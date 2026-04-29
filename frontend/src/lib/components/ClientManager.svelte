<script lang="ts">
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { fade, slide } from 'svelte/transition';
	import { untrack } from 'svelte';
	
	// Importieren des AppointmentManagers für die Inline-Terminbearbeitung
	import AppointmentManager from '$lib/components/AppointmentManager.svelte';

	// --- Interfaces (Aktualisiert nach pb_schema_01) ---
	interface ClientData {
		id?: string;
		salutation: string;
		name_first: string;
		name_last: string;
		birthdate: string;
		marital_status: string;
		street: string;
		housenr: string;
		zip: string;
		city: string;
		email: string;
		phone: string;
		handy: string;
		level_of_care: string;
		special_scheduling_details?: any;
		
		// Relationen
		company?: string;             // maxSelect: 1 -> String
		assigned_employee?: string;   // maxSelect: 1 -> String
		insurance?: string | string[];// maxSelect: 0 -> Array
		retirement_home?: string | string[]; // maxSelect: 0 -> Array
		
		_notes?: string; 
	}

	interface InsurerData { id: string; name: string; type: string; }
	interface RetirementHomeData { id: string; name: string; }
	interface EmployeeData { id: string; name_first: string; name_last: string; }

	// --- Props ---
	let { client = null, isOpen, onClosed } = $props<{
		client?: ClientData | null;
		isOpen: boolean;
		onClosed: () => void;
	}>();

	// --- Default Template ---
	const defaultClient: ClientData = {
		salutation: 'Keine Angabe', name_first: '', name_last: '', birthdate: '',
		marital_status: 'Ledig', street: '', housenr: '', zip: '', city: '',
		email: '', phone: '', handy: '', level_of_care: '0', 
		special_scheduling_details: null, insurance: '', company: '', 
		assigned_employee: '', retirement_home: '', _notes: ''
	};

	// --- State ---
	let formData = $state<ClientData>({ ...defaultClient });
	let isSaving = $state(false);
	let activeTab = $state<'personal' | 'contact' | 'care' | 'appointments' | 'admin'>('personal');

	const currentUser = pb.authStore.model;
	const isAdmin = $derived(currentUser?.role === 'admin');
	const isNewClient = $derived(!client?.id);
	const modalTitle = $derived(isNewClient ? 'Neuen Klienten anlegen' : 'Klientendaten bearbeiten');

	// Dropdown States
	let companies = $state.raw<any[]>([]);
	let employees = $state.raw<EmployeeData[]>([]);
	let insurers = $state.raw<InsurerData[]>([]);
	let retirementHomes = $state.raw<RetirementHomeData[]>([]);

	// --- State für Termin-Verwaltung ---
	let clientAppointments = $state<any[]>([]);
	let isApptsLoading = $state(false);
	
	let isApptModalOpen = $state(false);
	let selectedAppointment = $state<any | null>(null);

	// --- Synchronisation (Safe Reactivity) ---
	$effect(() => {
		if (isOpen) {
			untrack(() => {
				activeTab = 'personal'; 
				if (client) {
					const cloned = JSON.parse(JSON.stringify(client));
					cloned._notes = cloned.special_scheduling_details?.notes || '';
					
					// ARRAY-MAPPING: PB Schema liefert Arrays für maxSelect: 0/10
					if (Array.isArray(cloned.insurance)) cloned.insurance = cloned.insurance[0] || '';
					if (Array.isArray(cloned.retirement_home)) cloned.retirement_home = cloned.retirement_home[0] || '';
					
					formData = cloned;
					loadClientAppointments();
				} else {
					formData = { ...defaultClient };
					clientAppointments = [];
				}

				if (isAdmin && companies.length === 0) loadAdminRelations();
				if (insurers.length === 0) loadInsurers();
				if (retirementHomes.length === 0) loadRetirementHomes();
			});
		}
	});

	// --- Data Fetching ---
	async function loadInsurers() {
		try { insurers = await pb.collection('health_insurers').getFullList<InsurerData>({ fields: 'id,name,type', sort: 'name' }); } catch (e) {}
	}

	async function loadRetirementHomes() {
		try { retirementHomes = await pb.collection('retirement_homes').getFullList<RetirementHomeData>({ fields: 'id,name', sort: 'name' }); } catch (e) {}
	}

	async function loadAdminRelations() {
		try {
			companies = await pb.collection('company').getFullList({ fields: 'id,name', sort: 'name' });
			employees = await pb.collection('users').getFullList<EmployeeData>({ fields: 'id,name_first,name_last', sort: 'name_last' });
		} catch (e) {}
	}

	async function loadClientAppointments() {
		if (!formData.id) return;
		isApptsLoading = true;
		try {
			clientAppointments = await pb.collection('appointments').getFullList({
				filter: `client ~ "${formData.id}"`,
				sort: '-appointment',
				expand: 'user'
			});
		} catch (error) {
			console.error('Fehler beim Laden der Termine:', error);
		} finally {
			isApptsLoading = false;
		}
	}

	// --- Actions ---
	async function saveClient(event?: SubmitEvent) {
		if (event) event.preventDefault();
		if (isSaving) return;
		isSaving = true;

		try {
			const payload: any = { ...formData };
			payload.special_scheduling_details = { notes: formData._notes };
			delete payload._notes; 

			// Array Mapping für PB Speicherung
			payload.insurance = payload.insurance ? [payload.insurance] : [];
			payload.retirement_home = payload.retirement_home ? [payload.retirement_home] : [];

			if (!isAdmin) {
				delete payload.company;
				delete payload.assigned_employee;
			}

			if (isNewClient) {
				const created = await pb.collection('clients').create(payload);
				formData.id = created.id; // ID setzen, um Termine freizuschalten
				toastService.success('Klient erfolgreich gespeichert.');
			} else {
				await pb.collection('clients').update(client!.id!, payload);
				toastService.success('Änderungen gespeichert.');
				if (event) onClosed(); // Nur Modal schließen, wenn man unten auf Speichern klickt
			}
		} catch (error: any) {
			toastService.error(`Speichern fehlgeschlagen: ${error?.data?.message || 'Bitte Eingaben prüfen.'}`);
		} finally {
			isSaving = false;
		}
	}

	async function deleteClient() {
		if (!formData.id) return;
		if (!confirm(`Möchten Sie ${formData.name_first} ${formData.name_last} wirklich unwiderruflich löschen? Alle verknüpften Termine könnten verwaist werden.`)) return;

		try {
			await pb.collection('clients').delete(formData.id);
			toastService.success('Klient wurde aus dem System entfernt.');
			onClosed();
		} catch (error) {
			toastService.error('Löschen nicht möglich.');
		}
	}

	// --- Termin Manager Integration ---
	function openApptModal(appt = null) {
		selectedAppointment = appt;
		isApptModalOpen = true;
	}

	function handleApptSaved() {
		loadClientAppointments();
		isApptModalOpen = false;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:p-6" transition:fade={{duration: 200}}>
		
		<button 
			type="button" aria-label="Modal schließen"
			class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm cursor-default border-none outline-none focus:outline-none"
			onclick={onClosed}
		></button>

		<div 
			class="relative bg-white w-full max-w-4xl mt-12 sm:mt-0 h-[90vh] sm:h-auto sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" 
			role="dialog" aria-modal="true" transition:slide={{duration: 300, axis: 'y'}}
		>
			<div class="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 left-0 z-50">
				<div class="w-12 h-1.5 bg-neutral-300 rounded-full"></div>
			</div>

			<header class="pt-8 sm:pt-6 md:pt-8 p-4 sm:p-6 md:p-8 border-b border-neutral-100 flex justify-between items-start sm:items-center bg-white shrink-0 relative z-40">
				<div>
					<h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900">{modalTitle}</h2>
					<p class="text-[10px] sm:text-xs md:text-sm text-neutral-500 mt-1 font-medium">
						{isNewClient ? 'Bitte füllen Sie das Profil vollständig aus' : `ID: ${formData?.id}`}
					</p>
				</div>
				<button type="button" aria-label="Schließen" onclick={onClosed} class="p-2 sm:p-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 hover:text-neutral-700 transition-colors focus:outline-none">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</header>

			<div class="flex border-b border-neutral-100 bg-neutral-50/50 px-4 sm:px-6 md:px-8 pt-2 gap-6 sm:gap-8 overflow-x-auto custom-scrollbar shrink-0 scroll-smooth relative z-40">
				{#each ['personal', 'contact', 'care', 'appointments', 'admin'] as tab}
					{#if tab !== 'admin' || isAdmin}
						<button 
							type="button" 
							onclick={() => activeTab = tab as any} 
							class="pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 {activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}"
						>
							{#if tab === 'personal'} Stammdaten
							{:else if tab === 'contact'} Kontakt & Ort
							{:else if tab === 'care'} Pflege & Details
							{:else if tab === 'appointments'} Termine 
								{#if clientAppointments.length > 0}
									<span class="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md text-[9px]">{clientAppointments.length}</span>
								{/if}
							{:else} System-Admin {/if}
						</button>
					{/if}
				{/each}
			</div>

			<div class="flex flex-col flex-1 overflow-hidden bg-white">
				
				<div class="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar pb-10">
					
					{#if activeTab === 'personal'}
						<div in:fade={{ duration: 150 }} class="space-y-6">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<span class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-2 sm:mb-3">Anrede</span>
									<div class="flex flex-wrap gap-2">
										{#each ["Herr", "Frau", "Divers", "Keine Angabe"] as sal}
											<button type="button" onclick={() => formData.salutation = sal} class="flex-1 min-w-16 py-2.5 sm:py-3 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm focus:outline-none {formData.salutation === sal ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-neutral-200 text-neutral-500'}">{sal}</button>
										{/each}
									</div>
								</div>
								
								<div>
									<span class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-2 sm:mb-3">Familienstand</span>
									<div class="flex flex-wrap gap-2">
										{#each ["Ledig", "Verheiratet", "Geschieden", "Verwitwet"] as status}
											<button type="button" onclick={() => formData.marital_status = status} class="flex-1 min-w-20 py-2.5 sm:py-3 rounded-xl border-2 transition-all font-bold text-xs sm:text-sm focus:outline-none {formData.marital_status === status ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-neutral-200 text-neutral-500'}">{status}</button>
										{/each}
									</div>
								</div>
							</div>
							
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-neutral-50/50 p-4 sm:p-6 rounded-2xl border border-neutral-100">
								<div class="md:col-span-1">
									<label for="name_first" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Vorname *</label>
									<input id="name_first" type="text" bind:value={formData.name_first} class="orga-input-clear bg-white text-sm sm:text-base py-2.5 sm:py-2" required />
								</div>
								<div class="md:col-span-1">
									<label for="name_last" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Nachname *</label>
									<input id="name_last" type="text" bind:value={formData.name_last} class="orga-input-clear bg-white text-sm sm:text-base py-2.5 sm:py-2" required />
								</div>
								<div class="md:col-span-2">
									<label for="birthdate" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Geburtsdatum</label>
									<input id="birthdate" type="text" bind:value={formData.birthdate} class="orga-input-clear bg-white text-sm sm:text-base py-2.5 sm:py-2" placeholder="z.B. 15.08.1945" />
								</div>
							</div>
						</div>
					{/if}

					{#if activeTab === 'contact'}
						<div in:fade={{ duration: 150 }} class="space-y-6 sm:space-y-8">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
								<div class="space-y-4 sm:space-y-5 bg-neutral-50/50 p-4 sm:p-6 rounded-2xl border border-neutral-100">
									<h3 class="text-indigo-600 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest border-b border-indigo-100 pb-2">Kommunikation</h3>
									<div>
										<label for="email" class="block text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">E-Mail</label>
										<input id="email" type="email" bind:value={formData.email} class="orga-input-clear bg-white text-sm py-2.5" placeholder="mail@beispiel.de" />
									</div>
									<div class="grid grid-cols-2 gap-4">
										<div>
											<label for="phone" class="block text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Festnetz</label>
											<input id="phone" type="text" bind:value={formData.phone} class="orga-input-clear bg-white text-sm py-2.5" />
										</div>
										<div>
											<label for="handy" class="block text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Mobil</label>
											<input id="handy" type="text" bind:value={formData.handy} class="orga-input-clear bg-white text-sm py-2.5" />
										</div>
									</div>
								</div>

								<div class="space-y-4 sm:space-y-5 bg-neutral-50/50 p-4 sm:p-6 rounded-2xl border border-neutral-100">
									<h3 class="text-indigo-600 text-[10px] sm:text-xs font-extrabold uppercase tracking-widest border-b border-indigo-100 pb-2">Adresse</h3>
									<div class="grid grid-cols-4 gap-4">
										<div class="col-span-3">
											<label for="street" class="block text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Straße</label>
											<input id="street" type="text" bind:value={formData.street} class="orga-input-clear bg-white text-sm py-2.5" />
										</div>
										<div class="col-span-1">
											<label for="housenr" class="block text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Nr.</label>
											<input id="housenr" type="text" bind:value={formData.housenr} class="orga-input-clear bg-white text-sm py-2.5" />
										</div>
									</div>
									<div class="grid grid-cols-4 gap-4">
										<div class="col-span-1">
											<label for="zip" class="block text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">PLZ</label>
											<input id="zip" type="text" bind:value={formData.zip} class="orga-input-clear bg-white text-sm py-2.5" />
										</div>
										<div class="col-span-3">
											<label for="city" class="block text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Stadt</label>
											<input id="city" type="text" bind:value={formData.city} class="orga-input-clear bg-white text-sm py-2.5" />
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					{#if activeTab === 'care'}
						<div in:fade={{ duration: 150 }} class="space-y-6">
							
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-neutral-50/50 p-4 sm:p-6 rounded-2xl border border-neutral-100">
								<div>
									<label for="c_insurance" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Kostenträger / Kasse</label>
									<select id="c_insurance" bind:value={formData.insurance as string} class="orga-input-clear bg-white text-sm py-2.5">
										<option value="">-- Selbstzahler --</option>
										{#each insurers as ins} <option value={ins.id}>{ins.name} ({ins.type})</option> {/each}
									</select>
								</div>

								<div>
									<label for="c_home" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Seniorenheim</label>
									<select id="c_home" bind:value={formData.retirement_home as string} class="orga-input-clear bg-white text-sm py-2.5">
										<option value="">-- Privathaushalt --</option>
										{#each retirementHomes as home} <option value={home.id}>{home.name}</option> {/each}
									</select>
								</div>
							</div>

							<div class="pt-2">
								<span class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-2 sm:mb-3">Anerkannter Pflegegrad</span>
								<div class="flex flex-wrap gap-2 sm:gap-4">
									{#each ["0", "1", "2", "3", "4", "5"] as grad}
										<button type="button" onclick={() => formData.level_of_care = grad} class="flex-1 min-w-12 py-2.5 sm:py-3.5 rounded-xl border-2 transition-all font-bold text-center focus:outline-none {formData.level_of_care === grad ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-neutral-200 text-neutral-500'}">{grad}</button>
									{/each}
								</div>
							</div>

							<div class="pt-4 sm:pt-6 border-t border-neutral-100">
								<label for="notes" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Spezifische Notizen & Infos</label>
								<textarea id="notes" bind:value={formData._notes} rows="4" class="orga-input-clear bg-neutral-50 resize-y text-sm" placeholder="Allergien, Tür-Codes, Besonderheiten..."></textarea>
							</div>
						</div>
					{/if}

					{#if activeTab === 'appointments'}
						<div in:fade={{ duration: 150 }} class="space-y-4">
							{#if !formData.id}
								<div class="bg-indigo-50/50 border border-indigo-100 border-dashed rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center mt-2">
									<div class="bg-white p-2.5 sm:p-3 rounded-full shadow-sm mb-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 sm:h-8 sm:w-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
									<h3 class="text-xs sm:text-sm font-extrabold text-indigo-900 uppercase tracking-widest">Termine gesperrt</h3>
									<p class="text-[11px] sm:text-xs text-indigo-700/80 mt-1.5 max-w-xs mb-5 leading-relaxed">Bitte speichern Sie den Klienten zunächst im System, bevor Sie ihm Termine zuweisen können.</p>
									<button type="button" onclick={(e) => saveClient()} class="orga-button-primary text-[11px] sm:text-xs! py-2! px-5! shadow-sm">Speichern & Freischalten</button>
								</div>
							{:else}
								<div class="flex justify-between items-center bg-neutral-50 p-3 sm:p-4 rounded-2xl border border-neutral-200">
									<div>
										<h3 class="text-sm font-extrabold text-neutral-900">Termin-Historie</h3>
										<p class="text-[10px] sm:text-xs text-neutral-500 mt-0.5">Alle Einsätze für {formData.name_first}</p>
									</div>
									<button type="button" onclick={() => openApptModal(null)} class="orga-button-primary text-[11px] sm:text-xs! py-2! px-4! shadow-sm">+ Neuer Termin</button>
								</div>

								{#if isApptsLoading}
									<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div></div>
								{:else if clientAppointments.length === 0}
									<p class="text-xs text-neutral-400 italic text-center py-6">Noch keine Termine für diesen Klienten hinterlegt.</p>
								{:else}
									<div class="space-y-3">
										{#each clientAppointments as appt}
											{@const isPast = new Date(appt.appointment) < new Date()}
											<button 
												type="button" onclick={() => openApptModal(appt)} 
												class="w-full text-left bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between group hover:shadow-md hover:border-indigo-200 transition-all focus:outline-none {isPast ? 'opacity-60 grayscale-[30%]' : ''}"
											>
												<div>
													<div class="flex items-center gap-2 mb-1.5">
														<span class="text-[10px] sm:text-xs font-black {appt.is_private ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-indigo-700 bg-indigo-50 border-indigo-100'} px-2 py-0.5 rounded-lg border">
															{new Date(appt.appointment).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year:'numeric', hour: '2-digit', minute:'2-digit'})}
														</span>
														{#if isPast} <span class="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Vergangen</span> {/if}
													</div>
													<h4 class="text-sm font-extrabold text-neutral-900 truncate">{appt.title}</h4>
													{#if isAdmin && appt.expand?.user}
														<p class="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
															<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
															{appt.expand.user.name_first} {appt.expand.user.name_last}
														</p>
													{/if}
												</div>
												<div class="text-neutral-300 group-hover:text-indigo-500 transition-colors bg-neutral-50 group-hover:bg-indigo-50 rounded-full p-2">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
												</div>
											</button>
										{/each}
									</div>
								{/if}
							{/if}
						</div>
					{/if}

					{#if activeTab === 'admin' && isAdmin}
						<div in:fade={{ duration: 150 }} class="space-y-6">
							<div class="bg-red-50/50 border border-red-100 p-4 sm:p-5 rounded-2xl">
								<p class="text-[10px] sm:text-xs font-extrabold text-red-600 uppercase tracking-widest mb-1">Systemverwaltung</p>
								<p class="text-[11px] sm:text-xs text-red-500/80 leading-relaxed">Dieser Bereich ist nur für Administratoren sichtbar. Steuern Sie hier die Abrechnungs- und Mitarbeiterzuordnung.</p>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-neutral-50/50 p-4 sm:p-6 rounded-2xl border border-neutral-100">
								<div>
									<span class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-2 sm:mb-3">Zugeordnetes Unternehmen</span>
									<select bind:value={formData.company as string} class="orga-input-clear bg-white text-sm py-2.5 w-full">
										<option value="">-- Keine Zuordnung --</option>
										{#each companies as comp} <option value={comp.id}>{comp.name}</option> {/each}
									</select>
								</div>

								<div>
									<span class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-2 sm:mb-3">Betreuender Mitarbeiter</span>
									<select bind:value={formData.assigned_employee as string} class="orga-input-clear bg-white text-sm py-2.5 w-full">
										<option value="">-- Keine Zuordnung --</option>
										{#each employees as emp} <option value={emp.id}>{emp.name_first} {emp.name_last}</option> {/each}
									</select>
								</div>
							</div>
						</div>
					{/if}

				</div>

				<footer class="p-4 sm:p-6 md:p-8 border-t border-neutral-100 bg-white flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-6 sm:pb-8 md:pb-8 relative z-40">
					<div class="w-full sm:w-auto">
						{#if !isNewClient}
							<button type="button" onclick={deleteClient} class="w-full sm:w-auto orga-button-danger py-3! sm:py-2.5! px-6! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold">
								Löschen
							</button>
						{/if}
					</div>

					<div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
						<button type="button" onclick={onClosed} class="w-full sm:w-auto orga-button-ghost py-3! sm:py-2.5! px-6! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold">
							Schließen
						</button>
						
						{#if activeTab !== 'appointments'}
							<button type="submit" onclick={(e) => saveClient(e)} disabled={isSaving} class="w-full sm:w-auto orga-button-primary py-3! sm:py-2.5! px-8! sm:px-10! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold shadow-lg shadow-indigo-600/20">
								{#if isSaving}
									<div class="flex items-center"><div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Speichert...</div>
								{:else}
									Profil Speichern
								{/if}
							</button>
						{/if}
					</div>
				</footer>
			</div>
		</div>
	</div>
{/if}

{#if isApptModalOpen}
	<div class="relative z-[60]">
		<AppointmentManager
			isOpen={isApptModalOpen}
			appointment={selectedAppointment}
			onClosed={() => isApptModalOpen = false}
			onSaved={handleApptSaved}
			currentUser={currentUser}
			isAdmin={isAdmin}
			defaultDate={new Date()} 
			clients={[{ id: formData.id, name_first: formData.name_first, name_last: formData.name_last }]} 
			adminUsers={employees}
		/>
	</div>
{/if}