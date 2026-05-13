<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useClientFilter } from "$lib/services/clientFilterService.svelte";

    const clientsStore = orgaStore.clients;
    const filterService = useClientFilter(() => clientsStore?.data || []);
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Klienten</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier alle Stammdaten und Pflegegrade.</p>
    </div>
    <a href="/clients/new" class="orga-button-primary inline-flex">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Neuer Klient
    </a>
</div>

<div class="orga-filter-bar animate-enter delay-100">
    <div class="flex-1">
        <label for="search" class="sr-only">Suchen</label>
        <input 
            id="search"
            type="text" 
            bind:value={filterService.searchQuery} 
            placeholder="Nach Name oder E-Mail suchen..." 
            class="orga-input-clear"
        />
    </div>
    <div class="md:w-64 shrink-0">
        <label for="status" class="sr-only">Status</label>
        <select id="status" bind:value={filterService.statusFilter} class="orga-input-clear cursor-pointer">
            <option value="all">Alle Status anzeigen</option>
            <option value="Aktiv">Nur Aktive</option>
            <option value="Inaktiv">Nur Inaktive</option>
        </select>
    </div>
</div>

{#if clientsStore?.isLoading}
    <div class="text-center py-12 text-neutral-500 font-medium animate-pulse animate-enter delay-200">Lade Klienten-Daten...</div>
{:else if filterService.filtered.length === 0}
    <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm animate-enter delay-200">
        <p class="text-lg font-bold text-neutral-900 mb-2">Keine Klienten gefunden</p>
        <p>Versuchen Sie, die Suchkriterien anzupassen, oder legen Sie einen neuen Klienten an.</p>
    </div>
{:else}
    <div class="orga-grid grid-cols-1 sm:grid-cols-6 gap-6 animate-enter delay-200 ">
        {#each filterService.filtered as client, i (client.id)}
            <a href="/clients/{client.id}" class="orga-client-card group animate-enter overflow-hidden" style="animation-delay: {150 + (i * 50)}ms">
                <!-- Dekorativer Hover-Blob im Hintergrund -->
                <div class="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-150 z-0"></div>
                
                <div class="relative z-10">
                    <div class="flex justify-between items-start mb-4">
                        <div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-xl shrink-0 shadow-inner">
                            {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                        </div>
                        <span class="px-3.5 py-1 text-xs font-bold rounded-full {(client.status || '').toLowerCase() === 'aktiv' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}">
                            {(client.status || '').toLowerCase() === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
                        </span>
                    </div>
                    <h2 class="text-xl font-bold text-neutral-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">{client.name_first} {client.name_last}</h2>
                    <p class="text-sm text-neutral-500 mb-4 line-clamp-1">{client.email || 'Keine E-Mail hinterlegt'}</p>
                    
                    <div class="space-y-2 text-sm">
                        {#if client.level_of_care}
                            <div class="flex items-center gap-2 text-neutral-700 font-medium">
                                <span class="text-rose-500">❤️</span> Pflegegrad {client.level_of_care}
                            </div>
                        {/if}
                        {#if client.phone}
                            <div class="flex items-center gap-2 text-neutral-600">
                                <span class="text-indigo-400">📞</span> {client.phone}
                            </div>
                        {/if}
                    </div>
                </div>
            </a>
        {/each}
    </div>
{/if}