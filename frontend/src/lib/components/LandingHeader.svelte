<script lang="ts">
    import { scrollToSection } from "$lib/services/navigationService";
</script>

<header class="w-full px-6 py-4 flex justify-between items-center bg-white/95 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border-b border-brand-100 sticky top-0 z-50 transition-all">
    <button onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} class="flex items-center gap-3 group text-left">
        <div class="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md group-hover:scale-105 transition-transform duration-300">S</div>
        <span class="text-xl font-black tracking-tight text-neutral-900 group-hover:text-brand-800 transition-colors">Ihre Seniorenassistenz</span>
    </button>

    <nav class="hidden md:flex items-center gap-8 font-semibold text-sm text-neutral-600">
        <button onclick={() => scrollToSection('leistungen')} class="hover:text-brand-800 transition-colors">Leistungen</button>
        <button onclick={() => scrollToSection('kontakt')} class="hover:text-brand-800 transition-colors">Kontakt</button>
    </nav>

    <div class="flex items-center gap-4">
        <button onclick={() => scrollToSection('kontakt')} class="orga-button-ghost py-2 px-5 text-sm bg-brand-50 hover:bg-brand-100 text-brand-900 border-none shadow-sm hidden sm:flex">Anfrage stellen</button>
    </div>
</header>