import { pb } from '$lib/services/pocketbase';

// Basis-URL unseres neuen E-Mail Microservices
const MICROSERVICE_URL = 'http://127.0.0.1:3000/api/emails';

export interface SendEmailPayload {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export interface EmailMessage {
    uid: number;
    subject: string;
    from: string;
    date: string;
}

/**
 * Ruft die neuesten E-Mails aus dem Posteingang über den Microservice ab.
 */
export async function fetchInbox(): Promise<EmailMessage[]> {
    if (!pb.authStore.isValid) {
        throw new Error('Nicht autorisiert: Bitte loggen Sie sich ein.');
    }

    const response = await fetch(`${MICROSERVICE_URL}/inbox`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${pb.authStore.token}`,
            'Content-Type': 'application/json'
        }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.error || 'Fehler beim Abrufen der E-Mails.');
    }

    return result.data;
}

/**
 * Sendet eine E-Mail über den Microservice.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<{ messageId: string }> {
    if (!pb.authStore.isValid) {
        throw new Error('Nicht autorisiert: Bitte loggen Sie sich ein.');
    }

    const response = await fetch(`${MICROSERVICE_URL}/send`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${pb.authStore.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.error || 'Fehler beim Senden der E-Mail.');
    }

    return { messageId: result.messageId };
}