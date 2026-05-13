<script lang="ts">
    import { submitAppointmentRequest } from "$lib/services/appointmentRequestService";
    import { pb } from "$lib/services/pocketbase";
    import { onMount } from "svelte";

    let company_id = $state("");
    let sender_name = $state("");
    let request_text = $state("");
    let date = $state("");
    let time = $state("");
    let contact_method = $state("telephone");
    let contact_info = $state("");

    let isLoading = $state(false);
    let successMsg = $state("");
    let errorMsg = $state("");

    let companies = $state<any[]>([]);

    onMount(async () => {
        try {
            // Holt die aktiven Standorte/Firmen aus der Datenbank
            companies = await pb.collection('company').getFullList({ sort: 'city' });
            if (companies.length > 0) company_id = companies[0].id;
        } catch (e) {
            console.warn("Firmen konnten nicht geladen werden. Bitte API Rules in PocketBase für 'company' prüfen!");
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";
        successMsg = "";

        const final_request_text = request_text.trim() + "\n\n--- Kontaktdaten ---\n" + contact_info.trim();

        try {
            await submitAppointmentRequest({
                company: company_id,
                sender_name,
                request_text: final_request_text,
                date,
                time,
                contact_method
            });
            
            successMsg = "Vielen Dank! Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns in Kürze bei Ihnen.";
            
            // Formular zurücksetzen
            sender_name = "";
            request_text = "";
            date = "";
            time = "";
            contact_method = "telephone";
            contact_info = "";
        } catch (err: any) {
            console.error(err);
            errorMsg = "Es gab einen Fehler beim Senden. Bitte versuchen Sie es später noch einmal oder rufen Sie uns direkt an.";
        } finally {
            isLoading = false;
        }
    }
</script>

<div id="terminanfrage" class="w-full max-w-4xl mx-auto px-4 py-20">
    <div class="orga-card-white p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <!-- Dekorativer Blob im Hintergrund -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -mr-20 -mt-20 z-0 pointer-events-none"></div>
        
        <div class="relative z-10 text-center mb-10">
            <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Termin anfragen</h2>
            <p class="text-lg text-neutral-500">Hinterlassen Sie uns einfach Ihren Wunschtermin und Ihr Anliegen. Wir prüfen unsere Kapazitäten und melden uns schnellstmöglich zurück.</p>
        </div>

        {#if successMsg}
            <div class="relative z-10 bg-emerald-50 text-emerald-800 p-6 rounded-2xl border border-emerald-200 text-center mb-8 animate-enter">
                <span class="text-3xl block mb-2">✅</span>
                <p class="font-bold">{successMsg}</p>
            </div>
        {/if}

        {#if errorMsg}
            <div class="relative z-10 bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200 text-center mb-8 animate-enter">
                <span class="text-3xl block mb-2">❌</span>
                <p class="font-bold">{errorMsg}</p>
            </div>
        {/if}

        <form onsubmit={handleSubmit} class="relative z-10 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label for="req-name" class="block text-sm font-semibold text-neutral-700 mb-2">Ihr Name *</label><input id="req-name" type="text" bind:value={sender_name} class="orga-input-clear" placeholder="Max Mustermann" required disabled={isLoading} /></div>
                <div>
                    <label for="req-company" class="block text-sm font-semibold text-neutral-700 mb-2">Gewünschter Standort *</label>
                    <select id="req-company" bind:value={company_id} class="orga-input-clear cursor-pointer" required disabled={isLoading || companies.length === 0}>
                        <option value="" disabled>Bitte wählen...</option>
                        {#each companies as comp (comp.id)}<option value={comp.id}>{comp.city} ({comp.name})</option>{/each}
                    </select>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="req-contact" class="block text-sm font-semibold text-neutral-700 mb-2">Bevorzugter Kontaktweg *</label>
                    <!-- Die Values matchen exakt mit den erlaubten Select-Werten in deinem Schema -->
                    <select id="req-contact" bind:value={contact_method} class="orga-input-clear cursor-pointer" required disabled={isLoading}><option value="telephone">Telefonrückruf</option><option value="e-mail-address">E-Mail</option><option value="whatsapp">WhatsApp</option><option value="mail-adress">Postbrief</option></select>
                </div>
                <div><label for="req-contact-info" class="block text-sm font-semibold text-neutral-700 mb-2">Ihre E-Mail / Telefonnummer *</label><input id="req-contact-info" type="text" bind:value={contact_info} class="orga-input-clear" placeholder="Für die Rückmeldung" required disabled={isLoading} /></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label for="req-date" class="block text-sm font-semibold text-neutral-700 mb-2">Wunschdatum (optional)</label><input id="req-date" type="date" bind:value={date} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="req-time" class="block text-sm font-semibold text-neutral-700 mb-2">Wunschuhrzeit (optional)</label><input id="req-time" type="time" bind:value={time} class="orga-input-clear" disabled={isLoading} /></div>
            </div>

            <div><label for="req-text" class="block text-sm font-semibold text-neutral-700 mb-2">Ihr Anliegen *</label><textarea id="req-text" bind:value={request_text} rows="4" class="orga-input-clear resize-none" placeholder="Wie können wir Ihnen helfen?" required disabled={isLoading}></textarea></div>

            <div class="pt-4 text-center"><button type="submit" class="orga-button-primary w-full md:w-auto px-12 mx-auto" disabled={isLoading}>{isLoading ? "Wird gesendet..." : "Anfrage absenden"}</button><p class="text-xs text-neutral-400 mt-4">Ihre Daten werden sicher übertragen und vertraulich behandelt.</p></div>
        </form>
    </div>
</div>