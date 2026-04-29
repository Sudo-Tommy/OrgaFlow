<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { fade } from 'svelte/transition';
	import ClientManager from '$lib/components/ClientManager.svelte';

	// --- Interfaces ---
	interface ClientData {
		id: string;
		salutation: string;
		name_first: string;
		name_last: string;
		email: string;
		phone: string;
		handy: string;
		street: string;
		housenr: string;
		zip: string;
		city: string;
		level_of_care: string;
	}

	// --- State ---
	let clients = $state.raw<ClientData[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');

	// Modal State
	let isModalOpen = $state(false);
	let selectedClient = $state<ClientData | null>(null);

	// --- Derived Data (Live Suche) ---
	const filteredClients = $derived(
		clients.filter(c => {
			const search = searchQuery.toLowerCase();
			const fullName = `${c.name_first} ${c.name_last}`.toLowerCase();
			return fullName.includes(search) || 
				   c.city.toLowerCase().includes(search) ||
				   (c.email && c.email.toLowerCase().includes(search));
		})
	);

	// --- Lifecycle ---
	onMount(async () => {
		await loadClients();
		isLoading = false;
	});

	async function loadClients() {
		try {
			// Lade alle Klienten alphabetisch sortiert
			clients = await pb.collection('clients').getFullList<ClientData>({ sort: 'name_last' });
		} catch (error) {
			console.error("Fehler beim Laden der Klienten:", error);
		}
	}

	// --- Actions ---
	function openModal(client: ClientData | null = null) {
		selectedClient = client;
		isModalOpen = true;
	}

	function handleModalClosed() {
		isModalOpen = false;
		// Lade die Liste neu, falls ein Klient gespeichert/gelöscht wurde
		loadClients(); 
	}
</script>

<div class="min-h-screen bg-neutral-50 md:bg-neutral-100 flex flex-col md:pl-20 lg:pl-72 transition-all">
	
	<header class="bg-white border-b border-neutral-200 p-4 md:p-6 lg:px-10 sticky top-0 z-30 shadow-sm shrink-0">
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center max-w-7xl mx-auto gap-4">
			<div class="pl-14 md:pl-0"> 
				<h1 class="text-xl md:text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 md:h-8 md:w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
					Klientenstamm
				</h1>
				<p class="text-xs md:text-sm text-neutral-500 font-medium mt-1">Verwalten Sie hier alle Stammdaten und Patientenakte.</p>
			</div>

			<div class="flex items-center gap-3 w-full sm:w-auto">
				<div class="relative w-full sm:w-64">
					<input 
						type="text" 
						bind:value={searchQuery} 
						placeholder="Name oder Stadt..." 
						aria-label="Klienten durchsuchen"
						class="orga-input-clear pl-10! py-2.5! text-sm!" 
					/>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</div>
				
				<button type="button" onclick={() => openModal()} class="orga-button-primary py-2.5! px-5! text-sm! shrink-0 shadow-lg shadow-indigo-600/20">
					+ Neuer Klient
				</button>
			</div>
		</div>
	</header>

	<main class="flex-1 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full pb-32" in:fade>
		
		{#if isLoading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
			</div>
		{:else if clients.length === 0}
			<div class="bg-white border border-neutral-200 rounded-3xl p-12 text-center shadow-sm max-w-2xl mx-auto mt-10">
				<div class="mx-auto w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
				</div>
				<h3 class="text-xl font-bold text-neutral-800">Noch keine Klienten angelegt</h3>
				<p class="text-neutral-500 mt-2 leading-relaxed">Ihre Datenbank ist noch leer. Beginnen Sie damit, Ihren ersten Klienten oder Patienten anzulegen, um Termine und Rechnungen zu verknüpfen.</p>
				<button onclick={() => openModal()} class="orga-button-primary py-2.5! px-6! mt-8 mx-auto shadow-md">
					Ersten Klienten anlegen
				</button>
			</div>
		{:else if filteredClients.length === 0}
			<div class="text-center py-20">
				<p class="text-neutral-500 font-medium text-lg">Keine Klienten für "{searchQuery}" gefunden.</p>
			</div>
		{:else}
			
			<div class="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
				
				<div class="grid grid-cols-12 gap-4 p-4 border-b border-neutral-100 bg-neutral-50/50 text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest hidden md:grid">
					<div class="col-span-4 pl-4">Name & Patient</div>
					<div class="col-span-3">Kontakt</div>
					<div class="col-span-3">Wohnort</div>
					<div class="col-span-2 text-right pr-6">Details</div>
				</div>

				<div class="divide-y divide-neutral-100">
					{#each filteredClients as client (client.id)}
						<button 
							type="button" 
							onclick={() => openModal(client)} 
							class="w-full text-left grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-5 hover:bg-indigo-50/30 transition-colors items-center group focus:outline-none focus:bg-indigo-50/50"
						>
							
							<div class="col-span-1 md:col-span-4 flex items-center gap-4 md:pl-2">
								<div class="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-200/50 shadow-sm">
									{client.name_first[0]}{client.name_last[0]}
								</div>
								<div class="min-w-0">
									<h3 class="text-sm font-bold text-neutral-900 truncate">{client.name_first} {client.name_last}</h3>
									<p class="text-xs text-neutral-500 font-medium md:hidden mt-0.5 truncate">
										{client.city} • PG {client.level_of_care}
									</p>
								</div>
							</div>

							<div class="hidden md:block col-span-3 min-w-0">
								{#if client.phone || client.handy}
									<p class="text-sm text-neutral-700 font-medium truncate">{client.phone || client.handy}</p>
								{:else}
									<p class="text-sm text-neutral-400 italic">Keine Nummer</p>
								{/if}
								{#if client.email}
									<p class="text-[11px] text-neutral-500 truncate">{client.email}</p>
								{/if}
							</div>

							<div class="hidden md:block col-span-3 min-w-0">
								<p class="text-sm text-neutral-700 font-medium truncate">{client.city || 'Unbekannt'}</p>
								<p class="text-[11px] text-neutral-500 truncate">{client.street} {client.housenr}</p>
							</div>

							<div class="hidden md:flex col-span-2 justify-end items-center pr-2 gap-4">
								{#if client.level_of_care !== '0'}
									<span class="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide">
										PG {client.level_of_care}
									</span>
								{:else}
									<span class="text-neutral-400 text-[10px] font-bold uppercase tracking-wide">Privat</span>
								{/if}
								<div class="text-neutral-300 group-hover:text-indigo-500 transition-colors bg-white group-hover:bg-indigo-100 rounded-full p-1 border border-transparent group-hover:border-indigo-200">
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
	<ClientManager 
		isOpen={isModalOpen} 
		client={selectedClient} 
		onClosed={handleModalClosed} 
	/>
{/if}