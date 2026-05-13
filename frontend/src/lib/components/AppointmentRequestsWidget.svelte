<script lang="ts">
    import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
    import { onMount, onDestroy } from "svelte";

    const reqService = useRequestAdmin();
    let showAll = $state(false);

    onMount(() => reqService.init());
    onDestroy(() => reqService.cleanup());

    let visibleRequests = $derived(reqService.requests.filter(r => showAll || r.status === 'requested'));
    let pendingCount = $derived(reqService.requests.filter(r => r.status === 'requested').length);

    function formatContact(method: string) {
        switch(method) {
            case 'telephone': return '📞 Telefonrückruf';
            case 'e-mail-address': return '✉️ E-Mail';
            case 'whatsapp': return '💬 WhatsApp';
            case 'mail-adress': return '📮 Postbrief';
            default: return '📞 Unbekannt';
        }
    }
    
    async function handleStatus(id: string, status: 'accepted' | 'denied' | 'requested') {
        try {
            await reqService.updateStatus(id, status);
        } catch (err) {
            alert("Fehler beim Aktualisieren des Status.");
        }
    }

    async function handleDelete(id: string) {
        if (confirm("Möchten Sie diese Anfrage wirklich unwiderruflich löschen?")) {
            try {
                await reqService.deleteReq(id);
            } catch (err) {
                alert("Fehler beim Löschen.");
            }
        }
    }
</script>

<div class="orga-card-white flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <div class="flex items-center gap-3">
            <h2 class="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <span>📬</span> Terminanfragen
            </h2>
            {#if pendingCount > 0}
                <span class="px-2.5 py-0.5 rounded-full bg-brand-500 text-white text-xs font-bold shadow-sm animate-pulse">{pendingCount} Neu</span>
            {/if}
        </div>        
      </div>

      <div class="flex bg-white p-1 rounded-lg border border-neutral-200 shadow-sm m-1">
          <button onclick={() => showAll = false} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {!showAll ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">Offen ({pendingCount})</button>
          <button onclick={() => showAll = true} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {showAll ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}">Alle</button>
      </div>

    <!-- Content -->
    <div class="p-6 bg-white min-h-[200px] max-h-[500px] overflow-y-auto custom-scrollbar">
        {#if reqService.isLoading}
            <p class="text-neutral-500 text-sm text-center py-10">Lade Anfragen...</p>
        {:else if visibleRequests.length === 0}
            <div class="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                <span class="text-4xl mb-3 block opacity-80">🙌</span>
                <p class="text-neutral-700 font-bold mb-1">Alles erledigt!</p>
                <p class="text-neutral-400 text-sm">Es liegen aktuell keine neuen Terminanfragen vor.</p>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each visibleRequests as req (req.id)}
                    <div class="border rounded-xl p-5 flex flex-col relative transition-all shadow-sm hover:shadow-md {req.status === 'requested' ? 'border-brand-200 bg-brand-50/30' : 'border-neutral-200 bg-white'}">
                        
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h3 class="font-bold text-neutral-900 text-lg">{req.sender_name}</h3>
                                <p class="text-xs font-semibold text-brand-600 bg-brand-100 inline-block px-2 py-0.5 rounded mt-1 border border-brand-200">{formatContact(req.contact_method)}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-xs text-neutral-500 font-medium">{new Date(req.created).toLocaleDateString('de-DE')} {new Date(req.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
                                {#if req.status === 'accepted'}<span class="text-xs font-bold text-emerald-600 mt-1 block">✅ Angenommen</span>{/if}
                                {#if req.status === 'denied'}<span class="text-xs font-bold text-rose-600 mt-1 block">❌ Abgelehnt</span>{/if}
                            </div>
                        </div>

                        <div class="bg-white p-3 rounded-lg border border-neutral-100 text-sm text-neutral-700 mb-4 flex-1 whitespace-pre-wrap shadow-inner">
                            "{req.request_text}"
                        </div>

                        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100">
                            <div class="text-xs text-neutral-500 w-full sm:w-auto">
                                {#if req.date || req.time}
                                    <span class="font-bold">Wunsch:</span> 
                                    {req.date ? new Date(req.date).toLocaleDateString('de-DE') : 'Kein Datum'} 
                                    {req.time ? `um ${new Date(req.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''}
                                {:else}
                                    <span class="italic">Kein Terminwunsch</span>
                                {/if}
                            </div>
                            
                            <div class="flex items-center gap-2 w-full sm:w-auto">
                                {#if req.status === 'requested'}
                                    <button onclick={() => handleStatus(req.id, 'denied')} class="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200">Ablehnen</button>
                                    <button onclick={() => handleStatus(req.id, 'accepted')} class="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300">Annehmen</button>
                                {:else}
                                    <button onclick={() => handleStatus(req.id, 'requested')} class="px-2 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-700 transition-colors">Zurücksetzen</button>
                                {/if}
                                <button onclick={() => handleDelete(req.id)} class="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors" title="Löschen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>