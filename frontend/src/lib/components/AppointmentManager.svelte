<script lang="ts">
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { fade, slide } from 'svelte/transition';
	import { untrack } from 'svelte';

	import TimeRecord from '$lib/components/TimeRecord.svelte';

	// --- Interfaces ---
	export interface Appointment {
		id?: string;
		user: string;
		is_private: boolean;
		appointment: string; 
		title: string;
		description: string;
		client: string | string[]; 
		time_record?: string[];    
		drive_record?: string[];   
		expand?: any; 
	}

	export interface ClientData { id: string; name_first: string; name_last: string; }
	export interface UserData { id: string; name_first: string; name_last: string; }
	
	export interface DriveRecord { id: string; km: number; type: string; appointment: string; }
	export interface ExpenseRecord { id: string; title: string; amount_gross: number; transaction_type: string; }

	// --- Props ---
	let {
		isOpen, appointment = null, defaultDate = null, clients = [], adminUsers = [],
		currentUser, isAdmin = false, onClosed, onSaved
	} = $props<{
		isOpen: boolean; appointment?: Appointment | null; defaultDate?: Date | null;
		clients: ClientData[]; adminUsers?: UserData[]; currentUser: any; isAdmin?: boolean;
		onClosed: () => void; onSaved: () => void;
	}>();

	// --- State ---
	let formData = $state<Appointment | null>(null);
	let isSaving = $state(false);
	let activeTab = $state<'details' | 'times' | 'drives'>('details');

	// State: Zusatzdaten (Fahrten & Ausgaben)
	let driveRecords = $state<DriveRecord[]>([]);
	let expenses = $state<ExpenseRecord[]>([]);
	
	let newDrive = $state({ km: '', type: 'Anfahrt' });
	let newExpense = $state({ title: '', amount: '' });
	let isSavingAncillary = $state(false);

	// --- Synchronisation beim Öffnen ---
	$effect(() => {
		if (isOpen) {
			untrack(() => {
				activeTab = 'details';
				driveRecords = [];
				expenses = [];
				
				if (appointment) {
					const cloned = JSON.parse(JSON.stringify(appointment));
					const dt = new Date(cloned.appointment);
					dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
					cloned.appointment = dt.toISOString().slice(0, 16);
					
					if (Array.isArray(cloned.client)) cloned.client = cloned.client.length > 0 ? cloned.client[0] : '';
					formData = cloned;
					loadAncillaryData(cloned.id);
				} else {
					const dt = defaultDate ? new Date(defaultDate) : new Date();
					dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
					formData = {
						user: currentUser?.id || '', is_private: false, appointment: dt.toISOString().slice(0, 16),
						title: '', description: '', client: '' 
					};
				}
			});
		}
	});

	// --- Intelligente Klienten-Erkennung ---
	const suggestedClients = $derived.by(() => {
		if (!formData?.description) return [];
		const descLower = formData.description.toLowerCase();
		return clients.filter((c: ClientData) => {
			const hasLastName = c.name_last.length > 2 && descLower.includes(c.name_last.toLowerCase());
			const hasFirstName = c.name_first.length > 2 && descLower.includes(c.name_first.toLowerCase());
			return (hasLastName || hasFirstName) && formData!.client !== c.id;
		});
	});

	async function assignClient(client: ClientData) {
		if (!formData) return;
		formData.client = client.id;
		formData.description = formData.description.replace(/\[(?:Import(?:ierter)? Klient)[:\-\s]*([^\]]+)\]/ig, '').trim();
		await saveAppointment();
		toastService.success(`${client.name_first} ${client.name_last} wurde zugewiesen.`);
	}

	// --- CRUD Aktionen Termin ---
	async function saveAppointment(e?: SubmitEvent) {
		if (e) e.preventDefault();
		if (!formData || isSaving) return;
		isSaving = true;
		
		try {
			const payload: any = { ...formData };
			payload.appointment = new Date(payload.appointment).toISOString();
			if (typeof formData.client === 'string') payload.client = formData.client ? [formData.client] : [];

			if (payload.id) {
				await pb.collection('appointments').update(payload.id, payload);
				toastService.success('Termin aktualisiert.');
				if (e) onClosed(); 
			} else {
				const record = await pb.collection('appointments').create(payload);
				formData.id = record.id; 
				toastService.success('Termin erstellt. Sie können nun Leistungen erfassen.');
				loadAncillaryData(record.id);
			}
			onSaved();
		} catch (error) {
			console.error(error);
			toastService.error('Fehler beim Speichern des Termins.');
		} finally {
			isSaving = false;
		}
	}

	async function deleteAppointment() {
		if (!formData?.id || !confirm('Diesen Termin wirklich unwiderruflich löschen?')) return;
		try {
			await pb.collection('appointments').delete(formData.id);
			toastService.success('Termin gelöscht.');
			onSaved();
			onClosed();
		} catch (error) {
			toastService.error('Fehler beim Löschen.');
		}
	}

	// --- CRUD Aktionen Zusatzdaten (Fahrten & Ausgaben) ---
	async function loadAncillaryData(appId: string) {
		try {
			const [drives, acc] = await Promise.all([
				pb.collection('drive_records').getFullList<DriveRecord>({ filter: `appointment="${appId}"` }),
				pb.collection('accounting').getFullList<ExpenseRecord>({ filter: `transaction_type="Ausgabe" && notes~"APP_ID:${appId}"` })
			]);
			driveRecords = drives;
			expenses = acc;
		} catch (error) { console.error('Zusatzdaten Fehler:', error); }
	}

	async function addDrive(e: SubmitEvent) {
		e.preventDefault();
		const km = parseFloat(newDrive.km);
		if (!formData?.id || isNaN(km) || km <= 0) return toastService.error('Bitte gültige Kilometer angeben.');
		
		isSavingAncillary = true;
		try {
			const res = await pb.collection('drive_records').create<DriveRecord>({
				appointment: formData.id, km: km, type: newDrive.type
			});
			driveRecords = [...driveRecords, res];
			newDrive.km = '';
			toastService.success('Fahrtstrecke erfasst.');
		} catch (e) { toastService.error('Fehler beim Speichern der Fahrt.'); }
		finally { isSavingAncillary = false; }
	}

	async function deleteDrive(id: string) {
		try {
			await pb.collection('drive_records').delete(id);
			driveRecords = driveRecords.filter(d => d.id !== id);
			toastService.success('Fahrt gelöscht.');
		} catch (e) { toastService.error('Fehler beim Löschen.'); }
	}

	async function addExpense(e: SubmitEvent) {
		e.preventDefault();
		const amount = parseFloat(newExpense.amount.replace(',', '.'));
		if (!formData?.id || !newExpense.title.trim() || isNaN(amount) || amount <= 0) return toastService.error('Bitte Titel und Betrag angeben.');
		
		isSavingAncillary = true;
		try {
			const res = await pb.collection('accounting').create<ExpenseRecord>({
				title: newExpense.title.trim(),
				transaction_type: 'Ausgabe',
				amount_gross: amount,
				amount_net: amount, 
				tax_rate: "0",
				transaction_date: formData.appointment,
				category: 'Nebenausgaben',
				payment_method: 'Bar',
				status: 'Bezahlt',
				createdby: currentUser.id,
				notes: `APP_ID:${formData.id}` 
			});
			expenses = [...expenses, res];
			newExpense = { title: '', amount: '' };
			toastService.success('Ausgabe gebucht.');
		} catch (e) { toastService.error('Fehler bei der Buchung.'); }
		finally { isSavingAncillary = false; }
	}

	async function deleteExpense(id: string) {
		if(!confirm('Ausgabe wirklich stornieren?')) return;
		try {
			await pb.collection('accounting').delete(id);
			expenses = expenses.filter(ex => ex.id !== id);
			toastService.success('Ausgabe gelöscht.');
		} catch (e) { toastService.error('Fehler beim Löschen.'); }
	}
