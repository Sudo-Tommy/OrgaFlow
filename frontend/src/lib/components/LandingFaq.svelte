<script lang="ts">
    import { getFaqs } from "$lib/services/landingContentService";
    const faqs = getFaqs();
</script>

<div class="w-full max-w-5xl mx-auto px-4 py-20 text-left">
    <div class="bg-indigo-50 rounded-[2.5rem] p-8 md:p-14">
        <h2 class="text-3xl md:text-4xl font-bold text-indigo-950 mb-10 text-center">Häufige Fragen kurz erklärt</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
            {#each faqs as faq, i}
                <div>
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center font-bold">{i + 1}</div>
                        <h3 class="text-2xl font-bold text-indigo-950">{faq.question}</h3>
                    </div>
                    {#each faq.answerLines as line}
                        <p class="text-neutral-700 leading-relaxed text-lg mb-4">{@html line}</p>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
</div>