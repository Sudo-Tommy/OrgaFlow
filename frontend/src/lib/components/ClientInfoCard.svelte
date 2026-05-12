<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import ClientLinkInsuranceModal from "./ClientLinkInsuranceModal.svelte";
    
    let { client } = $props<{ client: any }>();
    let linkInsuranceModal: ReturnType<typeof ClientLinkInsuranceModal> | undefined = $state();
</script>

<div class="orga-card-white relative overflow-hidden group">
    <!-- Dekorativer Hintergrund-Blob -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150 z-0"></div>
    
    <div class="p-6 md:p-8 relative z-10">
        <div class="flex items-center gap-4 mb-8 border-b border-neutral-100 pb-6">
            <div class="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-2xl shrink-0 shadow-inner">
                {(client.name_first?.charAt(0) || '')}{(client.name_last?.charAt(0) || '')}
            </div>
            <div>
                <h2 class="text-xl font-bold text-neutral-900">{client.name_first} {client.name_last}</h2>
                <p class="text-neutral-500 font-medium text-xs mt-1 tracking-wider uppercase">ID: {client.id}</p>
            </div>
        </div>

        <div class="space-y-6">
            {#if client.birthdate}
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🎂</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Geburtsdatum</p>
                    <p class="text-neutral-900 font-bold">{new Date(client.birthdate).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</p>
                </div>
            </div>
            {/if}
            
            {#if client.level_of_care}
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">❤️</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Pflegegrad</p>
                    <p class="text-neutral-900 font-bold">Grad {client.level_of_care}</p>
                </div>
            </div>
            {/if}

            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">📞</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Telefon</p>
                    <p class="text-neutral-900 font-bold">{client.phone || 'Nicht hinterlegt'}</p>
                </div>
            </div>

            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">✉️</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">E-Mail</p>
                    <p class="text-neutral-900 font-bold break-all">{client.email || 'Nicht hinterlegt'}</p>
                </div>
            </div>

            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🏠</span></div>
                <div>
                    <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">Adresse</p>
                    <p class="text-neutral-900 font-bold leading-relaxed">{#if client.street || client.city}{client.street || ''} <br /> {client.zip || ''} {client.city || ''}{:else}Nicht hinterlegt{/if}</p>
                </div>
            </div>
        </div>
        
        <div class="mt-6 pt-6 border-t border-neutral-100">
            <div class="flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center shrink-0 shadow-sm"><span class="text-lg">🛡️</span></div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                        <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Krankenkasse</p>
                        <button onclick={() => linkInsuranceModal?.open()} class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Ändern</button>
                    </div>
                    <p class="text-neutral-900 font-bold truncate">{client.expand?.insurance?.name || 'Keine / Unbekannt'}</p>
                    {#if client.insurance_nr}
                        <p class="text-sm text-neutral-600 mt-1">Vers-Nr: <span class="font-mono bg-neutral-100 px-1 py-0.5 rounded">{client.insurance_nr}</span></p>
                    {/if}
                </div>
            </div>
        </div>
        
        <div class="mt-6 pt-6 border-t border-neutral-100">
            <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Abrechnungskonditionen</p>
            <div class="grid grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                <div><p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Stundensatz</p><p class="text-sm font-bold text-neutral-900">{client.hourly_wage ?? 40} €</p></div>
                <div><p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Fahrtkosten</p><p class="text-sm font-bold text-neutral-900">{client.km_rate ?? 0.3} €/km</p></div>
                <div><p class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Steuersatz</p><p class="text-sm font-bold text-neutral-900">{client.tax_rate || '0'} %</p></div>
            </div>
        </div>
        
        {#if client.sign}
            <div class="pt-6 mt-6 border-t border-neutral-100">
                <p class="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-3">Unterschrift</p>
                <div class="bg-white rounded-xl border border-neutral-100 p-4 flex justify-center shadow-sm">
                    <img src={pb.files.getUrl(client, client.sign)} alt="Unterschrift von {client.name_first}" class="max-h-24 object-contain mix-blend-multiply" />
                </div>
            </div>
        {/if}
    </div>
</div>

<ClientLinkInsuranceModal bind:this={linkInsuranceModal} {client} />