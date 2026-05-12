<script lang="ts">
    let { onFormat, onInsertPlaceholder } = $props<{
        onFormat: (command: string, value?: string) => void;
        onInsertPlaceholder: (placeholder: string) => void;
    }>();
</script>

<div class="bg-indigo-50/50 border-b border-neutral-200 px-4 py-1.5 flex items-center gap-1 sm:gap-2 shrink-0 overflow-x-auto custom-scrollbar">
    
    <!-- Platzhalter-Werkzeug für Vorlagen -->
    <select onchange={(e) => { onInsertPlaceholder(e.currentTarget.value); e.currentTarget.value = ''; }} class="bg-white border border-neutral-200 hover:border-indigo-300 px-2 py-1 rounded text-sm font-semibold text-indigo-700 outline-none cursor-pointer shadow-sm">
        <option value="" selected disabled>+ Datenfeld einfügen...</option>
        <option value={"{{Klient_Vorname}}"}>Klient: Vorname</option>
        <option value={"{{Klient_Nachname}}"}>Klient: Nachname</option>
        <option value={"{{Klient_Strasse}}"}>Klient: Straße</option>
        <option value={"{{Klient_PLZ_Stadt}}"}>Klient: PLZ & Stadt</option>
        <option value={"{{Datum_Heute}}"}>Datum: Heute</option>
    </select>

    <div class="w-px h-5 bg-neutral-300 mx-1"></div>

    <select onchange={(e) => onFormat('formatBlock', e.currentTarget.value)} class="bg-transparent hover:bg-neutral-200 px-2 py-1 rounded text-sm font-medium outline-none cursor-pointer border-none">
        <option value="p">Normaler Text</option>
        <option value="h1">Überschrift 1</option>
        <option value="h2">Überschrift 2</option>
        <option value="h3">Überschrift 3</option>
    </select>
    
    <div class="w-px h-5 bg-neutral-300 mx-1"></div>
    
    <button onmousedown={(e) => { e.preventDefault(); onFormat('bold'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200 font-bold font-serif" title="Fett">B</button>
    <button onmousedown={(e) => { e.preventDefault(); onFormat('italic'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200 italic font-serif" title="Kursiv">I</button>
    <button onmousedown={(e) => { e.preventDefault(); onFormat('underline'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200 underline font-serif" title="Unterstrichen">U</button>
    
    <div class="w-px h-5 bg-neutral-300 mx-1"></div>
    
    <button onmousedown={(e) => { e.preventDefault(); onFormat('justifyLeft'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Linksbündig"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V19H21V21H3ZM3 17V15H15V17H3ZM3 13V11H21V13H3ZM3 9V7H15V9H3ZM3 5V3H21V5H3Z"/></svg></button>
    <button onmousedown={(e) => { e.preventDefault(); onFormat('justifyCenter'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Zentriert"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V19H21V21H3ZM7 17V15H17V17H7ZM3 13V11H21V13H3ZM7 9V7H17V9H7ZM3 5V3H21V5H3Z"/></svg></button>
    <button onmousedown={(e) => { e.preventDefault(); onFormat('justifyRight'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Rechtsbündig"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V19H21V21H3ZM9 17V15H21V17H9ZM3 13V11H21V13H3ZM9 9V7H21V9H9ZM3 5V3H21V5H3Z"/></svg></button>
    
    <div class="w-px h-5 bg-neutral-300 mx-1"></div>
    
    <button onmousedown={(e) => { e.preventDefault(); onFormat('insertUnorderedList'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Aufzählungszeichen"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 20V18H21V20H8ZM8 13V11H21V13H8ZM8 6V4H21V6H8ZM4 21C3.45 21 3 20.55 3 20C3 19.45 3.45 19 4 19C4.55 19 5 19.45 5 20C5 20.55 4.55 21 4 21ZM4 14C3.45 14 3 13.55 3 13C3 12.45 3.45 12 4 12C4.55 12 5 12.45 5 13C5 13.55 4.55 14 4 14ZM4 7C3.45 7 3 6.55 3 6C3 5.45 3.45 5 4 5C4.55 5 5 5.45 5 6C5 6.55 4.55 7 4 7Z"/></svg></button>
    <button onmousedown={(e) => { e.preventDefault(); onFormat('insertOrderedList'); }} class="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-200" title="Nummerierte Liste"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19V17H21V19H9ZM9 13V11H21V13H9ZM9 7V5H21V7H9ZM4 20V16H5.5V20H4ZM3 14V12.5H4L5 13.5V14H3ZM3 8V6.5L5 5.5V8H3Z"/></svg></button>
</div>