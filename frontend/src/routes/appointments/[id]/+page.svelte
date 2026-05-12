<script lang="ts">
    import { page } from "$app/stores";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import DriveRecordModal from "$lib/components/DriveRecordModal.svelte";
    import ExpenditureModal from "$lib/components/ExpenditureModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";

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

    let driveModal: ReturnType<typeof DriveRecordModal> | undefined = $state();
    let expenditureModal: ReturnType<typeof ExpenditureModal> | undefined = $state();
    let editModal: ReturnType<typeof AppointmentModal> | undefined = $state();

    // --- Inline Zeiterfassung Logik ---
    let isTimeLoading = $state(false);
    let editTimeId = $state<string | null>(null);
    let timeStart = $state("");
    let timeEnd = $state("");

    // --- Inline Tätigkeiten/Leistungen Logik ---
    let taskDialog: HTMLDialogElement | undefined = $state();
    let newTaskTitle = $state("");
    let newTaskDescription = $state("");
    let isTaskLoading = $state(false);

    // Hilfsfunktion: Extrahiert "hh:mm" aus einem ISO-Datum für das time Input
    function extractTime(dateString?: string) {
        if (!dateString) return "";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // Hilfsfunktion: Kombiniert das Datum des Termins mit der eingegebenen Uhrzeit
    function combineDateAndTime(timeString: string) {
        if (!timeString || !appointment?.appointment) return null;
        const baseDate = new Date(appointment.appointment);
        if (isNaN(baseDate.getTime())) return null;

        const [hours, minutes] = timeString.split(':').map(Number);
        const d = new Date(baseDate);
        d.setHours(hours, minutes, 0, 0);
        return d.toISOString();
    }

    function editTime(record: any) {
        editTimeId = record.id;
        timeStart = extractTime(record.start);
        timeEnd = extractTime(record.end);
    }

    function cancelTimeEdit() {
        editTimeId = null;
        timeStart = "";
        timeEnd = "";
    }

    async function updateAppointmentStore() {
        const updatedApp = await pb.collection('appointments').getOne(appointment.id, { expand: 'user,client,drive_record,time_record,tasks,expenditures' });
        const index = orgaStore.appointments?.data.findIndex(a => a.id === appointment.id) ?? -1;
        if (index !== -1 && orgaStore.appointments) orgaStore.appointments.data[index] = updatedApp;
    }

    async function saveTime() {
        isTimeLoading = true;
        try {
            const payload = { 
                start: combineDateAndTime(timeStart), 
                end: combineDateAndTime(timeEnd) 
            };
            if (editTimeId) { await pb.collection('time_records').update(editTimeId, payload); } 
            else {
                const newRecord = await pb.collection('time_records').create(payload);
                const existing = appointment.time_record || [];
                await pb.collection('appointments').update(appointment.id, { time_record: [...existing, newRecord.id] });
            }
            await updateAppointmentStore();
            cancelTimeEdit();
        } catch (err) { console.error(err); alert("Fehler beim Speichern der Zeit."); } finally { isTimeLoading = false; }
    }

    async function deleteTime(id: string) {
        if (!confirm("Wollen Sie diesen Zeiteintrag wirklich löschen?")) return;
        isTimeLoading = true;
        try { await pb.collection('time_records').delete(id); if (editTimeId === id) cancelTimeEdit(); await updateAppointmentStore(); } 
        catch (err) { console.error(err); alert("Fehler beim Löschen."); } finally { isTimeLoading = false; }
    }

    async function toggleTask(taskId: string) {
        const currentTaskIds = tasks.map((t: any) => t.id);
        const newIds = currentTaskIds.includes(taskId) 
            ? currentTaskIds.filter((id: string) => id !== taskId) 
            : [...currentTaskIds, taskId];
        
        try {
            await pb.collection('appointments').update(appointment.id, { tasks: newIds });
            await updateAppointmentStore();
        } catch (err) { console.error(err); alert("Fehler beim Aktualisieren der Leistungen."); }
    }

    function openTaskModal() {
        if (!newTaskTitle.trim()) return;
        newTaskDescription = "";
        taskDialog?.showModal();
    }

    async function createAndLinkTask() {
        isTaskLoading = true;
        try {
            const newTask = await pb.collection('tasks').create({ title: newTaskTitle, description: newTaskDescription });
            const currentTaskIds = tasks.map((t: any) => t.id);
            await pb.collection('appointments').update(appointment.id, { tasks: [...currentTaskIds, newTask.id] });
            await updateAppointmentStore();
            newTaskTitle = "";
            taskDialog?.close();
        } catch (err) { console.error(err); alert("Fehler beim Erstellen der Leistung."); } finally { isTaskLoading = false; }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <!-- svelte-ignore a11y_invalid_attribute -->
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
        <button onclick={() => editModal?.open(appointment)} class="orga-button-ghost shrink-0">
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
                </div>
                
                <div class="mb-6 bg-neutral-50 p-5 rounded-xl border border-neutral-100 shadow-sm">
                    <h3 class="text-sm font-bold text-neutral-800 mb-4">{editTimeId ? 'Zeit bearbeiten' : 'Neue Zeit erfassen'}</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div><label for="timeStart" class="block text-xs font-semibold text-neutral-600 mb-1.5">Startzeit</label><input id="timeStart" type="time" bind:value={timeStart} class="orga-input-clear py-2 text-sm" disabled={isTimeLoading} /></div>
                        <div><label for="timeEnd" class="block text-xs font-semibold text-neutral-600 mb-1.5">Endzeit (Optional)</label><input id="timeEnd" type="time" bind:value={timeEnd} class="orga-input-clear py-2 text-sm" disabled={isTimeLoading} /></div>
                    </div>
                    <div class="flex justify-end gap-3">
                        {#if editTimeId || timeStart || timeEnd}
                            <button type="button" onclick={cancelTimeEdit} class="orga-button-ghost py-2 px-5 text-sm" disabled={isTimeLoading}>Abbrechen</button>
                        {/if}
                        <button type="button" onclick={saveTime} disabled={isTimeLoading || !timeStart} class="orga-button-primary py-2 px-5 text-sm shadow-indigo-600/20">
                            {isTimeLoading ? 'Speichert...' : (editTimeId ? 'Änderungen speichern' : 'Zeit hinzufügen')}
                        </button>
                    </div>
                </div>

                {#if timeRecords.length === 0}
                    <div class="text-center py-6 border-2 border-dashed border-neutral-200 rounded-xl bg-white">
                        <p class="text-neutral-500 font-bold text-sm mb-1">Keine Zeiten erfasst.</p>
                    </div>
                {:else}
                    <div class="space-y-3">
                        {#each timeRecords as record}
                        <div class="flex items-center justify-between p-4 rounded-xl border transition-colors group {editTimeId === record.id ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : 'border-neutral-100 bg-white hover:border-indigo-200'}">
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
                                    <div class="text-right flex flex-col items-end">
                                       <p class="text-indigo-700 font-bold text-lg">{getDuration(record.start, record.end)}</p>
                                       <div class="flex gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onclick={() => editTime(record)} class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">Bearbeiten</button>
                                          <span class="text-neutral-300">|</span>
                                          <button onclick={() => deleteTime(record.id)} class="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors">Löschen</button>
                                       </div>
                                    </div>
                                 </div>
                                 {/each}
                              </div>
                              {/if}
                           </div>
                           
                           <!-- Leistungen / Tätigkeiten -->
                           <div class="orga-card-white p-6 md:p-8">
                               <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-neutral-100 pb-4">
                                   <h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2">
                                       <span class="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 rounded-lg shadow-inner text-sm">📋</span> Leistungen & Tätigkeiten
                                   </h2>
                               </div>
                  
                               <div class="mb-6">
                                   <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Ausgewählte & Häufige Leistungen</p>
                                   <div class="flex flex-wrap gap-2">
                                       {#each orgaStore.tasks?.data || [] as t}
                                           <button 
                                               onclick={() => toggleTask(t.id)}
                                               class="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all {tasks.some((pt: any) => pt.id === t.id) ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm' : 'bg-white border-neutral-200 text-neutral-600 hover:border-amber-200 hover:bg-amber-50'}"
                                           >
                                               {t.title}
                                           </button>
                                       {/each}
                                   </div>
                               </div>
                  
                               <div class="pt-4 border-t border-neutral-100">
                                   <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Neue Leistung im System anlegen</p>
                                   <div class="flex gap-2">
                                       <input type="text" bind:value={newTaskTitle} placeholder="z.B. Fenster putzen" class="orga-input-clear py-2 text-sm" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); openTaskModal(); } }} disabled={isTaskLoading} />
                                       <button type="button" onclick={openTaskModal} disabled={!newTaskTitle.trim() || isTaskLoading} class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 py-2 px-4 text-sm shrink-0">Hinzufügen</button>
                                   </div>
                               </div>
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

    <DriveRecordModal bind:this={driveModal} {appointment} />
    <ExpenditureModal bind:this={expenditureModal} {appointment} />
    <AppointmentModal bind:this={editModal} />

    <!-- Task Description Modal -->
    <dialog bind:this={taskDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-md mx-auto my-auto rounded-3xl">
        <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
            <button aria-label="Schließen" title="Schließen" onclick={() => taskDialog?.close()} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 class="text-xl font-bold text-neutral-900 mb-2">Details zur Leistung</h2>
            <p class="text-sm text-neutral-500 mb-6">Möchten Sie für "{newTaskTitle}" noch eine genaue Beschreibung hinterlegen?</p>
            <form onsubmit={(e) => { e.preventDefault(); createAndLinkTask(); }} class="space-y-4">
                <div>
                    <label for="task-desc" class="block text-sm font-semibold text-neutral-700 mb-1.5">Beschreibung (Optional)</label>
                    <textarea id="task-desc" bind:value={newTaskDescription} rows="3" class="orga-input-clear resize-none text-sm" placeholder="Genaue Tätigkeitsbeschreibung..."></textarea>
                </div>
                <div class="pt-4 flex justify-end gap-3 border-t border-neutral-100 mt-2">
                    <button type="button" onclick={() => taskDialog?.close()} class="orga-button-ghost" disabled={isTaskLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" disabled={isTaskLoading}>{isTaskLoading ? "Speichert..." : "Speichern & Auswählen"}</button>
                </div>
            </form>
        </div>
    </dialog>
{/if}