import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';

// Im Entwicklungsmodus (npm run dev) greift SvelteKit auf Port 8090 zu.
// Im Live-Betrieb (Build in pb_public) läuft SvelteKit über PocketBase selbst, daher reicht ein relativer Pfad ("/").
const pbUrl = import.meta.env.DEV ? (env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090') : '/';

export const pb = new PocketBase(pbUrl);

// Funktion, um die PocketBase-Session am Leben zu halten
export function keepPocketBaseAlive() {
    const interval = setInterval(async () => {
        if (pb.authStore.isValid && pb.authStore.model) {
            try {
                const collectionName = pb.authStore.model.collectionName;
                // Erweitere den Refresh um 'company', damit die Firmen-Daten im State erhalten bleiben
                await pb.collection(collectionName).authRefresh({
                    expand: 'company'
                });
            } catch (error) {
                console.warn('Failed to refresh auth:', error);
            }
        }
    }, 5 * 60 * 1000); // Alle 5 Minuten

    return () => clearInterval(interval);
} 

// WICHTIG: PocketBase niemals in ein $state() packen (Proxy-Konflikt)!
