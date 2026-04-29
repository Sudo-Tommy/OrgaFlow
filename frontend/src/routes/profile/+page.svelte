<script lang="ts">
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { fade } from 'svelte/transition';

	// --- Interfaces (Aktualisiert nach pb_schema_01.json) ---
	interface UserData {
		id: string;
		role: string;
		name_first: string;
		name_last: string;
		username: string;
		email: string;
		date_birth: string;
		street: string;
		housenr: string;
		zip: string;
		city: string;
		sign: string;
		created: string;
		// Neue Relationen aus dem Schema:
		appointments?: string[];
		clients?: string[];
		contacts?: string[];
		documents?: string[];
		accounting?: string[];
		letterboxes?: string[];
	}

	// --- State: Auth ---
	// Wir casten das PocketBase Model auf unser neues UserData Interface
	let currentUser = $state<UserData | null>(pb.authStore.model as unknown as UserData);
	const isAdmin = $derived(currentUser?.role === 'admin');

	// Abgeleitete Initialen für den Avatar
	const initials = $derived(
		((currentUser?.name_first?.[0] || '') + (currentUser?.name_last?.[0] || '')).toUpperCase() || 'OF'
	);

	// --- State: Profil & Stammdaten ---
	let isSavingProfile = $state(false);
	
	let profileData = $state({
		name_first: currentUser?.name_first || '',
		name_last: currentUser?.name_last || '',
		username: currentUser?.username || '',
		email: currentUser?.email || '',
		date_birth: currentUser?.date_birth ? currentUser.date_birth.substring(0, 10) : '',
		street: currentUser?.street || '',
		housenr: currentUser?.housenr || '',
		zip: currentUser?.zip || '',
		city: currentUser?.city || ''
	});

	// --- State: Signatur (Unterschrift) ---
	let signFile = $state<File | null>(null);
	let signPreview = $state<string | null>(
		currentUser?.sign ? pb.files.getURL(currentUser as any, currentUser.sign) : null
	);

	// --- State: Passwort ---
	let isSavingPassword = $state(false);
	let passwordData = $state({
		oldPassword: '',
		password: '',
		passwordConfirm: ''
	});

	// --- File Handler für Signatur ---
	function handleSignChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			signFile = target.files[0];
			signPreview = URL.createObjectURL(signFile);
		}
	}

	// --- Actions ---
	async function saveProfile(e: SubmitEvent) {
		e.preventDefault();
		if (isSavingProfile || !currentUser?.id) return;
		isSavingProfile = true;

		try {
			const formDataObj = new FormData();
			formDataObj.append('name_first', profileData.name_first);
			formDataObj.append('name_last', profileData.name_last);
			formDataObj.append('username', profileData.username);
			formDataObj.append('email', profileData.email);
			formDataObj.append('street', profileData.street);
			formDataObj.append('housenr', profileData.housenr);
			formDataObj.append('zip', profileData.zip);
			formDataObj.append('city', profileData.city);
			
			if (profileData.date_birth) {
				formDataObj.append('date_birth', new Date(profileData.date_birth).toISOString());
			} else {
				formDataObj.append('date_birth', '');
			}

			if (signFile) {
				formDataObj.append('sign', signFile);
			}

			const updatedRecord = await pb.collection('users').update(currentUser.id, formDataObj);
			
			pb.authStore.save(pb.authStore.token, updatedRecord);
			currentUser = pb.authStore.model as unknown as UserData;
			
			signFile = null;
			if (currentUser?.sign) {
				signPreview = pb.files.getURL(currentUser as any, currentUser.sign);
			}
			
			toastService.success('Profil erfolgreich aktualisiert.');
		} catch (error: any) {
			console.error('Profil Update Fehler:', error);
			toastService.error(`Fehler: ${error?.data?.message || 'Bitte Eingaben prüfen.'}`);
		} finally {
			isSavingProfile = false;
		}
	}

	async function savePassword(e: SubmitEvent) {
		e.preventDefault();
		if (isSavingPassword || !currentUser?.id) return;

		if (passwordData.password !== passwordData.passwordConfirm) {
			toastService.error('Die neuen Passwörter stimmen nicht überein.');
			return;
		}

		isSavingPassword = true;

		try {
			await pb.collection('users').update(currentUser.id, passwordData);
			
			passwordData = { oldPassword: '', password: '', passwordConfirm: '' };
			toastService.success('Passwort erfolgreich geändert.');
		} catch (error: any) {
			console.error('Passwort Update Fehler:', error);
			toastService.error(`Fehler: ${error?.data?.message || 'Altes Passwort inkorrekt?'}`);
		} finally {
			isSavingPassword = false;
		}
	}
</script>

