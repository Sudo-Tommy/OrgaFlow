<script lang="ts">
    import { page } from "$app/stores";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import TimeRecordModal from "$lib/components/TimeRecordModal.svelte";
    import DriveRecordModal from "$lib/components/DriveRecordModal.svelte";
    import ExpenditureModal from "$lib/components/ExpenditureModal.svelte";

    let appId = $derived($page.params.id || '');
    let appointment = $derived(orgaStore.appointments?.getById(appId));

    // Relationale Daten aus dem "expand" entpacken (Fallback auf leere Arrays)
    // client ist in PocketBase als Array definiert (maxSelect: 10), daher greifen wir aufs erste Element zu
    let client = $derived(appointment?.expand?.client?.[0] || null);
    let timeRecords = $derived(appointment?.expand?.time_record || []);
    let driveRecords = $derived(appointment?.expand?.drive_record || []);
    let tasks = $derived(appointment?.expand?.tasks || []);
    let expenditures = $derived(appointment?.expand?.expenditures || []);

    // Hilfsfunktion zur Berechnung der Zeitdifferenz
    function getDuration(startStr: string, endStr: string) {
        if (!startStr || !endStr) return "-";
        const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
        if (diffMs < 0) return "Fehlerhafte Zeiten";
        const diffMins = Math.round(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hours === 0) return `${mins} min`;
        return `${hours}h ${mins}m`;
    }

    // Berechnungen für die Übersicht
    let totalKm = $derived(driveRecords.reduce((sum: number, r: any) => sum + (r.km || 0), 0));
    let totalExpenditure = $derived(expenditures.reduce((sum: number, e: any) => sum + (e.sum || 0), 0));

    let timeModal: ReturnType<typeof TimeRecordModal> | undefined = $state();
    let driveModal: ReturnType<typeof DriveRecordModal> | undefined = $state();
    let expenditureModal: ReturnType<typeof ExpenditureModal> | undefined = $state();
</script>

