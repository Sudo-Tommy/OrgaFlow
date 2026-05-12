<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    let { client } = $props<{ client: any }>();
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