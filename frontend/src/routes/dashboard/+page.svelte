<script lang="ts">
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
	import Calendar from "$lib/components/Calendar.svelte";
	import AppointmentModal from "$lib/components/AppointmentModal.svelte";
	import Greetings from "$lib/components/Greetings.svelte";
	import ChatWidget from "$lib/components/ChatWidget.svelte";
	import AppointmentRequestsWidget from "$lib/components/AppointmentRequestsWidget.svelte";
	import AppointmentDetailModal from "$lib/components/AppointmentDetailModal.svelte";
	import StickiesLayer from "$lib/components/StickiesLayer.svelte";

	let appointmentModal: ReturnType<typeof AppointmentModal> | undefined = $state();
	let detailModal: ReturnType<typeof AppointmentDetailModal> | undefined = $state();

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

<div class="orga-layout-wrapper">
    <div class="orga-layout-content">
        <StickiesLayer />
        
        <!-- Dashboard Header -->
        <header class="orga-dashboard-header animate-enter flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <h1 class="orga-dashboard-title">Dashboard</h1>
                <button onclick={() => window.dispatchEvent(new CustomEvent('add-sticky'))} class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5">
                    <span class="text-sm">📌</span> Notizzettel
                </button>
            </div>
        </header>
        
        <!-- Dashboard Begrüßung -->
        <div class="mb-10 w-full animate-enter">
            <Greetings />
        </div>

        <!-- Oberes Grid: Termine & Kalender -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Termine -->
            <div class="orga-card-white p-6 animate-enter delay-100 flex flex-col lg:col-span-1 h-full">
                <h2 class="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2"><span>📅</span> Heutige Termine</h2>
                {#if todaysAppointments.length === 0}
                    <p class="text-neutral-500 text-sm mt-2">Heute stehen keine Termine an. Lehnen Sie sich zurück!</p>
                {:else}
                    <div class="space-y-3 mt-2 flex-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {#each todaysAppointments as app}
                            <button type="button" onclick={() => detailModal?.open(app.id)} class="w-full text-left block p-3 rounded-xl border border-neutral-100 hover:border-indigo-300 bg-neutral-50 hover:bg-white transition-all group shadow-sm hover:shadow-md">
                                <div class="flex justify-between items-start mb-1">
                                    <span class="text-xs font-bold {app.is_private ? 'text-rose-600' : 'text-indigo-600'}">{new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                    {#if app.expand?.client?.[0]}
                                        <span class="text-[10px] font-bold text-neutral-600 bg-neutral-200 px-1.5 py-0.5 rounded truncate max-w-[100px]">{app.expand.client[0].name_first} {app.expand.client[0].name_last}</span>
                                    {/if}
                                </div>
                                <p class="text-sm font-semibold text-neutral-900 truncate">{app.description || 'Termin ohne Beschreibung'}</p>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Eingebetteter Kalender -->
            <div class="orga-card-white overflow-hidden animate-enter delay-200 flex flex-col lg:col-span-2">
                <div class="p-4 sm:p-6 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
                    <h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2"><span>🗓️</span> Kalenderübersicht</h2>
                </div>
                <div class="p-0 sm:p-6 bg-white flex-1 min-h-[400px]">
                    <Calendar 
                        appointments={orgaStore.appointments?.data || []} 
                        clients={orgaStore.clients?.data || []} 
                        onNewAppointment={handleNewAppointment}
                        isWidget={true}
                    />
                </div>
            </div>
        </div>

        <!-- Unteres Grid: Terminanfragen & Chat -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="animate-enter delay-300 h-full">
                <AppointmentRequestsWidget />
            </div>
            <div class="animate-enter delay-400 h-full">
                <ChatWidget />
            </div>
        </div>

    </div>
</div>

<AppointmentModal bind:this={appointmentModal} />
<AppointmentDetailModal bind:this={detailModal} />