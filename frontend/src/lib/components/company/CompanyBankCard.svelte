<script lang="ts">
    let { formData, isLoading } = $props<{
        formData: any;
        isLoading: boolean;
    }>();
</script>

<div class="orga-card-white p-6 md:p-8">
    <h2 class="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4">
        <span class="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 rounded-lg shadow-inner text-sm">💶</span> Abrechnung & Finanzen
    </h2>
    
    <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label for="comp-ik" class="block text-sm font-semibold text-neutral-700 mb-1.5">IK-Nummer</label><input id="comp-ik" type="text" bind:value={formData.ik_number} class="orga-input-clear" disabled={isLoading} /></div>
            <div><label for="comp-vat" class="block text-sm font-semibold text-neutral-700 mb-1.5">Steuernummer / USt-IdNr.</label><input id="comp-vat" type="text" bind:value={formData.vatcode} class="orga-input-clear" disabled={isLoading} /></div>
        </div>
        <div><label for="comp-bank" class="block text-sm font-semibold text-neutral-700 mb-1.5">Name der Bank</label><input id="comp-bank" type="text" bind:value={formData.bank_name} class="orga-input-clear" disabled={isLoading} /></div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2"><label for="comp-iban" class="block text-sm font-semibold text-neutral-700 mb-1.5">IBAN</label><input id="comp-iban" type="text" bind:value={formData.bank_iban} class="orga-input-clear uppercase font-mono tracking-widest text-sm" disabled={isLoading} /></div>
            <div><label for="comp-bic" class="block text-sm font-semibold text-neutral-700 mb-1.5">BIC</label><input id="comp-bic" type="text" bind:value={formData.bank_bic} class="orga-input-clear uppercase font-mono tracking-widest text-sm" disabled={isLoading} /></div>
        </div>
    </div>
</div>