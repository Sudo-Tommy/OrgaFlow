<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useInvoiceFilter } from "$lib/services/invoiceFilterService.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";

    const invoicesStore = orgaStore.invoices;
    const filterService = useInvoiceFilter(() => invoicesStore?.data || []);

    let generatorModal: ReturnType<typeof DocumentGeneratorModal> | undefined = $state();

    // Funktion für das direkte Aktualisieren des Status aus der Übersicht heraus
    async function updateStatus(id: string, newStatus: string) {
        try {
            await pb.collection('invoices').update(id, { status: newStatus });
        } catch (err) {
            console.error("Fehler beim Status-Update:", err);
            alert("Der Status konnte nicht aktualisiert werden.");
        }
    }

    // Hilfsfunktion: Gibt eine schöne CSS-Klasse basierend auf dem Status zurück
    function getStatusClass(status: string) {
        switch (status) {
            case 'Entwurf': return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
            case 'Eingereicht': return 'bg-blue-100 text-blue-700 border border-blue-200';
            case 'In Bearbeitung': return 'bg-amber-100 text-amber-700 border border-amber-200';
            case 'Abgeschlossen': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
            case 'Abgelehnt':
            case 'Storniert': return 'bg-rose-100 text-rose-700 border border-rose-200';
            default: return 'bg-neutral-100 text-neutral-600 border border-neutral-200';
        }
    }

    // Hilfsfunktion: Holt die korrekte URL für die PDF-Datei
    function getPdfUrl(record: any) {
        if (!record.pdf || record.pdf.length === 0) return null;
        // Wenn es ein Array ist (maxSelect: 10), nehmen wir das erste Element
        const filename = Array.isArray(record.pdf) ? record.pdf[0] : record.pdf;
        return pb.files.getUrl(record, filename);
    }
    
    function getClient(record: any) {
        return Array.isArray(record.expand?.client) ? record.expand.client[0] : record.expand?.client;
    }

    function openGenerator() {
        const invoiceTemplate = orgaStore.document_templates?.data.find((t: any) => (t.type || '').toLowerCase() === 'rechnung');
        generatorModal?.open(invoiceTemplate?.id, invoiceTemplate ? 2 : 1);
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Rechnungen</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier alle generierten Rechnungen, Einnahmen und deren Status.</p>
    </div>
    <button onclick={openGenerator} class="orga-button-primary inline-flex">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Neue Rechnung (Generator)
    </button>
</div>

<div class="orga-filter-bar animate-enter delay-100 items-center">
    <div class="flex-1 w-full">
        <label for="search-inv" class="sr-only">Suchen</label>
        <input 
            id="search-inv"
            type="text" 
            bind:value={filterService.searchQuery} 
            placeholder="Nach Rechnungsnummer oder Klient suchen..." 
            class="orga-input-clear"
        />
    </div>
    <div class="w-full md:w-64 shrink-0">
        <label for="status-filter" class="sr-only">Status</label>
        <select id="status-filter" bind:value={filterService.statusFilter} class="orga-input-clear cursor-pointer">
            <option value="all">Alle Status anzeigen</option>
            <option value="Entwurf">Entwurf</option>
            <option value="Eingereicht">Eingereicht</option>
            <option value="In Bearbeitung">In Bearbeitung</option>
            <option value="Abgeschlossen">Abgeschlossen (Bezahlt)</option>
            <option value="Abgelehnt">Abgelehnt</option>
            <option value="Storniert">Storniert</option>
        </select>
    </div>
</div>

<div class="animate-enter delay-200">
    {#if invoicesStore?.isLoading}
        <div class="text-center py-12 text-neutral-500 font-medium animate-pulse">Lade Rechnungen...</div>
    {:else if filterService.filtered.length === 0}
        <div class="orga-card-white p-12 text-center text-neutral-500 border border-neutral-100 shadow-sm">
            <p class="text-lg font-bold text-neutral-900 mb-2">Keine Rechnungen gefunden</p>
            <p>Passen Sie die Suche an oder generieren Sie eine neue Rechnung über die Vorlagen.</p>
        </div>
    {:else}
        <div class="orga-grid">
            {#each filterService.filtered as inv (inv.id)}
                <div class="orga-card-white flex flex-col p-0! group">
                    <!-- Kopfbereich (Datum & Status) -->
                    <div class="p-5 border-b border-neutral-100 flex justify-between items-start bg-neutral-50/50">
                        <div>
                            <span class="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1">Ausgestellt am {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString('de-DE') : '-'}</span>
                            <h3 class="text-lg font-bold text-neutral-900">{inv.invoice_nr || 'RE-Unbekannt'}</h3>
                        </div>
                        <select 
                            value={inv.status} 
                            onchange={(e) => updateStatus(inv.id, e.currentTarget.value)}
                            class="text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer shadow-sm transition-colors {getStatusClass(inv.status)}"
                        >
                            <option value="Entwurf">Entwurf</option>
                            <option value="Eingereicht">Eingereicht</option>
                            <option value="In Bearbeitung">In Bearbeitung</option>
                            <option value="Abgeschlossen">Abgeschlossen</option>
                            <option value="Abgelehnt">Abgelehnt</option>
                            <option value="Storniert">Storniert</option>
                        </select>
                    </div>
                    
                    <!-- Mittelteil (Klient & Betrag) -->
                    <div class="p-5 flex-1">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">{(getClient(inv)?.name_first?.charAt(0) || '')}{(getClient(inv)?.name_last?.charAt(0) || '?')}</div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-neutral-900 truncate">{getClient(inv) ? `${getClient(inv).name_first} ${getClient(inv).name_last}` : 'Ohne Klient'}</p>
                                <p class="text-xs text-neutral-500 truncate">Zugeordnete Termine: {Array.isArray(inv.appointments) ? inv.appointments.length : (inv.appointments ? 1 : 0)}</p>
                            </div>
                        </div>
                        <div class="flex justify-between items-end mt-4 pt-4 border-t border-neutral-100">
                            <span class="text-xs font-bold text-neutral-400 uppercase tracking-wider">Brutto Gesamt</span>
                            <span class="text-xl font-black text-indigo-700">{inv.brutto ? inv.brutto.toFixed(2).replace('.', ',') : '0,00'} €</span>
                        </div>
                    </div>

                    <!-- Fussbereich (Aktionen) -->
                    {#if getPdfUrl(inv)}
                        <a href={getPdfUrl(inv)} target="_blank" rel="noopener noreferrer" class="block w-full text-center py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition-colors group-hover:shadow-md">PDF Ansehen & Herunterladen &rarr;</a>
                    {:else}
                        <div class="w-full text-center py-3.5 bg-neutral-100 text-neutral-400 font-bold text-sm italic">Keine PDF generiert</div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<DocumentGeneratorModal bind:this={generatorModal} />