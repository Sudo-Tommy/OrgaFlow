import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import PocketBase from 'pocketbase';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import webpush from 'web-push';

dotenv.config();

const app = express();

// Erlaubt Anfragen vom SvelteKit Frontend
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// PocketBase ist intern (hinter Nginx) weiterhin sicher auf Port 8090 erreichbar
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// Web-Push Konfiguration (VAPID Keys)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:info@ihre-seniorenassistenz.com', // Deine Kontakt-E-Mail
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

// In-Memory Speicher für Portal-Logins
const otpStore = new Map();
const sessionStore = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of otpStore.entries()) { if (value.expires < now) otpStore.delete(key); }
    for (const [key, value] of sessionStore.entries()) { if (value.expires < now) sessionStore.delete(key); }
}, 10 * 60000); // Aufräumen abgelaufener Codes alle 10 Minuten

// Helper: Auth-Token validieren und Postfach-Zugangsdaten aus PB holen
async function getUserEmailCredentials(authHeader) {
    if (!authHeader) throw new Error("Nicht autorisiert: Kein Token gesendet.");
    const token = authHeader.replace('Bearer ', '');
    
    const pb = new PocketBase(PB_URL);
    pb.authStore.save(token, null);
    
    let user = null;
    try {
        try {
            const authData = await pb.collection('users').authRefresh();
            user = authData.record;
        } catch (e) {
            const authData = await pb.collection('_superusers').authRefresh();
            user = authData.record || authData.admin;
        }
    } catch (err) {
        throw new Error("Token ungültig oder Berechtigung fehlt. Bitte logge dich neu ein.");
    }
        
    try {
        // Firmen-Zugehörigkeit ermitteln
        let companyId = null;
        if (user.company) {
            companyId = Array.isArray(user.company) ? user.company[0] : user.company;
        }

        let mailConfig = null;
        if (companyId) {
            try {
                // Mail-Config der Firma abrufen
                const configs = await pb.collection('userMailConfigs').getFullList({ filter: `company = "${companyId}"` });
                if (configs.length > 0) mailConfig = configs[0];
            } catch (e) {
                console.log("Info: Keine Firmen-Mail-Config gefunden.");
            }
        }
        
        // E-Mail Account des Nutzers hat Vorrang, danach greifen wir auf das zentrale Firmen-Postfach zurück
        const emailUser = user.smtp_mail || mailConfig?.smtp_user;
        const emailPass = user.smtp_password || mailConfig?.smtp_password;

        if (!emailUser || !emailPass) {
            throw new Error("Es sind keine E-Mail-Zugangsdaten im Profil oder Unternehmen hinterlegt.");
        }
        
        const actualUserName = `${user.name_first || ''} ${user.name_last || ''}`.trim() || "Ihre Seniorenassistenz";
        const actualUserEmail = user.email || emailUser;

        return {
            user: emailUser,
            pass: emailPass,
            actualUserName,
            actualUserEmail,
            smtp_host: mailConfig?.smtp_host || process.env.SMTP_HOST,
            smtp_port: mailConfig?.smtp_port ? parseInt(mailConfig.smtp_port) : 465,
            imap_host: mailConfig?.imap_host || process.env.IMAP_HOST,
            imap_port: mailConfig?.imap_port ? parseInt(mailConfig.imap_port) : 993
        };
    } catch (err) {
        throw new Error(err.message || "PocketBase Authentifizierung fehlgeschlagen.");
    }
}

// Reiner Auth-Check für Funktionen, die keine E-Mail benötigen (z.B. KI)
async function authenticateUser(authHeader) {
    if (!authHeader) throw new Error("Nicht autorisiert.");
    const token = authHeader.replace('Bearer ', '');
    const pb = new PocketBase(PB_URL);
    pb.authStore.save(token, null);
    try {
        return await pb.collection('users').authRefresh();
    } catch (e) {
        return await pb.collection('_superusers').authRefresh();
    }
}


// --- ROUTEN ---

