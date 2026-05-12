<script lang="ts">
    import { page } from "$app/stores";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ClientInfoCard from "$lib/components/ClientInfoCard.svelte";
    import ClientRelations from "$lib/components/ClientRelations.svelte";
    import ClientEditModal from "$lib/components/ClientEditModal.svelte";

    // Typ-Sicherheit herstellen, falls .id undefined ist
    let clientId = $derived($page.params.id || '');
    let client = $derived(orgaStore.clients?.getById(clientId));
    let editModal: ReturnType<typeof ClientEditModal> | undefined = $state();
</script>

<div class="orga-page-header animate-enter">
    <div>
        <a href="/clients" class="text-indigo-600 hover:text-indigo-800 font-semibold text-sm flex items-center gap-2 mb-4 transition-colors">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Zurück zur Übersicht
        </a>
        <h1 class="orga-page-title flex items-center gap-3">
            {#if client}
                {client.name_first} {client.name_last}
                <span class="px-3.5 py-1 text-xs font-bold rounded-full {(client.status || '').toLowerCase() === 'aktiv' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}">
                    {(client.status || '').toLowerCase() === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
                </span>
            {:else if orgaStore.clients?.isLoading}
                <!-- Skeleton Loader für den Namen -->
                <div class="h-8 w-48 bg-neutral-200 rounded-lg animate-pulse"></div>
            {:else}
                Klient nicht gefunden
            {/if}
        </h1>
        <p class="orga-page-subtitle">
            {#if client}Detaillierte Akte und Verknüpfungen{:else}Bitte überprüfen Sie die angefragte URL.{/if}
        </p>
    </div>
    {#if client}
        <button onclick={() => editModal?.open()} class="orga-button-ghost shrink-0">
            <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Bearbeiten
        </button>
    {/if}
</div>

{#if !client && orgaStore.clients?.isLoading}
    <div class="flex flex-col items-center justify-center py-20 animate-pulse animate-enter delay-100">
        <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p class="text-neutral-500 font-medium">Lade Klienten-Akte...</p>
    </div>
{:else if !client}
    <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm animate-enter delay-100">
        <p class="text-lg font-bold text-neutral-900 mb-2">Die angeforderte Akte existiert nicht</p>
        <p class="mb-6">Der Klient wurde möglicherweise gelöscht oder die ID ist falsch.</p>
        <a href="/clients" class="orga-button-primary inline-flex">Zurück zur Übersicht</a>
    </div>
{:else}

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-10 pb-12">
        <div class="xl:col-span-1 animate-enter delay-100">
            <ClientInfoCard {client} />
        </div>
        <div class="xl:col-span-2 animate-enter delay-200">
            <ClientRelations {clientId} />
        </div>
    </div>

    <!-- Das Bearbeitungs-Modal für den aktuellen Klienten -->
    <ClientEditModal bind:this={editModal} {client} />
{/if}