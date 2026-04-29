// src/lib/services/pocketbase.ts
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';

// Nutzt die Vercel-Variable, falls vorhanden, sonst localhost
const pbUrl = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(pbUrl);

// WICHTIG: PocketBase niemals in ein $state() packen (Proxy-Konflikt)!
