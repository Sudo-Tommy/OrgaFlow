<script lang="ts">
    import { sendEmail } from '$lib/services/emailService';
    
    let to = $state('');
    let subject = $state('');
    let message = $state('');
    
    let isSending = $state(false);
    let successMsg = $state('');
    let errorMsg = $state('');
    
    async function handleSend(e: Event) {
        e.preventDefault();
        if (!to || !subject || !message) {
            errorMsg = 'Bitte füllen Sie alle Felder aus.';
            return;
        }
        
        isSending = true;
        errorMsg = '';
        successMsg = '';
        
        try {
            await sendEmail({
                to,
                subject,
                text: message,
                // Optionale Umwandlung von Zeilenumbrüchen für HTML-Clients
                html: message.replace(/\n/g, '<br>')
            });
            successMsg = 'Ihre E-Mail wurde erfolgreich versendet!';
            to = '';
            subject = '';
            message = '';
            
            // Erfolgsmeldung nach 5 Sekunden ausblenden
            setTimeout(() => {
                successMsg = '';
            }, 5000);
        } catch (err: any) {
            errorMsg = err.message || 'Es ist ein Fehler aufgetreten.';
        } finally {
            isSending = false;
        }
    }
</script>

<div class="orga-card-white p-6 flex flex-col h-full">
    <h2 class="text-lg font-bold text-neutral-800 mb-6 flex items-center gap-2">
        <span>✉️</span> Neue E-Mail verfassen
    </h2>
    
    {#if successMsg}
        <div class="mb-6 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-semibold animate-enter flex items-center gap-2">
            <span>✅</span> {successMsg}
        </div>
    {/if}
    
    {#if errorMsg}
        <div class="mb-6 p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-sm font-semibold animate-enter flex items-center gap-2">
            <span>❌</span> {errorMsg}
        </div>
    {/if}
    
    <form onsubmit={handleSend} class="space-y-5 flex-1 flex flex-col">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
                <label for="to" class="block text-sm font-bold text-neutral-700 mb-1.5">Empfänger</label>
                <input type="email" id="to" bind:value={to} class="orga-input-clear w-full" placeholder="klient@beispiel.de" required disabled={isSending} />
            </div>
            
            <div>
                <label for="subject" class="block text-sm font-bold text-neutral-700 mb-1.5">Betreff</label>
                <input type="text" id="subject" bind:value={subject} class="orga-input-clear w-full" placeholder="Terminbestätigung..." required disabled={isSending} />
            </div>
        </div>
        
        <div class="flex-1 flex flex-col">
            <label for="message" class="block text-sm font-bold text-neutral-700 mb-1.5">Nachricht</label>
            <textarea id="message" bind:value={message} class="orga-input-clear flex-1 min-h-[160px] resize-none w-full" placeholder="Guten Tag..." required disabled={isSending}></textarea>
        </div>
        
        <div class="pt-2 flex justify-end">
            <button type="submit" class="orga-button-primary w-full md:w-auto" disabled={isSending}>
                {#if isSending}
                    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird gesendet...
                {:else}
                    <span>Nachricht senden</span>
                {/if}
            </button>
        </div>
    </form>
</div>