<script lang="ts">
    import { scrollToSection } from "$lib/services/navigationService";
</script>

<div class="w-full bg-linear-to-b from-white to-brand-50 pt-20 pb-24 px-4 flex flex-col items-center text-center border-b border-brand-100">
    <span class="bg-brand-100 text-brand-800 font-bold tracking-wider uppercase text-xs px-4 py-1.5 rounded-full mb-6">Wir sind an Ihrer Seite</span>
    <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 text-neutral-950 max-w-4xl leading-tight">
        Zuhause gut versorgt.<br> <span class="text-brand-600">Selbstbestimmt</span> leben.
    </h1>
    <p class="text-xl md:text-2xl text-neutral-600 max-w-3xl mb-12 leading-relaxed">
        Wir greifen Ihnen im Alltag unter die Arme – verlässlich, liebevoll und genau dort, wo Sie uns brauchen. Damit Sie sich sicher fühlen und Ihre Angehörigen entlastet aufatmen können.
    </p>
    
    <div class="flex flex-col sm:flex-row gap-4">
        <button onclick={() => scrollToSection('leistungen')} class="orga-button-primary">Unsere Leistungen entdecken</button>
        <button onclick={() => scrollToSection('kontakt')} class="orga-button-ghost">Kontakt aufnehmen</button>
    </div>
</div>