</script>

{#if isOpen && formData}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" transition:fade={{duration: 200}}>
		
		<button 
			type="button" aria-label="Modal schließen"
			class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm cursor-default border-none outline-none focus:outline-none"
			onclick={onClosed} onkeydown={(e) => { if (e.key === 'Escape') onClosed(); }}
		></button>

		<div 
			class="relative bg-white border border-neutral-200 w-full max-w-2xl mt-12 sm:mt-0 h-[90vh] sm:h-auto sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" 
			transition:slide={{duration: 300, axis: 'y'}} role="dialog" aria-modal="true"
		>
			<div class="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 left-0">
				<div class="w-12 h-1.5 bg-neutral-300 rounded-full"></div>
			</div>

			<header class="pt-8 sm:pt-6 md:pt-8 p-4 sm:p-6 md:p-8 border-b border-neutral-100 flex justify-between items-center bg-white shrink-0">
				<div>
					<h2 class="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2 sm:gap-3">
						{formData.id ? 'Termin-Management' : 'Neuer Termin'}
						{#if formData.is_private}
							<span class="text-[10px] sm:text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 sm:py-1 rounded-md font-bold uppercase tracking-widest">Privat</span>
						{/if}
					</h2>
					{#if formData.id} <p class="text-[10px] sm:text-xs text-neutral-400 mt-1 font-mono">ID: {formData.id}</p> {/if}
				</div>
				<button type="button" aria-label="Schließen" onclick={onClosed} class="p-2 sm:p-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
				</button>
			</header>

			<div class="flex border-b border-neutral-100 bg-neutral-50/50 px-4 sm:px-6 md:px-8 pt-2 gap-6 sm:gap-8 overflow-x-auto custom-scrollbar shrink-0 scroll-smooth">
				<button type="button" onclick={() => activeTab = 'details'} class="pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap {activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}">
					Details & Planung
				</button>
				<button type="button" onclick={() => activeTab = 'times'} class="pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap {activeTab === 'times' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}">
					Zeiten & Tätigkeiten
				</button>
				<button type="button" onclick={() => activeTab = 'drives'} class="pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 {activeTab === 'drives' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}">
					Fahrt & Ausgaben
					{#if driveRecords.length > 0 || expenses.length > 0}
						<span class="bg-indigo-100 text-indigo-700 py-0.5 px-1.5 rounded-full text-[9px]">{driveRecords.length + expenses.length}</span>
					{/if}
				</button>
			</div>
			
			<div class="flex flex-col flex-1 overflow-hidden bg-neutral-50/30">
				<div class="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1 pb-10">
					
					{#if activeTab === 'details'}
						<div in:fade={{duration: 150}} class="space-y-4 sm:space-y-6">
							<div class="bg-white p-4 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 sm:space-y-5">
								<div>
									<label for="a_title" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Titel / Betreff *</label>
									<input id="a_title" type="text" bind:value={formData.title} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" placeholder="z.B. Termin Max" required />
								</div>
								
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
									<div>
										<label for="a_date" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Datum & Uhrzeit *</label>
										<input id="a_date" type="datetime-local" bind:value={formData.appointment} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" required />
									</div>
									<div>
										<label for="a_client" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Klient</label>
										<select id="a_client" bind:value={formData.client as string} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2">
											<option value="">-- Kein Klient --</option>
											{#each clients as client} <option value={client.id}>{client.name_first} {client.name_last}</option> {/each}
										</select>
									</div>
								</div>

								{#if isAdmin}
									<div class="bg-indigo-50/50 p-3 sm:p-4 rounded-xl border border-indigo-100 mt-2">
										<label for="a_user" class="block text-[10px] sm:text-xs font-extrabold text-indigo-800 uppercase tracking-widest mb-1.5">Mitarbeiter Zuweisen</label>
										<select id="a_user" bind:value={formData.user} class="orga-input-clear bg-white border-indigo-200 text-sm py-2.5 sm:py-2">
											{#each adminUsers as u} <option value={u.id}>{u.name_first} {u.name_last}</option> {/each}
										</select>
									</div>
								{/if}
							</div>
							
							<div class="bg-white p-4 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm">
								<label for="a_desc" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Notizen</label>
								<textarea id="a_desc" bind:value={formData.description} rows="3" class="orga-input-clear bg-neutral-50 resize-y text-sm sm:text-base" placeholder="Termindetails..."></textarea>
								
								{#if suggestedClients.length > 0}
									<div class="bg-indigo-50 border border-indigo-100 p-3 sm:p-4 rounded-xl mt-3 sm:mt-4 flex items-start gap-2.5" in:slide>
										<div class="mt-0.5 text-indigo-500 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
										<div>
											<p class="text-[10px] sm:text-xs font-extrabold text-indigo-900 mb-1.5 sm:mb-2 uppercase tracking-tight">Erkannte Klienten</p>
											<div class="flex flex-wrap gap-2">
												{#each suggestedClients as sc}
													<button type="button" onclick={() => assignClient(sc)} class="text-[11px] sm:text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-2.5 sm:px-3 rounded-lg transition shadow-sm focus:outline-none">
														{sc.name_first} {sc.name_last}
													</button>
												{/each}
											</div>
										</div>
									</div>
								{/if}
							</div>
							
							<div class="bg-white border border-neutral-200 p-4 sm:p-5 rounded-2xl flex items-start gap-3 sm:gap-4 cursor-pointer hover:bg-neutral-50 transition-colors shadow-sm">
								<div class="flex items-center h-5 mt-0.5">
									<input id="a_priv" type="checkbox" bind:checked={formData.is_private} class="h-4 w-4 sm:h-5 sm:w-5 rounded-md border-neutral-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer">
								</div>
								<label for="a_priv" class="flex-1 cursor-pointer">
									<span class="block text-sm font-bold text-neutral-900">Privater Termin / Nicht abrechenbar</span>
									<span class="block text-[11px] sm:text-xs text-neutral-500 mt-0.5 font-medium leading-snug">Wird nicht in offiziellen Rechnungen berücksichtigt.</span>
								</label>
							</div>
						</div>
					{/if}

					{#if activeTab === 'times'}
						<div in:fade={{duration: 150}}>
							{#if formData.id}
								<TimeRecord appointmentId={formData.id} isPrivate={formData.is_private} defaultStart={formData.appointment} />
							{:else}
								<div class="bg-indigo-50/50 border border-indigo-100 border-dashed rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center mt-2">
									<div class="bg-white p-2.5 sm:p-3 rounded-full shadow-sm mb-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-8 sm:w-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
									<h3 class="text-xs sm:text-sm font-extrabold text-indigo-900 uppercase tracking-widest">Gesperrt</h3>
									<p class="text-[11px] sm:text-xs text-indigo-700/80 mt-1.5 max-w-xs mb-5 leading-relaxed">Bitte speichern Sie den Termin zunächst als Entwurf ab.</p>
									<button type="button" onclick={saveAppointment} class="orga-button-primary text-[11px] sm:text-xs! py-2! px-5! shadow-sm">Speichern & Freischalten</button>
								</div>
							{/if}
						</div>
					{/if}

					{#if activeTab === 'drives'}
						<div in:fade={{duration: 150}} class="space-y-4 sm:space-y-8">
							{#if !formData.id}
								<div class="bg-indigo-50/50 border border-indigo-100 border-dashed rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center mt-2">
									<div class="bg-white p-2.5 sm:p-3 rounded-full shadow-sm mb-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-8 sm:w-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
									<h3 class="text-xs sm:text-sm font-extrabold text-indigo-900 uppercase tracking-widest">Gesperrt</h3>
									<p class="text-[11px] sm:text-xs text-indigo-700/80 mt-1.5 max-w-xs mb-5 leading-relaxed">Bitte speichern Sie den Termin zunächst ab, um Fahrten zu erfassen.</p>
									<button type="button" onclick={saveAppointment} class="orga-button-primary text-[11px] sm:text-xs! py-2! px-5! shadow-sm">Speichern & Freischalten</button>
								</div>
							{:else}
								
								<div class="bg-white border border-neutral-200 rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm">
									<h3 class="text-[11px] sm:text-xs font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
										Fahrtstrecke (KM)
									</h3>
									
									<div class="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
										{#each driveRecords as drive}
											<div class="flex items-center justify-between bg-neutral-50 border border-neutral-100 p-2.5 sm:p-3 rounded-2xl group">
												<div class="flex items-center gap-2 sm:gap-3">
													<div class="bg-white px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-neutral-200 text-xs sm:text-sm font-black text-neutral-800 shadow-sm">{drive.km} km</div>
													<span class="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest truncate">{drive.type}</span>
												</div>
												<button type="button" aria-label="Löschen" onclick={() => deleteDrive(drive.id)} class="p-1.5 text-neutral-300 hover:text-red-500 transition-colors focus:outline-none">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
												</button>
											</div>
										{/each}
										{#if driveRecords.length === 0}
											<p class="text-[11px] sm:text-xs text-neutral-400 italic text-center py-1 sm:py-2">Noch keine Fahrten erfasst.</p>
										{/if}
									</div>

									<form onsubmit={addDrive} class="flex gap-2 items-center bg-indigo-50/50 p-2 sm:p-3 rounded-2xl border border-indigo-100">
										<input type="number" step="0.1" bind:value={newDrive.km} placeholder="KM" class="orga-input-clear bg-white w-16 sm:w-24 text-center font-bold text-sm" required />
										<select bind:value={newDrive.type} class="orga-input-clear bg-white flex-1 text-[11px] sm:text-xs! px-2!">
											<option>Anfahrt</option>
											<option>Auftragsfahrt</option>
										</select>
										<button type="submit" disabled={isSavingAncillary} aria-label="Speichern" class="bg-indigo-600 hover:bg-indigo-700 text-white p-2 sm:p-2.5 rounded-xl shadow-sm transition-colors shrink-0 disabled:opacity-50">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
										</button>
									</form>
								</div>

								<div class="bg-white border border-neutral-200 rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm">
									<h3 class="text-[11px] sm:text-xs font-extrabold text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
										Auslagen & Spesen
									</h3>
									
									<div class="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
										{#each expenses as exp}
											<div class="flex items-center justify-between bg-neutral-50 border border-neutral-100 p-2.5 sm:p-3 rounded-2xl group">
												<div class="flex items-center gap-2 sm:gap-3">
													<div class="bg-white px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-emerald-200 text-xs sm:text-sm font-black text-emerald-700 shadow-sm">{exp.amount_gross.toFixed(2)} €</div>
													<span class="text-[10px] sm:text-xs font-bold text-neutral-600 truncate max-w-[100px] sm:max-w-xs">{exp.title}</span>
												</div>
												<button type="button" aria-label="Löschen" onclick={() => deleteExpense(exp.id)} class="p-1.5 text-neutral-300 hover:text-red-500 transition-colors focus:outline-none">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
												</button>
											</div>
										{/each}
										{#if expenses.length === 0}
											<p class="text-[11px] sm:text-xs text-neutral-400 italic text-center py-1 sm:py-2">Keine Ausgaben erfasst.</p>
										{/if}
									</div>

									<form onsubmit={addExpense} class="flex gap-2 items-center bg-emerald-50/50 p-2 sm:p-3 rounded-2xl border border-emerald-100">
										<input type="text" bind:value={newExpense.title} placeholder="Zweck..." class="orga-input-clear bg-white flex-1 text-sm! px-3!" required />
										<div class="relative w-16 sm:w-20 shrink-0">
											<input type="text" bind:value={newExpense.amount} placeholder="0,00" class="orga-input-clear bg-white w-full text-right pr-5 sm:pr-6 font-bold text-sm!" required />
											<span class="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold text-neutral-400">€</span>
										</div>
										<button type="submit" disabled={isSavingAncillary} aria-label="Buchen" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 sm:p-2.5 rounded-xl shadow-sm transition-colors shrink-0 disabled:opacity-50">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
										</button>
									</form>
								</div>
							{/if}
						</div>
					{/if}
				</div>
				
				<footer class="p-4 sm:p-6 md:p-8 border-t border-neutral-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-6 sm:pb-8 md:pb-8">
					<div class="w-full sm:w-auto">
						{#if formData.id}
							<button type="button" aria-label="Termin löschen" onclick={deleteAppointment} class="w-full sm:w-auto orga-button-danger py-3! sm:py-2.5! px-6! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold">
								Löschen
							</button>
						{/if}
					</div>
					<div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
						<button type="button" aria-label="Abbrechen" onclick={onClosed} class="w-full sm:w-auto orga-button-ghost py-3! sm:py-2.5! px-6! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold">
							Schließen
						</button>
						{#if activeTab === 'details'}
							<button type="button" onclick={(e) => saveAppointment(e)} disabled={isSaving} aria-label="Speichern" class="w-full sm:w-auto orga-button-primary py-3! sm:py-2.5! px-8! sm:px-10! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold shadow-lg shadow-indigo-600/20">
								{#if isSaving}
									<div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
									Speichert...
								{:else}
									Termin Speichern
								{/if}
							</button>
						{/if}
					</div>
				</footer>
			</div>
		</div>
	</div>
{/if}