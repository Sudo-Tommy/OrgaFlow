<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let { appointment } = $props<{ appointment: any }>();
    
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let start = $state("");
    let end = $state("");

    // Hilfsfunktion: Konvertiert ISO-Datum zu "YYYY-MM-DDThh:mm" für datetime-local Input
    function toLocalISOString(dateString?: string) {
        if (!dateString) return "";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            start = toLocalISOString(record.start);
            end = toLocalISOString(record.end);
        } else {
            editId = null;
            start = "";
            end = "";
        }
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            if (editId) {
                // Bestehenden Datensatz aktualisieren
                await pb.collection('time_records').update(editId, {
                    start: start ? new Date(start).toISOString() : null,
                    end: end ? new Date(end).toISOString() : null,
                });
            } else {
                // 1. Neuen Zeiteintrag in der Collection anlegen
                const newRecord = await pb.collection('time_records').create({
                    start: start ? new Date(start).toISOString() : null,
                    end: end ? new Date(end).toISOString() : null,
                });
    
                // 2. Den neuen Eintrag mit dem Termin verknüpfen
                const existing = appointment.time_record || [];
                await pb.collection('appointments').update(appointment.id, {
                    time_record: [...existing, newRecord.id]
                });
            }

            // Realtime Update im Store erzwingen, um Relationen in der Ansicht live zu aktualisieren
            const updatedApp = await pb.collection('appointments').getOne(appointment.id, { 
                expand: 'user,client,drive_record,time_record,tasks,expenditures' 
            });
            const index = orgaStore.appointments?.data.findIndex(a => a.id === appointment.id) ?? -1;
            if (index !== -1 && orgaStore.appointments) {
                orgaStore.appointments.data[index] = updatedApp;
            }

            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern.";
            if (err.response?.data) {
                const details = Object.entries(err.response.data).map(([k, v]: any) => `${k}: ${v.message}`).join(", ");
                if (details) errorMsg += ` (${details})`;
            }
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl">
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">{editId ? 'Zeit bearbeiten' : 'Zeit erfassen'}</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        <form onsubmit={onSubmit} class="space-y-4">
            <div><label for="time-start" class="block text-sm font-semibold text-neutral-700 mb-1.5">Startzeit</label><input id="time-start" type="datetime-local" bind:value={start} class="orga-input-clear" required disabled={isLoading} /></div>
            <div><label for="time-end" class="block text-sm font-semibold text-neutral-700 mb-1.5">Endzeit (optional)</label><input id="time-end" type="datetime-local" bind:value={end} class="orga-input-clear" disabled={isLoading} /></div>
            <div class="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button type="button" onclick={close} class="orga-button-ghost" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary" disabled={isLoading}>{isLoading ? "Speichert..." : (editId ? "Änderungen speichern" : "Eintragen")}</button>
            </div>
        </form>
    </div>
</dialog>