<script lang="ts">
    import { getProcessSteps } from "$lib/services/landingContentService";
    const steps = getProcessSteps();
</script>

<div class="w-full bg-amber-50/40 py-20 px-4 border-y border-amber-100/50">
    <div class="max-w-5xl mx-auto text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Unser gemeinsamer Weg</h2>
        <p class="text-lg text-neutral-500 max-w-2xl mx-auto">Ganz entspannt und völlig ohne Hektik: So sieht ein typischer Ablauf aus, wenn wir zum Beispiel gemeinsam Ihren Arztbesuch oder den widerspenstigen Papierkram meistern.</p>
    </div>

    <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        {#each steps as step, i}
            <div class="orga-card-white p-6 relative">
                <!-- Verbindungslinie auf Desktop -->
                {#if i !== steps.length - 1}
                    <div class="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-amber-200"></div>
                {/if}
                
                <div class="text-sm font-bold text-brand-600 mb-2 uppercase tracking-wider">
                    {step.step}
                </div>
                <h3 class="text-xl font-bold mb-3 text-neutral-900">{step.title}</h3>
                <p class="text-neutral-600 text-md leading-relaxed">
                    {step.text}
                </p>
            </div>
        {/each}
    </div>
</div>