<div class="min-h-screen bg-neutral-50 md:bg-neutral-100 flex flex-col md:pl-20 lg:pl-72 transition-all relative">
	
	<header class="bg-white border-b border-neutral-200 p-6 lg:px-10 sticky top-0 z-30 shadow-sm shrink-0">
		<div class="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pl-14 md:pl-0">
			<div>
				<h1 class="text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900">Mein Profil</h1>
				<p class="text-sm text-neutral-500 mt-1 font-medium">Verwalten Sie Ihre persönlichen Daten, Adresse und Signatur.</p>
			</div>
		</div>
	</header>

	<main class="flex-1 p-6 lg:p-10 max-w-5xl mx-auto w-full pb-32" in:fade>
		
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			
			<div class="lg:col-span-1 space-y-6">
				<div class="orga-card-white p-8 text-center border border-neutral-100 relative overflow-hidden shadow-sm">
					<div class="absolute top-0 left-0 w-full h-24 bg-linear-to-br from-indigo-500 to-purple-600"></div>
					
					<div class="relative mx-auto w-24 h-24 bg-white rounded-full p-1.5 shadow-lg mb-4 mt-6">
						<div class="w-full h-full bg-neutral-100 rounded-full flex items-center justify-center text-2xl font-black text-neutral-400">
							{initials}
						</div>
					</div>
					
					<h2 class="text-xl font-extrabold text-neutral-900">{currentUser?.name_first} {currentUser?.name_last}</h2>
					<p class="text-sm text-neutral-500 mb-4 truncate">{currentUser?.email}</p>
					
					<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold text-xs uppercase tracking-wider
						{isAdmin ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}"
					>
						{#if isAdmin}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
							Administrator
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>
							Mitarbeiter
						{/if}
					</div>
				</div>

				<div class="orga-card-white p-6 border border-neutral-100 shadow-sm">
					<h3 class="text-xs font-extrabold text-neutral-400 uppercase tracking-widest mb-4">System Info</h3>
					<div class="space-y-3 text-sm">
						<div class="flex justify-between items-center py-2 border-b border-neutral-50">
							<span class="text-neutral-500 font-bold">Username</span>
							<span class="font-mono font-medium text-neutral-800">{currentUser?.username}</span>
						</div>
						<div class="flex justify-between items-center py-2 border-b border-neutral-50">
							<span class="text-neutral-500 font-bold">Nutzer-ID</span>
							<span class="font-mono font-medium text-neutral-800 text-xs">{currentUser?.id}</span>
						</div>
						<div class="flex justify-between items-center py-2 border-b border-neutral-50">
							<span class="text-neutral-500 font-bold">Erstellt am</span>
							<span class="font-medium text-neutral-800">{new Date(currentUser?.created || Date.now()).toLocaleDateString('de-DE')}</span>
						</div>
						
						<div class="pt-2 space-y-3">
							<div class="flex justify-between items-center">
								<span class="text-indigo-500 font-bold text-xs uppercase tracking-widest">Klienten</span>
								<span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-xs">{currentUser?.clients?.length || 0}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-indigo-500 font-bold text-xs uppercase tracking-widest">Termine</span>
								<span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-xs">{currentUser?.appointments?.length || 0}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-indigo-500 font-bold text-xs uppercase tracking-widest">Dokumente</span>
								<span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-xs">{currentUser?.documents?.length || 0}</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="lg:col-span-2 space-y-8">
				
				<form onsubmit={saveProfile} class="orga-card-white border border-neutral-100 overflow-hidden shadow-sm">
					<div class="p-6 md:p-8 border-b border-neutral-100">
						<h2 class="text-xl font-extrabold text-neutral-900 mb-1">Stammdaten & Signatur</h2>
						<p class="text-sm text-neutral-500">Diese Daten werden unter anderem für die Rechnungserstellung genutzt.</p>
					</div>
					
					<div class="p-6 md:p-8 space-y-8 bg-neutral-50/50">
						
						<div>
							<h3 class="text-xs font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">Zur Person</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label for="p_fname" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Vorname *</label>
									<input id="p_fname" type="text" bind:value={profileData.name_first} class="orga-input-clear bg-white" required />
								</div>
								<div>
									<label for="p_lname" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Nachname *</label>
									<input id="p_lname" type="text" bind:value={profileData.name_last} class="orga-input-clear bg-white" required />
								</div>
								<div>
									<label for="p_birth" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Geburtsdatum</label>
									<input id="p_birth" type="date" bind:value={profileData.date_birth} class="orga-input-clear bg-white" />
								</div>
								<div>
									<label for="p_user" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Username *</label>
									<input id="p_user" type="text" bind:value={profileData.username} class="orga-input-clear bg-white" required />
								</div>
								<div class="md:col-span-2">
									<label for="p_email" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">E-Mail Adresse *</label>
									<input id="p_email" type="email" bind:value={profileData.email} class="orga-input-clear bg-white" required />
								</div>
							</div>
						</div>

						<div>
							<h3 class="text-xs font-extrabold text-indigo-600 uppercase tracking-widest border-b border-neutral-200 pb-2 mb-4">Adresse</h3>
							<div class="grid grid-cols-4 gap-5">
								<div class="col-span-3">
									<label for="p_street" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Straße</label>
									<input id="p_street" type="text" bind:value={profileData.street} class="orga-input-clear bg-white" />
								</div>
								<div class="col-span-1">
									<label for="p_housenr" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Haus-Nr.</label>
									<input id="p_housenr" type="text" bind:value={profileData.housenr} class="orga-input-clear bg-white" />
								</div>
								<div class="col-span-1">
									<label for="p_zip" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">PLZ</label>
									<input id="p_zip" type="text" bind:value={profileData.zip} class="orga-input-clear bg-white" />
								</div>
								<div class="col-span-3">
									<label for="p_city" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Stadt</label>
									<input id="p_city" type="text" bind:value={profileData.city} class="orga-input-clear bg-white" />
								</div>
							</div>
						</div>

						<div class="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-sm">
							<h3 class="text-xs font-extrabold text-indigo-800 uppercase tracking-widest mb-1.5">Ihre Digitale Unterschrift</h3>
							<p class="text-xs text-indigo-600/80 mb-4">Diese wird automatisch auf Rechnungen und Dokumenten eingefügt. (Empfohlen: Transparente PNG)</p>
							
							<div class="flex flex-col sm:flex-row items-center gap-6">
								<div class="h-20 w-full sm:w-48 bg-white border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center overflow-hidden">
									{#if signPreview}
										<img src={signPreview} alt="Signatur Vorschau" class="h-full w-full object-contain p-2" />
									{:else}
										<span class="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Keine Signatur</span>
									{/if}
								</div>
								<div class="flex-1 w-full">
									<label for="sign_upload" class="block w-full text-center px-4 py-3 bg-white border border-indigo-200 text-indigo-600 font-bold text-sm rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
										<span class="flex items-center justify-center gap-2">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
											Signatur hochladen
										</span>
										<input id="sign_upload" type="file" accept="image/*" class="sr-only" onchange={handleSignChange} />
									</label>
									{#if signFile}
										<p class="text-[10px] text-indigo-500 mt-2 font-medium text-center">Datei ausgewählt: {signFile.name}</p>
									{/if}
								</div>
							</div>
						</div>

					</div>

					<div class="p-6 bg-white border-t border-neutral-100 flex justify-end">
						<button type="submit" disabled={isSavingProfile} class="orga-button-primary py-2.5! px-8! shadow-md shadow-indigo-600/20 uppercase tracking-widest font-extrabold text-xs!">
							{#if isSavingProfile}
								<div class="flex items-center">
									<div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
									Speichert...
								</div>
							{:else}
								Profil Speichern
							{/if}
						</button>
					</div>
				</form>

				<form onsubmit={savePassword} class="orga-card-white border border-neutral-100 overflow-hidden shadow-sm">
					<div class="p-6 md:p-8 border-b border-neutral-100">
						<h2 class="text-xl font-extrabold text-neutral-900 mb-1">Passwort ändern</h2>
						<p class="text-sm text-neutral-500">Wir empfehlen ein starkes Passwort mit mindestens 8 Zeichen.</p>
					</div>
					
					<div class="p-6 md:p-8 space-y-6 bg-neutral-50/50">
						<div>
							<label for="pw_old" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Aktuelles Passwort</label>
							<input id="pw_old" type="password" bind:value={passwordData.oldPassword} class="orga-input-clear bg-white" required />
						</div>
						<div class="h-px w-full bg-neutral-200/60 my-2"></div>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label for="pw_new" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Neues Passwort</label>
								<input id="pw_new" type="password" bind:value={passwordData.password} class="orga-input-clear bg-white" minlength="8" required />
							</div>
							<div>
								<label for="pw_confirm" class="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-1.5">Neues Passwort bestätigen</label>
								<input id="pw_confirm" type="password" bind:value={passwordData.passwordConfirm} class="orga-input-clear bg-white" minlength="8" required />
							</div>
						</div>
					</div>

					<div class="p-6 bg-white border-t border-neutral-100 flex justify-end">
						<button type="submit" disabled={isSavingPassword || !passwordData.oldPassword || !passwordData.password} class="orga-button-primary py-2.5! px-8! shadow-md shadow-indigo-600/20 uppercase tracking-widest font-extrabold text-xs!">
							{#if isSavingPassword}
								<div class="flex items-center">
									<div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
									Ändert...
								</div>
							{:else}
								Passwort ändern
							{/if}
						</button>
					</div>
				</form>

			</div>
		</div>
	</main>
</div>