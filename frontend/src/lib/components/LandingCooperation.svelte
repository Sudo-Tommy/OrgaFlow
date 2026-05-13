<script lang="ts">
    import { getCooperationScenarios } from "$lib/services/landingContentService";
    const scenarios = getCooperationScenarios();
</script>

<div class="w-full max-w-6xl mx-auto px-4 py-10 mb-20 text-center">
    <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Das Dreamteam für Angehörige & Betreuer</h2>
    <p class="text-lg text-neutral-500 max-w-2xl mx-auto mb-16">Wir drängen uns nicht auf, sondern springen genau da ein, wo der Schuh drückt. So wird aus Familie endlich wieder echte Familienzeit (statt Dauer-Organisation und genervtem Augenrollen).</p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {#each scenarios as scenario}
            <div class="orga-card-white border-2 border-amber-50 p-8 hover:border-amber-200 transition-colors">
                <div class="inline-block bg-amber-100/50 text-amber-900 text-xs font-bold px-3 py-1 rounded-full mb-4">
                    {scenario.tag}
                </div>
                <h3 class="text-xl font-bold text-neutral-900 mb-3">{scenario.title}</h3>
                <p class="text-neutral-600 leading-relaxed">
                    {scenario.text}
                </p>
            </div>
        {/each}
    </div>
</div>