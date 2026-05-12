<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";

    let searchQuery = $state("");
    
    let documents = $derived.by(() => {
        const allDocs = orgaStore.document_templates?.data || [];
        if (!searchQuery) return allDocs;
        return allDocs.filter(d => 
            (d.title || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    async function deleteDoc(id: string) {
        if (confirm("Möchten Sie diese Vorlage wirklich löschen?")) {
            await pb.collection('document_templates').delete(id);
        }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Vorlagenverwaltung</h1>
        <p class="orga-page-subtitle">Erstellen und verwalten Sie hier Master-Vorlagen für Rechnungen, Formulare und Briefe.</p>
    </div>
    <a href="/documents/new" class="orga-button-primary inline-flex">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Neue Vorlage
    </a>
</div>

<div class="orga-filter-bar animate-enter delay-100">
    <div class="flex-1">
        <label for="search-docs" class="sr-only">Vorlagen durchsuchen</label>
        <input id="search-docs" type="text" bind:value={searchQuery} placeholder="Nach Titel suchen..." class="orga-input-clear" />
    </div>
</div>

<div class="orga-grid animate-enter delay-200">
    {#each documents as doc}
        <div class="orga-card-white p-6 flex flex-col hover:border-indigo-200 transition-all group">
            <div class="flex-1">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-inner text-2xl">📄</div>
                <h2 class="text-lg font-bold text-neutral-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">{doc.title || 'Unbenannte Vorlage'}</h2>
                <p class="text-sm text-neutral-500 mb-4 line-clamp-3 overflow-hidden" style="display: -webkit-box; -webkit-box-orient: vertical;">
                    {typeof doc.content_html === 'string' ? doc.content_html.replace(/<[^>]*>?/gm, '') : 'Kein Inhalt...'}
                </p>
            </div>
            <div class="pt-4 mt-auto border-t border-neutral-100 flex items-center justify-between">
                <span class="text-xs text-neutral-400 font-semibold">{new Date(doc.updated || doc.created).toLocaleDateString('de-DE')}</span>
                <div class="flex gap-2">
                    <button onclick={() => deleteDoc(doc.id)} class="text-neutral-400 hover:text-red-500 transition-colors" title="Löschen"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    <a href="/documents/{doc.id}" class="text-indigo-600 hover:text-indigo-800 font-bold text-sm bg-indigo-50 px-3 py-1 rounded-md transition-colors">Bearbeiten</a>
                </div>
            </div>
        </div>
    {/each}
</div>