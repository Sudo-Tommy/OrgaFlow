import PocketBase from 'pocketbase';
import { writable } from 'svelte/store';
import { env } from '$env/dynamic/public';

// Nutzt die Vercel-Variable, falls vorhanden, sonst localhost
const pbUrl = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(pbUrl);

export const currentUser = writable(pb.authStore.model);

pb.authStore.onChange((auth) => {
    currentUser.set(pb.authStore.model);
});

// Funktion, um die PocketBase-Session am Leben zu halten
export function keepPocketBaseAlive() {
    const interval = setInterval(async () => {
        if (pb.authStore.isValid) {
            try {
                await pb.collection('users').authRefresh();
            } catch (error) {
                console.warn('Failed to refresh auth:', error);
            }
        }
    }, 5 * 60 * 1000); // Alle 5 Minuten

    return () => clearInterval(interval);
} 
