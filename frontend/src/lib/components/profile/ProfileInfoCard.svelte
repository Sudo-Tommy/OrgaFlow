<script lang="ts">
    let { record } = $props<{ record: any }>();
</script>

<div class="orga-card-white p-6 md:p-8">
    <h2 class="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4">
        <span class="w-8 h-8 flex items-center justify-center bg-teal-100 text-teal-600 rounded-lg shadow-inner text-sm">ℹ️</span> Account-Details
    </h2>
    
    <div class="space-y-4">
        <div class="flex justify-between items-center py-2 border-b border-neutral-50">
            <span class="text-sm font-semibold text-neutral-500">Account-ID</span>
            <span class="text-sm font-mono bg-neutral-100 px-2 py-0.5 rounded text-neutral-700">{record?.id || '-'}</span>
        </div>
        
        <div class="flex justify-between items-center py-2 border-b border-neutral-50">
            <span class="text-sm font-semibold text-neutral-500">Rolle / Status</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full {record?.collectionName === '_superusers' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">
                {record?.collectionName === '_superusers' ? 'Administrator' : 'Mitarbeiter'}
            </span>
        </div>

        {#if record?.expand?.company}
            <div class="flex justify-between items-center py-2 border-b border-neutral-50">
                <span class="text-sm font-semibold text-neutral-500">Verknüpfte Firma</span>
                <span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded truncate max-w-37.5">{record.expand.company.name}</span>
            </div>
        {/if}

        <div class="flex justify-between items-center py-2">
            <span class="text-sm font-semibold text-neutral-500">Mitglied seit</span>
            <span class="text-sm text-neutral-900 font-medium">{record?.created ? new Date(record.created).toLocaleDateString('de-DE') : '-'}</span>
        </div>
    </div>
</div>