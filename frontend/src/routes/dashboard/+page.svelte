<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import AppointmentManager from '$lib/components/AppointmentManager.svelte';
	import InfoCards from '$lib/components/InfoCards.svelte'; 

	// --- Interfaces (Synchronisiert mit pb_schema_01) ---
	interface Appointment {
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

	interface ClientData {
		id: string;
		name_first: string;
		name_last: string;
	}

	interface UserData {
		id: string;
		name_first: string;
		name_last: string;
		role: string;
	}

	// --- State ---
	let currentUser = $state(pb.authStore.model as unknown as UserData);
	let isLoading = $state(true);

	let appointments = $state.raw<Appointment[]>([]);
	let clients = $state.raw<ClientData[]>([]);
	let adminUsers = $state.raw<UserData[]>([]);

	// Modal State
	let isModalOpen = $state(false);
	let selectedAppointment = $state<Appointment | null>(null);

	// --- Dynamische Begrüßung ---
	const currentHour = new Date().getHours();
	let greeting = $state('Willkommen');

	if (currentHour >= 5 && currentHour < 12) {
		greeting = 'Guten Morgen';
	} else if (currentHour >= 12 && currentHour < 18) {
		greeting = 'Guten Tag';
	} else if (currentHour >= 18 && currentHour < 23) {
		greeting = 'Guten Abend';
	} else {
		greeting = 'Gute Nacht';
	}

	// --- Derived Data ---
	const isAdmin = $derived(currentUser?.role === 'admin');
	const currentDate = new Date();
	const formattedDate = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(currentDate);

	const todaysAppointments = $derived(
		appointments.filter((a: Appointment) => {
			const d = new Date(a.appointment);
			return d.getDate() === currentDate.getDate() && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
		})
	);

	const upcomingAppointments = $derived(
		appointments.filter((a: Appointment) => {
			const d = new Date(a.appointment);
			const inTwoWeeks = new Date();
			inTwoWeeks.setDate(currentDate.getDate() + 14);
			return d > currentDate && d.getDate() !== currentDate.getDate() && d <= inTwoWeeks;
		})
	);

	// --- Helper Funktionen für die Array-Relationen ---
	function getClientName(appt: Appointment): string {
		if (!appt.expand?.client) return '';
		const c = Array.isArray(appt.expand.client) ? appt.expand.client[0] : appt.expand.client;
		return c ? `${c.name_first} ${c.name_last}` : '';
	}

	function getClientLastName(appt: Appointment): string {
		if (!appt.expand?.client) return '';
		const c = Array.isArray(appt.expand.client) ? appt.expand.client[0] : appt.expand.client;
		return c ? c.name_last : '';
	}

	function getUserName(appt: Appointment): string {
		if (!appt.expand?.user) return '';
		const u = Array.isArray(appt.expand.user) ? appt.expand.user[0] : appt.expand.user;
		return u ? `${u.name_first} ${u.name_last}` : '';
	}

	// --- Lifecycle ---
	onMount(async () => {
		if (!pb.authStore.isValid || !currentUser) {
			goto('/');
			return;
		}

		if (isAdmin) {
			try {
				adminUsers = await pb.collection('users').getFullList<UserData>({ fields: 'id,name_first,name_last' });
			} catch (e) {
				console.error('Konnte User nicht laden:', e);
			}
		}

		await Promise.all([loadDashboardData(), loadClients()]);
		isLoading = false;
	});

	async function loadDashboardData() {
		try {
			const start = new Date();
			start.setDate(start.getDate() - 1);
			
			// Admin sieht alles, Mitarbeiter nur ihre eigenen
			const filter = isAdmin ? `appointment >= "${start.toISOString()}"` : `user = "${currentUser!.id}" && appointment >= "${start.toISOString()}"`;
			
			appointments = await pb.collection('appointments').getFullList<Appointment>({
				filter: filter,
				expand: 'client,user',
				sort: 'appointment'
			});
		} catch (error) {
			console.error('Fehler beim Laden der Dashboard-Daten', error);
			toastService.error('Fehler beim Laden der Termine.');
		}
	}

	async function loadClients() {
		try {
			clients = await pb.collection('clients').getFullList<ClientData>({ sort: 'name_last' });
		} catch (error) {
			console.error(error);
		}
	}

	// --- Actions ---
	function openEditModal(appt: Appointment) {
		selectedAppointment = appt;
		isModalOpen = true;
	}

	async function handleSaved() {
		await loadDashboardData(); 
		isModalOpen = false;
	}
</script>

<div class="min-h-screen bg-neutral-50 md:bg-neutral-100 flex flex-col md:pl-20 lg:pl-72 transition-all">
	
	<header class="bg-white border-b border-neutral-200 p-6 lg:px-10 sticky top-0 z-30 shadow-sm shrink-0">
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center max-w-7xl mx-auto gap-6 pl-14 md:pl-0">
			<div> 
				<h1 class="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight">
					{greeting}, <span class="text-indigo-600">{currentUser?.name_first || currentUser?.username}</span>!
				</h1>
				<p class="text-xs md:text-sm text-neutral-500 font-medium mt-1.5 flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
					{formattedDate}
				</p>
			</div>
			<div class="hidden sm:flex items-center gap-4 w-full md:w-auto">
				<button type="button" aria-label="Zum Kalender navigieren" onclick={() => goto('/appointments')} class="orga-button-primary py-3! px-6! text-sm! w-full md:w-auto shadow-md shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
					Zum Kalender
				</button>
			</div>
		</div>
	</header>

	{#if isLoading}
		<div class="flex-1 flex justify-center items-center">
			<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
		</div>
	{:else}
		<main class="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8 pb-32" in:fade>
			
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="orga-card-white p-6 border border-neutral-100 flex justify-between items-center group hover:-translate-y-1 transition-all shadow-sm">
					<div>
						<p class="text-xs font-extrabold text-indigo-600 uppercase tracking-widest mb-1.5">Termine Heute</p>
						<h3 class="text-4xl font-black text-neutral-900">{todaysAppointments.length}</h3>
					</div>
					<div class="p-4 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100/50 group-hover:scale-110 transition-transform">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					</div>
				</div>

				<div class="orga-card-white p-6 border border-neutral-100 flex justify-between items-center group hover:-translate-y-1 transition-all shadow-sm">
					<div>
						<p class="text-xs font-extrabold text-emerald-600 uppercase tracking-widest mb-1.5">Kommende Tage</p>
						<h3 class="text-4xl font-black text-neutral-900">{upcomingAppointments.length}</h3>
					</div>
					<div class="p-4 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100/50 group-hover:scale-110 transition-transform">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
					</div>
				</div>

				<button type="button" aria-label="Zur Klientenverwaltung" onclick={() => goto('/clients')} class="text-left bg-linear-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 shadow-xl relative overflow-hidden group transition-all hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2">
					<div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
					<div class="flex justify-between items-center relative z-10 h-full text-white">
						<div>
							<p class="text-xs font-extrabold text-indigo-200 uppercase tracking-widest mb-1.5">Klientenstamm</p>
							<h3 class="text-2xl font-extrabold flex items-center gap-2 group-hover:gap-3 transition-all">Verwaltung <span aria-hidden="true">&rarr;</span></h3>
						</div>
						<div class="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/10">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
						</div>
					</div>
				</button>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
				
				<div class="lg:col-span-2 orga-card-white p-6 md:p-8 border border-neutral-100 shadow-sm">
					<div class="flex justify-between items-center mb-8 border-b border-neutral-100 pb-4">
						<h2 class="text-2xl font-extrabold text-neutral-900 flex items-center gap-3">
							<span class="w-2.5 h-7 bg-indigo-500 rounded-full"></span>
							Ihre Einsätze Heute
						</h2>
					</div>

					{#if todaysAppointments.length === 0}
						<div class="text-center py-16 px-4 bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
							<div class="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-neutral-100">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
							</div>
							<p class="text-neutral-500 font-bold">Alles erledigt. Keine Termine heute.</p>
						</div>
					{:else}
						<div class="relative border-l-2 border-neutral-100 ml-3 md:ml-6 space-y-8 pb-4">
							{#each todaysAppointments as appt}
								{@const isPast = new Date(appt.appointment) < new Date()}
								{@const isOwn = appt.user === currentUser?.id}
								
								<button 
									type="button"
									onclick={() => openEditModal(appt)}
									class="relative pl-8 md:pl-10 group cursor-pointer text-left w-full focus:outline-none {isPast ? 'opacity-60 grayscale' : ''}"
								>
									<div class="absolute -left-2.5 top-8 w-5 h-5 rounded-full border-4 border-white {appt.is_private ? 'bg-emerald-500' : 'bg-indigo-500 group-hover:bg-indigo-400'} shadow-sm z-10 transition-colors"></div>
									
									{#if isOwn}
										<div class="bg-white border border-neutral-200 rounded-3xl p-6 transition-all group-hover:shadow-lg group-hover:-translate-y-0.5 group-hover:border-indigo-200 shadow-sm relative overflow-hidden">
											<div class="flex flex-col md:flex-row md:items-center gap-3 mb-5">
												<div class="flex items-center justify-between w-full">
													<span class="text-sm font-black {appt.is_private ? 'text-emerald-700 bg-emerald-50 border-emerald-100/50' : 'text-indigo-700 bg-indigo-50 border-indigo-100/50'} px-3 py-1.5 rounded-xl border">
														{new Date(appt.appointment).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})} Uhr
													</span>
													{#if appt.is_private}
														<span class="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">Privat</span>
													{/if}
												</div>
												<h3 class="text-lg font-extrabold text-neutral-900 leading-tight">
													{appt.title}
												</h3>
											</div>
											
											{#if getClientName(appt)}
												<div class="flex items-center gap-2.5 text-neutral-600 text-sm mb-4 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 w-fit max-w-full">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neutral-400 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>
													<span class="font-bold truncate">{getClientName(appt)}</span>
												</div>
											{/if}
											
											{#if appt.description}
												<p class="text-sm text-neutral-500 leading-relaxed pl-3.5 border-l-2 border-neutral-200 line-clamp-2">
													{appt.description}
												</p>
											{/if}
										</div>
									{:else}
										<div class="bg-neutral-50/80 border border-neutral-200 rounded-2xl p-4 transition-all opacity-80 group-hover:opacity-100 group-hover:bg-white group-hover:shadow-md">
											<div class="flex justify-between items-center mb-1.5">
												<div class="flex items-center gap-2">
													<span class="text-xs font-extrabold text-neutral-500">
														{new Date(appt.appointment).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}
													</span>
													{#if appt.is_private}
														<span class="w-2 h-2 rounded-full bg-emerald-400" title="Privat"></span>
													{/if}
												</div>
												<div class="bg-indigo-100/50 text-indigo-700 text-[9px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1.5 uppercase tracking-widest">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
													{getUserName(appt)}
												</div>
											</div>
											<h4 class="text-sm font-bold text-neutral-800 truncate">{appt.title}</h4>
											{#if getClientName(appt)}
												<p class="text-xs text-neutral-500 font-medium truncate mt-1">{getClientName(appt)}</p>
											{/if}
										</div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<div class="orga-card-white p-6 md:p-8 border border-neutral-100 h-max lg:sticky lg:top-32 shadow-sm">
					<h2 class="text-lg font-extrabold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Demnächst</h2>
					<div class="space-y-3">
						{#if upcomingAppointments.length === 0}
							<p class="text-xs text-neutral-400 italic text-center py-4">Keine anstehenden Termine.</p>
						{/if}
						
						{#each upcomingAppointments.slice(0, 6) as appt}
							{@const isOwn = appt.user === currentUser?.id}
							<button 
								type="button" 
								onclick={() => openEditModal(appt)} 
								class="w-full text-left flex items-center gap-4 p-3 rounded-2xl transition-all group border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500
								{isOwn ? 'hover:bg-neutral-50 hover:border-neutral-200' : 'opacity-70 grayscale hover:bg-neutral-50 hover:opacity-100'}"
							>
								<div class="bg-white border border-neutral-200 shadow-sm rounded-xl py-2 w-14 shrink-0 text-center group-hover:border-indigo-300 transition-colors">
									<span class="block text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest leading-none mb-1.5">
										{new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(new Date(appt.appointment))}
									</span>
									<span class="block text-xl font-black text-neutral-900 leading-none">
										{new Date(appt.appointment).getDate()}
									</span>
								</div>
								<div class="flex-1 min-w-0">
									<h4 class="text-sm font-bold text-neutral-900 truncate">{appt.title}</h4>
									<p class="text-xs text-neutral-500 truncate font-medium mt-0.5">
										{new Date(appt.appointment).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}
										{#if getClientLastName(appt)} <span class="mx-1">•</span> {getClientLastName(appt)}{/if}
									</p>
									{#if !isOwn && isAdmin && getUserName(appt)}
										<p class="text-[9px] text-indigo-500 font-extrabold uppercase mt-1.5 tracking-widest truncate flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
											{getUserName(appt)}
										</p>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
			<InfoCards />
		</main>
	{/if}
</div>

{#if isModalOpen}
	<AppointmentManager
		isOpen={isModalOpen}
		appointment={selectedAppointment}
		defaultDate={new Date()}
		clients={clients}
		adminUsers={adminUsers}
		currentUser={currentUser}
		isAdmin={isAdmin}
		onClosed={() => isModalOpen = false}
		onSaved={handleSaved} 
	/>
{/if}