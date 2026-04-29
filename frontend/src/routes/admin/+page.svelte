<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { goto } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';

	// --- Interfaces ---
	interface CompanyData {
		id: string;
		name: string;
		street: string;
		housenr: string;
		zip: string;
		city: string;
		vatcode: string;
		ik_number: string;
		logo: string;
	}

	interface UserData {
		id: string;
		username: string;
		email: string;
		name_first: string;
		name_last: string;
		role: string;
		created: string;
	}

	interface CatalogItem {
		id: string;
		title?: string; // für activities
		name?: string;  // für homes/insurers
		type?: string;  // für insurers
	}

	// --- State ---
	let isLoading = $state(true);
	let activeTab = $state<'company' | 'users' | 'catalogs'>('company');
	
	// Daten-States
	let company = $state<CompanyData | null>(null);
	let users = $state<UserData[]>([]);
	let activities = $state<CatalogItem[]>([]);
	let insurers = $state<CatalogItem[]>([]);
	let homes = $state<CatalogItem[]>([]);

	// Formular-States (Unternehmensdaten)
	let isSavingCompany = $state(false);
	let logoFile = $state<File | null>(null);
	let logoPreview = $state<string | null>(null);

	// Inline-Add States
	let newActivityTitle = $state('');
	let newHomeName = $state('');
	let newInsurerName = $state('');
	let newInsurerType = $state('GKV (Gesetzlich)');

	// --- Lifecycle & Auth ---
	onMount(async () => {
		// Harter Block: Nur Admins dürfen hier rein!
		if (!pb.authStore.isValid || pb.authStore.model?.role !== 'admin') {
			toastService.error('Zugriff verweigert. Administrator-Rechte erforderlich.');
			goto('/dashboard');
			return;
		}
		
		await loadAllData();
		isLoading = false;
	});

	async function loadAllData() {
		try {
			// 1. Unternehmensdaten laden (wir nehmen den ersten Eintrag)
			const compRes = await pb.collection('company').getFullList<CompanyData>({ requestKey: null });
			if (compRes.length > 0) {
				company = compRes[0];
				if (company.logo) logoPreview = pb.files.getURL(company, company.logo);
			}

			// 2. User laden
			users = await pb.collection('users').getFullList<UserData>({ sort: '-created', requestKey: null });

			// 3. Kataloge laden
			activities = await pb.collection('work_activities').getFullList<CatalogItem>({ sort: 'title', requestKey: null });
			insurers = await pb.collection('health_insurers').getFullList<CatalogItem>({ sort: 'name', requestKey: null });
			homes = await pb.collection('retirement_homes').getFullList<CatalogItem>({ sort: 'name', requestKey: null });
		} catch (error) {
			console.error('Fehler beim Laden der Admin-Daten:', error);
			toastService.error('Fehler beim Laden der Systemdaten.');
		}
	}

	// --- Actions: Company ---
	function handleLogoChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			logoFile = target.files[0];
			logoPreview = URL.createObjectURL(logoFile);
		}
	}

	async function saveCompany(e: SubmitEvent) {
		e.preventDefault();
		if (isSavingCompany || !company) return;
		isSavingCompany = true;

		try {
			const formData = new FormData();
			formData.append('name', company.name);
			formData.append('street', company.street);
			formData.append('housenr', company.housenr);
			formData.append('zip', company.zip);
			formData.append('city', company.city);
			formData.append('vatcode', company.vatcode || '');
			formData.append('ik_number', company.ik_number || '');

			if (logoFile) formData.append('logo', logoFile);

			if (company.id) {
				await pb.collection('company').update(company.id, formData);
			} else {
				await pb.collection('company').create(formData);
			}

			toastService.success('Unternehmensdaten gespeichert.');
			logoFile = null; 
		} catch (error) {
			toastService.error('Fehler beim Speichern der Unternehmensdaten.');
		} finally {
			isSavingCompany = false;
		}
	}

	// --- Actions: Users ---
	async function toggleUserRole(user: UserData) {
		if (user.id === pb.authStore.model?.id) {
			toastService.error('Sie können Ihre eigene Rolle nicht ändern.');
			return;
		}
		
		const newRole = user.role === 'admin' ? 'user' : 'admin';
		try {
			await pb.collection('users').update(user.id, { role: newRole });
			user.role = newRole; // Lokales Update
			toastService.success(`Rolle von ${user.name_first} auf ${newRole} geändert.`);
		} catch (error) {
			toastService.error('Fehler bei der Rollenänderung.');
		}
	}

	async function deleteUser(user: UserData) {
		if (user.id === pb.authStore.model?.id) {
			toastService.error('Sie können sich nicht selbst löschen.');
			return;
		}
		if (!confirm(`Möchten Sie den Mitarbeiter ${user.name_first} ${user.name_last} wirklich löschen?`)) return;

		try {
			await pb.collection('users').delete(user.id);
			users = users.filter(u => u.id !== user.id);
			toastService.success('Mitarbeiter gelöscht.');
		} catch (error) {
			toastService.error('Fehler beim Löschen des Mitarbeiters.');
		}
	}

	// --- Actions: Catalogs ---
	async function addActivity(e: SubmitEvent) {
		e.preventDefault();
		if (!newActivityTitle.trim()) return;
		try {
			const res = await pb.collection('work_activities').create<CatalogItem>({ title: newActivityTitle.trim() });
			activities = [...activities, res].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
			newActivityTitle = '';
			toastService.success('Tätigkeit hinzugefügt.');
		} catch (e) { toastService.error('Fehler.'); }
	}

	async function addHome(e: SubmitEvent) {
		e.preventDefault();
		if (!newHomeName.trim()) return;
		try {
			const res = await pb.collection('retirement_homes').create<CatalogItem>({ name: newHomeName.trim() });
			homes = [...homes, res].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
			newHomeName = '';
			toastService.success('Seniorenheim hinzugefügt.');
		} catch (e) { toastService.error('Fehler.'); }
	}

	async function addInsurer(e: SubmitEvent) {
		e.preventDefault();
		if (!newInsurerName.trim()) return;
		try {
			const res = await pb.collection('health_insurers').create<CatalogItem>({ name: newInsurerName.trim(), type: newInsurerType });
			insurers = [...insurers, res].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
			newInsurerName = '';
			toastService.success('Krankenkasse hinzugefügt.');
		} catch (e) { toastService.error('Fehler.'); }
	}

	async function deleteCatalogItem(collection: string, id: string) {
		if (!confirm('Eintrag wirklich löschen?')) return;
		try {
			await pb.collection(collection).delete(id);
			if (collection === 'work_activities') activities = activities.filter(i => i.id !== id);
			if (collection === 'retirement_homes') homes = homes.filter(i => i.id !== id);
			if (collection === 'health_insurers') insurers = insurers.filter(i => i.id !== id);
			toastService.success('Gelöscht.');
		} catch (e) { toastService.error('Fehler beim Löschen.'); }
	}
