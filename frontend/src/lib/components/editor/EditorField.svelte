<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";

    let { field = $bindable(), isSelected, onSelect } = $props<{
        field: CanvasField;
        isSelected: boolean;
        onSelect: () => void;
    }>();

    let isDragging = false;
    let isResizing = false;
    let startX = 0; let startY = 0;
    let initialFieldX = 0; let initialFieldY = 0;
    let initialFieldW = 0; let initialFieldH = 0;

    function startDrag(e: MouseEvent) {
        e.stopPropagation();
        onSelect();
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        initialFieldX = field.x; initialFieldY = field.y;
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
    }

    function onDrag(e: MouseEvent) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // Exaktes Positionieren auf dem A4 Blatt (kein Grid-Snapping mehr)
        // Verhindert das Herausschieben aus dem oberen und linken Rand
        field.x = Math.max(0, initialFieldX + dx);
        field.y = Math.max(0, initialFieldY + dy);
    }

    function stopDrag() {
        isDragging = false;
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    }

    function startResize(e: MouseEvent) {
        e.stopPropagation();
        onSelect();
        isResizing = true;
        startX = e.clientX; startY = e.clientY;
        initialFieldW = field.w; initialFieldH = field.h;
        window.addEventListener('mousemove', onResize);
        window.addEventListener('mouseup', stopResize);
    }

    function onResize(e: MouseEvent) {
        if (!isResizing) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        field.w = Math.max(20, initialFieldW + dx);
        field.h = Math.max(20, initialFieldH + dy);
    }

    function stopResize() {
        isResizing = false;
        window.removeEventListener('mousemove', onResize);
        window.removeEventListener('mouseup', stopResize);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="absolute cursor-move select-none transition-shadow {isSelected ? 'ring-2 ring-indigo-500 shadow-lg z-20' : 'ring-1 ring-neutral-200/50 hover:ring-indigo-300 z-10'}"
    style="left: {field.x}px; top: {field.y}px; width: {field.w}px; height: {field.h}px; background-color: {field.style.backgroundColor};"
    onmousedown={startDrag}
>
    <!-- Rendering des Inhalts -->
    <div class="w-full h-full overflow-hidden" style="color: {field.style.color}; font-size: {field.style.fontSize}px; font-weight: {field.style.fontWeight}; text-align: {field.style.textAlign}; padding: {field.style.padding}px;">
        {#if field.type === 'text'}
            {@html field.content.replace(/\n/g, '<br/>')}
        {:else if field.type === 'logo'}
            <div class="w-full h-full border-2 border-dashed border-neutral-300 flex items-center justify-center bg-neutral-50/50 text-neutral-400 font-bold tracking-widest uppercase text-sm">
                Firmenlogo Platzhalter
            </div>
        {:else if field.type === 'table'}
            <div class="w-full h-full border border-neutral-300 bg-white">
                <div class="flex border-b border-neutral-300 font-bold" style="background-color: {field.tableConfig?.headerBackgroundColor || '#f4f4f5'}; color: {field.tableConfig?.headerTextColor || '#000'}">
                    {#each field.tableConfig?.columns || [] as col}<div class="p-1 border-r border-neutral-300 last:border-0" style="width: {col.width}%; text-align: {col.align};">{col.name}</div>{/each}
                </div>
                <div class="flex text-neutral-400 italic text-xs">
                    <div class="p-2">
                        {field.tableConfig?.staticDescription ? `Fest: ${field.tableConfig.staticDescription}` : 'Daten werden hier dynamisch eingefügt...'}
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Resize Handle -->
    {#if isSelected}
        <div class="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-indigo-600 border border-white rounded-full cursor-se-resize shadow-md" onmousedown={startResize}></div>
    {/if}
</div>