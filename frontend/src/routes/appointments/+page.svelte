<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte'; 
	import { fade } from 'svelte/transition';
	import AppointmentManager from '$lib/components/AppointmentManager.svelte'; 

	// --- Interfaces ---
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

	interface CalendarCell {
		date: Date | null;
		appts: Appointment[];
		isToday: boolean;
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
	}

	// --- State ---
	let appointments = $state.raw<Appointment[]>([]);
	let clients = $state.raw<ClientData[]>([]); 
	let adminUsers = $state.raw<UserData[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	
	// Kalender State
	let currentMonthDate = $state(new Date());
	
	// Modal States
	let isModalOpen = $state(false);
	let selectedAppointment = $state<Appointment | null>(null);

	// --- RBAC ---
	const currentUser = pb.authStore.model;
	const isAdmin = $derived(currentUser?.role === 'admin');

	// --- Lifecycle ---
	onMount(async () => {
		currentMonthDate.setHours(0, 0, 0, 0);
		currentMonthDate.setDate(1); 
		
		if (isAdmin) {
			try {
				adminUsers = await pb.collection('users').getFullList<UserData>({ fields: 'id,name_first,name_last' });
			} catch (e) {
				console.error('Konnte User nicht laden:', e);
			}
		}

		await fetchData();
		isLoading = false;
	});

	async function fetchData() {
		try {
			const filter = isAdmin ? '' : `user = "${currentUser?.id}"`;
			
			const [apptsRes, clientsRes] = await Promise.all([
				pb.collection('appointments').getFullList<Appointment>({
					filter: filter,
					sort: 'appointment',
					expand: 'client,user'
				}),
				pb.collection('clients').getFullList<ClientData>({ sort: 'name_last' })
			]);

			appointments = apptsRes;
			clients = clientsRes;
		} catch (error) {
			console.error('Fehler beim Laden der Daten:', error);
			toastService.error('Daten konnten nicht geladen werden.');
		}
	}

	// --- Helper ---
	function isSameDay(d1: Date, d2: Date) {
		return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
	}

	function getClientName(appt: Appointment): string {
		if (!appt.expand?.client) return '';
		const c = Array.isArray(appt.expand.client) ? appt.expand.client[0] : appt.expand.client;
		return c ? `${c.name_first} ${c.name_last}` : '';
	}

	function getUserName(appt: Appointment): string {
		if (!appt.expand?.user) return '';
		const u = Array.isArray(appt.expand.user) ? appt.expand.user[0] : appt.expand.user;
		return u ? `${u.name_first} ${u.name_last}` : '';
	}

	// --- Derived Data ---
	const filteredAppointments = $derived(
		appointments.filter(appt => {
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			const cName = getClientName(appt).toLowerCase();
			const uName = isAdmin ? getUserName(appt).toLowerCase() : '';
			
			return appt.title.toLowerCase().includes(q) || cName.includes(q) || uName.includes(q) || appt.description?.toLowerCase().includes(q);
		})
	);

	// Datenstruktur für Desktop-Raster
	const calendarGrid = $derived.by(() => {
		const year = currentMonthDate.getFullYear();
		const month = currentMonthDate.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		
		let startingDay = (firstDay.getDay() + 6) % 7; // Montag als Wochestart
		const daysInMonth = lastDay.getDate();
		
		const grid: CalendarCell[] = [];
		const today = new Date();
		
		for (let i = 0; i < startingDay; i++) grid.push({ date: null, appts: [], isToday: false });
		
		for (let i = 1; i <= daysInMonth; i++) {
			const cellDate = new Date(year, month, i);
			const dayAppts = filteredAppointments.filter(a => isSameDay(new Date(a.appointment), cellDate));
			dayAppts.sort((a, b) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
			grid.push({ date: cellDate, appts: dayAppts, isToday: isSameDay(cellDate, today) });
		}
		
		const remaining = (7 - (grid.length % 7)) % 7;
		for (let i = 0; i < remaining; i++) grid.push({ date: null, appts: [], isToday: false });
		
		return grid;
	});

	// Datenstruktur für die neue Mobile-Agenda Ansicht
	const mobileGroupedAppts = $derived.by(() => {
		const year = currentMonthDate.getFullYear();
		const month = currentMonthDate.getMonth();

		// Filtere auf aktuellen Monat & sortiere chronologisch
		const monthAppts = filteredAppointments.filter(a => {
			const d = new Date(a.appointment);
			return d.getFullYear() === year && d.getMonth() === month;
		}).sort((a, b) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());

		const groups: { dateStr: string; label: string; appts: Appointment[]; isToday: boolean }[] = [];
		const today = new Date();

		for (const appt of monthAppts) {
			const d = new Date(appt.appointment);
			const dateStr = d.toISOString().split('T')[0];
			let group = groups.find(g => g.dateStr === dateStr);
			
			if (!group) {
				const isT = isSameDay(d, today);
				let label = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
				if (isT) label = 'Heute, ' + label;
				
				group = { dateStr, label, appts: [], isToday: isT };
				groups.push(group);
			}
			group.appts.push(appt);
		}
		return groups;
	});

	// --- Actions ---
	function prevMonth() { currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1); }
	function nextMonth() { currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1); }

	function goToToday() {
		const today = new Date();
		currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
	}

	function openManager(appt: Appointment | null = null, defaultDateObj: Date | null = null) {
		selectedAppointment = appt;
		isModalOpen = true;
	}

	function handleSaved() {
		fetchData();
		isModalOpen = false;
	}
