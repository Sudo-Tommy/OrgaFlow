<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { fade } from 'svelte/transition';
	
	// Wir binden hier das Modal ein (falls noch nicht vorhanden, bauen wir das im nächsten Schritt)
	import ContactManager from '$lib/components/ContactManager.svelte';

	// --- Interfaces (Nach pb_schema_01) ---
	interface ContactData {
		id: string;
		name_first: string;
		name_last: string;
		email: string;
		phone: string;
		street: string;
		housenr: string;
		zip: string;
		city: string;
		expand?: {
			// Relationen kommen als Arrays!
			client?: Array<{ name_first: string; name_last: string; }>;
			employee_from?: Array<{ name: string; }>;
		};
	}

	// --- State ---
	let contacts = $state.raw<ContactData[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');

	// Modal State
	let isModalOpen = $state(false);
	let selectedContact = $state<ContactData | null>(null);

	// --- Derived Data (Live Suche) ---
	const filteredContacts = $derived(
		contacts.filter(c => {
			if (!searchQuery) return true;
			const search = searchQuery.toLowerCase();
			const fullName = `${c.name_first} ${c.name_last}`.toLowerCase();
			
			// Suche in Name, Stadt oder E-Mail
			return fullName.includes(search) || 
				   (c.city && c.city.toLowerCase().includes(search)) ||
				   (c.email && c.email.toLowerCase().includes(search));
		})
	);

	// --- Lifecycle ---
	onMount(async () => {
		await loadContacts();
		isLoading = false;
	});

	async function loadContacts() {
		try {
			// Wir laden die Kontakte und "expandieren" die Relationen (Klienten & Seniorenheime),
			// damit wir in der Liste direkt sehen, wozu der Kontakt gehört.
			contacts = await pb.collection('contacts').getFullList<ContactData>({ 
				sort: 'name_last',
				expand: 'client,employee_from'
			});
		} catch (error) {
			console.error("Fehler beim Laden der Kontakte:", error);
		}
	}

	// --- Actions ---
	function openModal(contact: ContactData | null = null) {
		selectedContact = contact;
		isModalOpen = true;
	}

	function handleModalClosed() {
		isModalOpen = false;
		// Daten neu laden, falls im Modal gespeichert/gelöscht wurde
		loadContacts(); 
	}
</script>

<div class="min-h-screen bg-neutral-50 md:bg-neutral-100 flex flex-col md:pl-20 lg:pl-72 transition-all">
	
	<header class="bg-white border-b border-neutral-200 p-4 md:p-6 lg:px-10 sticky top-0 z-30 shadow-sm shrink-0">
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center max-w-7xl mx-auto gap-4">
			<div class="pl-14 md:pl-0"> 
				<h1 class="text-xl md:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-3">
					<div class="p-2 bg-blue-50 text-blue-600 rounded-xl">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
					</div>
					Kontakte & Netzwerk
				</h1>
				<p class="text-xs md:text-sm text-neutral-500 font-medium mt-1.5">Verwalten Sie hier Angehörige, Ärzte und Ansprechpartner in Einrichtungen.</p>
			</div>

			<div class="flex items-center gap-3 w-full sm:w-auto">
				<div class="relative w-full sm:w-64">
					<input 
						type="text" 
						bind:value={searchQuery} 
						placeholder="Name oder Stadt..." 
						aria-label="Kontakte durchsuchen"
						class="orga-input-clear pl-10! py-2.5! text-sm!" 
					/>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</div>
				
				<button type="button" onclick={() => openModal()} class="orga-button-primary bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 py-2.5! px-5! text-sm! shrink-0 shadow-lg">
					+ Neuer Kontakt
				</button>
			</div>
		</div>
	</header>

	<main class="flex-1 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full pb-32" in:fade>
		
		{#if isLoading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
			</div>
		{:else if contacts.length === 0}
			<div class="bg-white border border-neutral-200 rounded-3xl p-12 text-center shadow-sm max-w-2xl mx-auto mt-10">
				<div class="mx-auto w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
				</div>
				<h3 class="text-xl font-bold text-neutral-800">Netzwerk aufbauen</h3>
				<p class="text-neutral-500 mt-2 leading-relaxed text-sm">Sie haben noch keine Kontakte angelegt. Fügen Sie hier Angehörige, Ärzte oder Pflegedienst-Mitarbeiter hinzu, um sie später Klienten zuzuordnen.</p>
				<button onclick={() => openModal()} class="orga-button-primary bg-blue-600 hover:bg-blue-700 py-2.5! px-6! mt-8 mx-auto shadow-md shadow-blue-600/20">
					Ersten Kontakt anlegen
				</button>
			</div>
		{:else if filteredContacts.length === 0}
			<div class="text-center py-20">
				<p class="text-neutral-500 font-medium text-lg">Keine Kontakte für "{searchQuery}" gefunden.</p>
			</div>
		{:else}
			
			<div class="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
				
				<div class="grid grid-cols-12 gap-4 p-4 border-b border-neutral-100 bg-neutral-50/50 text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest hidden md:grid">
					<div class="col-span-4 pl-4">Name des Kontakts</div>
					<div class="col-span-3">Erreichbarkeit</div>
					<div class="col-span-3">Adresse</div>
					<div class="col-span-2 text-right pr-6">Verknüpfung</div>
				</div>

				<div class="divide-y divide-neutral-100">
					{#each filteredContacts as contact (contact.id)}
						<button 
							type="button" 
							onclick={() => openModal(contact)} 
							class="w-full text-left grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-5 hover:bg-blue-50/30 transition-colors items-center group focus:outline-none focus:bg-blue-50/50"
						>
							
							<div class="col-span-1 md:col-span-4 flex items-center gap-4 md:pl-2">
								<div class="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100/50 shadow-sm">
									{contact.name_first[0] || '?'}{contact.name_last[0] || '?'}
								</div>
								<div class="min-w-0">
									<h3 class="text-sm font-bold text-neutral-900 truncate">{contact.name_first} {contact.name_last}</h3>
									
									<div class="md:hidden flex gap-1 mt-1">
										{#if contact.expand?.client && contact.expand.client.length > 0}
											<span class="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-bold">Angehöriger</span>
										{/if}
										{#if contact.expand?.employee_from && contact.expand.employee_from.length > 0}
											<span class="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-bold">Einrichtung</span>
										{/if}
									</div>
								</div>
							</div>

							<div class="hidden md:block col-span-3 min-w-0">
								{#if contact.phone}
									<p class="text-sm text-neutral-700 font-medium truncate">{contact.phone}</p>
								{:else}
									<p class="text-sm text-neutral-400 italic">Keine Telefonnummer</p>
								{/if}
								{#if contact.email}
									<p class="text-[11px] text-neutral-500 truncate">{contact.email}</p>
								{/if}
							</div>

							<div class="hidden md:block col-span-3 min-w-0">
								{#if contact.city}
									<p class="text-sm text-neutral-700 font-medium truncate">{contact.city}</p>
									<p class="text-[11px] text-neutral-500 truncate">{contact.street} {contact.housenr}</p>
								{:else}
									<p class="text-xs text-neutral-400 italic mt-0.5">Keine Adresse hinterlegt</p>
								{/if}
							</div>

							<div class="hidden md:flex col-span-2 justify-end items-center pr-2 gap-3">
								<div class="flex flex-col items-end gap-1">
									{#if contact.expand?.client && contact.expand.client.length > 0}
										<span class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest truncate max-w-[120px]" title="Klient: {contact.expand.client[0].name_first} {contact.expand.client[0].name_last}">
											Klient: {contact.expand.client[0].name_last}
										</span>
									{/if}
									{#if contact.expand?.employee_from && contact.expand.employee_from.length > 0}
										<span class="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest truncate max-w-[120px]" title="Einrichtung: {contact.expand.employee_from[0].name}">
											Heim: {contact.expand.employee_from[0].name}
										</span>
									{/if}
									{#if !contact.expand?.client && !contact.expand?.employee_from}
										<span class="text-neutral-400 text-[10px] font-medium italic">Unverknüpft</span>
									{/if}
								</div>
								<div class="text-neutral-300 group-hover:text-blue-500 transition-colors bg-white group-hover:bg-blue-100 rounded-full p-1 border border-transparent group-hover:border-blue-200">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
								</div>
							</div>

						</button>
					{/each}
				</div>
			</div>
		{/if}
	</main>
</div>

{#if isModalOpen}
	<ContactManager 
		isOpen={isModalOpen} 
		contact={selectedContact} 
		onClosed={handleModalClosed} 
	/>
{/if}