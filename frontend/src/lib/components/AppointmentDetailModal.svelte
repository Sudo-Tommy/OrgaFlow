<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import DriveRecordModal from "$lib/components/DriveRecordModal.svelte";
    import ExpenditureModal from "$lib/components/ExpenditureModal.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";

    let dialog: HTMLDialogElement;
    let appId = $state<string | null>(null);
    let appointment = $derived(appId ? orgaStore.appointments?.getById(appId) : null);

    let client = $derived(appointment?.expand?.client?.[0] || null);
    let timeRecords = $derived(appointment?.expand?.time_record || []);
    let driveRecords = $derived(appointment?.expand?.drive_record || []);
    let tasks = $derived(appointment?.expand?.tasks || []);
    let expenditures = $derived(appointment?.expand?.expenditures || []);

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

    let totalKm = $derived(driveRecords.reduce((sum: number, r: any) => sum + (r.km || 0), 0));
    let totalExpenditure = $derived(expenditures.reduce((sum: number, e: any) => sum + (e.sum || 0), 0));

    let driveModal: ReturnType<typeof DriveRecordModal> | undefined = $state();
    let expenditureModal: ReturnType<typeof ExpenditureModal> | undefined = $state();
    let editModal: ReturnType<typeof AppointmentModal> | undefined = $state();

    let isTimeLoading = $state(false);
    let editTimeId = $state<string | null>(null);
    let timeStart = $state("");
    let timeEnd = $state("");

    let taskDialog: HTMLDialogElement | undefined = $state();
    let newTaskTitle = $state("");
    let newTaskDescription = $state("");
    let isTaskLoading = $state(false);

    function extractTime(dateString?: string) {
        if (!dateString) return "";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function combineDateAndTime(timeString: string) {
        if (!timeString || !appointment?.appointment) return null;
        const baseDate = new Date(appointment.appointment);
        if (isNaN(baseDate.getTime())) return null;
        const [hours, minutes] = timeString.split(':').map(Number);
        const d = new Date(baseDate);
        d.setHours(hours, minutes, 0, 0);
        return d.toISOString();
    }

    export function open(id: string) {
        appId = id;
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        appId = null;
        editTimeId = null;
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
        if (!appointment) return;
        const updatedApp = await pb.collection('appointments').getOne(appointment.id, { expand: 'user,client,drive_record,time_record,tasks,expenditures' });
        const index = orgaStore.appointments?.data.findIndex(a => a.id === appointment!.id) ?? -1;
        if (index !== -1 && orgaStore.appointments) orgaStore.appointments.data[index] = updatedApp;
    }

    async function saveTime() {
        if (!appointment) return;
        isTimeLoading = true;
        try {
            const payload = { start: combineDateAndTime(timeStart), end: combineDateAndTime(timeEnd) };
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
        if (!appointment) return;
        const currentTaskIds = tasks.map((t: any) => t.id);
        const newIds = currentTaskIds.includes(taskId) ? currentTaskIds.filter((id: string) => id !== taskId) : [...currentTaskIds, taskId];
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
        if (!appointment) return;
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

    async function deleteAppointment() {
        if (!appointment || !confirm("Möchten Sie diesen Termin wirklich löschen?")) return;
        try { await pb.collection('appointments').delete(appointment.id); close(); } catch (err) { alert("Fehler beim Löschen."); }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-5xl mx-auto my-auto rounded-3xl">
    <div class="bg-brand-50 rounded-3xl w-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
        
        <div class="bg-white px-6 py-5 border-b border-neutral-100 flex items-center justify-between shrink-0 sticky top-0 z-20">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-sm">📅</div>
                <div>
                    <h2 class="text-xl font-bold text-neutral-900 flex items-center gap-2">Termin-Details {#if appointment?.is_private}<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">Privat</span>{/if}</h2>
                    <p class="text-xs text-neutral-500 font-medium">
                        {appointment?.appointment ? new Date(appointment.appointment).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''} 
                        {appointment?.appointment ? `um ${new Date(appointment.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                {#if appointment}
                    <button onclick={() => editModal?.open(appointment)} class="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Termin bearbeiten"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                    <button onclick={deleteAppointment} class="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Termin löschen"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                {/if}
                <div class="w-px h-6 bg-neutral-200 mx-1"></div>
                <button aria-label="Schließen" onclick={close} class="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
        </div>

        <div class="p-6 overflow-y-auto custom-scrollbar">
            {#if !appointment}
                <div class="flex justify-center py-12"><div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
            {:else}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 space-y-6">
                     
                     {#if client}
                         <div class="orga-card-white p-5 relative overflow-hidden group">
                             <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-8 -mt-8 z-0"></div>
                             <h3 class="text-sm font-bold text-neutral-900 mb-3 border-b border-neutral-100 pb-2 relative z-10">Zugeordneter Klient</h3>
                             <div class="flex items-center gap-3 relative z-10">
                                 <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shadow-inner">{(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}</div>
                                 <div>
                                     <p class="text-sm font-bold text-neutral-900 leading-tight">{client.name_first} {client.name_last}</p>
                                     <a href="/clients/{client.id}" onclick={close} class="text-indigo-600 hover:text-indigo-800 text-xs font-semibold transition-colors">Akte öffnen &rarr;</a>
                                 </div>
                             </div>
                         </div>
                     {/if}
                     
                        <div class="orga-card-white p-5">
                            <h3 class="text-sm font-bold text-neutral-900 mb-2 border-b border-neutral-100 pb-2">Beschreibung</h3>
                            <p class="text-sm text-neutral-700">{appointment.description || 'Keine Beschreibung vorhanden.'}</p>
                        </div>
                    </div>

                    <div class="lg:col-span-2 space-y-6">
                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="text-indigo-600">⏱️</span> Zeiterfassung</h3></div>
                            <div class="mb-5 bg-neutral-50 p-4 rounded-xl border border-neutral-100 shadow-sm">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                    <div><label for="timeStart" class="block text-xs font-semibold text-neutral-600 mb-1">Startzeit</label><input id="timeStart" type="time" bind:value={timeStart} class="orga-input-clear py-1.5 text-sm" disabled={isTimeLoading} /></div>
                                    <div><label for="timeEnd" class="block text-xs font-semibold text-neutral-600 mb-1">Endzeit</label><input id="timeEnd" type="time" bind:value={timeEnd} class="orga-input-clear py-1.5 text-sm" disabled={isTimeLoading} /></div>
                                </div>
                                <div class="flex justify-end gap-2">
                                    {#if editTimeId || timeStart || timeEnd}<button type="button" onclick={cancelTimeEdit} class="orga-button-ghost py-1.5 px-3 text-xs" disabled={isTimeLoading}>Abbrechen</button>{/if}
                                    <button type="button" onclick={saveTime} disabled={isTimeLoading || !timeStart} class="orga-button-primary py-1.5 px-4 text-xs shadow-indigo-600/20">{isTimeLoading ? 'Speichert...' : (editTimeId ? 'Speichern' : 'Zeit hinzufügen')}</button>
                                </div>
                            </div>
                            {#if timeRecords.length === 0}<p class="text-center text-xs text-neutral-400 italic py-2">Keine Zeiten erfasst.</p>{:else}
                                <div class="space-y-2">
                                    {#each timeRecords as record}
                                    <div class="flex items-center justify-between p-3 rounded-lg border transition-colors group {editTimeId === record.id ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : 'border-neutral-100 bg-white hover:border-indigo-200'}">
                                        <div><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> {record.start ? new Date(record.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} - {record.end ? new Date(record.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '...'} Uhr</p></div>
                                        <div class="text-right flex items-center gap-3"><p class="text-indigo-700 font-bold text-sm">{getDuration(record.start, record.end)}</p><div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onclick={() => editTime(record)} class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold" title="Bearbeiten">✎</button><button onclick={() => deleteTime(record.id)} class="text-xs text-rose-500 hover:text-rose-700 font-semibold" title="Löschen">✕</button></div></div>
                                    </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="text-amber-500">📋</span> Leistungen</h3></div>
                            <div class="flex flex-wrap gap-1.5 mb-4">
                                {#each orgaStore.tasks?.data || [] as t}
                                    <button onclick={() => toggleTask(t.id)} class="px-2.5 py-1 rounded-md text-xs font-semibold border transition-all {tasks.some((pt: any) => pt.id === t.id) ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm' : 'bg-white border-neutral-200 text-neutral-600 hover:border-amber-200 hover:bg-amber-50'}">{t.title}</button>
                                {/each}
                            </div>
                            <div class="flex gap-2"><input type="text" bind:value={newTaskTitle} placeholder="Neue Leistung anlegen..." class="orga-input-clear py-1.5 text-xs flex-1" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); openTaskModal(); } }} disabled={isTaskLoading} /><button type="button" onclick={openTaskModal} disabled={!newTaskTitle.trim() || isTaskLoading} class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 py-1.5 px-3 text-xs shrink-0">+</button></div>
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="text-emerald-500">🚗</span> Fahrten</h3><button onclick={() => driveModal?.open()} class="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors">+ Hinzufügen</button></div>
                            {#if driveRecords.length === 0}<p class="text-center text-xs text-neutral-400 italic py-2">Keine Fahrten hinterlegt.</p>{:else}
                                <div class="space-y-2 mb-3">{#each driveRecords as drive}<div class="flex items-center justify-between p-3 rounded-lg border border-neutral-100 bg-neutral-50 hover:border-emerald-200 transition-colors group"><div><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {drive.type || 'Fahrt'}</p>{#if drive.lump_sum}<p class="text-xs text-neutral-500 pl-3.5">Pauschale: {drive.lump_sum} €</p>{/if}</div><div class="text-right flex items-center gap-3"><p class="text-emerald-700 font-bold text-sm">{drive.km || 0} km</p><button onclick={() => driveModal?.open(drive)} class="text-xs text-neutral-400 hover:text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity" title="Bearbeiten">✎</button></div></div>{/each}</div>
                                <div class="bg-emerald-50 rounded-lg p-3 flex justify-between items-center"><p class="text-xs font-bold text-emerald-900">Gesamte Strecke</p><p class="text-sm font-bold text-emerald-700">{totalKm} km</p></div>
                            {/if}
                        </div>

                        <div class="orga-card-white p-5">
                            <div class="flex items-center justify-between mb-4 border-b border-neutral-100 pb-2"><h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="text-rose-500">💶</span> Sonderausgaben</h3><button onclick={() => expenditureModal?.open()} class="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors">+ Hinzufügen</button></div>
                            {#if expenditures.length === 0}<p class="text-center text-xs text-neutral-400 italic py-2">Keine Ausgaben hinterlegt.</p>{:else}
                                <div class="space-y-2 mb-3">{#each expenditures as exp}<div class="flex items-center justify-between p-3 rounded-lg border border-neutral-100 bg-neutral-50 hover:border-rose-200 transition-colors group"><p class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> {exp.titel || 'Ausgabe'}</p><div class="text-right flex items-center gap-3"><p class="text-rose-700 font-bold text-sm">{exp.sum ? exp.sum.toFixed(2).replace('.', ',') : '0,00'} €</p><button onclick={() => expenditureModal?.open(exp)} class="text-xs text-neutral-400 hover:text-rose-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity" title="Bearbeiten">✎</button></div></div>{/each}</div>
                                <div class="bg-rose-50 rounded-lg p-3 flex justify-between items-center"><p class="text-xs font-bold text-rose-900">Gesamtsumme</p><p class="text-sm font-bold text-rose-700">{totalExpenditure.toFixed(2).replace('.', ',')} €</p></div>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
    
    <DriveRecordModal bind:this={driveModal} {appointment} />
    <ExpenditureModal bind:this={expenditureModal} {appointment} />
    <AppointmentModal bind:this={editModal} />
    
    <dialog bind:this={taskDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl">
        <div class="bg-white rounded-3xl p-6 w-full relative">
            <button aria-label="Schließen" onclick={() => taskDialog?.close()} class="absolute top-4 right-4 w-8 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">✕</button>
            <h2 class="text-lg font-bold text-neutral-900 mb-2">Details zur Leistung</h2>
            <p class="text-xs text-neutral-500 mb-4">"{newTaskTitle}" genauer beschreiben?</p>
            <form onsubmit={(e) => { e.preventDefault(); createAndLinkTask(); }} class="space-y-3">
                <textarea bind:value={newTaskDescription} rows="3" class="orga-input-clear resize-none text-sm" placeholder="Optionale Beschreibung..."></textarea>
                <div class="flex justify-end gap-2 mt-2">
                    <button type="button" onclick={() => taskDialog?.close()} class="orga-button-ghost py-1.5 px-3 text-xs" disabled={isTaskLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 py-1.5 px-4 text-xs" disabled={isTaskLoading}>{isTaskLoading ? "Speichert..." : "Speichern"}</button>
                </div>
            </form>
        </div>
    </dialog>
</dialog>