// 1. E-Mail senden
app.post('/api/emails/send', async (req, res) => {
    const { to, cc, bcc, subject, text, html, attachments } = req.body;

    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);
        
        // Transporter dynamisch für diesen Nutzer erstellen
        const transporter = nodemailer.createTransport({
            host: credentials.smtp_host,
            port: credentials.smtp_port,
            secure: credentials.smtp_port === 465, // SSL für 465, sonst TLS (z.B. 587)
            auth: {
                user: credentials.user,
                pass: credentials.pass,
            },
        });

        const info = await transporter.sendMail({
            from: `"${credentials.actualUserName}" <${credentials.actualUserEmail}>`,
            replyTo: credentials.actualUserEmail,
            to,
            cc,
            bcc,
            subject,
            text,
            html,
            attachments
        });
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error("Fehler beim Senden der E-Mail:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. E-Mails abrufen (Posteingang)
app.get('/api/emails/inbox', async (req, res) => {
    let imapClient;
    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);

        // IMAP Client dynamisch für diesen Nutzer erstellen
        imapClient = new ImapFlow({
            host: credentials.imap_host,
            port: credentials.imap_port,
            secure: credentials.imap_port === 993,
            auth: {
                user: credentials.user,
                pass: credentials.pass
            },
            logger: false
        });

        await imapClient.connect();
        let lock = await imapClient.getMailboxLock('INBOX');
        const emails = [];
        
        try {
            // Die absolut sicherste Methode: Anzahl aller E-Mails im Ordner ermitteln
            const totalMails = imapClient.mailbox.exists;
            
            if (totalMails > 0) {
                // Wir holen die neuesten 15 E-Mails (um Ladezeiten zu minimieren)
                const startSeq = Math.max(1, totalMails - 14);
                const seqRange = `${startSeq}:*`;
                
                for await (let message of imapClient.fetch(seqRange, { envelope: true, source: true, uid: true, flags: true })) {
                    try {
                        const parsed = await simpleParser(message.source);
                        emails.push({
                            uid: message.uid.toString(),
                            subject: parsed.subject || 'Kein Betreff',
                            from: parsed.from?.value[0]?.address || message.envelope?.from?.[0]?.address || 'Unbekannt',
                            to: parsed.to?.value[0]?.address || credentials.user,
                            date: parsed.date || message.envelope?.date || new Date().toISOString(),
                            text: parsed.text || '',
                            html: parsed.html || parsed.textAsHtml || '',
                            is_read: message.flags?.has('\\Seen') || false
                        });
                    } catch (parseErr) {
                        console.error("Konnte E-Mail nicht parsen:", parseErr);
                    }
                }
            }
        } finally {
            lock.release();
        }
        await imapClient.logout();
        
        res.status(200).json({ success: true, data: emails });
    } catch (error) {
        console.error("Fehler beim Abrufen der E-Mails:", error);
        // Sicherstellen, dass die IMAP-Verbindung bei einem Fehler geschlossen wird
        if (imapClient && imapClient.usable) {
            await imapClient.logout();
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. E-Mails löschen (Massenlöschung)
app.post('/api/emails/delete', async (req, res) => {
    let imapClient;
    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);
        const { uid } = req.body;
        
        if (!uid) {
            return res.status(400).json({ error: "Keine UID(s) angegeben." });
        }

        const uidsToDelete = Array.isArray(uid) ? uid.join(',') : uid.toString();

        imapClient = new ImapFlow({
            host: credentials.imap_host,
            port: credentials.imap_port,
            secure: credentials.imap_port === 993,
            auth: { user: credentials.user, pass: credentials.pass },
            logger: false
        });

        await imapClient.connect();
        let lock = await imapClient.getMailboxLock('INBOX');
        try {
            await imapClient.messageFlagsAdd(uidsToDelete, ['\\Deleted'], { uid: true });
            try { await imapClient.messageExpunge(uidsToDelete, { uid: true }); } catch(e) {}
        } finally {
            lock.release();
        }
        await imapClient.logout();
        res.json({ success: true, deleted: uidsToDelete });
    } catch (error) {
        console.error("Lösch-Fehler:", error);
        if (imapClient && imapClient.usable) {
            await imapClient.logout();
        }
        res.status(500).json({ error: error.message });
    }
});

// 4. E-Mail als gelesen markieren
app.post('/api/emails/mark-read', async (req, res) => {
    let imapClient;
    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);
        const { uid } = req.body;
        
        if (!uid) {
            return res.status(400).json({ error: "Keine UID angegeben." });
        }

        imapClient = new ImapFlow({
            host: credentials.imap_host,
            port: credentials.imap_port,
            secure: credentials.imap_port === 993,
            auth: { user: credentials.user, pass: credentials.pass },
            logger: false
        });

        await imapClient.connect();
        let lock = await imapClient.getMailboxLock('INBOX');
        try {
            await imapClient.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
        } finally {
            lock.release();
        }
        await imapClient.logout();
        res.json({ success: true, uid });
    } catch (error) {
        console.error("Fehler beim Markieren als gelesen:", error);
        if (imapClient && imapClient.usable) {
            await imapClient.logout();
        }
        res.status(500).json({ error: error.message });
    }
});

