<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import Calendar from "$lib/components/Calendar.svelte";
    import AppointmentModal from "$lib/components/AppointmentModal.svelte";

    // svelte-ignore non_reactive_update
    let appointmentModal: ReturnType<typeof AppointmentModal>;

    function handleNewAppointment(date?: Date) {
        appointmentModal?.open(date);
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Terminkalender</h1>
        <p class="orga-page-subtitle">Alle Einsätze, Besuche und Termine im Überblick.</p>
    </div>
    <button onclick={() => handleNewAppointment()} class="orga-button-primary w-full sm:w-auto justify-center py-3 sm:py-2.5 mt-4 sm:mt-0">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Neuer Termin
    </button>
</div>

<div class="animate-enter delay-100">
    <Calendar 
        appointments={orgaStore.appointments?.data || []} 
        clients={orgaStore.clients?.data || []} 
        onNewAppointment={handleNewAppointment}
    />
</div>

<AppointmentModal bind:this={appointmentModal} />