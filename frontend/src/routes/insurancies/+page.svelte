<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useInsuranceFilter } from "$lib/services/insuranceFilterService.svelte";
    import InsuranceModal from "$lib/components/InsuranceModal.svelte";

    const insuranciesStore = orgaStore.insurancies;
    const filterService = useInsuranceFilter(() => insuranciesStore?.data || []);
    
    // svelte-ignore non_reactive_update
    let modal: ReturnType<typeof InsuranceModal>;
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Krankenkassen</h1>
        <p class="orga-page-subtitle">Zentrale Verwaltung aller Versicherungen und Ansprechpartner.</p>
    </div>
    <button onclick={() => modal?.open()} class="orga-button-primary inline-flex w-full sm:w-auto justify-center py-3 sm:py-2.5 mt-4 sm:mt-0">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Neue Krankenkasse
    </button>
</div>

<div class="orga-filter-bar animate-enter delay-100 items-center">
    <div class="flex-1 w-full">
        <label for="search-ins" class="sr-only">Suchen</label>
        <input 
            id="search-ins"
            type="text" 
            bind:value={filterService.searchQuery} 
            placeholder="Nach Name, Stadt oder E-Mail suchen..." 
            class="orga-input-clear py-3 sm:py-2.5"
        />
    </div>
    <div class="w-full md:w-64 shrink-0">
        <label for="type-filter" class="sr-only">Versicherungsart</label>
        <select id="type-filter" bind:value={filterService.typeFilter} class="orga-input-clear py-3 sm:py-2.5 cursor-pointer">
            <option value="all">Alle Arten anzeigen</option>
            <option value="GKV (Gesetzlich)">Gesetzlich (GKV)</option>
            <option value="PKV (Privat)">Privat (PKV)</option>
            <option value="Beihilfe">Beihilfe</option>
            <option value="Berufsgenossenschaft">Berufsgenossenschaft</option>
        </select>
    </div>
</div>

<div class="animate-enter delay-200">
    {#if insuranciesStore?.isLoading}
        <div class="text-center py-12 text-neutral-500 font-medium animate-pulse">Lade Krankenkassen...</div>
    {:else if filterService.filtered.length === 0}
        <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm">
            <p class="text-lg font-bold text-neutral-900 mb-2">Keine Krankenkassen gefunden</p>
            <p>Passen Sie die Suche an oder legen Sie eine neue Krankenkasse an.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {#each filterService.filtered as ins (ins.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div onclick={() => modal?.open(ins)} class="w-full text-left orga-card-white p-4 sm:p-6 flex flex-col hover:border-indigo-200 transition-all group cursor-pointer" role="button" tabindex="0">
                    <div class="flex items-center sm:items-start justify-between gap-3 sm:gap-4 sm:mb-4">
                        <div class="flex items-center gap-3 w-full sm:w-auto min-w-0">
                            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center text-lg sm:text-2xl shrink-0 shadow-inner">
                                🛡️
                            </div>
                            <div class="flex-1 min-w-0 sm:hidden">
                                <h2 class="text-[15px] font-bold text-neutral-900 truncate group-hover:text-indigo-600 transition-colors">{ins.name || 'Unbenannt'}</h2>
                                <p class="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mt-0.5 truncate">{ins.type || 'Unbekannte Art'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hidden sm:block">
                        <h2 class="text-lg font-bold text-neutral-900 truncate group-hover:text-indigo-600 transition-colors">{ins.name || 'Unbenannt'}</h2>
                        <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-0.5 truncate">{ins.type || 'Unbekannte Art'}</p>
                    </div>
                    
                    <div class="flex flex-row sm:flex-col gap-4 sm:gap-2 text-xs sm:text-sm mt-3 sm:mt-auto pt-3 sm:pt-4 border-t border-neutral-100 sm:border-transparent overflow-hidden">
                        {#if ins.phone}
                            <div class="flex items-center gap-1.5 text-neutral-600 truncate shrink-0">
                                <span class="text-indigo-400">📞</span> <a href="tel:{ins.phone}" onclick={(e) => e.stopPropagation()} class="hover:text-indigo-600 hover:underline truncate">{ins.phone}</a>
                            </div>
                        {/if}
                        {#if ins.email}
                            <div class="flex items-center gap-1.5 text-neutral-600 truncate">
                                <span class="text-emerald-400">✉️</span> <a href="mailto:{ins.email}" onclick={(e) => e.stopPropagation()} class="hover:text-emerald-600 hover:underline truncate">{ins.email}</a>
                            </div>
                        {/if}
                        {#if !ins.phone && !ins.email}
                            <p class="text-[10px] sm:text-xs text-neutral-400 italic">Keine Kontaktdaten</p>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<InsuranceModal bind:this={modal} />