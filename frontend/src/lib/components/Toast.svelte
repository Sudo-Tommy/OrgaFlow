<script lang="ts">
    import { toastService } from '$lib/services/toast.svelte';
    import { fly, fade } from 'svelte/transition';
    import { flip } from 'svelte/animate';
</script>

<div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
    {#each toastService.toasts as toast (toast.id)}
        <div
            animate:flip={{ duration: 300 }}
            in:fly={{ y: 20, duration: 300 }}
            out:fade={{ duration: 200 }}
            class="pointer-events-auto min-w-[320px] max-w-md p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md text-sm transition-colors"
            class:bg-emerald-950={toast.type === 'success'}
            class:border-emerald-500/50={toast.type === 'success'}
            class:text-emerald-50={toast.type === 'success'}
            
            class:bg-red-950={toast.type === 'error'}
            class:border-red-500/50={toast.type === 'error'}
            class:text-red-50={toast.type === 'error'}
            
            class:bg-indigo-950={toast.type === 'info'}
            class:border-indigo-500/50={toast.type === 'info'}
            class:text-indigo-50={toast.type === 'info'}
            role="alert"
        >
            <div class="mt-0.5">
                {#if toast.type === 'success'}
                    <span class="text-emerald-400">✓</span>
                {:else if toast.type === 'error'}
                    <span class="text-red-400">⚠</span>
                {:else}
                    <span class="text-indigo-400">i</span>
                {/if}
            </div>

            <div class="flex-1 font-medium leading-relaxed">
                {toast.message}
            </div>

            <button
                class="opacity-60 hover:opacity-100 transition-opacity p-1 -m-1"
                onclick={() => toastService.remove(toast.id)}
                aria-label="Toast schließen"
            >
                ✕
            </button>
        </div>
    {/each}
</div>