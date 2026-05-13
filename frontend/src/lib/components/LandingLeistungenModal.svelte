<script lang="ts">
    import { getServices } from "$lib/services/landingContentService";
    
    const services = getServices();
    let dialog: HTMLDialogElement;

    export function open() {
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-4xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-8 md:p-12 w-full max-h-[85vh] overflow-y-auto custom-scrollbar relative">
        <button aria-label="Schließen" onclick={close} class="absolute top-6 right-6 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-3xl font-bold text-brand-950 mb-8">Unsere Leistungen im Detail</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {#each services as svc}
                <div class="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                    <div class="w-12 h-12 bg-amber-100 text-brand-800 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d={svc.iconPath} /></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-2 text-neutral-900">{svc.title}</h3>
                    <p class="text-neutral-600 leading-relaxed text-base">{svc.description}</p>
                </div>
            {/each}
        </div>
    </div>
</dialog>