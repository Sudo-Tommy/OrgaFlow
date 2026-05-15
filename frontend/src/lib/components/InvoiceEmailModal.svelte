<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";

    // svelte-ignore non_reactive_update
    let dialog: HTMLDialogElement;
    let invoice = $state<any>(null);
    
    let emailTo = $state("");
    let emailSubject = $state("");
    let emailText = $state("");
    let isEmailSending = $state(false);
    let successMsg = $state("");
    let errorMsg = $state("");

    export function open(inv: any) {
        invoice = inv;
        
        // Empfänger ermitteln (Aus dem Client-Objekt, falls vorhanden)
        const client = Array.isArray(invoice?.expand?.client) ? invoice.expand.client[0] : invoice?.expand?.client;
        emailTo = client?.email || "";
        
        emailSubject = `Ihre Dokumente (Ref: ${invoice?.invoice_nr || 'Neu'})`;
        emailText = `Guten Tag${client?.name_last ? ` ${client.salutation === 'Herr' ? 'Herr' : (client.salutation === 'Frau' ? 'Frau' : '')} ${client.name_last}` : ''},\n\nanbei erhalten Sie Ihre Rechnung sowie ggf. zugehörige Arbeitszeitnachweise als PDF-Dokument.\n\nIhre Rechnungen und Dokumente können Sie ab sofort auch jederzeit sicher in unserem neuen Klienten-Portal einsehen:\n👉 https://www.ihre-seniorenassistenz.com/portal\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
        
        successMsg = "";
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
        invoice = null;
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') resolve(reader.result.split(',')[1]);
                else reject(new Error("Failed to convert blob to base64"));
            };
            reader.readAsDataURL(blob);
        });
    }

    async function sendInvoiceEmail() {
        if (!invoice || !invoice.pdf || invoice.pdf.length === 0) {
            errorMsg = "Keine PDF-Datei an dieser Rechnung gefunden.";
            return;
        }

        isEmailSending = true;
        errorMsg = "";
        successMsg = "";

        try {
            const attachments = [];
            
            // Lade alle angehängten PDFs der Rechnung herunter und wandle sie um
            for (const pdfFilename of invoice.pdf) {
                const fileUrl = pb.files.getURL(invoice, pdfFilename);
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const base64 = await blobToBase64(blob);
                attachments.push({
                    filename: pdfFilename,
                    content: base64,
                    encoding: 'base64'
                });
            }

            const user = pb.authStore.model;
            const userName = user ? `${user.name_first || ''} ${user.name_last || ''}`.trim() : 'Ihre Seniorenassistenz';
            const userEmail = user?.email || 'info@ihre-seniorenassistenz.com';
            const userPhone = user?.handy || user?.tel || '0151 57515432';

            const textEmail = `${emailText.trim()}\n\n--\n${userName}\nIhre Seniorenassistenz\nDreyhauptstraße 2, 06108 Halle (Saale)\nTelefon: ${userPhone}\nE-Mail: ${userEmail}\nWeb: www.ihre-seniorenassistenz.com`;

            const htmlEmail = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #374151; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: #fdf8f6; padding: 25px 30px; border-bottom: 3px solid #c66a4d;">
                        <h1 style="color: #954028; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Ihre Seniorenassistenz</h1>
                        <p style="color: #c66a4d; margin: 4px 0 0 0; font-size: 14px; font-weight: 500;">Alltagshilfe • Betreuung • Organisation</p>
                    </div>
                    <div style="padding: 30px; font-size: 15px; line-height: 1.6; color: #1f2937; background-color: #ffffff;">
                        ${emailText.trim().replace(/\n/g, '<br>').replace('👉 https://www.ihre-seniorenassistenz.com/portal', '<br><a href="https://www.ihre-seniorenassistenz.com/portal" style="display: inline-block; background-color: #c66a4d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px; margin-bottom: 10px;">Zum Klienten-Portal</a>')}
                    </div>
                    <div style="background-color: #f8fafc; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #4b5563;">
                            <tr>
                                <td style="padding-bottom: 15px;">
                                    <strong style="color: #111827; font-size: 16px;">${userName}</strong><br>
                                    <span style="color: #c66a4d;">Ihre Ansprechperson</span>
                                </td>
                            </tr>
                            <tr>
                                <td style="line-height: 1.6;">
                                    <strong>Ihre Seniorenassistenz</strong><br>
                                    Dreyhauptstraße 2<br>
                                    06108 Halle (Saale)<br><br>
                                    📞 <a href="tel:${userPhone}" style="color: #c66a4d; text-decoration: none;">${userPhone}</a><br>
                                    ✉️ <a href="mailto:${userEmail}" style="color: #c66a4d; text-decoration: none;">${userEmail}</a><br>
                                    🌐 <a href="https://www.ihre-seniorenassistenz.com" style="color: #c66a4d; text-decoration: none;">www.ihre-seniorenassistenz.com</a>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            `;

            await sendEmail({
                to: emailTo,
                subject: emailSubject,
                text: textEmail,
                html: htmlEmail,
                attachments
            });

            successMsg = "E-Mail wurde erfolgreich mit Anhang versendet!";
            setTimeout(() => {
                close();
            }, 2500);
        } catch (err: any) {
            console.error(err);
            errorMsg = "Fehler beim Senden der E-Mail: " + err.message;
        } finally {
            isEmailSending = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative shadow-2xl">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-6 flex items-center gap-2"><span>✉️</span> Dokumente versenden</h2>

        {#if successMsg}
            <div class="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-sm font-medium border border-emerald-100 flex items-center gap-2 animate-enter">
                <span class="text-xl">✅</span> {successMsg}
            </div>
        {/if}
        {#if errorMsg}
            <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100 animate-enter">
                {errorMsg}
            </div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); sendInvoiceEmail(); }} class="space-y-4">
            <div>
                <label for="email-to" class="block text-sm font-semibold text-neutral-700 mb-1.5">Empfänger (An)</label>
                <input id="email-to" type="email" bind:value={emailTo} class="orga-input-clear py-2 text-sm" required disabled={isEmailSending || !!successMsg} />
            </div>
            <div>
                <label for="email-subject" class="block text-sm font-semibold text-neutral-700 mb-1.5">Betreff</label>
                <input id="email-subject" type="text" bind:value={emailSubject} class="orga-input-clear py-2 text-sm" required disabled={isEmailSending || !!successMsg} />
            </div>
            <div>
                <label for="email-text" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachricht</label>
                <textarea id="email-text" bind:value={emailText} rows="5" class="orga-input-clear py-2 text-sm resize-none" required disabled={isEmailSending || !!successMsg}></textarea>
            </div>
            
                {#if invoice?.pdf && invoice.pdf.length > 0}
            <div class="flex flex-wrap gap-2 pt-2 mt-2 border-t border-neutral-100">
                {#each invoice.pdf as pdfFile}
                    <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
                        <span class="truncate max-w-50 font-medium">📎 {pdfFile}</span>
                    </div>
                {/each}
            </div>
                {:else}
            <div class="pt-2 mt-2 border-t border-neutral-100">
                <span class="text-sm text-neutral-500 italic">Keine PDF an dieser Rechnung gefunden.</span>
            </div>
                {/if}

            <div class="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-neutral-100 mt-6">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto py-3 sm:py-2.5" disabled={isEmailSending}>Abbrechen</button>
                <button type="submit" class="orga-button-primary shadow-indigo-600/20 w-full sm:w-auto py-3 sm:py-2.5" disabled={isEmailSending || !!successMsg || !invoice?.pdf?.length}>
                    {isEmailSending ? 'Wird gesendet...' : 'E-Mail senden ✉️'}
                </button>
            </div>
        </form>
    </div>
</dialog>