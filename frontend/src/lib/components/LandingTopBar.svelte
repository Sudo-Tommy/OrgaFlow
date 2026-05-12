<script lang="ts">
    import { callPhone } from "$lib/services/navigationService";
</script>

<div class="bg-neutral-950 border-b border-white/5 text-neutral-300 text-[13px] py-2.5 px-6 flex flex-col lg:flex-row justify-between items-center gap-4 relative z-50">
    <div class="flex flex-col sm:flex-row gap-4 sm:gap-8 text-center sm:text-left font-medium">
        <div class="flex items-center justify-center sm:justify-start gap-2">
            <span class="text-brand-400">📍 Halle (Saale):</span>
            <button onclick={() => callPhone('015157515432')} class="hover:text-white transition-colors">0151 / 57515432</button>
        </div>
        <div class="hidden sm:block text-neutral-700">|</div>
        <div class="flex items-center justify-center sm:justify-start gap-2">
            <span class="text-brand-400">📍 Lutherstadt Wittenberg:</span>
            <button onclick={() => callPhone('01607303830')} class="hover:text-white transition-colors">0160 / 7303830</button>
        </div>
    </div>
    <a href="mailto:info@ihre-seniorenassistenz.com" class="hover:text-white transition-colors font-medium flex items-center gap-2">
        <span class="text-brand-400">✉️</span> info@ihre-seniorenassistenz.com
    </a>
</div>