</script>

<div class="min-h-screen bg-neutral-50 md:bg-neutral-100 flex flex-col md:pl-20 lg:pl-72 transition-all relative">
	
	<header class="bg-white border-b border-neutral-200 p-6 lg:px-10 sticky top-0 z-30 shadow-sm shrink-0">
		<div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pl-14 md:pl-0">
			<div>
				<h1 class="text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 flex items-center gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
					System-Administration
				</h1>
				<p class="text-sm text-neutral-500 mt-1 font-medium">Verwalten Sie globale Einstellungen, Mitarbeiter und Kataloge.</p>
			</div>
		</div>
	</header>

	{#if isLoading}
		<div class="flex-1 flex justify-center items-center">
			<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
		</div>
	{:else}
		<main class="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full pb-32" in:fade>
			
			<div class="flex border-b border-neutral-200 mb-8 gap-8 overflow-x-auto custom-scrollbar">
				<button 
					type="button" 
					onclick={() => activeTab = 'company'} 
					class="pb-4 text-sm font-extrabold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap {activeTab === 'company' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}"
				>
					Unternehmensdaten
				</button>
				<button 
					type="button" 
					onclick={() => activeTab = 'users'} 
					class="pb-4 text-sm font-extrabold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 {activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}"
				>
					Mitarbeiter
					<span class="bg-neutral-100 text-neutral-600 py-0.5 px-2 rounded-full text-[10px]">{users.length}</span>
				</button>
				<button 
					type="button" 
					onclick={() => activeTab = 'catalogs'} 
					class="pb-4 text-sm font-extrabold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap {activeTab === 'catalogs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}"
				>
					Kataloge & Listen
				</button>
			</div>

			{#if activeTab === 'company' && company}
				<div in:fade={{duration: 200}} class="orga-card-white border border-neutral-100 overflow-hidden shadow-sm max-w-3xl">
					<div class="p-6 md:p-8 border-b border-neutral-100 bg-neutral-50/50">
						<h2 class="text-xl font-extrabold text-neutral-900 mb-1">Firmendaten & Logo</h2>
						<p class="text-sm text-neutral-500">Diese Daten bilden den Briefkopf für Ihre generierten Rechnungen.</p>
					</div>

					<form onsubmit={saveCompany} class="p-6 md:p-8 space-y-8 bg-white">
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="md:col-span-2">
								<label for="c_name" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Firmenname / Inhaber *</label>
								<input id="c_name" type="text" bind:value={company.name} class="orga-input-clear bg-neutral-50" required />
							</div>
							
							<div class="md:col-span-2 grid grid-cols-4 gap-4">
								<div class="col-span-3">
									<label for="c_street" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Straße *</label>
									<input id="c_street" type="text" bind:value={company.street} class="orga-input-clear bg-neutral-50" required />
								</div>
								<div class="col-span-1">
									<label for="c_nr" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Nr. *</label>
									<input id="c_nr" type="text" bind:value={company.housenr} class="orga-input-clear bg-neutral-50" required />
								</div>
							</div>

							<div class="md:col-span-2 grid grid-cols-4 gap-4">
								<div class="col-span-1">
									<label for="c_zip" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">PLZ *</label>
									<input id="c_zip" type="text" bind:value={company.zip} class="orga-input-clear bg-neutral-50" required />
								</div>
								<div class="col-span-3">
									<label for="c_city" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Stadt *</label>
									<input id="c_city" type="text" bind:value={company.city} class="orga-input-clear bg-neutral-50" required />
								</div>
							</div>

							<div>
								<label for="c_ik" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">IK-Nummer</label>
								<input id="c_ik" type="text" bind:value={company.ik_number} class="orga-input-clear bg-neutral-50" placeholder="Optional" />
							</div>
							<div>
								<label for="c_vat" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Umsatzsteuer-ID</label>
								<input id="c_vat" type="text" bind:value={company.vatcode} class="orga-input-clear bg-neutral-50" placeholder="Optional" />
							</div>
						</div>

						<div class="bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl">
							<h3 class="text-xs font-extrabold text-indigo-800 uppercase tracking-widest mb-1.5">Firmenlogo (PDF Briefkopf)</h3>
							<div class="flex flex-col sm:flex-row items-center gap-6 mt-4">
								<div class="h-20 w-full sm:w-48 bg-white border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center overflow-hidden">
									{#if logoPreview}
										<img src={logoPreview} alt="Logo Vorschau" class="h-full w-full object-contain p-2" />
									{:else}
										<span class="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Kein Logo</span>
									{/if}
								</div>
								<div class="flex-1 w-full">
									<label for="logo_upload" class="block w-full text-center px-4 py-3 bg-white border border-indigo-200 text-indigo-600 font-bold text-sm rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
										<span class="flex items-center justify-center gap-2">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
											Neues Logo hochladen
										</span>
										<input id="logo_upload" type="file" accept="image/*" class="sr-only" onchange={handleLogoChange} />
									</label>
								</div>
							</div>
						</div>

						<div class="flex justify-end pt-4 border-t border-neutral-100">
							<button type="submit" disabled={isSavingCompany} class="orga-button-primary py-3! px-8! uppercase tracking-widest font-extrabold text-xs! shadow-md shadow-indigo-600/20">
								{#if isSavingCompany}
									<div class="flex items-center"><div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Speichert...</div>
								{:else}
									Unternehmensdaten Speichern
								{/if}
							</button>
						</div>
					</form>
				</div>
			{/if}

			{#if activeTab === 'users'}
				<div in:fade={{duration: 200}} class="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
					<div class="grid grid-cols-12 gap-4 p-4 border-b border-neutral-100 bg-neutral-50/50 text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest hidden md:grid">
						<div class="col-span-4 pl-4">Name & Username</div>
						<div class="col-span-4">Kontakt</div>
						<div class="col-span-2">Rolle</div>
						<div class="col-span-2 text-right pr-4">Aktionen</div>
					</div>

					<div class="divide-y divide-neutral-100">
						{#each users as user}
							<div class="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-5 hover:bg-neutral-50/50 transition-colors items-center">
								
								<div class="col-span-1 md:col-span-4 flex items-center gap-4 pl-2">
									<div class="h-10 w-10 rounded-full {user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-neutral-100 text-neutral-600'} flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-200">
										{user.name_first[0]}{user.name_last[0]}
									</div>
									<div class="min-w-0">
										<h3 class="text-sm font-bold text-neutral-900 truncate">{user.name_first} {user.name_last}</h3>
										<p class="text-xs text-neutral-500 font-mono mt-0.5 truncate">@{user.username}</p>
									</div>
								</div>

								<div class="hidden md:block col-span-4 min-w-0">
									<p class="text-sm text-neutral-700 font-medium truncate">{user.email}</p>
									<p class="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-widest">Registriert: {new Date(user.created).toLocaleDateString('de-DE')}</p>
								</div>

								<div class="hidden md:flex col-span-2 items-center">
									{#if user.role === 'admin'}
										<span class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
											Admin
										</span>
									{:else}
										<span class="bg-neutral-100 text-neutral-600 border border-neutral-200 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide">
											Mitarbeiter
										</span>
									{/if}
								</div>

								<div class="hidden md:flex col-span-2 justify-end items-center pr-2 gap-2">
									<button type="button" aria-label="Rolle ändern" onclick={() => toggleUserRole(user)} class="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors focus:outline-none" title="Rolle wechseln">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
									</button>
									<button type="button" aria-label="Nutzer löschen" onclick={() => deleteUser(user)} class="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none" title="Benutzer löschen">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if activeTab === 'catalogs'}
				<div in:fade={{duration: 200}} class="grid grid-cols-1 lg:grid-cols-3 gap-8">
					
					<div class="orga-card-white border border-neutral-100 flex flex-col h-140">
						<div class="p-6 border-b border-neutral-100 bg-indigo-50/30">
							<h3 class="text-sm font-extrabold text-indigo-900 uppercase tracking-widest">Arbeits-Tätigkeiten</h3>
							<p class="text-xs text-neutral-500 mt-1">Für die Zeiterfassung</p>
						</div>
						<div class="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
							{#each activities as act}
								<div class="flex justify-between items-center bg-white border border-neutral-200 p-3 rounded-xl shadow-sm group hover:border-indigo-200">
									<span class="text-sm font-bold text-neutral-700 truncate pr-4">{act.title}</span>
									<button type="button" aria-label="Löschen" onclick={() => deleteCatalogItem('work_activities', act.id)} class="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
									</button>
								</div>
							{/each}
						</div>
						<form onsubmit={addActivity} class="p-4 border-t border-neutral-100 bg-neutral-50 flex gap-2">
							<input type="text" bind:value={newActivityTitle} placeholder="Neue Tätigkeit..." class="orga-input-clear bg-white flex-1 text-sm!" required />
							<button type="submit" aria-label="Hinzufügen" class="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition shadow-sm shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
							</button>
						</form>
					</div>

					<div class="orga-card-white border border-neutral-100 flex flex-col h-140">
						<div class="p-6 border-b border-neutral-100 bg-emerald-50/30">
							<h3 class="text-sm font-extrabold text-emerald-900 uppercase tracking-widest">Seniorenheime</h3>
							<p class="text-xs text-neutral-500 mt-1">Zuweisung für Klienten</p>
						</div>
						<div class="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
							{#each homes as home}
								<div class="flex justify-between items-center bg-white border border-neutral-200 p-3 rounded-xl shadow-sm group hover:border-emerald-200">
									<span class="text-sm font-bold text-neutral-700 truncate pr-4">{home.name}</span>
									<button type="button" aria-label="Löschen" onclick={() => deleteCatalogItem('retirement_homes', home.id)} class="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
									</button>
								</div>
							{/each}
						</div>
						<form onsubmit={addHome} class="p-4 border-t border-neutral-100 bg-neutral-50 flex gap-2">
							<input type="text" bind:value={newHomeName} placeholder="Einrichtung..." class="orga-input-clear bg-white flex-1 text-sm!" required />
							<button type="submit" aria-label="Hinzufügen" class="bg-emerald-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-emerald-700 transition shadow-sm shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
							</button>
						</form>
					</div>

					<div class="orga-card-white border border-neutral-100 flex flex-col h-140">
						<div class="p-6 border-b border-neutral-100 bg-purple-50/30">
							<h3 class="text-sm font-extrabold text-purple-900 uppercase tracking-widest">Krankenkassen</h3>
							<p class="text-xs text-neutral-500 mt-1">Kostenträger der Klienten</p>
						</div>
						<div class="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
							{#each insurers as ins}
								<div class="flex justify-between items-start bg-white border border-neutral-200 p-3 rounded-xl shadow-sm group hover:border-purple-200">
									<div class="flex flex-col min-w-0 pr-4">
										<span class="text-sm font-bold text-neutral-700 truncate">{ins.name}</span>
										<span class="text-[9px] font-bold text-purple-600 uppercase tracking-widest mt-0.5">{ins.type}</span>
									</div>
									<button type="button" aria-label="Löschen" onclick={() => deleteCatalogItem('health_insurers', ins.id)} class="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 mt-1">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
									</button>
								</div>
							{/each}
						</div>
						<form onsubmit={addInsurer} class="p-4 border-t border-neutral-100 bg-neutral-50 flex flex-col gap-2">
							<div class="flex gap-2">
								<input type="text" bind:value={newInsurerName} placeholder="Name..." class="orga-input-clear bg-white flex-1 text-sm!" required />
								<button type="submit" aria-label="Hinzufügen" class="bg-purple-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-purple-700 transition shadow-sm shrink-0">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
								</button>
							</div>
							<select bind:value={newInsurerType} class="orga-input-clear bg-white text-xs! py-2!">
								<option>GKV (Gesetzlich)</option>
								<option>PKV (Privat)</option>
								<option>Beihilfe</option>
								<option>Berufsgenossenschaft</option>
							</select>
						</form>
					</div>

				</div>
			{/if}

		</main>
	{/if}
</div>