<script lang="ts">
    let { title = $bindable(), type = $bindable(), saveMessage, isSaving, onSave, onAdd } = $props<{
        title: string;
        type: string;
        saveMessage: string;
        isSaving: boolean;
        onSave: () => void;
        onAdd: (type: 'text' | 'logo' | 'table') => void;
    }>();
</script>

<header class="bg-white flex items-center justify-between px-4 py-2 border-b border-neutral-200 shrink-0">
    <div class="flex items-center gap-4">
        <a href="/documents" class="w-10 h-10 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Zurück zur Übersicht">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </a>
        <div class="flex flex-col">
            <div class="flex items-center gap-2">
                <input 
                    type="text" 
                    bind:value={title} 
                    class="text-[18px] font-medium text-neutral-800 bg-transparent border border-transparent hover:border-neutral-300 focus:border-indigo-500 focus:outline-none rounded px-2 py-0.5 w-48 md:w-64 transition-colors" 
                />
                <select bind:value={type} class="bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                    <option value="rechnung">Rechnung</option>
                    <option value="arbeitszeitnachweis">Arbeitszeitnachweis</option>
                    <option value="allgemein">Brief / Allgemein</option>
                </select>
            </div>
            <div class="flex gap-1 px-2 mt-0.5 text-[12px] font-bold text-neutral-500">
                <button onclick={() => onAdd('text')} class="hover:bg-neutral-100 hover:text-indigo-600 px-2 py-0.5 rounded transition-colors">+ Textbox</button>
                <button onclick={() => onAdd('logo')} class="hover:bg-neutral-100 hover:text-indigo-600 px-2 py-0.5 rounded transition-colors">+ Logo</button>
                <button onclick={() => onAdd('table')} class="hover:bg-neutral-100 hover:text-indigo-600 px-2 py-0.5 rounded transition-colors">+ Tabelle</button>
            </div>
        </div>
    </div>
    <div class="flex items-center gap-4">
        {#if saveMessage}
            <span class="text-sm text-neutral-500 hidden md:inline">{saveMessage}</span>
        {/if}
        <button onclick={onSave} disabled={isSaving} class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Speichern
        </button>
    </div>
</header>