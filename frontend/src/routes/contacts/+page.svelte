<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import ContactModal from "$lib/components/ContactModal.svelte";
    import RetirementHomeModal from "$lib/components/RetirementHomeModal.svelte";

    let activeTab = $state<"contacts" | "homes">("contacts");
    let searchQuery = $state("");

    let contactModal: ReturnType<typeof ContactModal> | undefined = $state();
    let homeModal: ReturnType<typeof RetirementHomeModal> | undefined = $state();

    // Dynamischer Filter für alle normalen Kontaktpersonen (Angehörige, Betreuer etc.)
    let filteredContacts = $derived.by(() => {
        const list = orgaStore.contacts?.data || [];
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(c => 
            (c.name_first || '').toLowerCase().includes(q) ||
            (c.name_last || '').toLowerCase().includes(q) ||
            (c.company_name || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q)
        );
    });

    // Dynamischer Filter für alle Einrichtungen/Pflegeheime
    let filteredHomes = $derived.by(() => {
        const list = orgaStore.retirement_homes?.data || [];
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(h => 
            (h.name || '').toLowerCase().includes(q) ||
            (h.city || '').toLowerCase().includes(q) ||
            (h.street || '').toLowerCase().includes(q)
        );
    });
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Kontakte & Einrichtungen</h1>
        <p class="orga-page-subtitle">Zentrale Verwaltung für Ansprechpartner, Angehörige und Pflegeheime.</p>
    </div>
    <div class="flex items-center gap-3">
        {#if activeTab === 'contacts'}
            <button onclick={() => contactModal?.open()} class="orga-button-primary inline-flex">
                <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                Neuer Kontakt
            </button>
        {:else}
            <button onclick={() => homeModal?.open()} class="orga-button-primary inline-flex">
                <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                Neues Pflegeheim
            </button>
        {/if}
    </div>
</div>

<div class="orga-filter-bar animate-enter delay-100 items-center">
    <!-- Tab Switcher -->
    <div class="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0">
        <button onclick={() => activeTab = 'contacts'} class="px-4 py-1.5 text-sm font-bold rounded-md transition-colors {activeTab === 'contacts' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Kontaktpersonen</button>
        <button onclick={() => activeTab = 'homes'} class="px-4 py-1.5 text-sm font-bold rounded-md transition-colors {activeTab === 'homes' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Pflegeheime</button>
    </div>
    
    <!-- Suchfeld -->
    <div class="flex-1 w-full mt-4 md:mt-0">
        <label for="search-contacts" class="sr-only">Suchen</label>
        <input 
            id="search-contacts"
            type="text" 
            bind:value={searchQuery} 
            placeholder={activeTab === 'contacts' ? "Nach Name, E-Mail oder Rolle suchen..." : "Nach Name oder Stadt suchen..."} 
            class="orga-input-clear py-2.5"
        />
    </div>
</div>

<div class="animate-enter delay-200">
    {#if activeTab === 'contacts'}
        <!-- === REITER: KONTAKTE === -->
        {#if orgaStore.contacts?.isLoading}
            <div class="text-center py-12 text-neutral-500 font-medium animate-pulse">Lade Kontakte...</div>
        {:else if filteredContacts.length === 0}
            <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm">
                <p class="text-lg font-bold text-neutral-900 mb-2">Keine Kontakte gefunden</p>
                <p>Passen Sie die Suche an oder legen Sie einen neuen Kontakt an.</p>
            </div>
        {:else}
            <div class="orga-grid">
                {#each filteredContacts as contact (contact.id)}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div onclick={() => contactModal?.open(contact)} class="orga-card-white p-6 flex flex-col hover:border-indigo-200 transition-all group cursor-pointer" role="button" tabindex="0">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-full bg-neutral-100 text-neutral-600 font-bold flex items-center justify-center text-xl shrink-0 shadow-inner">
                                {(contact.name_first?.charAt(0) || contact.company_name?.charAt(0) || '?').toUpperCase()}
                            </div>
                            <div class="flex-1 overflow-hidden">
                                <h2 class="text-lg font-bold text-neutral-900 truncate group-hover:text-indigo-600 transition-colors">
                                    {#if contact.name_first || contact.name_last}{contact.name_first} {contact.name_last}{:else if contact.company_name}{contact.company_name}{:else}Unbekannt{/if}
                                </h2>
                                {#if contact.company_name && (contact.name_first || contact.name_last)}
                                    <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-0.5 truncate">{contact.company_name}</p>
                                {/if}
                            </div>
                        </div>
                        
                        <div class="space-y-2 text-sm mt-auto">
                            {#if contact.phone}
                                <div class="flex items-center gap-2 text-neutral-600">
                                    <span class="text-indigo-400">📞</span> <a href="tel:{contact.phone}" onclick={(e) => e.stopPropagation()} class="hover:text-indigo-600 hover:underline">{contact.phone}</a>
                                </div>
                            {/if}
                            {#if contact.email}
                                <div class="flex items-center gap-2 text-neutral-600">
                                    <span class="text-emerald-400">✉️</span> <a href="mailto:{contact.email}" onclick={(e) => e.stopPropagation()} class="hover:text-emerald-600 hover:underline truncate">{contact.email}</a>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

    {:else}
        <!-- === REITER: PFLEGEHEIME === -->
        {#if orgaStore.retirement_homes?.isLoading}
            <div class="text-center py-12 text-neutral-500 font-medium animate-pulse">Lade Einrichtungen...</div>
        {:else if filteredHomes.length === 0}
            <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm">
                <p class="text-lg font-bold text-neutral-900 mb-2">Keine Pflegeheime gefunden</p>
                <p>Passen Sie die Suche an oder legen Sie ein neues Pflegeheim an.</p>
            </div>
        {:else}
            <div class="orga-grid">
                {#each filteredHomes as home (home.id)}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div onclick={() => homeModal?.open(home)} class="orga-card-white p-6 flex flex-col hover:border-indigo-200 transition-all group cursor-pointer" role="button" tabindex="0">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 font-bold flex items-center justify-center text-2xl shrink-0 shadow-sm">
                                🏥
                            </div>
                            <div class="flex-1 overflow-hidden">
                                <h2 class="text-lg font-bold text-neutral-900 truncate group-hover:text-indigo-600 transition-colors">{home.name || 'Unbekannt'}</h2>
                                <p class="text-xs font-semibold text-neutral-500 mt-0.5 truncate">{home.street ? `${home.street}, ` : ''}{home.zip || ''} {home.city || ''}</p>
                            </div>
                        </div>
                        
                        <!-- Anzeige von verknüpften Kontakten -->
                        {#if home.expand?.contacts && home.expand.contacts.length > 0}
                            <div class="mt-auto pt-4 border-t border-neutral-100">
                                <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-2">Ansprechpartner vor Ort</p>
                                <div class="flex -space-x-2 overflow-hidden">
                                    {#each home.expand.contacts.slice(0, 3) as hc}
                                        <div class="flex h-8 w-8 rounded-full ring-2 ring-white bg-neutral-200 items-center justify-center text-[10px] font-bold text-neutral-700" title="{hc.name} ({hc.relation})">
                                            {(hc.name?.charAt(0) || '?').toUpperCase()}
                                        </div>
                                    {/each}
                                    {#if home.expand.contacts.length > 3}
                                        <div class="flex h-8 w-8 rounded-full ring-2 ring-white bg-neutral-100 items-center justify-center text-[10px] font-bold text-neutral-500">
                                            +{home.expand.contacts.length - 3}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {:else}
                            <div class="mt-auto pt-4 border-t border-neutral-100">
                                <p class="text-xs text-neutral-400 italic">Keine Ansprechpartner hinterlegt</p>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<ContactModal bind:this={contactModal} />
<RetirementHomeModal bind:this={homeModal} />