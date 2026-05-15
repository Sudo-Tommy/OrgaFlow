import { pb } from './pocketbase';

class UpdateService {
    isOpen = $state(false);
    hasUnread = $state(false);
    updates = $state<any[]>([]);

    async check() {
        if (!pb.authStore.isValid) return;
        try {
            // Lädt die letzten 20 Updates, sortiert nach der höchsten Nummer
            const res = await pb.collection('updates').getList(1, 20, { sort: '-number', requestKey: null });
            this.updates = res.items;
            
            if (this.updates.length > 0) {
                const latestNum = this.updates[0].number || 0;
                const lastSeen = parseInt(localStorage.getItem('orga_last_seen_update') || '0');
                
                if (latestNum > lastSeen) {
                    this.hasUnread = true;
                }
            }
        } catch (e) {
            console.warn("Konnte Updates nicht laden.");
        }
    }

    open() {
        this.isOpen = true;
        this.hasUnread = false;
        if (this.updates.length > 0) {
            localStorage.setItem('orga_last_seen_update', (this.updates[0].number || 0).toString());
        }
    }

    close() { this.isOpen = false; }
}
export const updateStore = new UpdateService();