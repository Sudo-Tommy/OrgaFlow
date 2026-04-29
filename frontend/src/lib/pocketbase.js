import PocketBase from 'pocketbase'; 
import { writable } from 'svelte/store';

const isDev = import.meta.env.DEV;
 
export const pb = new PocketBase(isDev ? 'http://127.0.0.1:8090' : '/');

export const currentUser = writable(pb.authStore.model); 
 
pb.authStore.onChange((auth) => { 
    currentUser.set(pb.authStore.model); 
}); 
