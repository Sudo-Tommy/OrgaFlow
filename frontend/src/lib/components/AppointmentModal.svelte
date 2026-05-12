<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let appointmentDate = $state("");
    let description = $state("");
    let is_private = $state(false);
    let selectedClientId = $state("");
    
    export function open(data?: any) {
        // Wenn "data" existiert und kein reines Date-Objekt ist, bearbeiten wir einen bestehenden Termin!
        if (data && !(data instanceof Date) && data.id) {
            editId = data.id;
            appointmentDate = data.appointment ? toLocalISOString(new Date(data.appointment)) : "";
            description = data.description || "";
            is_private = data.is_private || false;
            
            // Sichere Extraktion der Klienten-ID (egal ob String oder Array)
            let cId = "";
            if (data.client) {
                if (Array.isArray(data.client) && data.client.length > 0) cId = data.client[0];
                else if (typeof data.client === "string") cId = data.client;
            }
            selectedClientId = cId;
            
        } else {
            editId = null;
            const d = data instanceof Date ? new Date(data) : new Date();
            if (data instanceof Date || !data) {
                d.setHours(new Date().getHours() + 1, 0, 0, 0);
            }
            appointmentDate = toLocalISOString(d);
        }
        description = "";
        is_private = false;
        selectedClientId = "";
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function toLocalISOString(date: Date) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            // Termin Payload zusammensetzen
            const payload: any = {
                appointment: appointmentDate ? new Date(appointmentDate).toISOString() : null,
                description,
                is_private,
                user: pb.authStore.record?.id,
                client: selectedClientId ? [selectedClientId] : []
            };

            // Termin updaten oder anlegen
            if (editId) {
                await pb.collection('appointments').update(editId, payload);
            } else {
                await pb.collection('appointments').create(payload);
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl">
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">{editId ? 'Termin bearbeiten' : 'Neuen Termin anlegen'}</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        <form onsubmit={onSubmit} class="space-y-4">
            <div>
                <label for="app-date" class="block text-sm font-semibold text-neutral-700 mb-1.5">Datum & Uhrzeit</label>
                <input id="app-date" type="datetime-local" bind:value={appointmentDate} class="orga-input-clear" required disabled={isLoading} />
            </div>
            <div>
                <label for="app-client" class="block text-sm font-semibold text-neutral-700 mb-1.5">Klient (optional)</label>
                <select id="app-client" bind:value={selectedClientId} class="orga-input-clear cursor-pointer" disabled={isLoading}>
                    <option value="">Kein Klient (z.B. Bürotätigkeit)</option>
                    {#each orgaStore.clients?.data || [] as client (client.id)}
                        <option value={client.id}>{client.name_first} {client.name_last}</option>
                    {/each}
                </select>
            </div>
            <div>
                <label for="app-desc" class="block text-sm font-semibold text-neutral-700 mb-1.5">Beschreibung / Titel</label>
                <input id="app-desc" type="text" bind:value={description} class="orga-input-clear" placeholder="z.B. Arztbesuch Begleitung" required disabled={isLoading} />
            </div>
            

            <div class="pt-2">
                <label for="app-private" class="flex items-center justify-between w-full p-4 border-2 rounded-2xl cursor-pointer transition-all {is_private ? 'border-indigo-500 bg-indigo-50/50' : 'border-neutral-200 bg-white hover:border-indigo-200'} {isLoading ? 'opacity-50 pointer-events-none' : ''}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors {is_private ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-500'}">
                            <span class="text-lg">🔒</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold {is_private ? 'text-indigo-900' : 'text-neutral-900'}">Privater Termin</p>
                            <p class="text-xs {is_private ? 'text-indigo-700' : 'text-neutral-500'}">Termin ist nicht öffentlich sichtbar</p>
                        </div>
                    </div>
                    <!-- Custom Toggle Switch -->
                    <div class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {is_private ? 'bg-indigo-600' : 'bg-neutral-300'}">
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm {is_private ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </div>
                    <input id="app-private" type="checkbox" bind:checked={is_private} class="sr-only" disabled={isLoading} />
                </label>
            </div>
            <div class="pt-4 flex justify-end gap-3 border-t border-neutral-100">
                <button type="button" onclick={close} class="orga-button-ghost" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary" disabled={isLoading}>{isLoading ? "Speichert..." : (editId ? "Speichern" : "Termin erstellen")}</button>
            </div>
        </form>
    </div>
</dialog>