</script>

<div class="min-h-screen bg-neutral-50 md:bg-neutral-100 flex flex-col md:pl-20 lg:pl-72 transition-all relative">
	
	<div class="hidden md:flex flex-col flex-1 h-screen">
		<header class="bg-white border-b border-neutral-200 p-8 lg:px-12 z-30 shadow-sm shrink-0">
			<div class="max-w-7xl mx-auto flex justify-between items-center gap-6">
				<div class="flex flex-col gap-1">
					<div class="flex items-center gap-6">
						<h1 class="text-4xl font-extrabold tracking-tight text-neutral-900">Kalender</h1>
						<div class="flex items-center gap-3 bg-neutral-50 rounded-2xl p-1.5 border border-neutral-200">
							<button onclick={prevMonth} aria-label="Letzter Monat" class="p-2 hover:bg-white rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
							</button>
							<span class="w-40 text-center font-bold text-neutral-800 text-lg tracking-wide">
								{currentMonthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
							</span>
							<button onclick={nextMonth} aria-label="Nächster Monat" class="p-2 hover:bg-white rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
							</button>
						</div>
						<button type="button" onclick={goToToday} class="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors shadow-sm text-sm border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
							Heute
						</button>
					</div>
					<p class="text-sm text-neutral-500 font-medium mt-2">
						{isAdmin ? 'Systemweite Übersicht aller Mitarbeiter-Termine' : 'Übersicht Ihrer zugewiesenen Einsätze'}
					</p>
				</div>
				<div class="flex items-center gap-5 w-auto">
					<div class="relative w-80">
						<input type="text" bind:value={searchQuery} placeholder={isAdmin ? "Suchen..." : "Suchen..."} class="orga-input-clear pl-11! py-3!" />
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
					</div>
					<button type="button" onclick={() => openManager(null, new Date())} class="orga-button-primary py-3! px-6! text-sm!">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" /></svg>
						Neuer Termin
					</button>
				</div>
			</div>
		</header>

		<main class="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full overflow-hidden flex flex-col pb-8">
			{#if isLoading}
				<div class="flex justify-center items-center flex-1"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
			{:else}
				<div class="flex-1 bg-neutral-200 border border-neutral-200 rounded-3xl overflow-hidden flex flex-col shadow-xl">
					<div class="grid grid-cols-7 bg-white border-b border-neutral-200 shrink-0">
						{#each ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as day}
							<div class="py-4 text-center text-xs font-extrabold text-neutral-400 uppercase tracking-widest">{day}</div>
						{/each}
					</div>

					<div class="grid grid-cols-7 flex-1 bg-neutral-200 gap-px">
						{#each calendarGrid as cell}
							<div class="bg-white p-3 min-h-32 flex flex-col gap-1.5 transition-colors group relative {cell.date ? 'hover:bg-neutral-50/80' : 'bg-neutral-50/50'}">
								{#if cell.date}
									<div class="flex justify-between items-start w-full mb-2">
										<button
											type="button"
											onclick={() => cell.date && openManager(null, cell.date)}
											aria-label="Neuen Termin am {cell.date.toLocaleDateString()} erstellen"
											class="text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 {cell.isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-neutral-600 group-hover:text-indigo-600'}"
										>
											{cell.date.getDate()}
										</button>
									</div>

									<div class="flex flex-col gap-1.5 w-full overflow-y-auto custom-scrollbar flex-1 pr-1">
										{#each cell.appts as appt}
											{@const tTime = new Date(appt.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
											<button 
												type="button"
												onclick={() => openManager(appt, new Date(appt.appointment))}
												class="text-left flex flex-col px-2.5 py-1.5 rounded-lg w-full font-bold transition-all hover:-translate-y-0.5 shadow-sm border focus:outline-none focus:ring-2 focus:ring-indigo-400
												{appt.is_private ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100'}"
												title="{tTime} - {appt.title}"
											>
												<div class="flex items-center text-xs truncate w-full">
													<span class="opacity-70 mr-1.5 font-medium">{tTime}</span>
													<span class="truncate">{appt.title}</span>
												</div>
												{#if isAdmin && getUserName(appt)}
													<div class="mt-1 text-[9px] font-extrabold opacity-50 uppercase tracking-wider truncate w-full">
														{getUserName(appt)}
													</div>
												{/if}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</main>
	</div>

	<div class="md:hidden flex flex-col flex-1 bg-neutral-50 min-h-screen">
		
		<header class="bg-white sticky top-0 z-30 shadow-sm px-5 pt-6 pb-5 rounded-b-3xl border-b border-neutral-200">
			<div class="flex justify-between items-center mb-5">
				<h1 class="text-2xl font-extrabold text-neutral-900 tracking-tight">Kalender</h1>
				<button type="button" onclick={goToToday} class="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
					Heute
				</button>
			</div>
			
			<div class="flex flex-col gap-4">
				<div class="relative w-full">
					<input type="text" bind:value={searchQuery} placeholder="Termine durchsuchen..." class="orga-input-clear pl-10! py-3! text-sm! bg-neutral-100/50" />
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</div>
				
				<div class="flex items-center justify-between bg-neutral-100/80 p-1.5 rounded-2xl border border-neutral-200/50">
					<button type="button" onclick={prevMonth} aria-label="Letzter Monat" class="p-2 hover:bg-white rounded-xl transition-colors shadow-sm focus:outline-none">
						<svg class="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
					</button>
					<span class="font-extrabold text-neutral-800 text-sm tracking-wide">
						{currentMonthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
					</span>
					<button type="button" onclick={nextMonth} aria-label="Nächster Monat" class="p-2 hover:bg-white rounded-xl transition-colors shadow-sm focus:outline-none">
						<svg class="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
					</button>
				</div>
			</div>
		</header>

		<main class="flex-1 px-5 pt-6 pb-32 space-y-8" in:fade>
			{#if isLoading}
				<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
			{:else if mobileGroupedAppts.length === 0}
				<div class="text-center py-12 bg-white rounded-3xl border border-neutral-100 shadow-sm">
					<div class="bg-neutral-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="h-8 w-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
					</div>
					<p class="text-sm font-bold text-neutral-500">Keine Termine im {currentMonthDate.toLocaleDateString('de-DE', { month: 'long' })}.</p>
				</div>
			{:else}
				{#each mobileGroupedAppts as group}
					<div class="space-y-3">
						<h2 class="text-xs font-extrabold uppercase tracking-widest flex items-center gap-2 {group.isToday ? 'text-indigo-600' : 'text-neutral-500'}">
							{#if group.isToday}
								<span class="w-2 h-2 rounded-full bg-indigo-500 shadow-sm"></span>
							{/if}
							{group.label}
						</h2>
						
						<div class="flex flex-col gap-3">
							{#each group.appts as appt}
								{@const isPast = new Date(appt.appointment) < new Date()}
								<button 
									type="button" 
									onclick={() => openManager(appt, new Date(appt.appointment))} 
									class="text-left bg-white p-5 rounded-3xl shadow-sm border border-neutral-100 hover:shadow-md transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 {isPast ? 'opacity-60 grayscale-[20%]' : ''}"
								>
									<div class="flex items-start justify-between mb-3">
										<span class="text-xs font-black px-2.5 py-1 rounded-lg border {appt.is_private ? 'text-emerald-700 bg-emerald-50 border-emerald-100/50' : 'text-indigo-700 bg-indigo-50 border-indigo-100/50'}">
											{new Date(appt.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
										</span>
										{#if appt.is_private}
											<span class="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 tracking-widest">Privat</span>
										{/if}
									</div>
									<h3 class="text-sm font-extrabold text-neutral-900 leading-snug mb-2">{appt.title}</h3>
									
									{#if getClientName(appt)}
										<p class="text-xs text-neutral-600 flex items-center gap-1.5 mb-1.5 bg-neutral-50 p-1.5 rounded-lg border border-neutral-100 w-fit">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-neutral-400 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>
											<span class="font-bold truncate">{getClientName(appt)}</span>
										</p>
									{/if}
									
									{#if isAdmin && getUserName(appt)}
										<p class="text-[9px] mt-2 bg-indigo-50/50 text-indigo-600 px-2 py-1 rounded-md w-max font-extrabold uppercase tracking-widest flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
											{getUserName(appt)}
										</p>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</main>

		<button 
			type="button" 
			aria-label="Neuen Termin erstellen" 
			onclick={() => openManager(null, new Date())} 
			class="fixed bottom-8 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-600/40 flex items-center justify-center transition-transform active:scale-90 z-40 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
		</button>
	</div>

</div>

{#if isModalOpen}
	<AppointmentManager
		isOpen={isModalOpen}
		appointment={selectedAppointment}
		onClosed={() => isModalOpen = false}
		onSaved={handleSaved}
		currentUser={currentUser}
		isAdmin={isAdmin}
		defaultDate={new Date()} 
		clients={clients}
		adminUsers={adminUsers}
	/>
{/if}