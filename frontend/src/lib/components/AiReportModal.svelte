<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { env } from '$env/dynamic/public';
    import { toastStore } from "$lib/services/toastService.svelte";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let { onSave } = $props<{ onSave: (text: string) => void }>();

    let isRecording = $state(false);
    let isGenerating = $state(false);
    let generatedText = $state("");
    let errorMsg = $state("");
    
    let mediaRecorder: MediaRecorder | null = $state(null);
    let audioChunks: Blob[] = [];
    let recordingTime = $state(0);
    let recordingInterval: any;

    // Nutzt relativ zur aktuellen Domain (verhindert www. vs non-www Weiterleitungs-Fehler)
    const microserviceUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';

    export function open() {
        errorMsg = "";
        generatedText = "";
        dialog?.showModal();
    }

    export function close() {
        cancelRecording();
        dialog?.close();
    }

    async function startRecording() {
        try {
            errorMsg = "";
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                if (audioChunks.length > 0 && !errorMsg) {
                    const mimeType = mediaRecorder?.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunks, { type: mimeType });
                    await processAudio(audioBlob, mimeType);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            recordingTime = 0;
            recordingInterval = setInterval(() => recordingTime++, 1000);
        } catch (err) {
            console.error("Mikrofon-Zugriff verweigert", err);
            errorMsg = "Konnte nicht auf das Mikrofon zugreifen. Bitte überprüfen Sie Ihre Browser-Einstellungen.";
        }
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            clearInterval(recordingInterval);
        }
    }

    function cancelRecording() {
        if (mediaRecorder && isRecording) {
            errorMsg = "Abgebrochen"; // Signalisiert onstop, dass wir nicht an die KI senden
            mediaRecorder.stop();
            isRecording = false;
            clearInterval(recordingInterval);
            errorMsg = "";
        }
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
                else reject(new Error("Fehler beim Konvertieren"));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function processAudio(blob: Blob, mimeType: string) {
        isGenerating = true;
        try {
            const base64 = await blobToBase64(blob);
            const response = await fetch(`${microserviceUrl}/api/emails/ai/transcribe`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({ audioBase64: base64, mimeType })
            });
            
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || "Server-Fehler");
            
            generatedText = data.text;
            toastStore.success("Bericht erfolgreich generiert!");
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Die KI konnte das Audio nicht verarbeiten.";
        } finally {
            isGenerating = false;
        }
    }

    function handleSave() {
        onSave(generatedText);
        close();
    }

    let formattedTime = $derived(`${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')}`);
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">✕</button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <span class="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-inner text-sm">🤖</span> KI Sprach-Notiz
        </h2>
        <p class="text-sm text-neutral-500 mb-6">Sprechen Sie Ihren Besuchsbericht ein. Unsere KI wandelt ihn automatisch in einen sauberen Text um.</p>

        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}

        {#if isGenerating}
            <div class="flex flex-col items-center justify-center py-12 px-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 border-dashed">
                <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p class="font-bold text-indigo-900">KI analysiert Aufnahme...</p>
                <p class="text-xs text-indigo-600 mt-1">Das kann je nach Länge ein paar Sekunden dauern.</p>
            </div>
        {:else if generatedText}
            <div class="animate-enter">
                <label for="ai-result" class="block text-sm font-semibold text-neutral-700 mb-1.5">Generierter Bericht (Bitte prüfen)</label>
                <textarea id="ai-result" bind:value={generatedText} rows="8" class="orga-input-clear resize-y custom-scrollbar text-sm leading-relaxed"></textarea>
                <div class="mt-6 pt-4 border-t border-neutral-100 flex flex-col-reverse sm:flex-row justify-end gap-3"><button type="button" onclick={() => generatedText = ""} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5">Verwerfen</button><button type="button" onclick={handleSave} class="orga-button-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 w-full sm:w-auto py-3 sm:py-2.5">Übernehmen & Speichern</button></div>
            </div>
        {:else}
            <div class="flex flex-col items-center justify-center py-10">
                {#if isRecording}
                    <div class="text-3xl font-mono font-black text-rose-600 mb-6 animate-pulse">{formattedTime}</div>
                    <div class="flex gap-4"><button type="button" onclick={cancelRecording} class="w-14 h-14 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 rounded-full flex items-center justify-center transition-colors" title="Abbrechen">✕</button><button type="button" onclick={stopRecording} class="w-20 h-20 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg shadow-rose-500/30" title="Aufnahme beenden & KI starten"><div class="w-6 h-6 bg-white rounded-sm"></div></button></div>
                {:else}
                    <button type="button" onclick={startRecording} class="w-24 h-24 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-full flex flex-col items-center justify-center transition-colors shadow-sm group"><span class="text-3xl mb-1 group-hover:scale-110 transition-transform">🎤</span><span class="text-[10px] font-bold uppercase tracking-wider">Aufnehmen</span></button>
                {/if}
            </div>
        {/if}
    </div>
</dialog>