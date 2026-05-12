<script lang="ts">
    import { getQualityFeatures } from "$lib/services/landingContentService";
    const features = getQualityFeatures();
</script>

<div class="w-full max-w-6xl mx-auto px-4 py-20 text-left">
    <div class="bg-indigo-950 text-white rounded-[2.5rem] p-8 md:p-14 shadow-2xl">
        <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-bold mb-4">Vertrauen und Verlässlichkeit</h2>
            <p class="text-indigo-200 text-lg">Ihre Sicherheit und Ihr gutes Gefühl stehen für uns an erster Stelle.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
            {#each features as feature}
                <div>
                    <h3 class="text-xl font-bold text-indigo-300 mb-3">{feature.title}</h3>
                    <p class="text-neutral-300 leading-relaxed">{feature.text}</p>
                </div>
            {/each}
        </div>
    </div>
</div>