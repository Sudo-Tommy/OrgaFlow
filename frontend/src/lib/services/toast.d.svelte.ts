// src/lib/services/toast.svelte.ts

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

class ToastService {
    // Zentraler State für alle aktiven Toasts
    toasts = $state<ToastMessage[]>([]);

    private add(message: string, type: ToastType = 'info', timeout: number = 4000) {
        // Einmalige Berechnung -> const
        const id = crypto.randomUUID();
        
        this.toasts.push({ id, message, type });

        // Automatisches Entfernen nach Ablauf der Zeit
        setTimeout(() => this.remove(id), timeout);
    }

    // Convenience-Methoden für die verschiedenen Typen
    success(message: string, timeout?: number) { 
        this.add(message, 'success', timeout); 
    }
    
    error(message: string, timeout: number = 6000) { 
        // Fehler bleiben standardmäßig etwas länger stehen
        this.add(message, 'error', timeout); 
    }
    
    info(message: string, timeout?: number) { 
        this.add(message, 'info', timeout); 
    }

    remove(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }
}

// Exportiere eine Singleton-Instanz
export const toastService = new ToastService();