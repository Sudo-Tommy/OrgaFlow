<script lang="ts">
    import { confirmStore } from "$lib/services/confirmService.svelte";
    import { fade, scale } from "svelte/transition";
</script>

{#if confirmStore.isVisible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="fixed inset-0 z-10000 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm"
         transition:fade={{ duration: 150 }}
         onclick={(e) => { if (e.target === e.currentTarget) confirmStore.respond(false); }}
         role="dialog" aria-modal="true" tabindex="-1">
        
        <div class="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm flex flex-col gap-4"
             transition:scale={{ duration: 200, start: 0.95, opacity: 0 }}>
            
            <div class="flex items-center gap-3 mb-2 {confirmStore.isDanger ? 'text-rose-900' : 'text-brand-900'}">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner {confirmStore.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'}">
                    {confirmStore.isDanger ? '⚠️' : '🤔'}
                </div>
                <h3 class="text-xl font-bold leading-tight">{confirmStore.title}</h3>
            </div>
            
            <p class="text-neutral-600 leading-relaxed font-medium">{confirmStore.message}</p>
            
            <div class="flex gap-3 mt-4 pt-5 border-t border-neutral-100">
                <button onclick={() => confirmStore.respond(false)} class="orga-button-ghost flex-1 py-2.5 bg-neutral-50! text-neutral-600! hover:bg-neutral-100! hover:text-neutral-900! border-neutral-200!">{confirmStore.cancelText}</button>
                <button onclick={() => confirmStore.respond(true)} class="flex justify-center items-center gap-2 font-bold py-2.5 px-6 rounded-xl transition-all duration-300 shadow-lg active:scale-95 flex-1 {confirmStore.isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 hover:shadow-rose-600/50' : 'bg-brand-800 hover:bg-brand-700 text-white shadow-brand-800/30 hover:shadow-brand-800/50'}">{confirmStore.confirmText}</button>
            </div>
            
        </div>
    </div>
{/if}