<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let appointmentDate = $state("");
    let description = $state("");
    let is_private = $state(false);
    let is_blocked = $state(false);
    let selectedClientId = $state("");
    // Holt sich live die Daten (inkl. Notizen) des aktuell gewählten Klienten
    let selectedClientRecord = $derived(orgaStore.clients?.data?.find((c: any) => c.id === selectedClientId));
    
    let isSuperAdmin = $state(pb.authStore.isSuperuser || pb.authStore.model?.role === 'superadmin' || pb.authStore.model?.role === 'admin');
    let users = $state<any[]>([]);
    let selectedUserId = $state("");

    export function open(data?: any) {
        // Sobald das Modal öffnet, laden wir als Admin die verfügbaren Mitarbeiter (im Hintergrund)
        if (isSuperAdmin && users.length === 0) {
            pb.collection('users').getFullList({ sort: 'name_first', requestKey: null }).then(res => users = res).catch(() => {});
        }

        // Wenn "data" existiert und kein reines Date-Objekt ist, bearbeiten wir einen bestehenden Termin!
        if (data && !(data instanceof Date) && data.id) {
            editId = data.id;
            appointmentDate = data.appointment ? toLocalISOString(new Date(data.appointment)) : "";
            description = data.description || "";
            if (description.includes('[BLOCK]')) {
                is_blocked = true;
                description = description.replace('[BLOCK]', '').trim();
            } else {
                is_blocked = false;
            }
            is_private = data.is_private || false;
            
            // Sichere Extraktion der Klienten-ID (egal ob String oder Array)
            let cId = "";
            if (data.client) {
                if (Array.isArray(data.client) && data.client.length > 0) cId = data.client[0];
                else if (typeof data.client === "string") cId = data.client;
            }
            selectedClientId = cId;
            selectedUserId = data.user || pb.authStore.model?.id || "";
            
        } else {
            editId = null;
            const d = (data && data.date) ? new Date(data.date) : (data instanceof Date ? new Date(data) : new Date());
            if (data instanceof Date || !data || data.preselectedClient) {
                d.setHours(new Date().getHours() + 1, 0, 0, 0);
            }
            appointmentDate = toLocalISOString(d);
            // Felder nur beim Erstellen eines neuen Termins zurücksetzen
            description = "";
            is_private = false;
            is_blocked = data?.is_blocked || false;
            selectedClientId = data?.preselectedClient || "";
            selectedUserId = pb.authStore.model?.id || "";
        }
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

        let finalDesc = description.trim();
        if (is_blocked) {
            if (!finalDesc) finalDesc = "Urlaub / Abwesend";
            finalDesc = `[BLOCK] ${finalDesc}`;
        }

        try {
            // Termin Payload zusammensetzen
            const payload: any = {
                appointment: appointmentDate ? new Date(appointmentDate).toISOString() : null,
                description: finalDesc,
                is_private,
                user: selectedUserId || pb.authStore.model?.id,
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

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">{editId ? 'Termin bearbeiten' : 'Neuen Termin anlegen'}</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        <form onsubmit={onSubmit} class="space-y-4">
            <div>
                <label for="app-date" class="block text-sm font-semibold text-neutral-700 mb-1.5">{is_blocked ? 'Datum (Ganztägig)' : 'Datum & Uhrzeit'}</label>
                {#if is_blocked}
                    <input id="app-date-only" type="date" value={appointmentDate.split('T')[0]} oninput={(e) => appointmentDate = e.currentTarget.value + 'T12:00'} class="orga-input-clear" required disabled={isLoading} />
                {:else}
                    <input id="app-date" type="datetime-local" bind:value={appointmentDate} class="orga-input-clear" required disabled={isLoading} />
                {/if}
            </div>
            {#if !is_blocked}
                <div>
                    <label for="app-client" class="block text-sm font-semibold text-neutral-700 mb-1.5">Klient (optional)</label>
                    <select id="app-client" bind:value={selectedClientId} class="orga-input-clear cursor-pointer" disabled={isLoading}>
                        <option value="">Kein Klient (z.B. Bürotätigkeit)</option>
                        {#each orgaStore.clients?.data || [] as client (client.id)}
                            <option value={client.id}>{client.name_first} {client.name_last}</option>
                        {/each}
                    </select>
                    <!-- Subtiler Hinweis auf Klienten-Notizen -->
                    {#if selectedClientRecord?.notes}
                        <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 shadow-sm animate-enter">
                            <span class="text-amber-500 text-lg leading-none mt-0.5">💡</span>
                            <div>
                                <p class="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Klienten-Notizen / Hinweise</p>
                                <p class="text-xs text-amber-900 font-medium whitespace-pre-wrap leading-relaxed">{selectedClientRecord.notes}</p>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
            {#if isSuperAdmin && !is_blocked}
                <div>
                    <label for="app-user" class="block text-sm font-semibold text-neutral-700 mb-1.5">Zuständiger Mitarbeiter</label>
                    <select id="app-user" bind:value={selectedUserId} class="orga-input-clear cursor-pointer" disabled={isLoading}>
                    {#if users.length === 0 && selectedUserId}
                        <option value={selectedUserId}>Lädt Mitarbeiter...</option>
                    {/if}
                        {#each users as u (u.id)}
                            <option value={u.id}>{u.name_first} {u.name_last}</option>
                        {/each}
                    </select>
                </div>
            {/if}
            <div>
                <label for="app-desc" class="block text-sm font-semibold text-neutral-700 mb-1.5">Beschreibung / Titel {is_blocked ? '(optional)' : ''}</label>
                <input id="app-desc" type="text" bind:value={description} class="orga-input-clear" placeholder={is_blocked ? "z.B. Urlaub / Abwesend" : "z.B. Arztbesuch Begleitung"} required={!is_blocked} disabled={isLoading} />
            </div>
            

            <div class="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label for="app-private" class="flex items-center justify-between w-full p-4 border-2 rounded-xl cursor-pointer transition-all {is_private ? 'border-indigo-500 bg-indigo-50/50' : 'border-neutral-200 bg-white hover:border-indigo-200'} {isLoading ? 'opacity-50 pointer-events-none' : ''}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors {is_private ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-500'}">
                            <span class="text-lg">🔒</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold {is_private ? 'text-indigo-900' : 'text-neutral-900'}">Privat</p>
                            <p class="text-[10px] {is_private ? 'text-indigo-700' : 'text-neutral-500'}">Interner Termin</p>
                        </div>
                    </div>
                    <!-- Custom Toggle Switch -->
                    <div class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {is_private ? 'bg-indigo-600' : 'bg-neutral-300'}">
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm {is_private ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </div>
                    <input id="app-private" type="checkbox" bind:checked={is_private} class="sr-only" disabled={isLoading} />
                </label>

                <label for="app-block" class="flex items-center justify-between w-full p-4 border-2 rounded-xl cursor-pointer transition-all {is_blocked ? 'border-rose-500 bg-rose-50/50' : 'border-neutral-200 bg-white hover:border-rose-200'} {isLoading ? 'opacity-50 pointer-events-none' : ''}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors {is_blocked ? 'bg-rose-100 text-rose-600' : 'bg-neutral-100 text-neutral-500'}">
                            <span class="text-lg">🚫</span>
                        </div>
                        <div>
                            <p class="text-sm font-bold {is_blocked ? 'text-rose-900' : 'text-neutral-900'}">Tag sperren</p>
                            <p class="text-[10px] {is_blocked ? 'text-rose-700' : 'text-neutral-500'}">Keine Online-Anfragen</p>
                        </div>
                    </div>
                    <!-- Custom Toggle Switch -->
                    <div class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {is_blocked ? 'bg-rose-600' : 'bg-neutral-300'}">
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm {is_blocked ? 'translate-x-6' : 'translate-x-1'}"></span>
                    </div>
                    <input id="app-block" type="checkbox" bind:checked={is_blocked} class="sr-only" disabled={isLoading} />
                </label>
            </div>
            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>Abbrechen</button>
                <button type="submit" class="orga-button-primary w-full sm:w-auto py-3 sm:py-2.5" disabled={isLoading}>{isLoading ? "Speichert..." : (editId ? "Speichern" : "Termin erstellen")}</button>
            </div>
        </form>
    </div>
</dialog>