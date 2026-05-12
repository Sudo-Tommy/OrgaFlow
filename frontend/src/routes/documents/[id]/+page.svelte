<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
<<<<<<< HEAD
=======
    import { goto } from "$app/navigation";
    import { pb } from "$lib/services/pocketbase";
>>>>>>> 040e0d1e50cbe83a1f4436ed8c76cdc8af821e4d
    import { useEditor } from "$lib/services/editorService.svelte";
    import EditorTopBar from "$lib/components/editor/EditorTopBar.svelte";
    import EditorCanvas from "$lib/components/editor/EditorCanvas.svelte";
    import EditorSidebar from "$lib/components/editor/EditorSidebar.svelte";

<<<<<<< HEAD
    // Die ID kommt nun dynamisch aus dem Pfad (z.B. /documents/12345 oder /documents/new)
    const docId = $page.params.id === 'new' ? null : ($page.params.id ?? null);
    const editor = useEditor(docId);

    onMount(() => {
        editor.load();
    });
</script>

<svelte:head>
=======
    let docId = $derived($page.url.searchParams.get("id"));
    
    let title = $state("Unbenannte Vorlage");
    let content = $state("<p><br></p>");
    let isSaving = $state(false);
    let saveMessage = $state("");
    
    let editorRef: HTMLDivElement;
    const docId = $page.url.searchParams.get("id");
    const editor = useEditor(docId);

    onMount(async () => {
        if (docId) {
            try {
                const record = await pb.collection('document_templates').getOne(docId);
                title = record.title || "Unbenannte Vorlage";
                content = record.content || "<p><br></p>";
                if (editorRef) editorRef.innerHTML = content;
            } catch (err) {
                console.error("Vorlage konnte nicht geladen werden", err);
            }
        }
    onMount(() => {
        editor.load();
    });

    function format(command: string, value: string | undefined = undefined) {
        document.execCommand(command, false, value);
        if (editorRef) editorRef.focus();
    }

    function insertPlaceholder(placeholder: string) {
        if (!placeholder) return;
        // Fügt den Text an der aktuellen Cursor-Position ein
        document.execCommand('insertText', false, placeholder);
        if (editorRef) editorRef.focus();
        handleInput();
    }

    // Aktualisiert das Daten-Binding bei Eingabe
    function handleInput() {
        if (editorRef) content = editorRef.innerHTML;
    }

    async function saveDocument() {
        isSaving = true;
        saveMessage = "Speichert...";
        try {
            const data = { title, content };
            if (docId) {
                await pb.collection('document_templates').update(docId, data);
            } else {
                const newDoc = await pb.collection('document_templates').create(data);
                // URL aktualisieren ohne Neuladen, damit wir fortan updaten
                goto(`?id=${newDoc.id}`, { replaceState: true, keepFocus: true });
            }
            saveMessage = "Gespeichert!";
            setTimeout(() => saveMessage = "", 2000);
        } catch (err) {
            console.error(err);
            saveMessage = "Fehler beim Speichern!";
        } finally {
            isSaving = false;
        }
    }
</script>

<svelte:head>
    <title>{title} - OrgaFlow Editor</title>
>>>>>>> 040e0d1e50cbe83a1f4436ed8c76cdc8af821e4d
    <title>{editor.title} - OrgaFlow Editor</title>
</svelte:head>

<!-- Die Toolbar und das Layout brechen hier bewusst aus dem normalen orga-layout aus, um Fullscreen zu sein -->
<div class="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col font-sans">
<<<<<<< HEAD
=======
    
    <!-- Top Bar (Google Docs Style) -->
    <header class="bg-white flex items-center justify-between px-4 py-2 border-b border-neutral-200 shrink-0">
        <div class="flex items-center gap-4">
            <a href="/documents" class="w-10 h-10 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Zurück zur Übersicht">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </a>
            <div class="flex flex-col">
                <input 
                    type="text" 
                    bind:value={title} 
                    class="text-[18px] font-medium text-neutral-800 bg-transparent border border-transparent hover:border-neutral-300 focus:border-indigo-500 focus:outline-none rounded px-2 py-0.5 w-64 md:w-96 transition-colors" 
                />
                <div class="flex gap-4 px-2 mt-0.5 text-[13px] text-neutral-500">
                    <button class="hover:bg-neutral-100 px-1.5 rounded transition-colors">Datei</button>
                    <button class="hover:bg-neutral-100 px-1.5 rounded transition-colors">Bearbeiten</button>
                    <button class="hover:bg-neutral-100 px-1.5 rounded transition-colors">Einfügen</button>
                </div>
            </div>
        </div>
        <div class="flex items-center gap-4">
            {#if saveMessage}
                <span class="text-sm text-neutral-500 hidden md:inline">{saveMessage}</span>
            {/if}
            <button onclick={saveDocument} disabled={isSaving} class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Speichern
            </button>
        </div>
    </header>

    <!-- Formatierungs-Toolbar -->
    <div class="bg-indigo-50/50 border-b border-neutral-200 px-4 py-1.5 flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto custom-scrollbar">
        
        <!-- NEU: Platzhalter-Werkzeug für Vorlagen -->
        <select onchange={(e) => { insertPlaceholder(e.currentTarget.value); e.currentTarget.value = ''; }} class="bg-white border border-neutral-200 hover:border-indigo-300 px-2 py-1 rounded text-sm font-semibold text-indigo-700 outline-none cursor-pointer shadow-sm">
            <option value="" selected disabled>+ Datenfeld einfügen...</option>
            <option value="{{Klient_Vorname}}">Klient: Vorname</option>
            <option value="{{Klient_Nachname}}">Klient: Nachname</option>
            <option value="{{Klient_Strasse}}">Klient: Straße</option>
            <option value="{{Klient_PLZ_Stadt}}">Klient: PLZ & Stadt</option>
            <option value="{{Datum_Heute}}">Datum: Heute</option>
        </select>

        <div class="w-px h-5 bg-neutral-300 mx-1"></div>

        <select onchange={(e) => format('formatBlock', e.currentTarget.value)} class="bg-transparent hover:bg-neutral-200 px-2 py-1 rounded text-sm font-medium outline-none cursor-pointer border-none">
            <option value="p">Normaler Text</option>
            <option value="h1">Überschrift 1</option>
            <option value="h2">Überschrift 2</option>
            <option value="h3">Überschrift 3</option>
        </select>
        
        <div class="w-px h-5 bg-neutral-300 mx-1"></div>
        
        <!-- mousedown.preventDefault verhindert, dass das Textfeld den Fokus verliert! -->
        <button onmousedown={(e) => { e.preventDefault(); format('bold'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200 font-bold font-serif" title="Fett">B</button>
        <button onmousedown={(e) => { e.preventDefault(); format('italic'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200 italic font-serif" title="Kursiv">I</button>
        <button onmousedown={(e) => { e.preventDefault(); format('underline'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200 underline font-serif" title="Unterstrichen">U</button>
        
        <div class="w-px h-5 bg-neutral-300 mx-1"></div>
        
        <button onmousedown={(e) => { e.preventDefault(); format('justifyLeft'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Linksbündig"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V19H21V21H3ZM3 17V15H15V17H3ZM3 13V11H21V13H3ZM3 9V7H15V9H3ZM3 5V3H21V5H3Z"/></svg></button>
        <button onmousedown={(e) => { e.preventDefault(); format('justifyCenter'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Zentriert"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V19H21V21H3ZM7 17V15H17V17H7ZM3 13V11H21V13H3ZM7 9V7H17V9H7ZM3 5V3H21V5H3Z"/></svg></button>
        <button onmousedown={(e) => { e.preventDefault(); format('justifyRight'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Rechtsbündig"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V19H21V21H3ZM9 17V15H21V17H9ZM3 13V11H21V13H3ZM9 9V7H21V9H9ZM3 5V3H21V5H3Z"/></svg></button>
        
        <div class="w-px h-5 bg-neutral-300 mx-1"></div>
        
        <button onmousedown={(e) => { e.preventDefault(); format('insertUnorderedList'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Aufzählungszeichen"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 20V18H21V20H8ZM8 13V11H21V13H8ZM8 6V4H21V6H8ZM4 21C3.45 21 3 20.55 3 20C3 19.45 3.45 19 4 19C4.55 19 5 19.45 5 20C5 20.55 4.55 21 4 21ZM4 14C3.45 14 3 13.55 3 13C3 12.45 3.45 12 4 12C4.55 12 5 12.45 5 13C5 13.55 4.55 14 4 14ZM4 7C3.45 7 3 6.55 3 6C3 5.45 3.45 5 4 5C4.55 5 5 5.45 5 6C5 6.55 4.55 7 4 7Z"/></svg></button>
        <button onmousedown={(e) => { e.preventDefault(); format('insertOrderedList'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Nummerierte Liste"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19V17H21V19H9ZM9 13V11H21V13H9ZM9 7V5H21V7H9ZM4 20V16H5.5V20H4ZM3 14V12.5H4L5 13.5V14H3ZM3 8V6.5L5 5.5V8H3Z"/></svg></button>
    </div>

    <!-- Arbeitsfläche (Grauer Hintergrund, zentriertes A4-Blatt) -->
    <main class="flex-1 overflow-y-auto custom-scrollbar flex justify-center p-4 sm:p-8 bg-[#F8F9FA]">
        <!-- A4 Seiten-Proportion (210mm x 297mm) -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
            bind:this={editorRef}
            class="editor-page bg-white shadow-md border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            contenteditable="true"
            oninput={handleInput}
            onblur={handleInput}
        >
            <!-- Inhalt wird via onMount injiziert -->
        </div>
    </main>
>>>>>>> 040e0d1e50cbe83a1f4436ed8c76cdc8af821e4d
    <EditorTopBar 
        bind:title={editor.title} 
        saveMessage={editor.saveMessage} 
        isSaving={editor.isSaving} 
        onSave={editor.save} 
        onAdd={editor.addField}
    />
<<<<<<< HEAD
    <div class="flex-1 flex overflow-hidden">
        <EditorCanvas 
            fields={editor.fields} 
            bind:selectedFieldId={editor.selectedFieldId}
        />
        <EditorSidebar 
            fields={editor.fields} 
            selectedFieldId={editor.selectedFieldId} 
            onDelete={editor.deleteField}
        />
    </div>
</div>
=======
    <EditorToolbar 
        onFormat={editor.format} 
        onInsertPlaceholder={editor.insertPlaceholder} 
    />
    <EditorCanvas 
        onInput={editor.handleInput} 
        setRef={editor.setEditorRef} 
    />
</div>

<style>
    /* A4-Blatt Simulation */
    .editor-page {
        width: 100%;
        max-width: 210mm; /* A4 Breite */
        min-height: 297mm; /* A4 Höhe */
        padding: 25mm; /* A4 Standard-Ränder */
        line-height: 1.6;
        color: #1f2937;
    }
    
    /* Standard-Formatierungen für den Editor */
    .editor-page :global(h1) { font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem; color: #111827; }
    .editor-page :global(h2) { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: #1f2937; margin-top: 1rem; }
    .editor-page :global(h3) { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151; }
    .editor-page :global(p) { margin-bottom: 1rem; }
    .editor-page :global(ul) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
    .editor-page :global(ol) { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
</style>
>>>>>>> 040e0d1e50cbe83a1f4436ed8c76cdc8af821e4d
