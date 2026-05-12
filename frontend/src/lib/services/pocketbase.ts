import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';

const pbUrl = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(pbUrl);

// Funktion, um die PocketBase-Session am Leben zu halten
export function keepPocketBaseAlive() {
    const interval = setInterval(async () => {
        if (pb.authStore.isValid && pb.authStore.record) {
            try {
                const collectionName = pb.authStore.record.collectionName;
                await pb.collection(collectionName).authRefresh();
            } catch (error) {
                console.warn('Failed to refresh auth:', error);
            }
        }
    }, 5 * 60 * 1000); // Alle 5 Minuten

    return () => clearInterval(interval);
} 

// WICHTIG: PocketBase niemals in ein $state() packen (Proxy-Konflikt)!