// --- PORTAL ROUTEN (Für Klienten) ---

async function getAdminPb() {
    const pbAdmin = new PocketBase(PB_URL);
    const adminEmail = process.env.PB_ADMIN_EMAIL;
    const adminPass = process.env.PB_ADMIN_PASSWORD;
    if (!adminEmail || !adminPass) throw new Error("PB_ADMIN_EMAIL und PB_ADMIN_PASSWORD fehlen in .env");
    // PocketBase v0.23+ nutzt '_superusers' anstelle der veralteten 'admins'
    await pbAdmin.collection('_superusers').authWithPassword(adminEmail, adminPass);
    return pbAdmin;
}

app.post('/api/emails/portal/request-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-Mail fehlt.' });

    try {
        console.log(`[PORTAL] Fordere OTP an für: ${email}`);
        const pbAdmin = await getAdminPb();
        const clients = await pbAdmin.collection('clients').getFullList({ filter: `email = "${email}"`, requestKey: null });
        
        if (clients.length === 0) {
            console.log(`[PORTAL] Abbruch: E-Mail '${email}' ist nicht als Klient registriert.`);
            // Vorher "Fake-Erfolg" aus Sicherheitsgründen. Zum Testen werfen wir jetzt einen echten Fehler!
            return res.status(404).json({ error: 'Diese E-Mail ist nicht als Klient registriert.' });
        }
        
        const client = clients[0];
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(email, { otp, clientId: client.id, expires: Date.now() + 15 * 60000 });
        
        console.log(`[PORTAL] Klient gefunden: ${client.name_first} ${client.name_last}. Lade SMTP-Config...`);

        const companies = await pbAdmin.collection('company').getFullList({ filter: `clients ~ "${client.id}"`, requestKey: null });
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASSWORD;
        let smtpHost = process.env.SMTP_HOST || 'smtp.ionos.de';
        let smtpPort = 465;

        if (companies.length > 0) {
            const configs = await pbAdmin.collection('userMailConfigs').getFullList({ filter: `company = "${companies[0].id}"`, requestKey: null });
            if (configs.length > 0 && configs[0].smtp_user) {
                console.log(`[PORTAL] Nutze Firmen-E-Mail-Config aus der Datenbank.`);
                smtpUser = configs[0].smtp_user; smtpPass = configs[0].smtp_password;
                smtpHost = configs[0].smtp_host; smtpPort = parseInt(configs[0].smtp_port);
            }
        }

        if (!smtpUser || !smtpPass) {
            console.error(`[PORTAL] FEHLER: Weder in .env noch in Firmen-Einstellungen SMTP-Daten gefunden!`);
            return res.status(500).json({ error: "E-Mail-Server ist nicht konfiguriert." });
        }

        console.log(`[PORTAL] Sende Code via SMTP (${smtpHost}:${smtpPort}) als ${smtpUser}...`);
        const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
        await transporter.sendMail({
            from: `"Klienten-Portal" <${smtpUser}>`,
            to: email,
            subject: 'Ihr Zugangs-Code für das Portal',
            html: `<div style="font-family: Arial; padding: 20px;"><h2>Guten Tag ${client.name_first || ''},</h2><p>Ihr Einmal-Code für das Portal lautet: <strong><span style="font-size: 24px; color: #4f46e5; letter-spacing: 2px;">${otp}</span></strong></p><p>Dieser Code ist 15 Minuten gültig.</p></div>`
        });

        console.log(`[PORTAL] E-Mail erfolgreich versendet!`);
        res.json({ success: true });
    } catch (err) {
        console.error("[PORTAL] Schwerer Fehler beim Versenden:", err);
        res.status(500).json({ error: "Fehler beim E-Mail-Versand. Stimmen die SMTP-Zugangsdaten?" });
    }
});

app.post('/api/emails/portal/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore.get(email);
    
    if (!record || record.expires < Date.now() || record.otp !== otp) return res.status(401).json({ error: "Code ungültig oder abgelaufen." });
    
    otpStore.delete(email); // Code verbraucht
    const token = crypto.randomBytes(32).toString('hex');
    sessionStore.set(token, { clientId: record.clientId, email, expires: Date.now() + 2 * 3600000 }); // Session hält 2 Stunden
    res.json({ success: true, token });
});

