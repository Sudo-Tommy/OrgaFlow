<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ClientLinkContactModal from "./ClientLinkContactModal.svelte";
    import ClientLinkHomeModal from "./ClientLinkHomeModal.svelte";
    import AppointmentModal from "./AppointmentModal.svelte";
    import AppointmentDetailModal from "./AppointmentDetailModal.svelte";

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

    // Helper um live zu prüfen, ob dieser Termin bereits in einer Rechnung auftaucht
    function isAppointmentBilled(appId: string) {
        const invoices = orgaStore.invoices?.data || [];
        return invoices.some((inv: any) => 
            Array.isArray(inv.appointments) ? inv.appointments.includes(appId) : inv.appointments === appId
        );
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
                <span class="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 rounded-lg shadow-inner text-sm">📄</span> Vorlagen
            </h3>
            <button class="orga-button-ghost py-1.5 px-3 text-xs md:text-sm font-bold">
                + Hochladen
            </button>
        </div>
        <div class="p-6">
            {#if documents.length === 0}
                <div class="text-center py-10 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                    <span class="text-3xl mb-2 block opacity-80">📂</span>
                    <p class="text-neutral-500 font-bold text-sm mb-1">Die Akte ist noch leer.</p>
                    <p class="text-neutral-400 text-xs">Hinterlegen Sie hier klientenspezifische Vorlagen oder Verträge.</p>
                </div>
            {:else}
                <div class="grid grid-cols-1 gap-3">
                    {#each documents as doc}
                        <!-- Sauberes Routing: Link direkt zur Dokument-Ansicht -->
                        <a href="/documents/{doc.id}" class="group flex items-start gap-3 p-4 rounded-xl border border-neutral-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer shadow-sm hover:shadow-md">
                            <div class="text-2xl mt-0.5 opacity-90 group-hover:scale-110 transition-transform duration-300">📄</div>
                            <div class="flex-1 overflow-hidden">
                                <p class="text-sm font-bold text-neutral-900 truncate">{doc.title || 'Dokument'}</p>
                                <p class="text-xs text-neutral-500 mt-1">{doc.created ? new Date(doc.created).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
                            </div>
                        </a>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<ClientLinkContactModal bind:this={linkContactModal} client={clientData} />
<ClientLinkHomeModal bind:this={linkHomeModal} client={clientData} />
<AppointmentModal bind:this={appointmentModal} />
<AppointmentDetailModal bind:this={detailModal} />