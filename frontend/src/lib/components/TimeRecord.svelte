<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';

	// --- Interfaces ---
	export interface WorkActivity {
		id: string;
		title: string;
		description: string;
	}

	export interface TimeRecordData {
		id?: string;
		appointment: string;
		start: string;
		end: string;
		work: string[]; 
	}

	// --- Props ---
	let {
		appointmentId = '',
		isPrivate = false,
		defaultStart = ''
	} = $props<{
		appointmentId?: string;
		isPrivate?: boolean;
		defaultStart?: string;
	}>();

	// --- State ---
	let isLoading = $state(true);
	let isSaving = $state(false);
	
	let activities = $state.raw<WorkActivity[]>([]);
	let newActivityTitle = $state('');
	let isCreatingActivity = $state(false);
	
	// Separate States nur für die Uhrzeit (HH:mm)
	let timeStart = $state('');
	let timeEnd = $state('');

	let record = $state<TimeRecordData>({
		appointment: '',
		start: '',
		end: '',
		work: []
	});

	// Hilfsfunktion: Extrahiert die lokale Uhrzeit als "HH:mm" aus einem Date-Objekt
	function getTimeString(dateObj: Date) {
		if (isNaN(dateObj.getTime())) return '';
		return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
	}

	// Reagiert auf ID-Änderungen absolut reaktiv
	$effect(() => {
		if (appointmentId && record.appointment !== appointmentId) {
			record.appointment = appointmentId;
			loadRecord();
		}
	});

	onMount(async () => {
		if (!isPrivate && appointmentId) {
			await Promise.all([loadActivities(), loadRecord()]);
		} else if (!appointmentId) {
			await loadActivities();
		}
		isLoading = false;
	});

	async function loadActivities() {
		try {
			activities = await pb.collection('work_activities').getFullList<WorkActivity>({ sort: 'title' });
		} catch (error) {
			console.error('Fehler beim Laden der Tätigkeiten:', error);
		}
	}

	async function loadRecord() {
		if (!appointmentId) return;
		try {
			const existing = await pb.collection('time_records').getFirstListItem<TimeRecordData>(`appointment="${appointmentId}"`);
			if (existing) {
				record = {
					id: existing.id,
					appointment: existing.appointment,
					start: existing.start,
					end: existing.end,
					work: existing.work || []
				};
				// Lade existierende Zeiten in die Inputs
				timeStart = getTimeString(new Date(existing.start));
				timeEnd = getTimeString(new Date(existing.end));
			}
		} catch (e: any) {
			if (e.status === 404) {
				// Kein Eintrag vorhanden: Nutze die Startzeit des Termins
				const dStart = new Date(defaultStart);
				timeStart = getTimeString(dStart);
				
				// Standard-Dauer: 1 Stunde
				const dEnd = new Date(dStart);
				dEnd.setHours(dEnd.getHours() + 1); 
				timeEnd = getTimeString(dEnd);
			}
		}
	}

	function toggleActivity(id: string) {
		if (record.work.includes(id)) {
			record.work = record.work.filter(w => w !== id);
		} else {
			if (record.work.length < 10) {
				record.work = [...record.work, id];
			} else {
				toastService.error('Sie können maximal 10 Tätigkeiten pro Termin erfassen.');
			}
		}
	}

	// --- INLINE CRUD FÜR TÄTIGKEITEN ---
	async function createActivity(e: SubmitEvent) {
		e.preventDefault();
		const title = newActivityTitle.trim();
		if (!title || isCreatingActivity) return;
		isCreatingActivity = true;

		try {
			const act = await pb.collection('work_activities').create<WorkActivity>({ title });
			activities = [...activities, act];
			
			// Die neue Tätigkeit sofort für diesen Termin auswählen
			record.work = [...record.work, act.id]; 
			
			newActivityTitle = '';
			toastService.success('Neue Tätigkeit im System angelegt.');
		} catch (error) {
			toastService.error('Fehler beim Anlegen der Tätigkeit.');
		} finally {
			isCreatingActivity = false;
		}
	}

	async function deleteActivityDB(e: MouseEvent, id: string) {
		e.stopPropagation(); // Verhindert, dass der Button darunter (toggleActivity) geklickt wird
		if (!confirm('Möchten Sie diese Tätigkeit wirklich komplett aus dem System löschen? (Sie wird auch aus alten Zeiterfassungen entfernt)')) return;
		
		try {
			await pb.collection('work_activities').delete(id);
			activities = activities.filter(a => a.id !== id);
			record.work = record.work.filter(w => w !== id); // Aus aktueller Auswahl entfernen
			toastService.success('Tätigkeit aus dem System gelöscht.');
		} catch (error) {
			toastService.error('Fehler beim Löschen der Tätigkeit.');
		}
	}

	// --- ZEITERFASSUNG SPEICHERN ---
	async function saveRecord() {
		if (isSaving || isPrivate || !appointmentId) return;
		if (!timeStart || !timeEnd) {
			toastService.error('Bitte Start- und Endzeit angeben.');
			return;
		}
		isSaving = true;

		try {
			// Datum aus dem Termin extrahieren und mit den gewählten Zeiten kombinieren
			const baseDate = defaultStart ? new Date(defaultStart) : new Date();
			
			const startDt = new Date(baseDate);
			const [sH, sM] = timeStart.split(':').map(Number);
			startDt.setHours(sH, sM, 0, 0);

			const endDt = new Date(baseDate);
			const [eH, eM] = timeEnd.split(':').map(Number);
			endDt.setHours(eH, eM, 0, 0);

			const payload = {
				appointment: appointmentId,
				start: startDt.toISOString(),
				end: endDt.toISOString(),
				work: record.work
			};

			if (record.id) {
				await pb.collection('time_records').update(record.id, payload);
				toastService.success('Zeiterfassung erfolgreich aktualisiert.');
			} else {
				const created = await pb.collection('time_records').create(payload);
				record.id = created.id;
				toastService.success('Zeiterfassung gespeichert.');
			}
		} catch (error) {
			console.error('Save Error:', error);
			toastService.error('Fehler beim Speichern der Zeiterfassung.');
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="bg-neutral-50/50 border border-neutral-200 p-5 md:p-6 rounded-2xl">
	<h3 class="text-sm font-extrabold text-indigo-600 uppercase tracking-widest mb-5 flex items-center gap-2">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
		Zeiterfassung & Tätigkeiten
	</h3>

	{#if isLoading}
		<div class="flex justify-center p-6">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
		</div>
	{:else if isPrivate}
		<div class="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center shadow-sm">
			<p class="text-sm text-emerald-700 font-medium">Dies ist ein privater Termin. Für private Einträge ist keine Zeiterfassung vorgesehen.</p>
		</div>
	{:else if !appointmentId}
		<div class="bg-amber-50 border border-amber-100 p-4 rounded-xl text-center shadow-sm">
			<p class="text-sm text-amber-700 font-medium">Bitte speichern Sie diesen Termin zuerst, bevor Sie Zeiten oder Tätigkeiten erfassen.</p>
		</div>
	{:else}
		<div class="space-y-6">
			
			<div class="grid grid-cols-2 gap-5">
				<div>
					<label for="tr_start" class="block text-xs font-bold text-neutral-500 mb-1.5">Startzeit</label>
					<input id="tr_start" type="time" bind:value={timeStart} class="orga-input-clear py-2.5! bg-white" required />
				</div>
				<div>
					<label for="tr_end" class="block text-xs font-bold text-neutral-500 mb-1.5">Endzeit</label>
					<input id="tr_end" type="time" bind:value={timeEnd} class="orga-input-clear py-2.5! bg-white" required />
				</div>
			</div>

			<div role="group" aria-labelledby="activity-heading">
				<span id="activity-heading" class="block text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-3">Ausgeführte Tätigkeiten wählen</span>
				
				<div class="flex flex-wrap gap-2.5 items-center pt-1">
					{#each activities as act}
						{@const isSelected = record.work.includes(act.id)}
						<div class="relative group">
							<button 
								type="button" 
								onclick={() => toggleActivity(act.id)}
								title={act.description || act.title}
								class="relative px-4 py-2 rounded-xl text-xs font-extrabold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 
								{isSelected 
									? 'bg-indigo-600 text-white shadow-md border-transparent' 
									: 'bg-white text-neutral-600 border border-neutral-200 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/30 shadow-sm'}"
							>
								{act.title}
							</button>

							<button 
								type="button"
								onclick={(e) => deleteActivityDB(e, act.id)}
								class="absolute -top-2 -left-2 bg-white text-red-500 border border-red-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm hover:bg-red-50 hover:border-red-400 transition-all z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
								title="Tätigkeit aus dem System löschen"
								aria-label="Tätigkeit löschen"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" /></svg>
							</button>
						</div>
					{/each}
				</div>

				<form onsubmit={createActivity} class="flex items-center gap-2 mt-4 w-full">
					<input 
						type="text" 
						bind:value={newActivityTitle} 
						placeholder="Neue Tätigkeit anlegen..." 
						aria-label="Neue Tätigkeit"
						class="orga-input-clear py-2! px-3.5! text-sm! w-full bg-white" 
					/>
					<button 
						type="submit" 
						disabled={isCreatingActivity || !newActivityTitle.trim()} 
						aria-label="Tätigkeit hinzufügen"
						class="bg-white border border-neutral-200 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-600 rounded-xl h-9.5 w-12 flex items-center justify-center font-bold transition-colors disabled:opacity-50 shrink-0 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
					</button>
				</form>
			</div>

			<div class="flex justify-end pt-5 border-t border-neutral-200 mt-2">
				<button 
					type="button" 
					onclick={saveRecord} 
					disabled={isSaving || !timeStart || !timeEnd}
					class="w-full sm:w-auto py-2.5! px-6! text-xs! font-extrabold uppercase tracking-widest transition-all focus:outline-none shadow-sm
					{isSaving || !timeStart || !timeEnd 
						? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200 rounded-xl' 
						: 'orga-button-primary'}"
				>
					{#if isSaving}
						<div class="flex items-center justify-center">
							<div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
							Speichert...
						</div>
					{:else}
						{record.id ? 'Zeiten aktualisieren' : 'Zeiten speichern'}
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>