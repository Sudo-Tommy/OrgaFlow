<script lang="ts">
    import { confirmStore } from "$lib/services/confirmService.svelte";

    let dialog: HTMLDialogElement;

    $effect(() => {
        if (confirmStore.isVisible && dialog && !dialog.open) {
            dialog.showModal();
        } else if (!confirmStore.isVisible && dialog && dialog.open) {
            dialog.close();
        }
    });
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-neutral-900/40 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) confirmStore.respond(false); }}>
    {#if confirmStore.isVisible}
        <div class="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full flex flex-col gap-4 animate-enter">
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
    {/if}
</dialog>