<div class="orga-page-header animate-enter">
    <div>
        <a href="javascript:history.back()" class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm flex items-center gap-2 mb-4 transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Zurück
        </a>
        <h1 class="orga-page-title flex items-center gap-3">
            {#if appointment}
                Termin-Details
                {#if appointment.is_private}
                    <span class="px-3.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700">Privat</span>
                {/if}
            {:else if orgaStore.appointments?.isLoading}
                <div class="h-8 w-48 bg-neutral-200 rounded-lg animate-pulse"></div>
            {:else}
                Termin nicht gefunden
            {/if}
        </h1>
        <p class="orga-page-subtitle">
            {#if appointment}Übersicht, Zeiten und Fahrtkosten{:else}Bitte überprüfen Sie die angefragte URL.{/if}
        </p>
    </div>
    {#if appointment}
        <button class="orga-button-ghost shrink-0">
            <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Termin bearbeiten
        </button>
    {/if}
</div>

{#if !appointment && orgaStore.appointments?.isLoading}
    <div class="flex flex-col items-center justify-center py-20 animate-pulse animate-enter delay-100">
        <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p class="text-neutral-500 font-medium">Lade Termindaten...</p>
    </div>
{:else if !appointment}
    <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm animate-enter delay-100">
        <p class="text-lg font-bold text-neutral-900 mb-2">Dieser Termin existiert nicht</p>
        <p class="mb-6">Der Termin wurde möglicherweise gelöscht oder die ID ist falsch.</p>
    </div>
{:else}
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-10 pb-12">
        
        <!-- Linke Spalte: Stammdaten des Termins -->
        <div class="xl:col-span-1 space-y-6 animate-enter delay-100">
            <div class="orga-card-white p-6 md:p-8">
                <h2 class="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4">
                    <span>📋</span> Termin-Info
                </h2>
                
                <div class="space-y-5">
                    <div>
                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1.5">Datum & Uhrzeit</p>
                        <p class="text-neutral-900 font-bold">
                            {#if appointment.appointment}
                                {new Date(appointment.appointment).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}<br/>
                                <span class="text-indigo-600">{new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                            {:else}
                                Kein Datum hinterlegt
                            {/if}
                        </p>
                    </div>
                    <div>
                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1.5">Beschreibung</p>
                        <p class="text-neutral-900 font-medium">{appointment.description || '-'}</p>
                    </div>
                </div>
            </div>

            {#if client}
                <div class="orga-card-white p-6 md:p-8 relative overflow-hidden group">
                    <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-150 z-0"></div>
                    <h2 class="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4 relative z-10">
                        <span>👤</span> Zugeordneter Klient
                    </h2>
                    <div class="flex items-center gap-4 relative z-10">
                        <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-lg shrink-0 shadow-inner">
                            {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                        </div>
                        <div class="flex-1">
                            <p class="text-neutral-900 font-bold">{client.name_first} {client.name_last}</p>
                            <a href="/clients/{client.id}" class="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors mt-1 inline-block">Zur Akte &rarr;</a>
                        </div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Rechte Spalte: Zeiterfassung & Fahrtenbuch -->
        <div class="xl:col-span-2 space-y-6 animate-enter delay-200">
            
            <!-- Zeiterfassung -->
            <div class="orga-card-white p-6 md:p-8">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-neutral-100 pb-4">
                    <h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2">
                        <span class="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-inner text-sm">⏱️</span> Zeiterfassung
                    </h2>
                    <button onclick={() => timeModal?.open()} class="orga-button-ghost py-2 px-4 text-sm">+ Zeit erfassen</button>
                </div>
                
                {#if timeRecords.length === 0}
                    <div class="text-center py-6 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                        <p class="text-neutral-500 font-bold text-sm mb-1">Keine Zeiten erfasst.</p>
                        <p class="text-neutral-400 text-xs">Starten Sie eine Erfassung oder tragen Sie sie manuell nach.</p>
                    </div>
                {:else}
                    <div class="space-y-3">
                        {#each timeRecords as record}
                            <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-100 bg-neutral-50 hover:border-indigo-200 transition-colors group">
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
                                        <p class="text-sm font-bold text-neutral-900">
                                            {record.start ? new Date(record.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} - 
                                            {record.end ? new Date(record.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} Uhr
                                        </p>
                                    </div>
                                    <p class="text-xs text-neutral-500 pl-4">{record.start ? new Date(record.start).toLocaleDateString('de-DE') : ''}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-indigo-700 font-bold text-lg">{getDuration(record.start, record.end)}</p>
                                    <button onclick={() => timeModal?.open(record)} class="text-xs text-neutral-400 hover:text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Bearbeiten</button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Fahrtenbuch -->
            <div class="orga-card-white p-6 md:p-8">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-neutral-100 pb-4">
                    <h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2">
                        <span class="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-lg shadow-inner text-sm">🚗</span> Fahrtenbuch
                    </h2>
                    <button onclick={() => driveModal?.open()} class="orga-button-ghost py-2 px-4 text-sm">+ Fahrt eintragen</button>
                </div>
                
                {#if driveRecords.length === 0}
                    <div class="text-center py-6 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                        <p class="text-neutral-500 font-bold text-sm mb-1">Keine Fahrten hinterlegt.</p>
                        <p class="text-neutral-400 text-xs">Tragen Sie gefahrene Kilometer für diesen Termin ein.</p>
                    </div>
                {:else}
                    <div class="space-y-3 mb-4">
                        {#each driveRecords as drive}
                            <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-100 bg-neutral-50 hover:border-emerald-200 transition-colors group">
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        <p class="text-sm font-bold text-neutral-900">{drive.type || 'Fahrt'}</p>
                                    </div>
                                    {#if drive.lump_sum}
                                        <p class="text-xs text-neutral-500 pl-4">Pauschale: {drive.lump_sum} €</p>
                                    {/if}
                                </div>
                                <div class="text-right">
                                    <p class="text-emerald-700 font-bold text-lg">{drive.km || 0} km</p>
                                    <button onclick={() => driveModal?.open(drive)} class="text-xs text-neutral-400 hover:text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Bearbeiten</button>
                                </div>
                            </div>
                        {/each}
                    </div>
                    <div class="bg-emerald-50 rounded-xl p-4 flex justify-between items-center">
                        <p class="text-sm font-bold text-emerald-900">Gesamte Strecke</p>
                        <p class="text-lg font-bold text-emerald-700">{totalKm} km</p>
                    </div>
                {/if}
            </div>

            <!-- Sonderausgaben -->
            <div class="orga-card-white p-6 md:p-8">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-neutral-100 pb-4">
                    <h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2">
                        <span class="w-8 h-8 flex items-center justify-center bg-rose-100 text-rose-600 rounded-lg shadow-inner text-sm">💶</span> Sonderausgaben
                    </h2>
                    <button onclick={() => expenditureModal?.open()} class="orga-button-ghost py-2 px-4 text-sm">+ Ausgabe hinzufügen</button>
                </div>
                
                {#if expenditures.length === 0}
                    <div class="text-center py-6 border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                        <p class="text-neutral-500 font-bold text-sm mb-1">Keine Ausgaben hinterlegt.</p>
                        <p class="text-neutral-400 text-xs">Erfassen Sie hier Auslagen oder besondere Anschaffungen für den Klienten.</p>
                    </div>
                {:else}
                    <div class="space-y-3 mb-4">
                        {#each expenditures as exp}
                            <div class="flex items-center justify-between p-4 rounded-xl border border-neutral-100 bg-neutral-50 hover:border-rose-200 transition-colors group">
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                                    <p class="text-sm font-bold text-neutral-900">{exp.titel || 'Ausgabe'}</p>
                                </div>
                                <div class="text-right flex flex-col items-end">
                                    <p class="text-rose-700 font-bold text-lg">{exp.sum ? exp.sum.toFixed(2).replace('.', ',') : '0,00'} €</p>
                                    <button onclick={() => expenditureModal?.open(exp)} class="text-xs text-neutral-400 hover:text-rose-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Bearbeiten</button>
                                </div>
                            </div>
                        {/each}
                    </div>
                    <div class="bg-rose-50 rounded-xl p-4 flex justify-between items-center">
                        <p class="text-sm font-bold text-rose-900">Gesamtsumme</p>
                        <p class="text-lg font-bold text-rose-700">{totalExpenditure.toFixed(2).replace('.', ',')} €</p>
                    </div>
                {/if}
            </div>

        </div>
    </div>

    <TimeRecordModal bind:this={timeModal} {appointment} />
    <DriveRecordModal bind:this={driveModal} {appointment} />
    <ExpenditureModal bind:this={expenditureModal} {appointment} />
{/if}