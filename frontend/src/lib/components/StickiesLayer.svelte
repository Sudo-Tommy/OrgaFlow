<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { onMount, onDestroy } from "svelte";
    import { toastStore } from "$lib/services/toastService.svelte";

    // Lokaler State für die Stickies
    let stickies = $state<any[]>([]);
    let isSubscribed = false;

    let innerWidth = $state(1024);
    let isMobile = $derived(innerWidth < 768);

    async function loadStickies() {
        try {
            const user = pb.authStore.model;
            if (!user) return;
            // Holt alle Stickies des aktuellen Nutzers
            const res = await pb.collection('stickies').getFullList({ filter: `user = "${user.id}"` });
            stickies = res;

            // Realtime-Abo starten
            if (!isSubscribed) {
                pb.collection('stickies').subscribe('*', (e) => {
                    if (e.action === 'create' && e.record.user === user.id) {
                        if (!stickies.find(s => s.id === e.record.id)) stickies.push(e.record);
                    } else if (e.action === 'update') {
                        const idx = stickies.findIndex(s => s.id === e.record.id);
                        if (idx !== -1) stickies[idx] = e.record;
                    } else if (e.action === 'delete') {
                        stickies = stickies.filter(s => s.id !== e.record.id);
                    }
                });
                isSubscribed = true;
            }
        } catch (err) {
            // Silently ignore - Collection might be empty or permissions not yet synced
        }
    }

    onMount(() => {
        loadStickies();
        
        // Event-Listener für den "Neue Notiz" Button aus dem Dashboard
        const addHandler = async () => {
            const user = pb.authStore.model;
            if (!user) return;
            try {
                await pb.collection('stickies').create({
                    user: user.id,
                    content: "",
                    color: "bg-amber-200",
                    pos_x: Math.floor(Math.random() * 200) + 50, // Zufälliger Versatz für einen "Post-it" Look
                    pos_y: Math.floor(Math.random() * 100) + 50
                });
            } catch (err) {
                toastStore.error("Datenbank-Fehler: Tabelle 'stickies' existiert nicht.");
            }
        };

        window.addEventListener('add-sticky', addHandler);
        return () => {
            window.removeEventListener('add-sticky', addHandler);
            if (isSubscribed) pb.collection('stickies').unsubscribe('*');
        };
    });

    // --- Drag and Drop Logik ---
    let dragId = $state<string | null>(null);
    let startX = $state(0);
    let startY = $state(0);
    let initialPosX = $state(0);
    let initialPosY = $state(0);

    function handlePointerDown(e: PointerEvent, sticky: any) {
        // Verhindert, dass man beim Schreiben in die Textbox aus Versehen zieht
        if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'BUTTON') return;
        dragId = sticky.id;
        startX = e.clientX;
        startY = e.clientY;
        initialPosX = sticky.pos_x || 0;
        initialPosY = sticky.pos_y || 0;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!dragId) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const s = stickies.find(s => s.id === dragId);
        if (s) {
            s.pos_x = Math.max(0, initialPosX + dx);
            s.pos_y = Math.max(0, initialPosY + dy);
        }
    }

    function handlePointerUp(e: PointerEvent) {
        if (dragId) {
            const s = stickies.find(s => s.id === dragId);
            if (s) pb.collection('stickies').update(s.id, { pos_x: s.pos_x, pos_y: s.pos_y }); // In DB speichern
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            dragId = null;
        }
    }

    // Speichert den Text automatisch 500ms nachdem man aufgehört hat zu tippen
    let typingTimeout: ReturnType<typeof setTimeout>;
    function handleContentChange(sticky: any) {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            pb.collection('stickies').update(sticky.id, { content: sticky.content });
        }, 500);
    }

    function changeColor(sticky: any, color: string) {
        sticky.color = color;
        pb.collection('stickies').update(sticky.id, { color });
    }
</script>

<svelte:window bind:innerWidth />

