<script lang="ts">
    import { useAdminService } from "$lib/services/adminService.svelte";
    import AdminDataTable from "$lib/components/admin/AdminDataTable.svelte";
    import AdminRecordModal from "$lib/components/admin/AdminRecordModal.svelte";
    import { confirmStore } from "$lib/services/confirmService.svelte";

    const adminService = useAdminService();
    let modal: ReturnType<typeof AdminRecordModal> | undefined = $state();

    function handleEdit(record: any) {
        modal?.open(adminService.activeCollection, record);
    }

    function handleCreate() {
        modal?.open(adminService.activeCollection);
    }

    async function handleDelete(id: string) {
        if (await confirmStore.ask(`Möchten Sie diesen Datensatz unwiderruflich aus '${adminService.activeCollection}' löschen?`, "Datensatz löschen?", "Unwiderruflich Löschen", "Abbrechen", true)) {
            await adminService.deleteRecord(adminService.activeCollection, id);
        }
    }
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">System-Administration</h1>
        <p class="orga-page-subtitle">Verwalten Sie hier alle Rohdaten, Tabellen und Verknüpfungen (God Mode).</p>
    </div>
</div>

<div class="flex flex-col lg:flex-row gap-6 h-[calc(100vh-[env(safe-area-inset-top)]-14rem)] min-h-150 animate-enter delay-100">
    <!-- Sidebar mit allen Tabellen -->
    <div class="w-full lg:w-64 shrink-0 flex flex-col gap-4">
        <div class="orga-card-white flex-1 p-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar shadow-sm">
            <h3 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 px-3 pt-2">Datenbank (Collections)</h3>
            {#each adminService.collections as col}
                <button onclick={() => adminService.activeCollection = col} class="text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between {adminService.activeCollection === col ? 'bg-neutral-900 text-white shadow-md' : 'text-neutral-600 hover:bg-neutral-100'}">
                    <span class="truncate">{col}</span>
                    {#if adminService.activeCollection === col}<svg class="w-4 h-4 opacity-70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>{/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Hauptbereich: Filter & Tabelle -->
    <div class="flex-1 flex flex-col min-w-0 gap-4">
        <div class="orga-card-white p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
            <div class="w-full sm:w-auto flex-1 max-w-md relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span class="text-neutral-400">🔍</span></div>
                <input type="text" bind:value={adminService.searchQuery} placeholder="In gesamten JSON-Daten suchen..." class="orga-input-clear pl-12 py-2.5 border-neutral-200" />
            </div>
            <button onclick={handleCreate} class="orga-button-primary py-2.5 px-6 w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 shadow-neutral-900/20"><svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg> Neuen Eintrag anlegen</button>
        </div>
        <AdminDataTable data={adminService.activeData} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
</div>

<AdminRecordModal bind:this={modal} onSave={adminService.saveRecord} />