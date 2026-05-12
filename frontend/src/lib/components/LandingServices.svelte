<script lang="ts">
    import { getServices } from "$lib/services/landingContentService";
    const services = getServices();
</script>

<div id="leistungen" class="w-full max-w-6xl px-4 py-20">
    <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Wie wir Sie unterstützen können</h2>
        <p class="text-lg text-neutral-500 max-w-2xl mx-auto">Jeder Mensch braucht andere Hilfen. Wir passen uns Ihren Wünschen an – egal ob einmal in der Woche oder jeden Tag.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {#each services as svc}
            <div class="orga-card-white p-8 hover:-translate-y-1 transition-transform duration-300">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d={svc.iconPath} /></svg>
                </div>
                <h3 class="text-xl font-bold mb-3">{svc.title}</h3>
                <p class="text-neutral-600 leading-relaxed text-lg">{svc.description}</p>
            </div>
        {/each}
    </div>
</div>