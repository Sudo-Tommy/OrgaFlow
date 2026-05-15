<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { onMount, onDestroy } from "svelte";
    import EmailComposer from "$lib/components/EmailComposer.svelte";

    let folders = $state<any[]>([]);
    let messages = $state<any[]>([]);
    let selectedFolder = $state("INBOX");
    let selectedMessage = $state<any>(null);
    
    let isLoading = $state(true);
    let isComposerOpen = $state(false);
    let unsubscribe: (() => void) | null = null;

    async function loadFolders() {
        try {
            const user = pb.authStore.record;
            if (!user) return;
            folders = await pb.collection('mailboxFolders').getFullList({
                filter: `user = "${user.id}"`,
                sort: 'folder_name'
            });
        } catch (err) {
            console.error("Fehler beim Laden der Ordner:", err);
        }
    }

    async function loadMessages() {
        isLoading = true;
        try {
            const res = await pb.collection('mailbox_messages').getList(1, 50, {
                filter: `folder = "${selectedFolder}"`,
                sort: '-date',
                expand: 'client'
            });
            messages = res.items;
        } catch (err) {
            console.error("Fehler beim Laden der Nachrichten:", err);
        } finally {
            isLoading = false;
        }
    }

    async function selectFolder(folderName: string) {
        selectedFolder = folderName;
        selectedMessage = null;
        isComposerOpen = false;
        await loadMessages();
    }

    async function selectMessage(msg: any) {
        selectedMessage = msg;
        isComposerOpen = false;
        
        // Markiere E-Mail in PocketBase als gelesen
        if (!msg.is_read) {
            try {
                await pb.collection('mailbox_messages').update(msg.id, { is_read: true });
                msg.is_read = true;
                
                // Lokalen Counter im Ordner anpassen
                const folderIdx = folders.findIndex(f => f.folder_name === selectedFolder);
                if (folderIdx !== -1 && folders[folderIdx].unread_count > 0) {
                    folders[folderIdx].unread_count--;
                }
            } catch (err) {
                console.error("Fehler beim Markieren als gelesen:", err);
            }
        }
    }

    function openComposer() {
        selectedMessage = null;
        isComposerOpen = true;
    }

    async function deleteMessage(id: string) {
        if (confirm("E-Mail wirklich löschen?")) {
            await pb.collection('mailbox_messages').delete(id);
            if (selectedMessage?.id === id) selectedMessage = null;
        }
    }

    onMount(async () => {
        await loadFolders();
        await loadMessages();

        // Realtime Updates für neue E-Mails
        pb.collection('mailbox_messages').subscribe('*', (e) => {
            if (e.action === 'create' && e.record.folder === selectedFolder) {
                messages = [e.record, ...messages];
            } else if (e.action === 'update' && e.record.folder === selectedFolder) {
                const idx = messages.findIndex(m => m.id === e.record.id);
                if (idx !== -1) messages[idx] = e.record;
            } else if (e.action === 'delete') {
                messages = messages.filter(m => m.id !== e.record.id);
                if (selectedMessage?.id === e.record.id) selectedMessage = null;
            }
        }).then(unsub => unsubscribe = unsub);
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    function formatDate(dateStr: string) {
        const d = new Date(dateStr);
        const now = new Date();
        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (isToday) return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
</script>

<div class="orga-layout-wrapper text-neutral-900 h-[calc(100vh-(--spacing(24)))] pb-4 px-4 sm:px-6 md:px-8">
    <div class="w-full h-full bg-white rounded-3xl border border-neutral-200 shadow-sm flex overflow-hidden">
        
        <!-- 1. SPALTE: Ordner-Navigation -->
        <div class="w-16 md:w-64 bg-neutral-50/50 border-r border-neutral-100 flex flex-col shrink-0">
            <div class="p-4 border-b border-neutral-100 flex justify-center md:justify-start">
                <button onclick={openComposer} class="w-10 h-10 md:w-full md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl md:rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
                    <span>✏️</span><span class="hidden md:inline">Neue E-Mail</span>
                </button>
            </div>
            <div class="p-2 space-y-1 flex-1 overflow-y-auto">
                <!-- Standard-Ordner als Fallback, falls DB noch leer ist -->
                <button onclick={() => selectFolder('INBOX')} class="w-full flex items-center justify-center md:justify-between p-3 md:px-4 md:py-2.5 rounded-lg transition-colors {selectedFolder === 'INBOX' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-neutral-600 hover:bg-neutral-100 font-medium'}">
                    <div class="flex items-center gap-3"><span class="text-lg">📥</span><span class="hidden md:inline">Posteingang</span></div>
                    {#if folders.find(f => f.folder_name === 'INBOX')?.unread_count > 0}
                        <span class="hidden md:flex bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{folders.find(f => f.folder_name === 'INBOX').unread_count}</span>
                    {/if}
                </button>
                <button onclick={() => selectFolder('Sent')} class="w-full flex items-center justify-center md:justify-between p-3 md:px-4 md:py-2.5 rounded-lg transition-colors {selectedFolder === 'Sent' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-neutral-600 hover:bg-neutral-100 font-medium'}">
                    <div class="flex items-center gap-3"><span class="text-lg">📤</span><span class="hidden md:inline">Gesendet</span></div>
                </button>
                <button onclick={() => selectFolder('Trash')} class="w-full flex items-center justify-center md:justify-between p-3 md:px-4 md:py-2.5 rounded-lg transition-colors {selectedFolder === 'Trash' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-neutral-600 hover:bg-neutral-100 font-medium'}">
                    <div class="flex items-center gap-3"><span class="text-lg">🗑️</span><span class="hidden md:inline">Papierkorb</span></div>
                </button>
            </div>
        </div>

        <!-- 2. SPALTE: Nachrichtenliste -->
        <div class="w-1/3 min-w-70 max-w-100 border-r border-neutral-100 flex flex-col bg-white shrink-0">
            <div class="p-4 border-b border-neutral-100 bg-white sticky top-0 flex items-center justify-between">
                <h2 class="font-bold text-lg text-neutral-900">{selectedFolder === 'INBOX' ? 'Posteingang' : selectedFolder}</h2>
                <button onclick={loadMessages} class="text-neutral-400 hover:text-indigo-600 transition-colors" title="Aktualisieren">↻</button>
            </div>
            
            <div class="flex-1 overflow-y-auto custom-scrollbar">
                {#if isLoading}
                    <div class="p-8 text-center text-sm text-neutral-400">Lade E-Mails...</div>
                {:else if messages.length === 0}
                    <div class="p-8 text-center flex flex-col items-center"><span class="text-3xl mb-2 opacity-50">📭</span><p class="text-sm font-semibold text-neutral-500">Keine E-Mails vorhanden.</p></div>
                {:else}
                    {#each messages as msg}
                        <button type="button" onclick={() => selectMessage(msg)} class="w-full text-left p-4 border-b border-neutral-50 transition-colors hover:bg-neutral-50 {selectedMessage?.id === msg.id ? 'bg-indigo-50/50' : ''}">
                            <div class="flex justify-between items-start mb-1">
                                <span class="text-sm truncate pr-2 {msg.is_read ? 'text-neutral-700 font-semibold' : 'text-neutral-900 font-bold'}">{msg.from_address?.split('<')[0] || msg.from_address}</span>
                                <span class="text-[10px] text-neutral-400 whitespace-nowrap pt-0.5">{formatDate(msg.date)}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                {#if !msg.is_read}<span class="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>{/if}
                                <span class="text-xs truncate {msg.is_read ? 'text-neutral-500' : 'text-neutral-900 font-bold'}">{msg.subject || 'Kein Betreff'}</span>
                            </div>
                        </button>
                    {/each}
                {/if}
            </div>
        </div>

        <!-- 3. SPALTE: Lese- & Komponierbereich -->
        <div class="flex-1 bg-white flex flex-col relative overflow-hidden">
            {#if isComposerOpen}
                <div class="p-6 h-full overflow-y-auto"><EmailComposer /></div>
            {:else if selectedMessage}
                <div class="p-6 md:p-8 border-b border-neutral-100 shrink-0 bg-white">
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <h1 class="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">{selectedMessage.subject || 'Kein Betreff'}</h1>
                        <div class="flex items-center gap-2 shrink-0">
                            <button onclick={() => deleteMessage(selectedMessage.id)} class="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Löschen"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <div class="flex items-center gap-2"><div class="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold text-xs shadow-inner shrink-0">{(selectedMessage.from_address?.charAt(0) || '?').toUpperCase()}</div><div><p class="font-bold text-neutral-900">{selectedMessage.from_address}</p><p class="text-xs text-neutral-500">An: {selectedMessage.to_address}</p></div></div>
                        <div class="text-xs text-neutral-500 font-medium text-right">{new Date(selectedMessage.date).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
                <!-- Iframe isoliert das HTML der Mail, damit das Dashboard-Design nicht durch fremdes CSS zerstört wird -->
                <iframe srcdoc={selectedMessage.body_html || `<div style="font-family: sans-serif; padding: 20px;">${selectedMessage.body_text?.replace(/\n/g, '<br>') || ''}</div>`} class="flex-1 w-full border-none bg-white" title="E-Mail Inhalt" sandbox="allow-same-origin allow-popups"></iframe>
            {:else}
                <div class="flex-1 flex flex-col items-center justify-center text-neutral-400 bg-neutral-50/30"><span class="text-6xl mb-4 opacity-20">✉️</span><p class="font-medium">Wähle eine Nachricht aus, um sie zu lesen.</p></div>
            {/if}
        </div>
    </div>
</div>