{#if stickies.length > 0}
    <!-- Am PC absolut über der App liegend, auf dem Handy als horizontale Liste am oberen Bildschirmrand eingebettet -->
    <div class="{isMobile ? 'relative flex w-full overflow-x-auto gap-4 p-4 snap-x custom-scrollbar bg-black/5 shadow-inner border-b border-black/5' : 'absolute inset-0 pointer-events-none z-30 overflow-visible'}">
        {#each stickies as sticky (sticky.id)}
            <div 
                class="shadow-lg pointer-events-auto flex flex-col group {sticky.color || 'bg-amber-200'} {isMobile ? 'relative w-70 shrink-0 rounded-2xl snap-center' : 'absolute w-56 rounded-bl-2xl rounded-br-2xl rounded-tr-2xl'}"
                style={isMobile ? '' : `left: ${sticky.pos_x}px; top: ${sticky.pos_y}px; transition: ${dragId === sticky.id ? 'none' : 'box-shadow 0.2s'}; z-index: ${dragId === sticky.id ? 50 : 10};`}
            >
                <!-- Die Griffleiste (oben) -->
                <div 
                    role="none"
                    class="{isMobile ? 'h-12 rounded-t-2xl opacity-100' : 'h-8 rounded-tr-2xl cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100'} flex justify-between items-center px-3 md:px-2 transition-opacity bg-black/10"
                    onpointerdown={(e) => { if (!isMobile) handlePointerDown(e, sticky); }}
                    onpointermove={(e) => { if (!isMobile) handlePointerMove(e); }}
                    onpointerup={(e) => { if (!isMobile) handlePointerUp(e); }}
                    onpointercancel={(e) => { if (!isMobile) handlePointerUp(e); }}
                >
                    <!-- Farbauswahl -->
                    <div class="flex gap-2 md:gap-1.5 ml-1">
                        <button aria-label="Gelb" onclick={() => changeColor(sticky, 'bg-amber-200')} class="w-5 h-5 md:w-3.5 md:h-3.5 rounded-full bg-amber-200 border border-black/10 hover:scale-110 transition-transform shadow-sm"></button>
                        <button aria-label="Grün" onclick={() => changeColor(sticky, 'bg-emerald-200')} class="w-5 h-5 md:w-3.5 md:h-3.5 rounded-full bg-emerald-200 border border-black/10 hover:scale-110 transition-transform shadow-sm"></button>
                        <button aria-label="Rot" onclick={() => changeColor(sticky, 'bg-rose-200')} class="w-5 h-5 md:w-3.5 md:h-3.5 rounded-full bg-rose-200 border border-black/10 hover:scale-110 transition-transform shadow-sm"></button>
                        <button aria-label="Blau" onclick={() => changeColor(sticky, 'bg-sky-200')} class="w-5 h-5 md:w-3.5 md:h-3.5 rounded-full bg-sky-200 border border-black/10 hover:scale-110 transition-transform shadow-sm"></button>
                    </div>
                    <!-- Löschen Button -->
                    <button onclick={() => pb.collection('stickies').delete(sticky.id)} class="text-black/40 hover:text-rose-600 font-bold p-2 md:p-1 rounded-md hover:bg-black/5 transition-colors text-xl md:text-base leading-none">✕</button>
                </div>
                
                <!-- Textfeld -->
                <textarea 
                    bind:value={sticky.content} 
                    oninput={() => handleContentChange(sticky)}
                    class="w-full {isMobile ? 'min-h-48 text-base p-5 pt-3' : 'min-h-35 text-sm p-4 pt-2'} bg-transparent resize-none focus:outline-none text-neutral-800 font-medium leading-relaxed custom-scrollbar placeholder:text-black/40 placeholder:italic"
                    placeholder="Notiz eintragen..."
                    spellcheck="false"
                ></textarea>
                
                <!-- Optisches Eselsohr oben links (Nur auf Desktop) -->
                {#if !isMobile}
                    <div class="absolute top-0 left-0 w-4 h-4 bg-black/10 rounded-br-lg shadow-sm" style="clip-path: polygon(0 0, 100% 100%, 0 100%);"></div>
                {/if}
            </div>
        {/each}
    </div>
    {#if isMobile}<div class="w-full h-4"></div>{/if}
{/if}