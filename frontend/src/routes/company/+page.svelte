<script lang="ts">
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { useCompanyService } from "$lib/services/companyService.svelte";
    import CompanyContactCard from "$lib/components/company/CompanyContactCard.svelte";
    import CompanyAddressCard from "$lib/components/company/CompanyAddressCard.svelte";
    import CompanyBankCard from "$lib/components/company/CompanyBankCard.svelte";
    import { pb } from "$lib/services/pocketbase";

    const companyService = useCompanyService();

    // Lade exakt den Firmeneintrag, der dem eingeloggten Nutzer zugewiesen ist
    $effect(() => {
        if (!orgaStore.company?.isLoading && !companyService.isLoaded) {
            const user = pb.authStore.model;
            let userCompanyId = '';
            
            if (user?.company) {
                userCompanyId = Array.isArray(user.company) ? user.company[0] : user.company;
            }
            
            let record = null;
            if (userCompanyId) {
                record = orgaStore.company?.data?.find((c: any) => c.id === userCompanyId);
            }
            
            // Fallback: Falls ein Superadmin noch keine Zuweisung hat, lade den ersten Eintrag
            if (!record && (user?.role === 'superadmin' || pb.authStore.isSuperuser)) {
                record = orgaStore.company?.data?.[0];
            }
            
            if (record) companyService.load(record);
        }
    });
</script>

<form onsubmit={(e) => { e.preventDefault(); companyService.save(); }} class="flex flex-col h-full relative">
    <div class="orga-page-header animate-enter">
        <div>
            <h1 class="orga-page-title">Firmendaten</h1>
            <p class="orga-page-subtitle">Verwalten Sie hier die Stammdaten, Adresse und Bankverbindung Ihres Unternehmens.</p>
        </div>
        <div class="flex items-center gap-4">
            {#if companyService.successMsg}
                <span class="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">{companyService.successMsg}</span>
            {/if}
            <button type="submit" disabled={companyService.isLoading || !companyService.isLoaded} class="orga-button-primary shadow-indigo-600/20">
                <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                {companyService.isLoading ? 'Speichert...' : 'Änderungen speichern'}
            </button>
        </div>
    </div>

    {#if !companyService.isLoaded}
        <div class="text-center py-12 text-neutral-500 font-medium animate-pulse animate-enter delay-100">Lade Firmendaten...</div>
    {:else}
        {#if companyService.errorMsg}
            <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 animate-enter">{companyService.errorMsg}</div>
        {/if}
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-12 animate-enter delay-100">
            <div class="xl:col-span-1"><CompanyContactCard bind:logoFile={companyService.logoFile} bind:deleteLogo={companyService.deleteLogo} formData={companyService.formData} existingLogoUrl={companyService.existingLogoUrl} isLoading={companyService.isLoading} /></div>
            <div class="xl:col-span-2 space-y-8"><CompanyAddressCard formData={companyService.formData} isLoading={companyService.isLoading} /><CompanyBankCard formData={companyService.formData} isLoading={companyService.isLoading} /></div>
        </div>
    {/if}
</form>