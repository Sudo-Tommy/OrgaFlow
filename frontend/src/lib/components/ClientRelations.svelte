<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ClientLinkContactModal from "./ClientLinkContactModal.svelte";
    import ClientLinkHomeModal from "./ClientLinkHomeModal.svelte";
    import AppointmentModal from "./AppointmentModal.svelte";
    import AppointmentDetailModal from "./AppointmentDetailModal.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { toastStore } from "$lib/services/toastService.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    let { clientId } = $props<{ clientId: string }>();

    // Dynamisches Filtern der geladenen Collections auf den aktuellen Klienten
    // Sollten die Tabellen noch keine Daten haben, wird durch `|| []` ein Fehler vermieden.
    
    let clientData = $derived(orgaStore.clients?.getById(clientId));
    let appointments = $derived((orgaStore.appointments?.data || []).filter((a: any) => Array.isArray(a.client) ? a.client.includes(clientId) : a.client === clientId));
    let contacts = $derived(clientData?.expand?.contacts || []);
    let retirementHomes = $derived(clientData?.expand?.retirement_homes || []);
    let documents = $derived((orgaStore.document_templates?.data || []).filter((d: any) => d.client === clientId));

    let linkContactModal: ReturnType<typeof ClientLinkContactModal> | undefined = $state();
    let linkHomeModal: ReturnType<typeof ClientLinkHomeModal> | undefined = $state();
    let appointmentModal: ReturnType<typeof AppointmentModal> | undefined = $state();
    let detailModal: ReturnType<typeof AppointmentDetailModal> | undefined = $state();
    
    let fileInput: HTMLInputElement;
    let isUploading = $state(false);

    // Helper um live zu prüfen, ob dieser Termin bereits in einer Rechnung auftaucht
    function isAppointmentBilled(appId: string) {
        const invoices = orgaStore.invoices?.data || [];
        return invoices.some((inv: any) => 
            Array.isArray(inv.appointments) ? inv.appointments.includes(appId) : inv.appointments === appId
        );
    }

    async function uploadDocuments(e: Event) {
        const input = e.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        isUploading = true;
        try {
            const formData = new FormData();
            const existingFiles = clientData?.documents ?? [];
            for (const existing of existingFiles) formData.append('documents', existing);
            for (const file of input.files) formData.append('documents', file);
            
            await pb.collection('clients').update(clientId, formData);
            
            const updatedClient = await pb.collection<any>('clients').getOne(clientId, { expand: 'insurance,retirement_homes,contacts' });
            const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
            if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            
            toastStore.success(`${input.files.length} Dokument(e) erfolgreich hochgeladen.`);
        } catch (err) {
            console.error(err);
            toastStore.error("Fehler beim Hochladen der Dokumente. Existiert das Feld 'documents' in PocketBase?");
        } finally {
            isUploading = false;
            input.value = '';
        }
    }

    async function deleteDocument(filename: string) {
        if (!(await confirmStore.ask(`Möchten Sie das Dokument '${filename}' wirklich löschen?`, "Dokument löschen?", "Löschen", "Abbrechen", true))) return;
        try {
            const existingFiles = clientData?.documents ?? [];
            const formData = new FormData();
            for (const existing of existingFiles) { if (existing !== filename) formData.append('documents', existing); }
            if (existingFiles.length === 1 && existingFiles[0] === filename) formData.append('documents', '');
            await pb.collection('clients').update(clientId, formData);
            const updatedClient = await pb.collection<any>('clients').getOne(clientId, { expand: 'insurance,retirement_homes,contacts' });
            const index = orgaStore.clients?.data.findIndex((c: any) => c.id === clientId) ?? -1;
            if (index !== -1 && orgaStore.clients) orgaStore.clients.data[index] = updatedClient;
            toastStore.info("Dokument wurde gelöscht.");
        } catch (err) { console.error(err); toastStore.error("Fehler beim Löschen des Dokuments."); }
    }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-8 h-full content-start">
    
    <!-- Termine Section -->
    <div class="orga-card-white flex flex-col p-0!">
        <div class="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-inner text-sm">📅</span> Termine
            </h3>
            <button onclick={() => appointmentModal?.open({ preselectedClient: clientId })} aria-label="Termin hinzufügen" title="Neuer Termin" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
        <div class="p-6 flex-1 max-h-80 overflow-y-auto custom-scrollbar">
            {#if appointments.length === 0}
                <div class="text-center py-6">
                    <p class="text-neutral-400 text-sm mb-3">Keine anstehenden Termine.</p>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors">Jetzt planen &rarr;</button>
                </div>
            {:else}
                <ul class="space-y-4">
                    {#each appointments as app}
                        <button type="button" onclick={() => detailModal?.open(app.id)} class="w-full text-left group flex flex-col gap-2 p-4 rounded-xl hover:bg-indigo-50/50 transition-colors border border-neutral-100 hover:border-indigo-200 cursor-pointer shadow-sm hover:shadow-md">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-start gap-2.5">
                                    <div class="w-2.5 h-2.5 mt-1.5 rounded-full {isAppointmentBilled(app.id) ? 'bg-emerald-400' : 'bg-amber-400'} group-hover:scale-125 transition-transform shadow-sm shrink-0"></div>
                                    <p class="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">{app.description || 'Termin ohne Beschreibung'}</p>
                                </div>
                                {#if isAppointmentBilled(app.id)}
                                    <span class="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">✓ Abgerechnet</span>
                                {/if}
                            </div>
                            
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-600 mt-1 pl-5">
                                <div class="flex items-center gap-1.5 font-medium">
                                    <span class="text-sm">🕒</span>
                                    {#if app.appointment}
                                        {new Date(app.appointment).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                    {:else}
                                        Kein Datum
                                    {/if}
                                </div>
                                
                                {#if app.is_private}
                                    <div class="flex items-center gap-1 text-rose-600 font-bold">
                                        <span>🔒</span> Privat
                                    </div>
                                {/if}
                            </div>

                            <!-- Backtracking: Visuelle Indikatoren für verbundene Daten (expand) -->
                            {#if app.expand?.time_record || app.expand?.drive_record || app.expand?.tasks || app.expand?.expenditures}
                                <div class="flex gap-1.5 mt-1.5 pl-5 flex-wrap">
                                        {#if app.expand?.time_record}
                                            <span class="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">⏱️ Zeit</span>
                                        {/if}
                                        {#if app.expand?.drive_record}
                                            <span class="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">🚗 Fahrt</span>
                                        {/if}
                                        {#if app.expand?.tasks}
                                            <span class="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">📋 Tasks</span>
                                        {/if}
                                        {#if app.expand?.expenditures}
                                            <span class="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">💶 Ausgaben</span>
                                        {/if}
                                    </div>
                                {/if}
                        </button>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>

    <!-- Kontakte Section -->
    <div class="orga-card-white flex flex-col p-0!">
        <div class="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-lg shadow-inner text-sm">👥</span> Bezugspersonen
            </h3>
            <button onclick={() => linkContactModal?.open()} aria-label="Kontakt verknüpfen" title="Kontakt verknüpfen" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
        <div class="p-6 flex-1 max-h-80 overflow-y-auto custom-scrollbar">
            {#if contacts.length === 0}
                <div class="text-center py-6">
                    <p class="text-neutral-400 text-sm mb-3">Keine Kontakte hinterlegt.</p>
                    <button onclick={() => linkContactModal?.open()} class="text-emerald-600 hover:text-emerald-800 text-sm font-bold transition-colors">Jetzt verknüpfen &rarr;</button>
                </div>
            {:else}
                <ul class="space-y-4">
                    {#each contacts as contact}
                        <li class="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100 cursor-pointer">
                            <div class="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold text-sm shrink-0 shadow-inner">
                                {(contact.name_first?.charAt(0) || contact.company_name?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-neutral-900 truncate">
                                    {#if contact.name_first || contact.name_last}{contact.name_first} {contact.name_last}{:else}{contact.company_name || 'Unbekannt'}{/if}
                                </p>
                                {#if contact.company_name && (contact.name_first || contact.name_last)}
                                    <p class="text-xs text-neutral-500 mt-0.5 truncate">{contact.company_name}</p>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>

    <!-- Pflegeheime Section -->
    <div class="orga-card-white flex flex-col p-0!">
        <div class="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-teal-100 text-teal-600 rounded-lg shadow-inner text-sm">🏥</span> Pflegeheime
            </h3>
            <button onclick={() => linkHomeModal?.open()} aria-label="Pflegeheim verknüpfen" title="Pflegeheim verknüpfen" class="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-teal-600 hover:border-teal-200 transition-colors shadow-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
        </div>
        <div class="p-6 flex-1 max-h-80 overflow-y-auto custom-scrollbar">
            {#if retirementHomes.length === 0}
                <div class="text-center py-6">
                    <p class="text-neutral-400 text-sm mb-3">Keine Pflegeheime verknüpft.</p>
                    <button onclick={() => linkHomeModal?.open()} class="text-teal-600 hover:text-teal-800 text-sm font-bold transition-colors">Jetzt verknüpfen &rarr;</button>
                </div>
            {:else}
                <ul class="space-y-4">
                    {#each retirementHomes as home}
                        <li class="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100">
                            <div class="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-lg shrink-0 shadow-inner">🏥</div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-neutral-900 truncate">{home.name}</p>
                                <p class="text-xs text-neutral-500 mt-0.5 truncate">{home.city}</p>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>

    <!-- Dokumente Section -->
    <div class="orga-card-white flex flex-col p-0!">
        <div class="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span class="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 rounded-lg shadow-inner text-sm">📄</span> Dokumente & Akte
            </h3>
            <div class="flex items-center gap-2">
                <input type="file" multiple bind:this={fileInput} onchange={uploadDocuments} class="hidden" disabled={isUploading} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                <button onclick={() => fileInput.click()} disabled={isUploading} class="orga-button-primary py-1.5 px-3 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20" title="Scans oder Dateien hochladen">
                    {isUploading ? 'Lädt...' : '+ Datei hochladen'}
                </button>
            </div>
        </div>
        <div class="p-6 max-h-80 overflow-y-auto custom-scrollbar">
            {#if documents.length === 0 && (!clientData?.documents || clientData.documents.length === 0)}
                <div class="text-center py-10 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-3xl mb-2 block opacity-80">📂</span>
                    <p class="text-neutral-500 font-bold text-sm mb-1">Die Akte ist noch leer.</p>
                    <p class="text-neutral-400 text-xs">Laden Sie Scans (PDF/Bilder) hoch oder erstellen Sie Vorlagen.</p>
                </div>
            {:else}
                <div class="space-y-6">
                    {#if clientData?.documents && clientData.documents.length > 0}
                        <div>
                            <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Hochgeladene Dateien</h4>
                            <div class="grid grid-cols-1 gap-2">
                                {#each clientData.documents as docFileName}
                                    <div class="group flex items-center justify-between p-3 rounded-xl border border-neutral-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all shadow-sm hover:shadow-md">
                                        <a href={pb.files.getURL(clientData, docFileName)} target="_blank" class="flex items-center gap-3 min-w-0 flex-1">
                                            <div class="text-xl shrink-0 opacity-80 group-hover:scale-110 transition-transform duration-300">{docFileName.endsWith('.pdf') ? '📕' : '🖼️'}</div>
                                            <div class="truncate"><p class="text-sm font-bold text-neutral-900 truncate" title={docFileName}>{docFileName}</p></div>
                                        </a>
                                        <button onclick={() => deleteDocument(docFileName)} class="p-2 text-neutral-400 hover:text-rose-500 transition-colors opacity-0 xl:opacity-100 group-hover:opacity-100" title="Löschen"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    {#if documents.length > 0}
                        <div>
                            <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">System-Vorlagen</h4>
                            <div class="grid grid-cols-1 gap-2">
                                {#each documents as doc}
                                    <a href="/documents/{doc.id}" class="group flex items-center gap-3 p-3 rounded-xl border border-neutral-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-sm hover:shadow-md"><div class="text-xl shrink-0 opacity-80 group-hover:scale-110 transition-transform duration-300">📄</div><div class="flex-1 overflow-hidden"><p class="text-sm font-bold text-neutral-900 truncate">{doc.title || 'Dokument'}</p><p class="text-[10px] text-neutral-500 mt-0.5">{doc.created ? new Date(doc.created).toLocaleDateString('de-DE') : 'Unbekannt'}</p></div><span class="text-indigo-600 opacity-0 xl:opacity-100 group-hover:opacity-100 transition-opacity"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></span></a>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<ClientLinkContactModal bind:this={linkContactModal} client={clientData} />
<ClientLinkHomeModal bind:this={linkHomeModal} client={clientData} />
<AppointmentModal bind:this={appointmentModal} />
<AppointmentDetailModal bind:this={detailModal} />