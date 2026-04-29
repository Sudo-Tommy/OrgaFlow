<script lang="ts">
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { fade, slide } from 'svelte/transition';
	import { untrack } from 'svelte';

	// --- Interfaces ---
	interface ClientData { id: string; name_first: string; name_last: string; street: string; zip: string; city: string; }
	interface ContactData { id: string; name_first: string; name_last: string; }
	interface Appointment { id: string; title: string; appointment: string; expand?: any; }
	interface Template { id: string; title: string; type: string; content_html: string; }

	// --- Props ---
	let { isOpen, onClosed, onCreated } = $props<{
		isOpen: boolean; onClosed: () => void; onCreated: () => void;
	}>();

	// --- Workflow State ---
	let currentStep = $state(1); 
	let isLoading = $state(false);

	// Datenpools
	let clients = $state.raw<ClientData[]>([]);
	let contacts = $state.raw<ContactData[]>([]);
	let appointments = $state.raw<Appointment[]>([]);
	let templates = $state.raw<Template[]>([]);

	// Selektionen
	let selectedRecipientId = $state(''); // Kann Klient oder Kontakt ID sein
	let selectedAppointmentIds = $state<string[]>([]);
	let selectedDocType = $state('rechnung');
	let selectedTemplateId = $state('');

	// --- Initialisierung ---
	$effect(() => {
		if (isOpen) {
			untrack(() => {
				currentStep = 1;
				selectedAppointmentIds = [];
				loadInitialData();
			});
		}
	});

	async function loadInitialData() {
		try {
			const [cRes, ctRes, tRes] = await Promise.all([
				pb.collection('clients').getFullList<ClientData>({ sort: 'name_last' }),
				pb.collection('contacts').getFullList<ContactData>({ sort: 'name_last' }),
				pb.collection('document_templates').getFullList<Template>()
			]);
			clients = cRes;
			contacts = ctRes;
			templates = tRes;
		} catch (e) { toastService.error('Fehler beim Laden der Basisdaten.'); }
	}

	// Schritt 2: Termine laden
	async function goToAppointments() {
		if (!selectedRecipientId) return;
		isLoading = true;
		try {
			// Wir suchen Termine, die diesem Klienten zugeordnet sind (is_private=false)
			appointments = await pb.collection('appointments').getFullList<Appointment>({
				filter: `client ~ "${selectedRecipientId}" && is_private = false`,
				sort: '-appointment'
			});
			currentStep = 2;
		} catch (e) { toastService.error('Fehler beim Laden der Termine.'); }
		finally { isLoading = false; }
	}

	// Schritt 3 & 4 Filter
	const filteredTemplates = $derived(
		templates.filter(t => t.type === selectedDocType)
	);

	// --- Schritt 5: Die Automatisierte Generierung ---
	async function generateDocument() {
		if (!selectedTemplateId) return;
		isLoading = true;

		try {
			const template = templates.find(t => t.id === selectedTemplateId)!;
			const recipient = clients.find(c => c.id === selectedRecipientId) || contacts.find(c => c.id === selectedRecipientId);
			const selectedAppts = appointments.filter(a => selectedAppointmentIds.includes(a.id));

			// 1. Daten für Platzhalter sammeln
			const today = new Date().toLocaleDateString('de-DE');
			const fullName = `${recipient.name_first} ${recipient.name_last}`;
			
			// 2. Termintabelle generieren (Einfaches HTML)
			let apptRows = selectedAppts.map(a => `
				<tr>
					<td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(a.appointment).toLocaleDateString('de-DE')}</td>
					<td style="padding: 8px; border-bottom: 1px solid #eee;">${a.title}</td>
				</tr>
			`).join('');
			
			const apptTable = `<table style="width: 100%; border-collapse: collapse;">${apptRows}</table>`;

			// 3. Platzhalter im Template ersetzen
			let finalHtml = template.content_html
				.replace(/\{\{name\}\}/g, fullName)
				.replace(/\{\{datum\}\}/g, today)
				.replace(/\{\{termine_tabelle\}\}/g, apptTable)
				.replace(/\{\{anzahl\}\}/g, selectedAppointmentIds.length.toString());

			// 4. In Datenbank speichern (Collection 'invoices' nach pb_schema_01)
			await pb.collection('invoices').create({
				client: [selectedRecipientId],
				title: `${template.title} - ${recipient.name_last}`,
				status: 'Entwurf',
				issue_date: new Date().toISOString(),
				generated_html: finalHtml, // Das neue Feld aus Schritt 1
				document_type: { templateId: selectedTemplateId, type: selectedDocType }
			});

			toastService.success('Dokument erfolgreich generiert!');
			onCreated();
			onClosed();
		} catch (e) {
			console.error(e);
			toastService.error('Fehler bei der Dokumenterstellung.');
		} finally {
			isLoading = false;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" transition:fade={{duration: 200}}>
		<button type="button" class="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm border-none cursor-default" onclick={onClosed}></button>

		<div class="relative bg-white w-full max-w-2xl mt-12 sm:mt-0 h-[85vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" transition:slide={{axis: 'y'}}>
			
			<header class="p-6 md:p-8 border-b border-neutral-100 flex justify-between items-center bg-white shrink-0">
				<div>
					<h2 class="text-xl sm:text-2xl font-extrabold text-neutral-900">Dokument-Assistent</h2>
					<div class="flex gap-1.5 mt-2">
						{#each [1,2,3] as step}
							<div class="h-1.5 w-8 rounded-full transition-all {currentStep >= step ? 'bg-indigo-600' : 'bg-neutral-200'}"></div>
						{/each}
					</div>
				</div>
				<button type="button" onclick={onClosed} class="p-2 bg-neutral-100 rounded-full text-neutral-500 hover:bg-neutral-200 transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</header>

			<div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-neutral-50/30">
				
				{#if currentStep === 1}
					<div in:fade={{duration: 150}} class="space-y-6">
						<div class="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
							<label for="rec_select" class="block text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-3">1. Empfänger wählen</label>
							<select id="rec_select" bind:value={selectedRecipientId} class="orga-input-clear bg-neutral-50 py-3!">
								<option value="">-- Klient oder Kontakt wählen --</option>
								<optgroup label="Klienten">
									{#each clients as c} <option value={c.id}>{c.name_last}, {c.name_first} (Klient)</option> {/each}
								</optgroup>
								<optgroup label="Kontakte / Netzwerk">
									{#each contacts as ct} <option value={ct.id}>{ct.name_last}, {ct.name_first}</option> {/each}
								</optgroup>
							</select>
						</div>
						<button type="button" disabled={!selectedRecipientId} onclick={goToAppointments} class="orga-button-primary w-full py-4!">
							Weiter zu den Terminen
						</button>
					</div>
				{/if}

				{#if currentStep === 2}
					<div in:fade={{duration: 150}} class="space-y-6">
						<div class="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
							<h3 class="text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-4">2. Leistungen / Termine wählen</h3>
							
							{#if appointments.length === 0}
								<p class="text-center py-8 text-neutral-400 italic text-sm">Keine offenen Termine für diesen Empfänger gefunden.</p>
							{:else}
								<div class="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
									{#each appointments as appt}
										<label class="flex items-center p-3 rounded-xl border transition-all cursor-pointer {selectedAppointmentIds.includes(appt.id) ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-neutral-50 border-neutral-100 hover:border-neutral-200'}">
											<input type="checkbox" value={appt.id} bind:group={selectedAppointmentIds} class="h-5 w-5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 mr-4" />
											<div class="min-w-0">
												<span class="block text-sm font-bold text-neutral-800 truncate">{appt.title}</span>
												<span class="block text-[10px] font-medium text-neutral-500 uppercase">{new Date(appt.appointment).toLocaleDateString('de-DE')}</span>
											</div>
										</label>
									{/each}
								</div>
							{/if}
						</div>
						<div class="flex gap-4">
							<button type="button" onclick={() => currentStep = 1} class="orga-button-ghost flex-1 py-4!">Zurück</button>
							<button type="button" disabled={selectedAppointmentIds.length === 0} onclick={() => currentStep = 3} class="orga-button-primary flex-1 py-4!">Weiter zur Vorlage</button>
						</div>
					</div>
				{/if}

				{#if currentStep === 3}
					<div in:fade={{duration: 150}} class="space-y-6">
						<div class="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
							<h3 class="text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-4">3. Art & Design wählen</h3>
							
							<div class="grid grid-cols-2 gap-3 mb-6">
								{#each ['rechnung', 'quittung', 'arbeitszeitnachweis', 'brief'] as type}
									<button type="button" onclick={() => {selectedDocType = type; selectedTemplateId = '';}} class="py-3 rounded-xl border-2 font-bold text-xs uppercase tracking-widest transition-all {selectedDocType === type ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-neutral-100 text-neutral-400'}">
										{type}
									</button>
								{/each}
							</div>

							<label for="temp_select" class="block text-[10px] font-bold text-neutral-400 uppercase mb-2">Vorlage auswählen</label>
							<select id="temp_select" bind:value={selectedTemplateId} class="orga-input-clear bg-neutral-50 py-3!">
								<option value="">-- Bitte Vorlage wählen --</option>
								{#each filteredTemplates as t} <option value={t.id}>{t.title}</option> {/each}
							</select>
						</div>

						<div class="flex gap-4">
							<button type="button" onclick={() => currentStep = 2} class="orga-button-ghost flex-1 py-4!">Zurück</button>
							<button type="button" disabled={!selectedTemplateId || isLoading} onclick={generateDocument} class="orga-button-primary flex-1 py-4! shadow-lg shadow-indigo-600/20">
								{#if isLoading}
									<div class="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
								{:else}
									Dokument generieren
								{/if}
							</button>
						</div>
					</div>
				{/if}

			</div>
		</div>
	</div>
{/if}