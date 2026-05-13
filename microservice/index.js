import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import PocketBase from 'pocketbase';

dotenv.config();

const app = express();

// Erlaubt Anfragen vom SvelteKit Frontend
app.use(cors());
app.use(express.json());

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

// Helper: Auth-Token validieren und Postfach-Zugangsdaten aus PB holen
async function getUserEmailCredentials(authHeader) {
    if (!authHeader) throw new Error("Nicht autorisiert: Kein Token gesendet.");
    const token = authHeader.replace('Bearer ', '');
    
    const pb = new PocketBase(PB_URL);
    pb.authStore.save(token, null);
    
    try {
        // authRefresh validiert den Token und holt den aktuellen User-Record
        const authData = await pb.collection('users').authRefresh();
        const user = authData.record;
        
        if (!user.smtp_mail || !user.smtp_password) {
            throw new Error("Es sind keine E-Mail-Zugangsdaten im Profil hinterlegt.");
        }
        
        return {
            user: user.smtp_mail,
            pass: user.smtp_password
        };
    } catch (err) {
        throw new Error("PocketBase Authentifizierung fehlgeschlagen oder Session abgelaufen.");
    }
}

// --- ROUTEN ---

// 1. E-Mail senden
app.post('/api/emails/send', async (req, res) => {
    const { to, subject, text, html } = req.body;

    try {
        const credentials = await getUserEmailCredentials(req.headers.authorization);
        
        // Transporter dynamisch für diesen Nutzer erstellen
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 465,
            secure: true,
            auth: {
                user: credentials.user,
                pass: credentials.pass,
            },
        });

        const info = await transporter.sendMail({
            from: `"Ihre Seniorenassistenz" <${credentials.user}>`,
            to,
            subject,
            text,
            html
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
            host: process.env.IMAP_HOST,
            port: 993,
            secure: true,
            auth: {
                user: credentials.user,
                pass: credentials.pass
            },
            logger: false
        });

        await imapClient.connect();
        let lock = await imapClient.getMailboxLock('INBOX');
        const emails = [];
        
        // Die 10 neuesten E-Mails abrufen (1:10)
        for await (let message of imapClient.fetch('1:10', { envelope: true })) {
            emails.push({
                uid: message.uid,
                subject: message.envelope.subject,
                from: message.envelope.from[0]?.address,
                date: message.envelope.date
            });
        }
        lock.release();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log(`✉️ Email Microservice läuft erfolgreich auf http://127.0.0.1:${PORT}`);
});