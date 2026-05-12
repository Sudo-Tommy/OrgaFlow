<script lang="ts">
    import { pb } from "$lib/services/pocketbase";

    let dialog: HTMLDialogElement;
    let isLoading = $state(false);
    let errorMsg = $state("");

    let editId = $state<string | null>(null);
    let salutation = $state("");
    let company_name = $state("");
    let name_first = $state("");
    let name_last = $state("");
    let email = $state("");
    let phone = $state("");
    let street = $state("");
    let housenr = $state("");
    let zip = $state("");
    let city = $state("");
    let notes = $state("");

    export function open(record?: any) {
        if (record) {
            editId = record.id;
            salutation = record.salutation || "Keine Angabe";
            company_name = record.company_name || "";
            name_first = record.name_first || "";
            name_last = record.name_last || "";
            email = record.email || "";
            phone = record.phone || "";
            street = record.street || "";
            housenr = record.housenr || "";
            zip = record.zip || "";
            city = record.city || "";
            notes = record.notes ? (typeof record.notes === 'string' ? record.notes : JSON.stringify(record.notes)) : "";
        } else {
            editId = null;
            salutation = "Keine Angabe";
            company_name = "";
            name_first = "";
            name_last = "";
            email = "";
            phone = "";
            street = "";
            housenr = "";
            zip = "";
            city = "";
            notes = "";
        }
        errorMsg = "";
        dialog?.showModal();
    }

    export function close() {
        dialog?.close();
    }

    async function onSubmit(e: Event) {
        e.preventDefault();
        isLoading = true;
        errorMsg = "";

        try {
            // Notes als reinen String speichern (PocketBase JSON-Felder akzeptieren Strings, falls valid)
            let parsedNotes = null;
            if (notes) {
                try { parsedNotes = JSON.parse(notes); } 
                catch { parsedNotes = notes; } // Falls es normaler Text ist
            }

            const data = { 
                salutation, company_name, name_first, name_last, 
                email, phone, street, housenr, zip, city, notes: parsedNotes
            };
            
            if (editId) {
                await pb.collection('contacts').update(editId, data);
            } else {
                await pb.collection('contacts').create(data);
            }
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Speichern des Kontakts.";
        } finally {
            isLoading = false;
        }
    }
    
    async function onDelete() {
        if (!editId || !confirm("Möchten Sie diesen Kontakt wirklich löschen?")) return;
        isLoading = true;
        try {
            await pb.collection('contacts').delete(editId);
            close();
        } catch (err: any) {
            console.error(err);
            errorMsg = err.message || "Fehler beim Löschen.";
        } finally {
            isLoading = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-lg mx-auto my-auto rounded-3xl">
    <div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
        <button aria-label="Schließen" title="Schließen" onclick={close} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 class="text-2xl font-bold text-neutral-900 mb-6">{editId ? 'Kontakt bearbeiten' : 'Neuen Kontakt anlegen'}</h2>
        {#if errorMsg}<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">{errorMsg}</div>{/if}
        
        <form onsubmit={onSubmit} class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label for="contact-salutation" class="block text-sm font-semibold text-neutral-700 mb-1.5">Anrede</label><select id="contact-salutation" bind:value={salutation} class="orga-input-clear" disabled={isLoading}><option value="Keine Angabe">Keine Angabe</option><option value="Herr">Herr</option><option value="Frau">Frau</option></select></div>
                <div><label for="contact-company" class="block text-sm font-semibold text-neutral-700 mb-1.5">Firmenname (optional)</label><input id="contact-company" type="text" bind:value={company_name} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="contact-first" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname</label><input id="contact-first" type="text" bind:value={name_first} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="contact-last" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname</label><input id="contact-last" type="text" bind:value={name_last} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="contact-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label><input id="contact-email" type="email" bind:value={email} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="contact-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon</label><input id="contact-phone" type="text" bind:value={phone} class="orga-input-clear" disabled={isLoading} /></div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div class="md:col-span-2"><label for="contact-street" class="block text-sm font-semibold text-neutral-700 mb-1.5">Straße</label><input id="contact-street" type="text" bind:value={street} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="contact-housenr" class="block text-sm font-semibold text-neutral-700 mb-1.5">Hausnr.</label><input id="contact-housenr" type="text" bind:value={housenr} class="orga-input-clear" disabled={isLoading} /></div>
                <div><label for="contact-zip" class="block text-sm font-semibold text-neutral-700 mb-1.5">PLZ</label><input id="contact-zip" type="text" bind:value={zip} class="orga-input-clear" disabled={isLoading} /></div>
                <div class="md:col-span-2"><label for="contact-city" class="block text-sm font-semibold text-neutral-700 mb-1.5">Stadt</label><input id="contact-city" type="text" bind:value={city} class="orga-input-clear" disabled={isLoading} /></div>
            </div>
            
            <div class="pt-2">
                <label for="contact-notes" class="block text-sm font-semibold text-neutral-700 mb-1.5">Notizen</label>
                <textarea id="contact-notes" bind:value={notes} class="orga-input-clear resize-none" rows="2" disabled={isLoading}></textarea>
            </div>

            <div class="pt-4 flex justify-between items-center border-t border-neutral-100 mt-6">
                {#if editId}
                    <button type="button" onclick={onDelete} class="text-sm font-bold text-red-500 hover:text-red-700 transition-colors" disabled={isLoading}>Löschen</button>
                {:else}
                    <div></div>
                {/if}
                <div class="flex gap-3">
                    <button type="button" onclick={close} class="orga-button-ghost" disabled={isLoading}>Abbrechen</button>
                    <button type="submit" class="orga-button-primary" disabled={isLoading}>{isLoading ? "Speichert..." : "Speichern"}</button>
                </div>
            </div>
        </form>
    </div>
</dialog>