app.get('/api/emails/portal/invoices', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const session = sessionStore.get(token);
    
    if (!session || session.expires < Date.now()) return res.status(401).json({ error: "Session abgelaufen. Bitte neu anmelden." });
    
    try {
        const pbAdmin = await getAdminPb();
        const invoices = await pbAdmin.collection('invoices').getFullList({
            filter: `(client = "${session.clientId}" || client ?= "${session.clientId}") && (status = "Eingereicht" || status = "Abgeschlossen" || status = "In Bearbeitung")`,
            sort: '-issue_date', requestKey: null
        });

        // PocketBase File-Token erzeugen, damit der Klient die PDF ohne PB-Account herunterladen darf!
        const fileToken = await pbAdmin.files.getToken();
        
        const mappedInvoices = invoices.map(inv => {
            const pdfs = Array.isArray(inv.pdf) ? inv.pdf : (inv.pdf ? [inv.pdf] : []);
            const files = pdfs.map(filename => ({
                name: filename,
                url: `/api/files/invoices/${inv.id}/${filename}?token=${fileToken}`
            }));
            return { id: inv.id, invoice_nr: inv.invoice_nr, issue_date: inv.issue_date, status: inv.status, brutto: inv.brutto, files };
        });

        res.json({ success: true, invoices: mappedInvoices });
    } catch (err) {
        res.status(500).json({ error: "Rechnungen konnten nicht geladen werden." });
    }
});

    // --- NEU: Termine für das Klienten-Portal abrufen ---
    app.get(['/api/emails/portal/appointments', '/portal/appointments', '/appointments'], async (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const session = sessionStore.get(token);
        
        if (!session || session.expires < Date.now()) return res.status(401).json({ error: "Session abgelaufen. Bitte neu anmelden." });
        
        try {
            const pbAdmin = await getAdminPb();
            
            // Termine ab gestern laden (damit auch frische, vergangene Termine angezeigt werden)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const appointments = await pbAdmin.collection('appointments').getFullList({
                filter: `(client = "${session.clientId}" || client ?= "${session.clientId}") && appointment >= "${yesterday.toISOString()}"`,
                sort: 'appointment',
                requestKey: null
            });
            
            res.json({ success: true, appointments });
        } catch (err) {
            console.error("[PORTAL] Fehler beim Laden der Termine:", err);
            res.status(500).json({ error: "Fehler beim Laden der Termine." });
        }
    });

// Benachrichtigung an Admin bei neuer Terminanfrage
app.post('/api/emails/portal/notify-request', async (req, res) => {
    const { name, email, phone, requestText, date, time, companyName } = req.body;

    try {
        let smtpUser = process.env.SMTP_USER;
        let smtpPass = process.env.SMTP_PASSWORD;
        let smtpHost = process.env.SMTP_HOST || 'smtp.ionos.de';
        let smtpPort = 465;

        if (!smtpUser || !smtpPass) {
            return res.status(500).json({ error: "E-Mail-Server ist nicht konfiguriert." });
        }

        const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
        
        await transporter.sendMail({
            from: `"OrgaFlow System" <${smtpUser}>`,
            to: "info@ihre-seniorenassistenz.com",
            subject: `Neue Terminanfrage von ${name || 'Unbekannt'}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #c66a4d;">Neue Terminanfrage eingegangen</h2>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #eee;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>E-Mail:</strong> ${email || '-'}</p>
                        <p><strong>Telefon:</strong> ${phone || '-'}</p>
                        <p><strong>Standort:</strong> ${companyName || '-'}</p>
                        <p><strong>Wunschdatum:</strong> ${date || '-'}</p>
                        <p><strong>Uhrzeit:</strong> ${time || '-'}</p>
                    </div>
                    <h3 style="margin-top: 20px; color: #555;">Anliegen:</h3>
                    <p style="background-color: #fff; border: 1px solid #eee; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${(requestText || '').replace(/\n/g, '<br>')}</p>
                    <p style="margin-top: 30px; font-size: 12px; color: #999;">
                        Diese E-Mail wurde automatisch vom OrgaFlow System generiert. Sie finden die Anfrage in Ihrem Dashboard.
                    </p>
                </div>
            `
        });

        console.log(`[PORTAL] E-Mail-Benachrichtigung für neue Terminanfrage gesendet.`);
        res.json({ success: true });
        
        // --- PUSH BENACHRICHTIGUNG AN ALLE ADMINS ---
        try {
            if (process.env.VAPID_PUBLIC_KEY) {
                const pbAdmin = await getAdminPb();
                const admins = await pbAdmin.collection('_superusers').getFullList({ requestKey: null });
                
                const payload = JSON.stringify({
                    title: 'Neue Terminanfrage! 📬',
                    body: `${name || 'Jemand'} hat eine Anfrage gesendet.`,
                    url: '/dashboard'
                });

                for (const admin of admins) {
                    if (admin.push_subscriptions) {
                        let subs = admin.push_subscriptions;
                        if (typeof subs === 'string') { try { subs = JSON.parse(subs); } catch(e){} }
                        if (Array.isArray(subs)) {
                            for (const sub of subs) {
                                await webpush.sendNotification(sub, payload).catch(e => console.log('Alte/Ungültige Subscription:', e.statusCode));
                            }
                        }
                    }
                }
            }
        } catch (pushErr) { console.error("[PORTAL] Push konnte nicht gesendet werden:", pushErr); }
    } catch (err) {
        console.error("[PORTAL] Fehler beim Senden der Benachrichtigung:", err);
        res.status(500).json({ error: "Fehler beim Senden der Benachrichtigung." });
    }
});

