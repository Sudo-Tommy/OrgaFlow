<script lang="ts">
    import type { CanvasField } from "$lib/services/editorService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    let { field = $bindable(), allFields = [], isSelected, onSelect } = $props<{
        field: CanvasField;
        allFields: CanvasField[];
        isSelected: boolean;
        onSelect: () => void;
    }>();

    let isDragging = false;
    let isResizing = false;
    let startX = 0; let startY = 0;
    let initialFieldX = 0; let initialFieldY = 0;
    let initialFieldW = 0; let initialFieldH = 0;
    
    let snapLineX = $state<number | null>(null);
    let snapLineY = $state<number | null>(null);
    const snapThreshold = 6;

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
        
        let targetX = Math.max(0, initialFieldX + dx);
        let targetY = Math.max(0, initialFieldY + dy);
        let targetW = field.w;
        let targetH = field.h;

        snapLineX = null;
        snapLineY = null;

        let myEdgesX = [targetX, targetX + targetW / 2, targetX + targetW];
        let myEdgesY = [targetY, targetY + targetH / 2, targetY + targetH];

        let minDiffX = snapThreshold;
        let minDiffY = snapThreshold;

        for (const other of allFields) {
            if (other.id === field.id) continue;
            
            let otherEdgesX = [other.x, other.x + other.w / 2, other.x + other.w];
            let otherEdgesY = [other.y, other.y + other.h / 2, other.y + other.h];

            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (Math.abs(myEdgesX[i] - otherEdgesX[j]) < minDiffX) {
                        minDiffX = Math.abs(myEdgesX[i] - otherEdgesX[j]);
                        targetX = otherEdgesX[j] - (i === 0 ? 0 : (i === 1 ? targetW / 2 : targetW));
                        snapLineX = otherEdgesX[j];
                    }
                    if (Math.abs(myEdgesY[i] - otherEdgesY[j]) < minDiffY) {
                        minDiffY = Math.abs(myEdgesY[i] - otherEdgesY[j]);
                        targetY = otherEdgesY[j] - (i === 0 ? 0 : (i === 1 ? targetH / 2 : targetH));
                        snapLineY = otherEdgesY[j];
                    }
                }
            }
        }

        field.x = Math.max(0, targetX);
        field.y = Math.max(0, targetY);
    }

    function stopDrag() {
        isDragging = false;
        snapLineX = null;
        snapLineY = null;
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
    <!-- Snapping Hilfslinien -->
    {#if snapLineX !== null}
        <div class="absolute bg-indigo-500/40 pointer-events-none z-0" style="left: {snapLineX - field.x}px; top: -2000px; bottom: -2000px; width: 1px;"></div>
    {/if}
    {#if snapLineY !== null}
        <div class="absolute bg-indigo-500/40 pointer-events-none z-0" style="top: {snapLineY - field.y}px; left: -2000px; right: -2000px; height: 1px;"></div>
    {/if}

    <!-- Rendering des Inhalts -->
    <div class="w-full h-full overflow-hidden" style="color: {field.style.color}; font-size: {field.style.fontSize}px; font-weight: {field.style.fontWeight}; text-align: {field.style.textAlign}; padding: {field.style.padding}px;">
        {#if field.type === 'text'}
            {@html field.content.replace(/\n/g, '<br/>')}
        {:else if field.type === 'logo'}
            {#if orgaStore.company?.data?.[0]?.logo}
                <div class="w-full h-full flex items-center justify-center bg-transparent">
                    <img src={pb.files.getURL(orgaStore.company.data[0], orgaStore.company.data[0].logo)} class="max-w-full max-h-full object-contain" alt="Logo" crossorigin="anonymous" />
                </div>
            {:else}
                <div class="w-full h-full border-2 border-dashed border-neutral-300 flex items-center justify-center bg-neutral-50/50 text-neutral-400 font-bold tracking-widest uppercase text-sm">
                    Firmenlogo Platzhalter
                </div>
            {/if}
        {:else if field.type === 'table'}
            <div class="w-full h-full border border-neutral-300 bg-white">
                <div class="flex border-b border-neutral-300 font-bold" style="background-color: {field.tableConfig?.headerBackgroundColor || '#f4f4f5'}; color: {field.tableConfig?.headerTextColor || '#000'}">
                    {#each field.tableConfig?.columns || [] as col}<div class="p-1 border-r border-neutral-300 last:border-0" style="width: {col.width}%; text-align: {col.align};">{col.name}</div>{/each}
                </div>
                <!-- Dummy Data Preview -->
                <div class="flex-1 overflow-hidden flex flex-col text-neutral-600 text-xs">
                    {#if field.tableConfig?.includeTimeRecords !== false}
                        <div class="flex border-b border-neutral-100">
                            {#each field.tableConfig?.columns || [] as col}
                                <div class="p-1 border-r border-neutral-100 last:border-0 truncate" style="width: {col.width}%; text-align: {col.align};">{col.type === 'pos' ? '1' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '2.00 h' : col.type === 'title' ? (field.tableConfig.staticDescription || 'Betreuung: Alltagshilfe') : col.type === 'price' ? '40,00 €' : '80,00 €'}</div>
                            {/each}
                        </div>
                    {/if}
                    {#if field.tableConfig?.includeDriveLumpSum !== false}
                        <div class="flex border-b border-neutral-100">
                            {#each field.tableConfig?.columns || [] as col}
                                <div class="p-1 border-r border-neutral-100 last:border-0 truncate" style="width: {col.width}%; text-align: {col.align};">{col.type === 'pos' ? '2' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '1' : col.type === 'title' ? (field.tableConfig.staticDescription || 'Anfahrt') : col.type === 'price' ? '5,00 €' : '5,00 €'}</div>
                            {/each}
                        </div>
                    {/if}
                    {#if field.tableConfig?.includeDriveKm !== false}
                        <div class="flex border-b border-neutral-100">
                            {#each field.tableConfig?.columns || [] as col}
                                <div class="p-1 border-r border-neutral-100 last:border-0 truncate" style="width: {col.width}%; text-align: {col.align};">{col.type === 'pos' ? '3' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '15 km' : col.type === 'title' ? (field.tableConfig.staticDescription || 'Fahrtkosten (15 km)') : col.type === 'price' ? '0,30 €' : '4,50 €'}</div>
                            {/each}
                        </div>
                    {/if}
                    {#if field.tableConfig?.includeExpenditures !== false}
                        <div class="flex border-b border-neutral-100">
                            {#each field.tableConfig?.columns || [] as col}
                                <div class="p-1 border-r border-neutral-100 last:border-0 truncate" style="width: {col.width}%; text-align: {col.align};">{col.type === 'pos' ? '4' : col.type === 'date' ? '12.05.2026' : col.type === 'duration' ? '1' : col.type === 'title' ? (field.tableConfig.staticDescription || 'Auslage: Apothekeneinkauf') : col.type === 'price' ? '14,50 €' : '14,50 €'}</div>
                            {/each}
                        </div>
                    {/if}
                </div>
                <!-- Dummy Footer -->
                {#if field.tableConfig?.includeTotalNetto !== false || field.tableConfig?.includeTotalTax !== false || field.tableConfig?.includeTotalBrutto !== false}
                    <div class="p-2 border-t-2 flex flex-col items-end text-xs" style="border-top-color: {field.tableConfig?.headerBackgroundColor || '#ccc'};">
                        <div class="w-48">
                            {#if field.tableConfig?.includeTotalNetto !== false}
                                <div class="flex justify-between mb-1"><span>Netto:</span> <span>104,00 €</span></div>
                            {/if}
                            {#if field.tableConfig?.includeTotalTax !== false}
                                <div class="flex justify-between mb-1"><span>MwSt (0%):</span> <span>0,00 €</span></div>
                            {/if}
                            {#if field.tableConfig?.includeTotalBrutto !== false}
                                <div class="flex justify-between font-bold text-[13px]"><span>Gesamt:</span> <span>104,00 €</span></div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Resize Handle -->
    {#if isSelected}
        <div class="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-indigo-600 border border-white rounded-full cursor-se-resize shadow-md" onmousedown={startResize}></div>
    {/if}
</div>