<script lang="ts">
    import LandingLegalModal from "$lib/components/LandingLegalModal.svelte";
    import LoginLogout from "$lib/components/LoginLogout.svelte";
    
    const year = new Date().getFullYear();
    let legalModal: ReturnType<typeof LandingLegalModal>;
</script>

<footer id="kontakt" class="bg-neutral-950 text-neutral-400 pt-20 pb-10 mt-auto border-t border-white/5 relative overflow-hidden">
    <!-- Subtiler Leuchteffekt am oberen Rand -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-32 bg-brand-500/15 blur-[100px] pointer-events-none z-0"></div>
    
    <div class="relative z-10 max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 border-b border-white/5 pb-12">
        <!-- Adresse -->
        <div>
            <h4 class="text-white font-bold text-lg mb-4">Ihre Seniorenassistenz</h4>
            <p class="text-neutral-500 leading-relaxed mb-4">Ihr vertrauensvoller Partner für ein selbstbestimmtes Leben. Wir unterstützen Sie und Ihre Angehörigen im Alltag – professionell, transparent und menschlich.</p>
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
                <li class="pt-4 mt-4 border-t border-white/10">
                    <LoginLogout subtle={true} />
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