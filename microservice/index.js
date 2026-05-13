import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import PocketBase from 'pocketbase';

dotenv.config();

const app = express();

// Erlaubt Anfragen vom SvelteKit Frontend
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// PocketBase ist intern (hinter Nginx) weiterhin sicher auf Port 8090 erreichbar
const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

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
                
                for await (let message of imapClient.fetch(seqRange, { envelope: true, source: true, uid: true })) {
                    try {
                        const parsed = await simpleParser(message.source);
                        emails.push({
                            uid: message.uid.toString(),
                            subject: parsed.subject || 'Kein Betreff',
                            from: parsed.from?.value[0]?.address || message.envelope?.from?.[0]?.address || 'Unbekannt',
                            to: parsed.to?.value[0]?.address || credentials.user,
                            date: parsed.date || message.envelope?.date || new Date().toISOString(),
                            text: parsed.text || '',
                            html: parsed.html || parsed.textAsHtml || ''
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`✉️ Email Microservice läuft erfolgreich auf http://127.0.0.1:${PORT}`);
});