<script lang="ts">
    import { getQualityFeatures } from "$lib/services/landingContentService";
    const features = getQualityFeatures();
</script>

<div class="w-full max-w-6xl mx-auto px-4 py-20 text-left">
    <div class="bg-orange-50 text-neutral-900 rounded-[2.5rem] p-8 md:p-14 shadow-xl border border-orange-100/50">
        <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-bold text-brand-950 mb-4">Auf uns können Sie bauen</h2>
            <p class="text-neutral-600 text-lg">Ihre Sicherheit, Ihr Lächeln und Ihr gutes Gefühl sind unser wichtigster Antrieb.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
            {#each features as feature}
                <div>
                    <h3 class="text-xl font-bold text-brand-800 mb-3">{feature.title}</h3>
                    <p class="text-neutral-600 leading-relaxed">{feature.text}</p>
                </div>
            {/each}
        </div>
    </div>
</div>