<script lang="ts">
    import LandingLegalModal from "$lib/components/LandingLegalModal.svelte";
    
    const year = new Date().getFullYear();
    // svelte-ignore non_reactive_update
    let legalModal: ReturnType<typeof LandingLegalModal>;
</script>

<footer id="kontakt" class="bg-brand-900 text-brand-100/90 pt-20 pb-10 mt-auto border-t border-brand-800 relative overflow-hidden">
    <!-- Subtiler Leuchteffekt am oberen Rand -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-32 bg-white/10 blur-[100px] pointer-events-none z-0"></div>
    
    <div class="relative z-10 max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 border-b border-brand-800/50 pb-12">
        <!-- Adresse -->
        <div>
            <h4 class="text-white font-bold text-lg mb-4">Ihre Seniorenassistenz</h4>
            <p class="text-brand-100/80 leading-relaxed mb-4">Ihre guten Geister für den Alltag. Wir jonglieren Termine, besiegen den Formulardrachen und haben immer ein offenes Ohr – professionell, transparent und absolut menschlich.</p>
        </div>
        
        <!-- Kontakt -->
        <div>
            <h4 class="text-white font-bold text-lg mb-4">Schnellkontakt</h4>
            <ul class="space-y-3">
                <li class="flex items-start gap-3">
                    <span class="mt-1">📞</span>
                    <div>
                        <p class="text-white">Halle (Saale):</p>
                        <a href="tel:015157515432" class="hover:text-brand-400 transition-colors">0151 57515432</a>
                    </div>
                </li>
                <li class="flex items-start gap-3">
                    <span class="mt-1">📞</span>
                    <div>
                        <p class="text-white">Wittenberg:</p>
                        <a href="tel:01607303830" class="hover:text-brand-400 transition-colors">0160 7303830</a>
                    </div>
                </li>
                <li class="flex items-center gap-3 mt-2">
                    <span>✉️</span>
                    <a href="mailto:info@ihre-seniorenassistenz.com" class="hover:text-brand-400 transition-colors">info@ihre-seniorenassistenz.com</a>
                </li>
            </ul>
        </div>
        
        <!-- Links -->
        <div>
            <h4 class="text-white font-bold text-lg mb-4">Rechtliches</h4>
            <ul class="space-y-3">
                <li>
                    <button onclick={() => legalModal.open()} class="hover:text-white transition-colors">Impressum & Datenschutz</button>
                </li>
                <li>
                    <a href="/portal" class="hover:text-white transition-colors">Zum Klienten-Portal 🔐</a>
                </li>
            </ul>
        </div>
    </div>
    
    <div class="relative z-10 max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm">
        <p>&copy; {year} Ihre Seniorenassistenz. Alle Rechte vorbehalten.</p>
    </div>

    <!-- Das eingebundene Modalfenster -->
    <LandingLegalModal bind:this={legalModal} />
</footer>