// KI Sprachnotiz-Transkription (Gemini 1.5 Flash)
app.post('/api/emails/ai/transcribe', async (req, res) => {
    try {
        await authenticateUser(req.headers.authorization); // Absichern!

        const { audioBase64, mimeType } = req.body;
        if (!audioBase64) return res.status(400).json({ error: "Kein Audio gesendet." });
        if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API Key fehlt im Server." });

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Wir erzwingen die stabile 'v1' API, da 'v1beta' oft den 404 Fehler wirft
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });

        const prompt = "Du bist ein professioneller Assistent in der Seniorenbetreuung. Höre dir das folgende Diktat an und erstelle daraus einen sachlichen, gut lesbaren Pflege- bzw. Besuchsbericht. Entferne Füllwörter (wie 'Ähm'), korrigiere Grammatikfehler und strukturiere den Text sinnvoll (z.B. mit Absätzen oder kurzen Stichpunkten). Bleibe beim 'Sie', wenn über den Klienten gesprochen wird. Schreibe KEINE Einleitung wie 'Hier ist der Bericht', sondern gib mir direkt nur den fertigen Text.";

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType || "audio/webm",
                    data: audioBase64
                }
            }
        ]);

        res.json({ success: true, text: result.response.text() });
    } catch (error) {
        console.error("[KI] Fehler:", error);
        res.status(500).json({ error: "Fehler bei der KI-Generierung: " + error.message });
    }
});

// Universeller Endpunkt (Catch-All für jede mögliche Weiterleitung)
app.post([
    '/api/emails/portal/push', 
    '/portal/push', 
    '/push', 
    '/api/push/send', 
    '/api/emails/push/send', 
    '/push/send'
], async (req, res) => {
    try {
        await authenticateUser(req.headers.authorization); // Nur eingeloggte Nutzer
        const { userId, title, body, url } = req.body;
        
        if (!userId || !title) return res.status(400).json({ error: "Fehlende Parameter." });
        if (!process.env.VAPID_PUBLIC_KEY) return res.status(500).json({ error: "VAPID Keys fehlen." });

        const pbAdmin = await getAdminPb();
        
        let targetUser;
        try { targetUser = await pbAdmin.collection('_superusers').getOne(userId); } catch (e) {}
        if (!targetUser) {
            try { targetUser = await pbAdmin.collection('users').getOne(userId); } catch (e) {}
        }

        if (targetUser && targetUser.push_subscriptions) {
            let subs = targetUser.push_subscriptions;
            if (typeof subs === 'string') { try { subs = JSON.parse(subs); } catch(e){} }
            const payload = JSON.stringify({ title, body, url: url || '/' });
            
            let pushResults = [];
            if (Array.isArray(subs)) {
                for (const sub of subs) {
                    try {
                        await webpush.sendNotification(sub, payload);
                        pushResults.push({ status: "success" });
                    } catch (e) {
                        console.error('[PUSH] Apple/Google Fehler:', e.statusCode, e.body);
                        pushResults.push({ status: "error", error: e.body || e.message });
                    }
                }
            }
            return res.json({ success: true, pushResults });
        }
        
        res.json({ success: false, error: "Keine Abonnements gefunden." });
    } catch (error) {
        console.error("[PUSH] Fehler:", error);
        res.status(500).json({ error: "Fehler beim Senden der Push-Benachrichtigung." });
    }
});

const PORT = process.env.PORT || 3000;
// Host weglassen, damit der Service unter localhost und IPv4/IPv6 erreichbar ist
app.listen(PORT, () => {
    console.log(`✉️ Email Microservice läuft erfolgreich auf http://localhost:${PORT}`);
});