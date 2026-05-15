<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useClientFilter } from "$lib/services/clientFilterService.svelte";
    import ClientDetailModal from "$lib/components/ClientDetailModal.svelte";

    const clientsStore = orgaStore.clients;
    const filterService = useClientFilter(() => clientsStore?.data || []);

    // svelte-ignore non_reactive_update
    let detailModal: ReturnType<typeof ClientDetailModal>;
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Klienten</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier alle Stammdaten und Pflegegrade.</p>
    </div>
    <a href="/clients/new" class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5 mt-4 sm:mt-0">
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
            class="orga-input-clear py-3 sm:py-2.5"
        />
    </div>
    <div class="md:w-64 shrink-0">
        <label for="status" class="sr-only">Status</label>
        <select id="status" bind:value={filterService.statusFilter} class="orga-input-clear py-3 sm:py-2.5 cursor-pointer">
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
    <!-- Responsive Grid: Kompakte Liste auf Handy, schöne Cards auf Tablet/Desktop -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 animate-enter delay-200">
        {#each filterService.filtered as client, i (client.id)}
            <button type="button" onclick={() => detailModal?.open(client.id)} class="w-full text-left orga-client-card group animate-enter overflow-hidden" style="animation-delay: {150 + (i * 50)}ms">
                <!-- Hover-Blob nur auf Desktop -->
                <div class="hidden sm:block absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-150 z-0"></div>
                
                <div class="relative z-10 flex flex-col sm:block">
                    <!-- Mobile: Horizontales Listen-Layout | Desktop: Vertikales Karten-Layout -->
                    <div class="flex items-center sm:items-start justify-between gap-3 sm:gap-4 sm:mb-4">
                        <div class="flex items-center gap-3 w-full sm:w-auto min-w-0">
                            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-base sm:text-xl shrink-0 shadow-inner">
                                {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
                            </div>
                            <!-- Mobile Text Infos (in Desktop ausgeblendet) -->
                            <div class="flex-1 min-w-0 sm:hidden">
                                <h2 class="text-[15px] font-bold text-neutral-900 truncate group-hover:text-indigo-600 transition-colors">{client.name_first} {client.name_last}</h2>
                                <p class="text-xs text-neutral-500 truncate">{client.email || 'Keine E-Mail'}</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 sm:px-3.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-full shrink-0 {(client.status || '').toLowerCase() === 'aktiv' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}">
                            {(client.status || '').toLowerCase() === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
                        </span>
                    </div>
                    
                    <!-- Diese Infos sind auf Mobile in der oberen Zeile integriert -->
                    <div class="hidden sm:block">
                        <h2 class="text-xl font-bold text-neutral-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">{client.name_first} {client.name_last}</h2>
                        <p class="text-sm text-neutral-500 mb-4 line-clamp-1">{client.email || 'Keine E-Mail hinterlegt'}</p>
                    </div>
                    
                    <div class="flex flex-row sm:flex-col gap-4 sm:gap-2 text-xs sm:text-sm mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-neutral-100 sm:border-transparent">
                        {#if client.level_of_care}
                            <div class="flex items-center gap-1.5 text-neutral-700 font-medium shrink-0">
                                <span class="text-rose-500">❤️</span> <span class="hidden sm:inline">Pflegegrad</span> {client.level_of_care}
                            </div>
                        {/if}
                        {#if client.phone}
                            <div class="flex items-center gap-1.5 text-neutral-600 truncate">
                                <span class="text-indigo-400">📞</span> {client.phone}
                            </div>
                        {/if}
                    </div>
                </div>
            </button>
        {/each}
    </div>
{/if}

<ClientDetailModal bind:this={detailModal} />