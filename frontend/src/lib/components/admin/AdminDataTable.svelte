<script lang="ts">
    let { data, onEdit, onDelete } = $props<{
        data: any[];
        onEdit: (record: any) => void;
        onDelete: (id: string) => void;
    }>();

    // Extrahiert dynamisch alle Spalten aus den Rohdaten
    let columns = $derived.by(() => {
        if (data.length === 0) return [];
        const keys = new Set<string>();
        data.forEach((item: any) => Object.keys(item).forEach(k => {
            if(k !== 'expand' && k !== 'collectionId' && k !== 'collectionName') keys.add(k);
        }));
        
        const arr = Array.from(keys);
        arr.sort((a, b) => {
            if (a === 'id') return -1; if (b === 'id') return 1;
            if (a === 'created') return 1; if (b === 'created') return -1;
            return a.localeCompare(b);
        });
        return arr;
    });

    function formatCell(val: any) {
        if (val === null || val === undefined || val === "") return '<span class="text-neutral-400">-</span>';
        if (typeof val === 'boolean') return val ? '✅' : '❌';
        if (typeof val === 'object') {
            if (Array.isArray(val) && val.length === 0) return '<span class="text-neutral-400">[]</span>';
            return `<span class="text-indigo-600 text-xs px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md font-mono">${JSON.stringify(val).substring(0, 35)}${JSON.stringify(val).length > 35 ? '...' : ''}</span>`;
        }
        const str = String(val);
        if (str.length > 50) return `<span title="${str.replace(/"/g, '&quot;')}">${str.substring(0, 50)}...</span>`;
        return str;
    }
</script>

<div class="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full relative z-0">
    <div class="overflow-auto custom-scrollbar flex-1">
        <table class="w-full text-left border-collapse text-sm min-w-max">
            <thead class="sticky top-0 bg-neutral-100 z-10 shadow-sm border-b border-neutral-200">
                <tr>
                    <th class="p-3 font-bold text-neutral-800 whitespace-nowrap bg-neutral-100/95 backdrop-blur-sm">Aktionen</th>
                    {#each columns as col}
                        <th class="p-3 font-bold text-neutral-800 whitespace-nowrap bg-neutral-100/95 backdrop-blur-sm">{col}</th>
                    {/each}
                </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 bg-white">
                {#each data as row (row.id)}
                    <tr class="hover:bg-indigo-50/50 transition-colors">
                        <td class="p-3 whitespace-nowrap border-r border-neutral-50 bg-white/50 sticky left-0 z-0">
                            <button onclick={() => onEdit(row)} class="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-colors mr-2 shadow-sm">Bearbeiten</button>
                            <button onclick={() => onDelete(row.id)} class="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-600 hover:text-white transition-colors shadow-sm">Löschen</button>
                        </td>
                        {#each columns as col}
                            <td class="p-3 text-neutral-600 max-w-75 truncate">{@html formatCell(row[col])}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
        {#if data.length === 0}<div class="p-12 text-center text-neutral-400 font-medium italic">Keine Einträge in dieser Tabelle vorhanden.</div>{/if}
    </div>
</div>