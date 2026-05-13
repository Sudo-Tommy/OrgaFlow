<script lang="ts">
    import { useDocumentGenerator } from "$lib/services/documentGeneratorService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { sendEmail } from "$lib/services/emailService";
    import { toastStore } from "$lib/services/toastService.svelte";

    let dialog: HTMLDialogElement;
    const service = useDocumentGenerator();
    let pdfContainerRef = $state<HTMLDivElement | null>(null);
    let timesheetPdfContainerRef = $state<HTMLDivElement | null>(null);

    let generatedPdfBlob = $state<Blob | null>(null);
    let generatedTsBlob = $state<Blob | null>(null);
    let generatedFilename = $state("");
    let generatedTsFilename = $state("");

    let emailTo = $state("");
    let emailSubject = $state("");
    let emailText = $state("");
    let isEmailSending = $state(false);
    let emailSuccessMsg = $state("");

    function getRecipientEmail() {
        if (service.recipientType === 'client') return service.client?.email || "";
        if (service.recipientType === 'contact') {
            const contact = service.client?.expand?.contacts?.find((c:any) => c.id === service.recipientId);
            return contact?.email || "";
        }
        if (service.recipientType === 'insurance') return service.client?.expand?.insurance?.email || "";
        if (service.recipientType === 'home') {
            const home = service.client?.expand?.retirement_homes?.find((h:any) => h.id === service.recipientId);
            return home?.email || "";
        }
        return "";
    }

    export function open(preselectedTemplateId?: string, startStep: number = 1) {
        service.reset();
        service.step = startStep;
        service.selectedTemplateId = preselectedTemplateId || "";
        service.selectedClientId = "";
        service.selectedAppointmentIds = [];
        generatedPdfBlob = null;
        generatedTsBlob = null;
        emailSuccessMsg = "";
        emailTo = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    function next() {
        service.errorMsg = "";
        if (service.step === 1) {
            if (!service.selectedClientId) { service.errorMsg = "Bitte einen Klienten wählen!"; return; }
            // Smart Skip: Wenn der Klient eine Standard-Vorlage hat, weisen wir sie zu und überspringen Schritt 2
            if (service.client?.default_template) {
                const exists = service.availableTemplates.find((t: any) => t.id === service.client?.default_template);
                if (exists) {
                    service.selectedTemplateId = exists.id;
                    service.step = (exists.type?.toLowerCase() === 'rechnung' || exists.type?.toLowerCase() === 'arbeitszeitnachweis') ? 3 : 4;
                    return;
                }
            }
            service.step = 2;
            return;
        }
        if (service.step === 2) {
            if (!service.selectedTemplateId) { service.errorMsg = "Bitte eine Vorlage wählen!"; return; }
            if (service.requiresAppointments) { service.step = 3; return; }
            service.step = 4; return;
        }
        if (service.step === 3) {
            if (service.selectedAppointmentIds.length === 0) { service.errorMsg = "Bitte Termine wählen!"; return; }
            service.step = 4; return;
        }
    }

    function prev() {
        service.errorMsg = "";
        if (service.step === 4) {
            if (service.requiresAppointments) { service.step = 3; return; }
            service.step = 2; return;
        }
        if (service.step === 3) { service.step = 2; return; }
        if (service.step === 2) { service.step = 1; return; }
    }

    function downloadManually() {
        if (generatedPdfBlob) {
            const url = URL.createObjectURL(generatedPdfBlob);
            const aTag = document.createElement('a');
            aTag.href = url;
            aTag.download = generatedFilename;
            aTag.click();
        }
        if (generatedTsBlob) {
            const url = URL.createObjectURL(generatedTsBlob);
            const aTag = document.createElement('a');
            aTag.href = url;
            aTag.download = generatedTsFilename;
            aTag.click();
        }
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

    async function sendPdfViaEmail() {
        isEmailSending = true;
        try {
            const attachments = [];
            if (generatedPdfBlob) attachments.push({ filename: generatedFilename, content: await blobToBase64(generatedPdfBlob), encoding: 'base64' });
            if (generatedTsBlob) attachments.push({ filename: generatedTsFilename, content: await blobToBase64(generatedTsBlob), encoding: 'base64' });

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
                        ${emailText.trim().replace(/\n/g, '<br>')}
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

            await sendEmail({ to: emailTo, subject: emailSubject, text: textEmail, html: htmlEmail, attachments });
            emailSuccessMsg = "E-Mail wurde erfolgreich mit Anhang versendet!";
        } catch (err: any) {
            console.error(err);
            toastStore.error("Fehler beim Senden der E-Mail: " + err.message);
        } finally { isEmailSending = false; }
    }

    async function generate() {
        if (!pdfContainerRef) return;
        service.isLoading = true;
        service.errorMsg = "";
        try {
            // Wir laden html2pdf NUR DANN dynamisch, wenn der Nutzer auf "Generieren" drückt!
            // So vermeiden wir jegliche SSR/Vite Fehler.
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            
            const filename = (service.invoiceData ? service.invoiceData.invoice_nr : 'Dokument') + '.pdf';
            const opt = {
                margin: 0,
                filename: filename,
                image: { type: 'jpeg' as const, quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'px', format: [794, 1123] as any, orientation: service.template?.content_html?.orientation || 'portrait' }
            };

            const pdfBlob = await html2pdf().set(opt).from(pdfContainerRef).output('blob');

            let tsFilename = "";
            let tsBlob = null;
            if (service.isInvoice && service.timesheetTemplate && timesheetPdfContainerRef) {
                tsFilename = `Zeitnachweis_${filename}`;
                const optTs = {
                    margin: 0,
                    filename: tsFilename,
                    image: { type: 'jpeg' as const, quality: 0.95 },
                    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                    jsPDF: { unit: 'px', format: [794, 1123] as any, orientation: service.timesheetTemplate.content_html?.orientation || 'portrait' }
                };
                tsBlob = await html2pdf().set(optTs).from(timesheetPdfContainerRef).output('blob');
            }

            // Wenn es eine Rechnung ist, speichern wir sie als echten Datensatz im System
            if (service.isInvoice && service.invoiceData) {
                const pbFormData = new FormData();
                pbFormData.append('user', pb.authStore.model?.id || '');
                pbFormData.append('client', service.selectedClientId);
                pbFormData.append('invoice_nr', service.invoiceData.invoice_nr);
                pbFormData.append('issue_date', new Date(service.invoiceData.issue_date).toISOString());
                pbFormData.append('status', 'Entwurf');
                const due = new Date(service.invoiceData.issue_date); due.setDate(due.getDate() + 14);
                pbFormData.append('due_date', due.toISOString());
                // FIX: Sende leeren String, falls "0" in PocketBase noch nicht im Select erlaubt ist
                pbFormData.append('tax_rate', service.taxRate === "0" ? "" : service.taxRate);
                pbFormData.append('netto', service.invoiceData.netto.toString());
                pbFormData.append('tax_sum', service.invoiceData.tax_sum.toString());
                pbFormData.append('brutto', service.invoiceData.brutto.toString());
                pbFormData.append('hourly_wage', service.hourlyWage.toString());
                pbFormData.append('travel_expanses_rate', service.kmRate.toString());
                pbFormData.append('table_positions', JSON.stringify(service.invoiceData.positions));
                
                service.selectedAppointmentIds.forEach(id => pbFormData.append('appointments', id));
                if (service.company?.id) pbFormData.append('company', service.company.id);

                pbFormData.append('pdf', pdfBlob, filename);

                // Wenn der Arbeitszeitnachweis existiert, als zweites PDF anheften
                if (tsBlob) {
                    pbFormData.append('pdf', tsBlob, tsFilename);
                }

                await pb.collection('invoices').create(pbFormData);
                service.successMsg = "Rechnung erfolgreich generiert und in der Datenbank gespeichert!";
            } else {
                service.successMsg = "Dokument erfolgreich generiert!";
            }
            
            generatedPdfBlob = pdfBlob;
            generatedFilename = filename;
            if (tsBlob) {
                generatedTsBlob = tsBlob;
                generatedTsFilename = tsFilename;
            }

            emailTo = getRecipientEmail();
            emailSubject = `Ihre Dokumente: ${filename.replace('.pdf', '')}`;
            emailText = `Guten Tag,\n\nanbei erhalten Sie die gewünschten Dokumente.\n\nMit freundlichen Grüßen\nIhre Seniorenassistenz`;
            
            service.step = 5;
        } catch (err: any) {
            console.error(err);
            service.errorMsg = err.message || "Fehler bei der Generierung.";
        } finally {
            service.isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-2xl mx-auto my-auto rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full min-h-100 flex flex-col relative overflow-hidden">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors z-10"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
        
        <h2 class="text-2xl font-bold text-neutral-900 mb-2">Dokument generieren</h2>
        
        <div class="flex gap-2 mb-6">
            <div class="h-1.5 flex-1 rounded-full {service.step >= 1 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>
            <div class="h-1.5 flex-1 rounded-full {service.step >= 2 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>
            {#if service.requiresAppointments}<div class="h-1.5 flex-1 rounded-full {service.step >= 3 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>{/if}
            <div class="h-1.5 flex-1 rounded-full {service.step >= 4 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>
            <div class="h-1.5 flex-1 rounded-full {service.step >= 5 ? 'bg-indigo-600' : 'bg-neutral-100'} transition-colors"></div>
        </div>

        {#if service.errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-medium border border-red-100">{service.errorMsg}</div>{/if}

        <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
            {#if service.step === 1}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">1. Klient & Empfänger</h3>
                <label for="generator-client" class="block text-sm font-semibold text-neutral-700 mb-1.5">Basis-Klient</label><select id="generator-client" bind:value={service.selectedClientId} class="orga-input-clear mb-6"><option value="">Klienten wählen...</option>{#each orgaStore.clients?.data || [] as c}<option value={c.id}>{c.name_first} {c.name_last}</option>{/each}</select>
                {#if service.client}
                    <span class="block text-sm font-semibold text-neutral-700 mb-1.5">Adressat / Empfänger auf dem Dokument</span>
                    <div class="space-y-2">
                        <label class="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="radio" bind:group={service.recipientType} value="client" class="text-indigo-600" /> <span class="text-sm font-medium">Klient selbst ({service.client.name_first} {service.client.name_last})</span></label>
                        {#if service.client.expand?.insurance}<label class="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="radio" bind:group={service.recipientType} value="insurance" class="text-indigo-600" /> <span class="text-sm font-medium">Krankenkasse ({service.client.expand.insurance.name})</span></label>{/if}
                        {#each service.client.expand?.contacts || [] as contact}<label class="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="radio" bind:group={service.recipientType} value="contact" onchange={() => service.recipientId = contact.id} class="text-indigo-600" /> <span class="text-sm font-medium">Kontakt: {contact.name_first} {contact.name_last} ({contact.company_name || contact.salutation})</span></label>{/each}
                        {#each service.client.expand?.retirement_homes || [] as home}<label class="flex items-center gap-2 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="radio" bind:group={service.recipientType} value="home" onchange={() => service.recipientId = home.id} class="text-indigo-600" /> <span class="text-sm font-medium">Pflegeheim: {home.name}</span></label>{/each}
                    </div>
                {/if}
            {:else if service.step === 2}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">2. Vorlage wählen</h3>
                <div class="grid grid-cols-1 gap-3">
                    {#each service.availableTemplates as t}
                        <label class="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors {service.selectedTemplateId === t.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-neutral-200 hover:border-indigo-300'}"><input type="radio" bind:group={service.selectedTemplateId} value={t.id} class="w-4 h-4 text-indigo-600" /><div><p class="font-bold text-neutral-900">{t.title || 'Unbenannt'}</p><p class="text-xs text-neutral-500 uppercase mt-0.5 tracking-wider font-semibold">{t.type}</p></div></label>
                    {/each}
                </div>
            {:else if service.step === 3 && service.requiresAppointments}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">3. Termine & Abrechnungsdaten</h3>
                {#if service.isInvoice}
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div><label for="gen-invoice-nr" class="block text-xs font-semibold text-neutral-600 mb-1">Rechnungsnummer</label><input id="gen-invoice-nr" type="text" bind:value={service.manualInvoiceNr} class="orga-input-clear py-2 text-sm" placeholder="z.B. 01/2026" /></div>
                        <div><label for="gen-issue-date" class="block text-xs font-semibold text-neutral-600 mb-1">Rechnungsdatum</label><input id="gen-issue-date" type="date" bind:value={service.manualIssueDate} class="orga-input-clear py-2 text-sm" /></div>
                    </div>
                    <hr class="border-neutral-100 mb-6" />
                    <div class="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-neutral-100">
                        <div><label for="gen-wage" class="block text-xs font-semibold text-neutral-600 mb-1">Stundensatz (€)</label><input id="gen-wage" type="number" bind:value={service.hourlyWage} class="orga-input-clear py-2 text-sm" /></div>
                        <div><label for="gen-km" class="block text-xs font-semibold text-neutral-600 mb-1">Fahrt (€/km)</label><input id="gen-km" type="number" step="0.01" bind:value={service.kmRate} class="orga-input-clear py-2 text-sm" /></div>
                        <div><label for="gen-tax" class="block text-xs font-semibold text-neutral-600 mb-1">Steuersatz (%)</label><select id="gen-tax" bind:value={service.taxRate} class="orga-input-clear py-2 text-sm px-2"><option value="0">0%</option><option value="7">7%</option><option value="19">19%</option></select></div>
                    </div>
                {/if}
                <p class="text-sm font-semibold text-neutral-700 mb-2">Abzurechnende Termine wählen</p>
                <div class="space-y-2">
                    {#each service.availableAppointments as app}
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 hover:border-indigo-300 cursor-pointer transition-colors {service.selectedAppointmentIds.includes(app.id) ? 'bg-indigo-50/30' : ''}"><input type="checkbox" bind:group={service.selectedAppointmentIds} value={app.id} class="w-4 h-4 mt-1 text-indigo-600 rounded focus:ring-indigo-500" /><div><p class="text-sm font-bold text-neutral-900">{app.appointment ? new Date(app.appointment as string).toLocaleDateString('de-DE') : ''} - {app.description || 'Termin'}</p><div class="flex gap-2 mt-1">{#if app.expand?.time_record}<span class="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Zeiten</span>{/if}{#if app.expand?.drive_record}<span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Fahrten</span>{/if}{#if app.expand?.expenditures}<span class="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">Ausgaben</span>{/if}</div></div></label>
                    {/each}
                    {#if service.availableAppointments.length === 0}<p class="text-sm italic text-neutral-500">Keine Termine vorhanden.</p>{/if}
                </div>
            {:else if service.step === 4}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">Zusammenfassung</h3>
                <div class="bg-neutral-50 p-6 rounded-xl border border-neutral-100 space-y-3">
                    <p class="text-sm"><span class="font-semibold text-neutral-500 w-24 inline-block">Vorlage:</span> <span class="font-bold">{service.template?.title}</span></p>
                    <p class="text-sm"><span class="font-semibold text-neutral-500 w-24 inline-block">Empfänger:</span> <span class="font-bold">{service.recipientType}</span></p>
                    {#if service.isInvoice && service.invoiceData}
                        <hr class="border-neutral-200 my-2" /><p class="text-sm"><span class="font-semibold text-neutral-500 w-24 inline-block">Rechnung:</span> <span class="font-bold">{service.invoiceData.invoice_nr}</span></p><p class="text-sm"><span class="font-semibold text-neutral-500 w-24 inline-block">Posten:</span> <span class="font-bold">{service.invoiceData.positions.length} Stück</span></p><p class="text-sm mt-2"><span class="font-semibold text-neutral-500 w-24 inline-block">Gesamt Brutto:</span> <span class="font-bold text-indigo-700 text-lg">{service.invoiceData.brutto.toFixed(2).replace('.', ',')} €</span></p>
                    {/if}
                </div>
                <div class="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3"><span class="text-xl">📄</span><p class="text-sm text-indigo-900">Das Dokument wird nun hochauflösend als PDF generiert. Dies kann wenige Sekunden dauern.</p></div>
            {:else if service.step === 5}
                <h3 class="text-lg font-bold text-neutral-800 mb-4">Fertig!</h3>
                <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6 flex items-start gap-3">
                    <span class="text-xl">✅</span>
                    <div>
                        <p class="font-bold text-emerald-900">{service.successMsg}</p>
                        <p class="text-sm text-emerald-700 mt-1">Sie können das Dokument nun herunterladen oder direkt per E-Mail versenden.</p>
                    </div>
                </div>

                {#if emailSuccessMsg}
                    <div class="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
                        <span class="text-3xl mb-2 block">📨</span>
                        <p class="font-bold text-blue-900">{emailSuccessMsg}</p>
                    </div>
                {:else}
                    <div class="border border-neutral-200 rounded-xl p-5 bg-neutral-50/50">
                        <h4 class="font-bold text-neutral-800 mb-3 flex items-center gap-2"><span>✉️</span> Direkt als E-Mail versenden</h4>
                        <div class="space-y-4">
                            <div><label for="emailTo" class="block text-xs font-semibold text-neutral-600 mb-1">Empfänger (An)</label><input id="emailTo" type="email" bind:value={emailTo} class="orga-input-clear py-2 text-sm" disabled={isEmailSending} /></div>
                            <div><label for="emailSubject" class="block text-xs font-semibold text-neutral-600 mb-1">Betreff</label><input id="emailSubject" type="text" bind:value={emailSubject} class="orga-input-clear py-2 text-sm" disabled={isEmailSending} /></div>
                            <div><label for="emailText" class="block text-xs font-semibold text-neutral-600 mb-1">Nachricht</label><textarea id="emailText" bind:value={emailText} rows="4" class="orga-input-clear py-2 text-sm resize-none" disabled={isEmailSending}></textarea></div>
                            <div class="flex flex-wrap gap-2 pt-2 mt-2 border-t border-neutral-100">
                                <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter">
                                    <span class="truncate max-w-50 font-medium">📎 {generatedFilename}</span>
                                </div>
                                {#if generatedTsBlob}
                                    <div class="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg text-sm border border-neutral-200 shadow-sm animate-enter delay-100">
                                        <span class="truncate max-w-50 font-medium">📎 {generatedTsFilename}</span>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}
            {/if}
        </div>

        <div class="pt-4 flex justify-between gap-3 border-t border-neutral-100 shrink-0">
            {#if service.step > 1 && service.step < 5}<button type="button" onclick={prev} class="orga-button-ghost py-2.5 px-6" disabled={service.isLoading}>Zurück</button>{:else if service.step === 5}<button type="button" onclick={downloadManually} class="orga-button-ghost py-2.5 px-6" disabled={isEmailSending}>Herunterladen</button>{:else}<div></div>{/if}
            {#if service.step < 4}<button type="button" onclick={next} class="orga-button-primary py-2.5 px-6" disabled={service.isLoading}>Weiter &rarr;</button>{:else if service.step === 4}<button type="button" onclick={generate} class="orga-button-primary py-2.5 px-8 shadow-indigo-600/30" disabled={service.isLoading}>{#if service.isLoading}<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generiert...{:else}PDF Generieren{/if}</button>{:else if service.step === 5}{#if !emailSuccessMsg}<button type="button" onclick={sendPdfViaEmail} class="orga-button-primary py-2.5 px-6" disabled={isEmailSending || !emailTo}>{isEmailSending ? 'Wird gesendet...' : 'E-Mail senden ✉️'}</button>{:else}<button type="button" onclick={() => { close(); service.reset(); }} class="orga-button-primary py-2.5 px-6">Fertig</button>{/if}{/if}
        </div>
    </div>
</dialog>

<!-- Verstecktes Canvas-Container für html2pdf Rendering -->
{#if service.template && service.step === 4}
    <div style="position: fixed; left: -9999px; top: 0; z-index: -100; color: #000000; background-color: #ffffff;">
        <div bind:this={pdfContainerRef} class="pdf-export-container orga-canvas-a4" style="background-color: #ffffff; width: 794px; min-height: 1123px; position: relative;">
            {#each service.template.content_html?.fields || [] as field}
                    <div style="position: absolute; left: {field.x}px; top: {field.y}px; width: {field.w}px; height: {field.h}px; font-size: {field.style.fontSize}px; color: {field.style.color}; font-weight: {field.style.fontWeight}; text-align: {field.style.textAlign}; padding: {field.style.padding}px;">{#if field.type === 'text'}{@html service.replacePlaceholders(field.content, false)}{:else if field.type === 'logo'}{#if service.company?.logo}<img src={pb.files.getURL(service.company, service.company.logo)} style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Logo" crossorigin="anonymous" />{/if}{:else if field.type === 'table'}{@html service.getItemsHtml(field.tableConfig, false)}{/if}</div>
            {/each}
        </div>
    </div>
    {#if service.isInvoice && service.timesheetTemplate}
        <div style="position: fixed; left: -9999px; top: 0; z-index: -100; color: #000000; background-color: #ffffff;">
            <div bind:this={timesheetPdfContainerRef} class="pdf-export-container orga-canvas-a4" style="background-color: #ffffff; width: 794px; min-height: 1123px; position: relative;">
                {#each service.timesheetTemplate.content_html?.fields || [] as field}
                    <div style="position: absolute; left: {field.x}px; top: {field.y}px; width: {field.w}px; height: {field.h}px; font-size: {field.style.fontSize}px; color: {field.style.color}; font-weight: {field.style.fontWeight}; text-align: {field.style.textAlign}; padding: {field.style.padding}px;">{#if field.type === 'text'}{@html service.replacePlaceholders(field.content, true)}{:else if field.type === 'logo'}{#if service.company?.logo}<img src={pb.files.getURL(service.company, service.company.logo)} style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Logo" crossorigin="anonymous" />{/if}{:else if field.type === 'table'}{@html service.getItemsHtml(field.tableConfig, true)}{/if}</div>
                {/each}
            </div>
        </div>
    {/if}
{/if}