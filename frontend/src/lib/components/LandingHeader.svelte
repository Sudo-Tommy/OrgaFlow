<script lang="ts">
    import { scrollToSection, callPhone } from "$lib/services/navigationService";
    import LandingAppointmentModal from "./LandingAppointmentModal.svelte";
    import LandingKostenModal from "./LandingKostenModal.svelte";
    import LandingLeistungenModal from "./LandingLeistungenModal.svelte";
    import LoginLogout from "$lib/components/LoginLogout.svelte";
    import { onMount } from "svelte";

    // svelte-ignore non_reactive_update
    let appModal: ReturnType<typeof LandingAppointmentModal>;
    // svelte-ignore non_reactive_update
    let kostenModal: ReturnType<typeof LandingKostenModal>;
    // svelte-ignore non_reactive_update
    let leistungenModal: ReturnType<typeof LandingLeistungenModal>;

    let isDarkMode = $state(false);

    onMount(() => {
        isDarkMode = document.documentElement.classList.contains('theme-negative');
        
        // Beobachtet Änderungen an der HTML-Klasse, falls die Automatik einspringt
        const observer = new MutationObserver(() => {
            isDarkMode = document.documentElement.classList.contains('theme-negative');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    });

    function toggleTheme() {
        const newTheme = isDarkMode ? 'light' : 'dark';
        localStorage.setItem('theme_preference', newTheme);
        window.dispatchEvent(new Event('theme-changed'));
    }
</script>

<header class="w-full flex flex-col sticky top-0 z-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] transition-all">
    
    <!-- Haupt-Navigation -->
    <div class="w-full px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-neutral-100">
        <button onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} class="flex items-center gap-2 sm:gap-3 group text-left">
            <img src="/favicon.png" alt="Logo" class="w-8 h-8 sm:w-10 sm:h-10 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm" />
            <span class="text-lg sm:text-xl font-black tracking-tight text-neutral-900 group-hover:text-brand-800 transition-colors">Ihre Seniorenassistenz</span>
        </button>

        <nav class="hidden lg:flex items-center gap-8 font-semibold text-sm text-neutral-600">
            <button onclick={() => leistungenModal?.open()} class="hover:text-brand-800 transition-colors">Leistungen</button>
            <button onclick={() => kostenModal?.open()} class="hover:text-brand-800 transition-colors">Kostenübernahme</button>
            <button onclick={() => scrollToSection('kontakt')} class="hover:text-brand-800 transition-colors">Kontakt</button>
        </nav>

        <div class="flex items-center gap-2 sm:gap-4">
            <button onclick={toggleTheme} class="p-2 text-neutral-500 hover:text-brand-800 transition-colors text-lg" title="Tag/Nacht Modus umschalten">
                {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onclick={() => kostenModal?.open()} class="orga-button-ghost py-2 px-4 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border-none shadow-sm hidden xl:flex font-bold">Zahlt die Pflegekasse?</button>
            
            
            <!-- Login Button -->            
            <button onclick={() => appModal?.open()} class="orga-button-ghost py-2 px-4 text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 border-none shadow-sm hidden xl:flex font-bold">Kostenloses Kennenlernen</button>
            <div class="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                <LoginLogout iconOnly={true} />
            </div>
        </div>
    </div>
</header>

<LandingAppointmentModal bind:this={appModal} />
<LandingKostenModal bind:this={kostenModal} />
<LandingLeistungenModal bind:this={leistungenModal} />