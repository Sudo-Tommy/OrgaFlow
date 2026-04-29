<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';

	// --- Interfaces ---
	interface CompanyData {
		id?: string;
		name: string;
		street: string;
		housenr: string;
		zip: string;
		city: string;
		vatcode: string;
		ik_number: string;
		bank_name: string;
		bank_iban: string;
		bank_bic: string;
		logo?: string;
		created?: string;
	}

	// --- State ---
	let currentUser = $state(pb.authStore.model);
	let isLoading = $state(true);
	let isSaving = $state(false);

	let company = $state<CompanyData>({
		name: '',
		street: '',
		housenr: '',
		zip: '',
		city: '',
		vatcode: '',
		ik_number: '',
		bank_name: '',
		bank_iban: '',
		bank_bic: ''
	});

	let logoFile = $state<File | null>(null);
	let logoPreview = $state<string | null>(null);

	// --- Lifecycle & Auth ---
	onMount(async () => {
		// Strenge RBAC (Role-Based Access Control)
		if (!pb.authStore.isValid || currentUser?.role !== 'admin') {
			toastService.error('Zugriff verweigert. Nur Administratoren dürfen Firmendaten bearbeiten.');
			goto('/dashboard');
			return;
		}

		await loadCompany();
		isLoading = false;
	});

	async function loadCompany() {
		try {
			// Wir laden den ersten Eintrag der Company-Collection
			const records = await pb.collection('company').getFullList<CompanyData>({ requestKey: null });
			
			if (records.length > 0) {
				company = records[0];
				if (company.logo) {
					logoPreview = pb.files.getURL(company, company.logo);
				}
			}
		} catch (error) {
			console.error('Fehler beim Laden der Unternehmensdaten:', error);
			toastService.error('Fehler beim Laden der Systemdaten.');
		}
	}

	// --- Actions ---
	function handleLogoChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			logoFile = target.files[0];
			logoPreview = URL.createObjectURL(logoFile);
		}
	}

	async function saveCompany(e: SubmitEvent) {
		e.preventDefault();
		if (isSaving) return;
		isSaving = true;

		try {
			// FormData nutzen, da wir ein Bild (Logo) hochladen könnten
			const formDataObj = new FormData();
			formDataObj.append('name', company.name);
			formDataObj.append('street', company.street);
			formDataObj.append('housenr', company.housenr);
			formDataObj.append('zip', company.zip);
			formDataObj.append('city', company.city);
			formDataObj.append('vatcode', company.vatcode || '');
			formDataObj.append('ik_number', company.ik_number || '');
			formDataObj.append('bank_name', company.bank_name || '');
			formDataObj.append('bank_iban', company.bank_iban || '');
			formDataObj.append('bank_bic', company.bank_bic|| '');

			if (logoFile) {
				formDataObj.append('logo', logoFile);
			}

			if (company.id) {
				const updated = await pb.collection('company').update(company.id, formDataObj);
				company = updated as unknown as CompanyData;
				toastService.success('Unternehmensdaten erfolgreich aktualisiert.');
			} else {
				const created = await pb.collection('company').create(formDataObj);
				company = created as unknown as CompanyData;
				toastService.success('Unternehmen erfolgreich im System registriert.');
			}
			
			// Preview aus den neuen PB Daten generieren & File-State leeren
			logoFile = null;
			if (company.logo) {
				logoPreview = pb.files.getURL(company as any, company.logo);
			}
			
		} catch (error: any) {
			console.error('Speicher-Fehler:', error);
			toastService.error(`Fehler beim Speichern: ${error?.data?.message || 'Bitte Eingaben prüfen.'}`);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="min-h-screen bg-neutral-50 md:bg-neutral-100 flex flex-col md:pl-20 lg:pl-72 transition-all relative">
	
	<header class="bg-white border-b border-neutral-200 p-6 lg:px-10 sticky top-0 z-30 shadow-sm shrink-0">
		<div class="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pl-14 md:pl-0">
			<div>
				<h1 class="text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
					Unternehmensprofil
				</h1>
				<p class="text-sm text-neutral-500 mt-1 font-medium">Verwalten Sie hier die globalen Stammdaten und das Branding Ihres Dienstes.</p>
			</div>
		</div>
	</header>

	<main class="flex-1 p-6 lg:p-10 max-w-5xl mx-auto w-full pb-32" in:fade>
		
		{#if isLoading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				
				<div class="lg:col-span-1 space-y-6">
					
					<div class="orga-card-white p-6 border border-neutral-100 shadow-sm relative overflow-hidden text-center">
						<div class="absolute top-0 left-0 w-full h-20 bg-indigo-50/50 border-b border-indigo-100"></div>
						
						<h3 class="text-xs font-extrabold text-indigo-800 uppercase tracking-widest relative z-10 mb-6">Firmenlogo</h3>
						
						<div class="relative mx-auto w-32 h-32 bg-white rounded-2xl border-2 border-dashed border-indigo-200 shadow-sm flex items-center justify-center p-2 overflow-hidden mb-6 z-10">
							{#if logoPreview}
								<img src={logoPreview} alt="Firmenlogo" class="w-full h-full object-contain" />
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
							{/if}
						</div>

						<label for="logo_upload" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors focus-within:ring-2 focus-within:ring-indigo-500 shadow-sm w-full">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
							{logoPreview ? 'Logo ändern' : 'Logo hochladen'}
							<input id="logo_upload" type="file" accept="image/*" class="sr-only" onchange={handleLogoChange} />
						</label>
						
						{#if logoFile}
							<p class="text-[10px] text-indigo-500 mt-3 font-medium truncate px-2">Ausgewählt: {logoFile.name}</p>
						{/if}
					</div>

					{#if company.id}
						<div class="orga-card-white p-6 border border-neutral-100 shadow-sm">
							<h3 class="text-xs font-extrabold text-neutral-400 uppercase tracking-widest mb-4">System Info</h3>
							<div class="space-y-3 text-sm">
								<div class="flex justify-between items-center py-2 border-b border-neutral-50">
									<span class="text-neutral-500 font-bold">Unternehmens-ID</span>
									<span class="font-mono font-medium text-neutral-800 text-xs">{company.id}</span>
								</div>
								<div class="flex justify-between items-center py-2 border-b border-neutral-50">
									<span class="text-neutral-500 font-bold">Registriert seit</span>
									<span class="font-medium text-neutral-800">{new Date(company.created || Date.now()).toLocaleDateString('de-DE')}</span>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<div class="lg:col-span-2">
					<form onsubmit={saveCompany} class="orga-card-white border border-neutral-100 overflow-hidden shadow-sm">
						
						<div class="p-6 md:p-8 border-b border-neutral-100">
							<h2 class="text-xl font-extrabold text-neutral-900 mb-1">Stammdaten & Abrechnung</h2>
							<p class="text-sm text-neutral-500">Diese Daten bilden den Briefkopf und Absender für alle generierten PDFs und Rechnungen.</p>
						</div>
						
						<div class="p-6 md:p-8 space-y-8 bg-neutral-50/50">
							
							<div>
								<h3 class="text-xs font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">Allgemein</h3>
								<div>
									<label for="c_name" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Firmenname / Inhaber *</label>
									<input id="c_name" type="text" bind:value={company.name} class="orga-input-clear bg-white" placeholder="z.B. Seniorenassistenz Mustermann" required />
								</div>
							</div>

							<div>
								<h3 class="text-xs font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">Hauptsitz / Adresse</h3>
								<div class="grid grid-cols-4 gap-5 mb-5">
									<div class="col-span-3">
										<label for="c_street" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Straße *</label>
										<input id="c_street" type="text" bind:value={company.street} class="orga-input-clear bg-white" required />
									</div>
									<div class="col-span-1">
										<label for="c_nr" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Haus-Nr. *</label>
										<input id="c_nr" type="text" bind:value={company.housenr} class="orga-input-clear bg-white" required />
									</div>
								</div>
								<div class="grid grid-cols-4 gap-5">
									<div class="col-span-1">
										<label for="c_zip" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">PLZ *</label>
										<input id="c_zip" type="text" bind:value={company.zip} class="orga-input-clear bg-white" required />
									</div>
									<div class="col-span-3">
										<label for="c_city" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Stadt *</label>
										<input id="c_city" type="text" bind:value={company.city} class="orga-input-clear bg-white" required />
									</div>
								</div>
							</div>

							<div>
								<h3 class="text-xs font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">Bankdaten</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="col-span-2">
										<label for="c_ik" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5 w-full">Bankname</label>
										<input id="c_ik" type="text" bind:value={company.bank_name} class="orga-input-clear bg-white" />
									</div>
									<div class="col-span-2">
										<label for="c_vat" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5 w-full">IBAN</label>
										<input id="c_vat" type="text" bind:value={company.bank_iban} class="orga-input-clear bg-white" />
									</div>
									<div class="col-span-2">
										<label for="c_vat" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5 w-full">BIC</label>
										<input id="c_vat" type="text" bind:value={company.bank_bic} class="orga-input-clear bg-white" />
									</div>
								</div>
							</div>

							<div>
								<h3 class="text-xs font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">Abrechnungs-Kennungen</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label for="c_ik" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">IK-Nummer (Krankenkassen)</label>
										<input id="c_ik" type="text" bind:value={company.ik_number} class="orga-input-clear bg-white" placeholder="Optional" />
										<p class="text-[10px] text-neutral-400 mt-1.5">Wird für die Abrechnung nach §45b SGB XI benötigt.</p>
									</div>
									<div>
										<label for="c_vat" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Umsatzsteuer-ID / Steuernummer</label>
										<input id="c_vat" type="text" bind:value={company.vatcode} class="orga-input-clear bg-white" placeholder="Optional" />
										<p class="text-[10px] text-neutral-400 mt-1.5">Pflichtangabe auf Rechnungen, falls zutreffend.</p>
									</div>
								</div>
							</div>

						</div>

						<div class="p-6 bg-white border-t border-neutral-100 flex justify-end">
							<button type="submit" disabled={isSaving} class="orga-button-primary py-3! px-8! uppercase tracking-widest font-extrabold text-xs! shadow-md shadow-indigo-600/20">
								{#if isSaving}
									<div class="flex items-center">
										<div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
										Speichert...
									</div>
								{:else}
									Unternehmensdaten Speichern
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</main>
</div>