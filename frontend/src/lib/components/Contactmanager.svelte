<script lang="ts">
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { fade, slide } from 'svelte/transition';
	import { untrack } from 'svelte';

	// --- Interfaces (Nach pb_schema_01) ---
	export interface ContactData {
		id?: string;
		name_first: string;
		name_last: string;
		email: string;
		phone: string;
		street: string;
		housenr: string;
		zip: string;
		city: string;
		// Relationen: PB speichert diese als Arrays
		client?: string | string[];
		employee_from?: string | string[];
		notes?: string; // Wird in PB als JSON { text: "..." } gespeichert
	}

	interface RelationData {
		id: string;
		name_first?: string;
		name_last?: string;
		name?: string;
	}

	// --- Props ---
	let { contact = null, isOpen, onClosed } = $props<{
		contact?: ContactData | null;
		isOpen: boolean;
		onClosed: () => void;
	}>();

	// --- Default Template ---
	const defaultContact: ContactData = {
		name_first: '', name_last: '', email: '', phone: '',
		street: '', housenr: '', zip: '', city: '',
		client: '', employee_from: '', notes: ''
	};

	// --- State ---
	let formData = $state<ContactData>({ ...defaultContact });
	let isSaving = $state(false);
	let activeTab = $state<'personal' | 'address' | 'relations'>('personal');

	const isNewContact = $derived(!contact?.id);
	const modalTitle = $derived(isNewContact ? 'Neuen Kontakt anlegen' : 'Kontakt bearbeiten');

	// Dropdown States
	let clientsList = $state.raw<RelationData[]>([]);
	let homesList = $state.raw<RelationData[]>([]);
	let isLoadingRelations = $state(false);

	// --- Synchronisation (Safe Reactivity) ---
	$effect(() => {
		if (isOpen) {
			untrack(() => {
				activeTab = 'personal'; 
				if (contact) {
					const cloned = JSON.parse(JSON.stringify(contact));
					
					// Extrahieren der JSON-Notiz
					cloned.notes = cloned.notes?.text || '';
					
					// ARRAY-MAPPING: PocketBase liefert Relationen als Array (z.B. ["id123"])
					if (Array.isArray(cloned.client)) cloned.client = cloned.client[0] || '';
					if (Array.isArray(cloned.employee_from)) cloned.employee_from = cloned.employee_from[0] || '';
					
					formData = cloned;
				} else {
					formData = { ...defaultContact };
				}

				if (clientsList.length === 0) loadRelations();
			});
		}
	});

	// --- Data Fetching ---
	async function loadRelations() {
		isLoadingRelations = true;
		try {
			const [cRes, hRes] = await Promise.all([
				pb.collection('clients').getFullList<RelationData>({ fields: 'id,name_first,name_last', sort: 'name_last' }),
				pb.collection('retirement_homes').getFullList<RelationData>({ fields: 'id,name', sort: 'name' })
			]);
			clientsList = cRes;
			homesList = hRes;
		} catch (e) {
			console.error('Fehler beim Laden der Relationen', e);
		} finally {
			isLoadingRelations = false;
		}
	}

	// --- Actions ---
	async function saveContact(event: SubmitEvent) {
		event.preventDefault();
		if (isSaving) return;
		isSaving = true;

		try {
			const payload: any = { ...formData };
			
			// Das "notes" Feld in PocketBase ist ein JSON Feld. Wir verpacken den String sauber.
			payload.notes = payload.notes ? { text: payload.notes } : null;

			// ARRAY-MAPPING: PocketBase erwartet wegen maxSelect: 10/0 Arrays beim Speichern!
			payload.client = payload.client ? [payload.client] : [];
			payload.employee_from = payload.employee_from ? [payload.employee_from] : [];

			if (isNewContact) {
				await pb.collection('contacts').create(payload);
				toastService.success('Kontakt erfolgreich angelegt.');
			} else {
				await pb.collection('contacts').update(contact!.id!, payload);
				toastService.success('Kontakt aktualisiert.');
			}
			onClosed();
		} catch (error: any) {
			console.error(error);
			toastService.error(`Fehler beim Speichern: ${error?.data?.message || 'Eingaben prüfen.'}`);
		} finally {
			isSaving = false;
		}
	}

	async function deleteContact() {
		if (!formData.id) return;
		if (!confirm(`Möchten Sie den Kontakt ${formData.name_first} ${formData.name_last} wirklich löschen?`)) return;

		try {
			await pb.collection('contacts').delete(formData.id);
			toastService.success('Kontakt wurde gelöscht.');
			onClosed();
		} catch (error) {
			toastService.error('Fehler beim Löschen des Kontakts.');
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" transition:fade={{duration: 200}}>
		
		<button 
			type="button" aria-label="Modal schließen"
			class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm cursor-default border-none outline-none focus:outline-none"
			onclick={onClosed} onkeydown={(e) => { if (e.key === 'Escape') onClosed(); }}
		></button>

		<div 
			class="relative bg-white w-full max-w-2xl mt-12 sm:mt-0 h-[90vh] sm:h-auto sm:max-h-[95vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" 
			role="dialog" aria-modal="true" transition:slide={{duration: 300, axis: 'y'}}
		>
			<div class="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 left-0 z-50">
				<div class="w-12 h-1.5 bg-neutral-300 rounded-full"></div>
			</div>

			<header class="pt-8 sm:pt-6 md:pt-8 p-4 sm:p-6 md:p-8 border-b border-neutral-100 flex justify-between items-start sm:items-center bg-white shrink-0 relative z-40">
				<div>
					<h2 class="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">{modalTitle}</h2>
					{#if formData.id}
						<p class="text-[10px] sm:text-xs text-neutral-400 mt-1 font-mono">ID: {formData.id}</p>
					{:else}
						<p class="text-[10px] sm:text-xs text-neutral-500 mt-1">Legen Sie einen neuen Ansprechpartner an.</p>
					{/if}
				</div>
				<button type="button" aria-label="Schließen" onclick={onClosed} class="p-2 sm:p-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 hover:text-neutral-700 transition-colors focus:outline-none">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</header>

			<div class="flex border-b border-neutral-100 bg-neutral-50/50 px-4 sm:px-6 md:px-8 pt-2 gap-6 sm:gap-8 overflow-x-auto custom-scrollbar shrink-0 scroll-smooth relative z-40">
				<button type="button" onclick={() => activeTab = 'personal'} class="pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap {activeTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}">
					Kontakt & Name
				</button>
				<button type="button" onclick={() => activeTab = 'address'} class="pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap {activeTab === 'address' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}">
					Wohnort
				</button>
				<button type="button" onclick={() => activeTab = 'relations'} class="pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap {activeTab === 'relations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}">
					Netzwerk & Notizen
				</button>
			</div>

			<form onsubmit={saveContact} class="flex flex-col flex-1 overflow-hidden bg-neutral-50/30">
				
				<div class="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1 pb-10">
					
					{#if activeTab === 'personal'}
						<div in:fade={{ duration: 150 }} class="space-y-4 sm:space-y-6">
							<div class="bg-white p-4 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 sm:space-y-5">
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
									<div>
										<label for="name_first" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Vorname</label>
										<input id="name_first" type="text" bind:value={formData.name_first} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" />
									</div>
									<div>
										<label for="name_last" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Nachname *</label>
										<input id="name_last" type="text" bind:value={formData.name_last} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" required />
									</div>
								</div>
							</div>

							<div class="bg-white p-4 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 sm:space-y-5">
								<div>
									<label for="email" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">E-Mail Adresse</label>
									<input id="email" type="email" bind:value={formData.email} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" placeholder="beispiel@mail.de" />
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
									<div>
										<label for="phone" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Telefon</label>
										<input id="phone" type="text" bind:value={formData.phone} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" />
									</div>
								</div>
							</div>
						</div>
					{/if}

					{#if activeTab === 'address'}
						<div in:fade={{ duration: 150 }}>
							<div class="bg-white p-4 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4 sm:space-y-5">
								<div class="grid grid-cols-4 gap-4">
									<div class="col-span-3">
										<label for="street" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Straße</label>
										<input id="street" type="text" bind:value={formData.street} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" />
									</div>
									<div class="col-span-1">
										<label for="housenr" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Nr.</label>
										<input id="housenr" type="text" bind:value={formData.housenr} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" />
									</div>
								</div>
								<div class="grid grid-cols-4 gap-4">
									<div class="col-span-1">
										<label for="zip" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">PLZ</label>
										<input id="zip" type="text" bind:value={formData.zip} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" />
									</div>
									<div class="col-span-3">
										<label for="city" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Stadt</label>
										<input id="city" type="text" bind:value={formData.city} class="orga-input-clear bg-neutral-50 text-sm sm:text-base py-2.5 sm:py-2" />
									</div>
								</div>
							</div>
						</div>
					{/if}

					{#if activeTab === 'relations'}
						<div in:fade={{ duration: 150 }} class="space-y-4 sm:space-y-6">
							
							<div class="bg-indigo-50/50 p-4 sm:p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-4 sm:space-y-5">
								<h3 class="text-xs sm:text-sm font-extrabold text-indigo-900 uppercase tracking-widest border-b border-indigo-100 pb-2">Netzwerk-Verknüpfung</h3>
								
								<div>
									<label for="c_client" class="block text-[10px] sm:text-xs font-extrabold text-indigo-700 uppercase tracking-widest mb-1.5">Als Angehöriger von Klient:</label>
									<select id="c_client" bind:value={formData.client as string} class="orga-input-clear bg-white text-sm py-2.5 border-indigo-200 focus:border-indigo-500" disabled={isLoadingRelations}>
										<option value="">-- Kein Klient --</option>
										{#each clientsList as c} <option value={c.id}>{c.name_first} {c.name_last}</option> {/each}
									</select>
								</div>
								
								<div>
									<label for="c_home" class="block text-[10px] sm:text-xs font-extrabold text-indigo-700 uppercase tracking-widest mb-1.5">Als Mitarbeiter in Einrichtung:</label>
									<select id="c_home" bind:value={formData.employee_from as string} class="orga-input-clear bg-white text-sm py-2.5 border-indigo-200 focus:border-indigo-500" disabled={isLoadingRelations}>
										<option value="">-- Keine Einrichtung --</option>
										{#each homesList as h} <option value={h.id}>{h.name}</option> {/each}
									</select>
								</div>
							</div>

							<div class="bg-white p-4 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm">
								<label for="notes" class="block text-[10px] sm:text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">Zusätzliche Notizen</label>
								<textarea id="notes" bind:value={formData.notes} rows="4" class="orga-input-clear bg-neutral-50 resize-y text-sm sm:text-base" placeholder="Informationen über diesen Kontakt..."></textarea>
							</div>

						</div>
					{/if}

				</div>

				<footer class="p-4 sm:p-6 md:p-8 border-t border-neutral-100 bg-white flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-6 sm:pb-8 relative z-40">
					<div class="w-full sm:w-auto">
						{#if !isNewContact}
							<button type="button" aria-label="Kontakt löschen" onclick={deleteContact} class="w-full sm:w-auto orga-button-danger py-3! sm:py-2.5! px-6! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold bg-red-100 text-red-600 hover:bg-red-200">
								Löschen
							</button>
						{/if}
					</div>

					<div class="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
						<button type="button" aria-label="Abbrechen" onclick={onClosed} class="w-full sm:w-auto orga-button-ghost py-3! sm:py-2.5! px-6! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold">
							Abbrechen
						</button>
						
						<button type="submit" disabled={isSaving} aria-label="Speichern" class="w-full sm:w-auto orga-button-primary bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 py-3! sm:py-2.5! px-8! sm:px-10! text-[11px] sm:text-xs! uppercase tracking-widest font-extrabold shadow-lg">
							{#if isSaving}
								<div class="flex items-center"><div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Speichert...</div>
							{:else}
								Kontakt Speichern
							{/if}
						</button>
					</div>
				</footer>
			</form>
		</div>
	</div>
{/if}