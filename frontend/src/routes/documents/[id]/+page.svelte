<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { useEditor } from "$lib/services/editorService.svelte";
    import EditorTopBar from "$lib/components/editor/EditorTopBar.svelte";
    import EditorToolbar from "$lib/components/editor/EditorToolbar.svelte";
    import EditorCanvas from "$lib/components/editor/EditorCanvas.svelte";

    // Die ID kommt nun dynamisch aus dem Pfad (z.B. /documents/12345 oder /documents/new)
    const docId = $page.params.id === 'new' ? null : ($page.params.id ?? null);
    const editor = useEditor(docId);

    onMount(() => {
        editor.load();
    });
</script>

<svelte:head>
    <title>{editor.title} - OrgaFlow Editor</title>
</svelte:head>

<!-- Die Toolbar und das Layout brechen hier bewusst aus dem normalen orga-layout aus, um Fullscreen zu sein -->
<div class="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col font-sans">
    <EditorTopBar 
        bind:title={editor.title} 
        saveMessage={editor.saveMessage} 
        isSaving={editor.isSaving} 
        onSave={editor.save} 
    />
    <EditorToolbar 
        onFormat={editor.format} 
        onInsertPlaceholder={editor.insertPlaceholder} 
    />
    <EditorCanvas 
        onInput={editor.handleInput} 
        setRef={editor.setEditorRef} 
    />
</div>