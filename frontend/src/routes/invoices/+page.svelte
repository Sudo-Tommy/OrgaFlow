<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useInvoiceFilter } from "$lib/services/invoiceFilterService.svelte";
    import DocumentGeneratorModal from "$lib/components/DocumentGeneratorModal.svelte";
    import InvoiceEmailModal from "$lib/components/InvoiceEmailModal.svelte";
    import { onMount } from "svelte";

    const invoicesStore = orgaStore.invoices;
    const filterService = useInvoiceFilter(() => invoicesStore?.data || []);

    let generatorModal: ReturnType<typeof DocumentGeneratorModal> | undefined = $state();
    let emailModal: ReturnType<typeof InvoiceEmailModal> | undefined = $state();

    // Funktion für das direkte Aktualisieren des Status aus der Übersicht heraus
    async function updateStatus(id: string, newStatus: string) {
        try {
            await pb.collection('invoices').update(id, { status: newStatus });
        } catch (err) {
            console.error("Fehler beim Status-Update:", err);
            alert("Der Status konnte nicht aktualisiert werden.");
        }
    }

    // Funktion zum Löschen einer Rechnung
    async function deleteInvoice(id: string) {
        if (confirm("Möchten Sie diese Rechnung wirklich unwiderruflich löschen?")) {
            try {
                await pb.collection('invoices').delete(id);
            } catch (err) {
                console.error("Fehler beim Löschen:", err);
                alert("Die Rechnung konnte nicht gelöscht werden.");
            }
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
    function getPdfUrl(record: any, index: number = 0) {
        if (!record.pdf || record.pdf.length === 0) return null;
        
        if (Array.isArray(record.pdf)) {
            if (index < record.pdf.length) {
                return pb.files.getURL(record, record.pdf[index]);
            }
            return null;
        }
        return index === 0 ? pb.files.getURL(record, record.pdf) : null;
    }
    
    // PWA-Sicherer Download: Verhindert, dass iOS die App mit der PDF überschreibt
    async function downloadPdf(record: any, index: number, prefix: string) {
        const url = getPdfUrl(record, index);
        if (!url) return;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Netzwerkantwort war nicht ok");
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            const safeNr = (record.invoice_nr || 'Unbekannt').replace(/\//g, '-');
            a.download = `${prefix}_${safeNr}.pdf`;
            
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(blobUrl); }, 100);
        } catch (error) {
            console.error("Download fehlgeschlagen:", error);
            alert("Das Dokument konnte nicht geladen werden.");
        }
    }

    function getClient(record: any) {
        return Array.isArray(record.expand?.client) ? record.expand.client[0] : record.expand?.client;
    }

    function openGenerator() {
        const invoiceTemplate = orgaStore.document_templates?.data.find((t: any) => (t.type || '').toLowerCase() === 'rechnung');
        generatorModal?.open(invoiceTemplate?.id, 1);
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">Rechnungen</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier alle generierten Rechnungen, Einnahmen und deren Status.</p>
    </div>
    <button onclick={openGenerator} class="orga-button-primary inline-flex">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        Neue Rechnung
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
                    <div class="flex flex-col mt-auto border-t border-neutral-100">
                        <div class="flex">
                            {#if getPdfUrl(inv, 0)}
                                <button type="button" onclick={() => downloadPdf(inv, 0, 'Rechnung')} class="flex-1 block text-center py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm transition-colors border-r border-neutral-700 cursor-pointer" title="Rechnung herunterladen">Rechnung</button>
                            {:else}
                                <div class="flex-1 text-center py-3.5 bg-neutral-100 text-neutral-400 font-bold text-sm italic border-r border-neutral-200">Keine Rechnung</div>
                            {/if}
                            
                            {#if getPdfUrl(inv, 1)}
                                <button type="button" onclick={() => downloadPdf(inv, 1, 'Zeitnachweis')} class="flex-1 block text-center py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors cursor-pointer" title="Zeitnachweis herunterladen">Zeitnachweis</button>
                            {/if}
                            
                            {#if getPdfUrl(inv, 0) || getPdfUrl(inv, 1)}
                                <button type="button" onclick={() => emailModal?.open(inv)} class="w-14 shrink-0 flex items-center justify-center bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white transition-colors" title="Per E-Mail versenden">
                                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                </button>
                            {/if}
                            
                            <button onclick={() => deleteInvoice(inv.id)} class="w-14 shrink-0 flex items-center justify-center bg-red-50 hover:bg-red-500 text-red-500 hover:text-white transition-colors" title="Rechnung löschen">
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<DocumentGeneratorModal bind:this={generatorModal} />
<InvoiceEmailModal bind:this={emailModal} />