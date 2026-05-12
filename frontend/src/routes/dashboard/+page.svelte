<script lang="ts">
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import Calendar from "$lib/components/Calendar.svelte";
	import AppointmentModal from "$lib/components/AppointmentModal.svelte";
	import Greetings from "$lib/components/Greetings.svelte";

	let appointmentModal: ReturnType<typeof AppointmentModal> | undefined = $state();

	// 1. Heutige Termine herausfiltern
	let todaysAppointments = $derived.by(() => {
		const today = new Date();
		return (orgaStore.appointments?.data || []).filter((app: any) => {
			if (!app.appointment) return false;
			const d = new Date(app.appointment);
			return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
		}).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
	});

	// 2. Offene Rechnungen & Summe berechnen
	let openInvoices = $derived((orgaStore.invoices?.data || []).filter((inv: any) => inv.status !== 'Abgeschlossen' && inv.status !== 'Storniert' && inv.status !== 'Abgelehnt'));
	let openInvoicesSum = $derived(openInvoices.reduce((sum: number, inv: any) => sum + (inv.brutto || 0), 0));

	// 3. Aktive Klienten zählen
	let activeClientsCount = $derived((orgaStore.clients?.data || []).filter((c: any) => (c.status || '').toLowerCase() === 'aktiv').length);

	function handleNewAppointment(date?: Date) {
		appointmentModal?.open(date);
	}
</script>

<div class="orga-dashboard-header animate-enter">
	<h1 class="orga-dashboard-title">Dashboard</h1>
	<Greetings />
</div>

<div class="orga-dashboard-grid mb-10">
	<div class="orga-card-white p-6 animate-enter delay-100 flex flex-col">
		<h2 class="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2"><span>📅</span> Heutige Termine</h2>
		{#if todaysAppointments.length === 0}
			<p class="text-neutral-500 text-sm mt-2">Heute stehen keine Termine an. Lehnen Sie sich zurück!</p>
		{:else}
			<div class="space-y-3 mt-2 flex-1 max-h-64 overflow-y-auto custom-scrollbar pr-2">
				{#each todaysAppointments as app}
					<a href="/appointments/{app.id}" class="block p-3 rounded-xl border border-neutral-100 hover:border-indigo-300 bg-neutral-50 hover:bg-white transition-all group shadow-sm hover:shadow-md">
						<div class="flex justify-between items-start mb-1">
							<span class="text-xs font-bold {app.is_private ? 'text-rose-600' : 'text-indigo-600'}">{new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
							{#if app.expand?.client?.[0]}
								<span class="text-[10px] font-bold text-neutral-600 bg-neutral-200 px-1.5 py-0.5 rounded truncate max-w-100px">{app.expand.client[0].name_first} {app.expand.client[0].name_last}</span>
							{/if}
						</div>
						<p class="text-sm font-semibold text-neutral-900 truncate">{app.description || 'Termin ohne Beschreibung'}</p>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<div class="orga-card-white p-6 animate-enter delay-200 flex flex-col">
		<h2 class="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2"><span>💶</span> Offene Forderungen</h2>
		{#if openInvoices.length === 0}
			<p class="text-neutral-500 text-sm mt-2">Alle Rechnungen sind bezahlt!</p>
		{:else}
			<div class="flex-1 flex flex-col justify-center py-4">
				<p class="text-3xl font-black text-rose-600 mb-1">{openInvoicesSum.toFixed(2).replace('.', ',')} €</p>
				<p class="text-sm font-medium text-neutral-500">Aus {openInvoices.length} unbezahlten Rechnungen</p>
			</div>
			<a href="/invoices" class="mt-auto block text-center text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-2.5 rounded-xl transition-colors">Zur Rechnungsübersicht &rarr;</a>
		{/if}
	</div>

	<div class="orga-card-white p-6 animate-enter delay-300 flex flex-col">
		<h2 class="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2"><span>📈</span> System-Status</h2>
		<div class="flex-1 flex flex-col justify-center space-y-4">
			<div class="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
				<span class="text-sm font-bold text-emerald-900">Aktive Klienten</span>
				<span class="text-xl font-black text-emerald-700">{activeClientsCount}</span>
			</div>
			<div class="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
				<span class="text-sm font-bold text-blue-900">Alle Termine</span>
				<span class="text-xl font-black text-blue-700">{(orgaStore.appointments?.data || []).length}</span>
			</div>
		</div>
		<a href="/clients" class="block text-center text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 py-2.5 rounded-xl transition-colors mt-4">Klienten verwalten &rarr;</a>
	</div>
</div>

<!-- Eingebetteter Kalender -->
<div class="orga-card-white overflow-hidden animate-enter delay-300">
	<div class="p-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
		<h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2"><span>📅</span> Kalenderübersicht</h2>
	</div>
	<div class="p-4 sm:p-6 bg-white">
		<Calendar 
			appointments={orgaStore.appointments?.data || []} 
			clients={orgaStore.clients?.data || []} 
			onNewAppointment={handleNewAppointment}
		/>
	</div>
</div>

<AppointmentModal bind:this={appointmentModal} />