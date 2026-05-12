<script lang="ts">
    import { callPhone } from "$lib/services/navigationService";
</script>

<div class="bg-indigo-950 text-indigo-100 text-sm py-3 px-6 flex flex-col lg:flex-row justify-between items-center gap-4">
    <div class="flex flex-col sm:flex-row gap-4 sm:gap-8 text-center sm:text-left font-medium">
        <div class="flex items-center justify-center sm:justify-start gap-2">
            <span>📍 Halle (Saale):</span>
            <button onclick={() => callPhone('015157515432')} class="hover:text-white transition-colors text-indigo-300">0151 / 57515432</button>
        </div>
        <div class="hidden sm:block text-indigo-800">|</div>
        <div class="flex items-center justify-center sm:justify-start gap-2">
            <span>📍 Lutherstadt Wittenberg:</span>
            <button onclick={() => callPhone('01607303830')} class="hover:text-white transition-colors text-indigo-300">0160 / 7303830</button>
        </div>
    </div>
    <a href="mailto:info@ihre-seniorenassistenz.com" class="hover:text-white transition-colors font-medium">✉️ info@ihre-seniorenassistenz.com</a>
</div>