import { pb } from "$lib/services/pocketbase";

/**
 * Führt den Login in PocketBase durch.
 * Prüft zuerst normale Nutzer ('users') und fällt bei Fehler auf Admins ('_superusers') zurück.
 */
export async function loginUser(email: string, pass: string): Promise<{ success: boolean; error: string | null }> {
    try {
        await pb.collection('users').authWithPassword(email, pass);
        return { success: true, error: null };
    } catch (err) {
        try {
            await pb.collection('_superusers').authWithPassword(email, pass);
            return { success: true, error: null };
        } catch (adminErr) {
            return { success: false, error: "Ungültige E-Mail-Adresse oder Passwort." };
        }
    }
}