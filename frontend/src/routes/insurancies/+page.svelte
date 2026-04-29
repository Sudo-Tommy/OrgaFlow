<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte'; 
	import { fade, slide } from 'svelte/transition';
	import { goto } from '$app/navigation';

	// --- Interfaces ---
	interface HealthInsurer {
		id?: string;
		name: string;
		type: string;
		street: string;
		zip: string;
		city: string;
		email: string;
		phone: string;
		billing_address_extra: string;
		notes: string;
	}

	// --- State ---
	let currentUser = $state(pb.authStore.model);
	let insurers = $state.raw<HealthInsurer[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let searchQuery = $state('');

	// Modal State
	let isModalOpen = $state(false);
	let formData = $state<HealthInsurer | null>(null);

	const defaultInsurer: HealthInsurer = {
		name: '',
		type: 'GKV (Gesetzlich)',
		street: '',
		zip: '',
		city: '',
		email: '',
		phone: '',
		billing_address_extra: '',
		notes: ''
	};

	// --- Derived ---
	const filteredInsurers = $derived(
		insurers.filter((i: HealthInsurer) => {
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			return i.name.toLowerCase().includes(q) || 
				   i.city.toLowerCase().includes(q) || 
				   i.type.toLowerCase().includes(q);
		})
	);

	// --- Lifecycle ---
	onMount(async () => {
		if (!pb.authStore.isValid || !currentUser) {
			goto('/');
			return;
		}
		await loadInsurers();
		isLoading = false;
	});

	async function loadInsurers() {
		try {
			insurers = await pb.collection('health_insurers').getFullList<HealthInsurer>({ sort: 'name' });
		} catch (error) {
			console.error('Fehler beim Laden der Krankenkassen:', error);
			toastService.error('Die Liste der Krankenkassen konnte nicht geladen werden.');
		}
	}

	// --- Actions ---
	function openModal(insurer?: HealthInsurer) {
		if (insurer) {
			formData = JSON.parse(JSON.stringify(insurer));
		} else {
			formData = { ...defaultInsurer };
		}
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
		formData = null;
	}

	async function saveInsurer(e: SubmitEvent) {
		e.preventDefault();
		if (!formData || isSaving) return;
		isSaving = true;

		try {
			const payload = { ...formData };

			if (payload.id) {
				await pb.collection('health_insurers').update(payload.id, payload);
				toastService.success('Krankenkasse erfolgreich aktualisiert.');
			} else {
				await pb.collection('health_insurers').create(payload);
				toastService.success('Neue Krankenkasse angelegt.');
			}
			
			await loadInsurers();
			closeModal();
		} catch (error) {
			console.error('Save Error:', error);
			toastService.error('Fehler beim Speichern der Krankenkasse.');
		} finally {
			isSaving = false;
		}
	}

	async function deleteInsurer() {
		if (!formData?.id || !confirm('Möchten Sie diese Krankenkasse wirklich löschen? Dies könnte Auswirkungen auf verknüpfte Klienten haben.')) return;
		
		try {
			await pb.collection('health_insurers').delete(formData.id);
			toastService.success('Krankenkasse erfolgreich gelöscht.');
			await loadInsurers();
			closeModal();
		} catch (error) {
			toastService.error('Löschen fehlgeschlagen. Möglicherweise ist die Kasse noch mit Klienten verknüpft.');
		}
	}
</script>

<div class="min-h-screen bg-neutral-50 md:bg-neutral-100 flex flex-col md:pl-20 lg:pl-72 transition-all relative">
	
	<header class="bg-white border-b border-neutral-200 p-6 lg:px-10 sticky top-0 z-30 shadow-sm shrink-0">
		<div class="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
			
			<div class="pl-14 md:pl-0"> <h1 class="text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
					Krankenkassen
				</h1>
				<p class="text-sm text-neutral-500 mt-1 font-medium">Verwaltung aller Kostenträger ({insurers.length} Einträge)</p>
			</div>

			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
				<div class="relative w-full sm:w-72 shrink-0">
					<input 
						type="text" 
						bind:value={searchQuery} 
						placeholder="Name, Typ oder Ort..." 
						aria-label="Krankenkassen durchsuchen"
						class="orga-input-clear pl-11! py-2.5!" 
					/>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</div>
				
				<button 
					type="button" 
					onclick={() => openModal()} 
					class="orga-button-primary py-2.5! px-6! flex-1 sm:flex-none justify-center whitespace-nowrap"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" /></svg>
					Neue Kasse
				</button>
			</div>
		</div>
	</header>

	<main class="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full pb-32">
		{#if isLoading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
			</div>
		{:else if insurers.length === 0}
			<div class="bg-white border border-neutral-200 rounded-3xl p-12 text-center shadow-sm max-w-2xl mx-auto mt-10">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-neutral-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
				<h3 class="text-xl font-bold text-neutral-800">Keine Krankenkassen hinterlegt</h3>
				<p class="text-neutral-500 mt-2">Legen Sie den ersten Kostenträger an, um ihn Klienten zuweisen zu können.</p>
				<button onclick={() => openModal()} class="orga-button-primary py-2.5! px-6! mt-6 mx-auto">
					Erste Kasse anlegen
				</button>
			</div>
		{:else if filteredInsurers.length === 0}
			<div class="text-center py-20">
				<p class="text-neutral-500 font-medium text-lg">Keine Krankenkassen für "{searchQuery}" gefunden.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" in:fade>
				{#each filteredInsurers as insurer}
					<button 
						type="button"
						onclick={() => openModal(insurer)}
						class="orga-card-white p-6 flex flex-col justify-between text-left border border-neutral-100 hover:shadow-xl hover:-translate-y-1 transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-500"
					>
						<div>
							<div class="flex justify-between items-start mb-4">
								<h3 class="font-extrabold text-neutral-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 pr-2">
									{insurer.name}
								</h3>
							</div>
							
							<div class="mb-5">
								<span class="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border 
									{insurer.type.includes('PKV') ? 'bg-amber-50 text-amber-700 border-amber-200' : 
									 insurer.type.includes('GKV') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
									 'bg-neutral-100 text-neutral-600 border-neutral-200'}">
									{insurer.type}
								</span>
							</div>

							<div class="space-y-2.5 text-sm text-neutral-600 mb-6">
								{#if insurer.city}
									<p class="flex items-center gap-3 bg-neutral-50 p-2 rounded-lg">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
										<span class="truncate">{insurer.zip} {insurer.city}</span>
									</p>
								{/if}
								{#if insurer.phone}
									<p class="flex items-center gap-3 bg-neutral-50 p-2 rounded-lg">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
										<span>{insurer.phone}</span>
									</p>
								{/if}
							</div>
						</div>
						
						<div class="w-full py-2.5 bg-neutral-100 group-hover:bg-indigo-50 text-neutral-700 group-hover:text-indigo-700 text-center text-sm font-bold rounded-xl transition-colors">
							Details bearbeiten
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if isModalOpen && formData}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" transition:fade={{duration: 200}}>
		
		<button 
			type="button"
			aria-label="Modal schließen"
			class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm cursor-default border-none outline-none focus:outline-none"
			onclick={closeModal}
			onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
		></button>

		<div 
			class="relative bg-white border border-neutral-200 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]" 
			transition:slide={{duration: 300}}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<header class="p-6 md:p-8 border-b border-neutral-100 flex justify-between items-start md:items-center bg-white shrink-0">
				<div>
					<h2 class="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900">
						{formData.id ? 'Krankenkasse bearbeiten' : 'Neue Krankenkasse anlegen'}
					</h2>
					<p class="text-xs md:text-sm text-neutral-500 mt-1 font-medium">Hinterlegen Sie hier die korrekten Abrechnungsdaten.</p>
				</div>
				<button type="button" aria-label="Schließen" onclick={closeModal} class="p-2.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 hover:text-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</header>
			
			<form onsubmit={saveInsurer} class="flex-1 overflow-hidden flex flex-col bg-white">
				<div class="p-6 md:p-8 space-y-10 overflow-y-auto custom-scrollbar flex-1">
					
					<div class="space-y-5">
						<h3 class="text-sm font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-100 pb-2">Stammdaten</h3>
						
						<div>
							<label for="hi_name" class="block text-sm font-bold text-neutral-600 mb-1.5">Name der Krankenkasse / Institution *</label>
							<input id="hi_name" type="text" bind:value={formData.name} class="orga-input-clear" placeholder="z.B. AOK Plus" required />
						</div>

						<div>
							<label for="hi_type" class="block text-sm font-bold text-neutral-600 mb-1.5">Art der Versicherung</label>
							<select id="hi_type" bind:value={formData.type} class="orga-input-clear">
								<option value="GKV (Gesetzlich)">GKV (Gesetzliche Krankenversicherung)</option>
								<option value="PKV (Privat)">PKV (Private Krankenversicherung)</option>
								<option value="Beihilfe">Beihilfestelle</option>
								<option value="Berufsgenossenschaft">Berufsgenossenschaft</option>
							</select>
						</div>
					</div>

					<div class="space-y-5">
						<h3 class="text-sm font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-100 pb-2">Rechnungsadresse & Kontakt</h3>
						
						<div class="grid grid-cols-1 sm:grid-cols-4 gap-5">
							<div class="sm:col-span-3">
								<label for="hi_street" class="block text-sm font-bold text-neutral-600 mb-1.5">Straße & Hausnummer</label>
								<input id="hi_street" type="text" bind:value={formData.street} class="orga-input-clear" placeholder="Musterstraße 123" />
							</div>
							<div class="sm:col-span-1">
								<label for="hi_zip" class="block text-sm font-bold text-neutral-600 mb-1.5">PLZ</label>
								<input id="hi_zip" type="text" bind:value={formData.zip} class="orga-input-clear" placeholder="06108" />
							</div>
						</div>

						<div>
							<label for="hi_city" class="block text-sm font-bold text-neutral-600 mb-1.5">Ort / Stadt</label>
							<input id="hi_city" type="text" bind:value={formData.city} class="orga-input-clear" placeholder="Halle (Saale)" />
						</div>

						<div>
							<label for="hi_billing_extra" class="block text-sm font-bold text-neutral-600 mb-1.5">Abrechnungs-Zusatz</label>
							<input id="hi_billing_extra" type="text" bind:value={formData.billing_address_extra} class="orga-input-clear" placeholder="z.B. Abteilung Kostenerstattung" />
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
							<div>
								<label for="hi_email" class="block text-sm font-bold text-neutral-600 mb-1.5">Zentrale E-Mail</label>
								<input id="hi_email" type="email" bind:value={formData.email} class="orga-input-clear" placeholder="info@kasse.de" />
							</div>
							<div>
								<label for="hi_phone" class="block text-sm font-bold text-neutral-600 mb-1.5">Telefon (Rechnungsstelle)</label>
								<input id="hi_phone" type="text" bind:value={formData.phone} class="orga-input-clear" placeholder="0800 123456" />
							</div>
						</div>
					</div>

					<div class="space-y-5">
						<h3 class="text-sm font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-100 pb-2">Interne Notizen</h3>
						<div>
							<label for="hi_notes" class="block text-sm font-bold text-neutral-600 mb-1.5">Spezielle Abrechnungsrichtlinien etc.</label>
							<textarea id="hi_notes" bind:value={formData.notes} rows="4" class="orga-input-clear resize-y" placeholder="Z.B. Benötigt immer Originalrechnung per Post..."></textarea>
						</div>
					</div>
				</div>
				
				<footer class="p-6 md:p-8 border-t border-neutral-100 bg-neutral-50 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 shrink-0">
					<div class="w-full sm:w-auto">
						{#if formData.id}
							<button type="button" onclick={deleteInsurer} class="w-full sm:w-auto orga-button-danger">
								Kasse löschen
							</button>
						{/if}
					</div>
					<div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
						<button type="button" onclick={closeModal} class="w-full sm:w-auto orga-button-ghost">
							Abbrechen
						</button>
						<button type="submit" disabled={isSaving} class="w-full sm:w-auto orga-button-primary">
							{#if isSaving}
								<div class="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
								Speichert...
							{:else}
								Kasse speichern
							{/if}
						</button>
					</div>
				</footer>
			</form>
		</div>
	</div>
{/if}