<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';

	let { isOpen, onClosed, onImportComplete } = $props<{
		isOpen: boolean;
		onClosed: () => void;
		onImportComplete: () => void;
	}>();

	// --- State-Management ---
	let step = $state<1 | 2 | 3>(1);
	let file = $state<File | null>(null);
	
	let csvHeaders = $state<string[]>([]);
	let csvRows = $state<any[]>([]);
	let fieldMapping = $state<Record<string, string>>({});

	let importProgress = $state({ current: 0, total: 0, errors: 0 });
	let isImporting = $state(false);
	
	let isDeleting = $state(false);
	let deleteProgress = $state({ current: 0, total: 0 });

	// Datenbank-Caches für die intelligente Zuordnung
	let dbClients = $state.raw<any[]>([]);
	let dbUsers = $state.raw<any[]>([]);
	let dbCompanies = $state.raw<any[]>([]);

	// Angepasst auf dein neues CSV Format!
	const pbFields = [
		{ id: 'title', label: 'Titel / Betreff', required: true },
		{ id: 'appointment', label: 'Datum & Uhrzeit (Start)', required: true },
		{ id: 'description', label: 'Notizen / Beschreibung', required: false },
		{ id: 'is_private', label: 'Privat (Ja/Nein)', required: false },
		{ id: 'client_full', label: 'Klient (Vor- und Nachname)', required: true }, 
		{ id: 'user_first', label: 'Mitarbeiter (Vorname)', required: true } 
	];

	const isMappingValid = $derived(
		pbFields.filter(f => f.required).every(f => fieldMapping[f.id])
	);

	onMount(async () => {
		try {
			dbClients = await pb.collection('clients').getFullList({ fields: 'id,name_first,name_last,assigned_employee,company' });
			dbUsers = await pb.collection('users').getFullList({ fields: 'id,name_first' });
			dbCompanies = await pb.collection('company').getFullList({ fields: 'id,member' });
		} catch (error) {
			console.error('Konnte Relationen für Zuordnung nicht laden:', error);
		}
	});

	async function deleteAllAppointments() {
		if (!confirm('WARNUNG: Möchten Sie wirklich ALLE bestehenden Termine im System unwiderruflich löschen?')) return;
		if (!confirm('SIND SIE SICH ABSOLUT SICHER? Dieser Vorgang kann nicht rückgängig gemacht werden!')) return;

		isDeleting = true;
		try {
			const currentUser = pb.authStore.model;
			const filter = currentUser?.role === 'admin' ? '' : `user = "${currentUser?.id}"`;
			
			const allAppts = await pb.collection('appointments').getFullList({ filter, fields: 'id' });
			deleteProgress = { current: 0, total: allAppts.length };

			for (const appt of allAppts) {
				await pb.collection('appointments').delete(appt.id, { $autoCancel: false });
				deleteProgress.current++;
				if (deleteProgress.current % 25 === 0) await new Promise(resolve => setTimeout(resolve, 10));
			}

			toastService.success(`${allAppts.length} Termine wurden erfolgreich gelöscht.`);
			onImportComplete();
		} catch (error) {
			console.error('Delete Error:', error);
			toastService.error('Fehler beim Löschen der Termine.');
		} finally {
			isDeleting = false;
		}
	}

	function parseCSVRobust(text: string): string[][] {
		const rows: string[][] = [];
		let currentRow: string[] = [];
		let currentCell = '';
		let inQuotes = false;

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			if (char === '"') {
				if (inQuotes && text[i + 1] === '"') { currentCell += '"'; i++; } 
				else { inQuotes = !inQuotes; }
			} else if (char === ';' && !inQuotes) {
				currentRow.push(currentCell.trim()); currentCell = '';
			} else if ((char === '\n' || char === '\r') && !inQuotes) {
				if (char === '\r' && text[i + 1] === '\n') i++; 
				currentRow.push(currentCell.trim());
				if (currentRow.length > 1 || currentRow[0] !== '') rows.push(currentRow);
				currentRow = []; currentCell = '';
			} else {
				currentCell += char;
			}
		}
		if (currentRow.length > 0 || currentCell !== '') {
			currentRow.push(currentCell.trim());
			if (currentRow.length > 1 || currentRow[0] !== '') rows.push(currentRow);
		}
		return rows;
	}

	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;
		
		file = target.files[0];
		const text = await file.text();
		const parsedData = parseCSVRobust(text);
		
		if (parsedData.length < 2) {
			toastService.error('Die CSV-Datei scheint leer zu sein.');
			return;
		}

		csvHeaders = parsedData[0];
		csvRows = parsedData.slice(1).map(rowValues => {
			const rowObj: Record<string, string> = {};
			csvHeaders.forEach((header, index) => {
				rowObj[header] = rowValues[index] || '';
			});
			return rowObj;
		});

		// Auto-Mapping Heuristik (Genau auf deine CSV abgestimmt)
		let initialMapping: Record<string, string> = {};
		const heuristics: Record<string, string[]> = {
			'title': ['title', 'titel'],
			'appointment': ['datetime', 'datum', 'zeit'],
			'description': ['notizen', 'beschreibung'],
			'is_private': ['is_private', 'privat'],
			'client_full': ['client', 'klient'],
			'user_first': ['user_first_name', 'mitarbeiter']
		};

		pbFields.forEach(field => {
			const terms = heuristics[field.id] || [];
			const match = csvHeaders.find(h => terms.some(term => h.toLowerCase().includes(term.toLowerCase())));
			if (match) initialMapping[field.id] = match;
		});
		
		fieldMapping = initialMapping;
		step = 2; 
	}

	function parseDateTime(dateStr: string): string | null {
		if (!dateStr) return null;
		const deMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?/);
		if (deMatch) {
			const [_, day, month, year, hour = "00", minute = "00"] = deMatch;
			const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
			return isNaN(d.getTime()) ? null : d.toISOString();
		}
		const standardDate = new Date(dateStr);
		return isNaN(standardDate.getTime()) ? null : standardDate.toISOString();
	}

	async function executeImport() {
		if (isImporting) return;
		const currentUser = pb.authStore.model;
		if (!currentUser) return;

		isImporting = true;
		step = 3;
		importProgress = { current: 0, total: csvRows.length, errors: 0 };

		for (const row of csvRows) {
			try {
				let title = row[fieldMapping['title']] || '';
				let datetime = row[fieldMapping['appointment']];
				let desc = row[fieldMapping['description']] || '';
				let privStr = row[fieldMapping['is_private']];
				let clientName = row[fieldMapping['client_full']];
				let userFirst = row[fieldMapping['user_first']];

				// 1. User/Mitarbeiter finden
				const matchedUser = dbUsers.find(u => u.name_first.toLowerCase() === userFirst?.trim().toLowerCase());
				const userId = matchedUser ? matchedUser.id : currentUser.id;

				// 2. Company des Mitarbeiters finden
				const matchedCompany = dbCompanies.find(c => c.member === userId);
				const companyId = matchedCompany ? matchedCompany.id : '';

				// 3. Klient Verarbeiten (Suchen, Updaten oder Neu Erstellen)
				let clientId = '';
				if (clientName && clientName.trim() !== '') {
					const parts = clientName.trim().split(' ');
					const fName = parts[0];
					const lName = parts.length > 1 ? parts.slice(1).join(' ') : ''; // Falls nur 1 Name existiert

					let matchedClient = dbClients.find(c => c.name_first.toLowerCase() === fName.toLowerCase() && c.name_last.toLowerCase() === lName.toLowerCase());

					if (matchedClient) {
						clientId = matchedClient.id;
						// Update Klient falls Mitarbeiter oder Firma abweicht
						if (matchedClient.assigned_employee !== userId || matchedClient.company !== companyId) {
							await pb.collection('clients').update(clientId, { assigned_employee: userId, company: companyId }, { $autoCancel: false });
							matchedClient.assigned_employee = userId;
							matchedClient.company = companyId;
						}
					} else {
						// Neuen Klient anlegen und sofort verknüpfen
						const newClient = await pb.collection('clients').create({
							name_first: fName,
							name_last: lName,
							assigned_employee: userId,
							company: companyId,
							salutation: 'Keine Angabe',
							marital_status: 'Ledig',
							level_of_care: '0'
						}, { $autoCancel: false });
						
						clientId = newClient.id;
						dbClients.push(newClient); // In Cache aufnehmen
					}
				}

				// 4. Termin erstellen
				await pb.collection('appointments').create({
					user: userId,
					client: clientId || null,
					title: title,
					appointment: parseDateTime(datetime) || new Date().toISOString(),
					description: desc,
					is_private: (privStr?.toLowerCase() === 'ja' || privStr?.toLowerCase() === 'true')
				}, { $autoCancel: false });
				
				importProgress.current++;
				
				if (importProgress.current % 25 === 0) {
					await new Promise(resolve => setTimeout(resolve, 10));
				}
				
			} catch (error) {
				console.error('Import Fehler Zeile:', row, error);
				importProgress.errors++;
			}
		}

		isImporting = false;
		if (importProgress.errors === 0) {
			toastService.success(`${importProgress.current} Termine & Klienten erfolgreich importiert!`);
		} else {
			toastService.error(`${importProgress.current} importiert, ${importProgress.errors} fehlerhaft.`);
		}
		onImportComplete();
	}

	function reset() {
		step = 1; file = null; csvHeaders = []; csvRows = []; fieldMapping = {};
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
		<div class="bg-neutral-900 border border-neutral-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
			
			<header class="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
				<div>
					<h2 class="text-xl font-bold text-white">Datenimport (Termine & Klienten)</h2>
					<p class="text-xs text-neutral-400 mt-1">Schritt {step} von 3</p>
				</div>
				<button aria-label="Fenster schließen" onclick={onClosed} disabled={isImporting || isDeleting} class="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 disabled:opacity-50 transition">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</header>

			<div class="p-8 overflow-y-auto flex-1 custom-scrollbar bg-neutral-900">
				
				{#if step === 1}
					{#if isDeleting}
						<div class="flex flex-col items-center justify-center py-16 bg-neutral-800/50 rounded-2xl border border-neutral-700">
							<div class="h-16 w-16 border-4 border-neutral-800 border-t-red-500 rounded-full animate-spin mb-6"></div>
							<h3 class="text-xl font-bold text-white mb-2">Lösche alte Termine...</h3>
							<div class="w-full max-w-xs bg-neutral-900 rounded-full h-2.5 mt-4 mb-2 overflow-hidden border border-neutral-800">
								<div class="bg-red-500 h-2.5 rounded-full transition-all duration-200" style="width: {(deleteProgress.current / deleteProgress.total) * 100}%"></div>
							</div>
							<p class="text-neutral-400 text-sm font-medium">{deleteProgress.current} von {deleteProgress.total} entfernt</p>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-10 border-2 border-dashed border-neutral-700 rounded-2xl hover:border-indigo-500/50 bg-neutral-800/30 transition mb-8">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
							<h3 class="text-lg font-medium text-white mb-2">Kalender-Export hochladen</h3>
							<p class="text-sm text-neutral-400 mb-6 text-center max-w-sm">Das System erkennt und verknüpft automatisch Mitarbeiter, Klienten und Unternehmen.</p>
							<label for="appt-csv-upload" class="orga-button-primary cursor-pointer py-2.5! px-8! shadow-lg shadow-indigo-900/20">
								Datei auswählen
								<input id="appt-csv-upload" type="file" accept=".csv" onchange={handleFileUpload} class="hidden" />
							</label>
						</div>

						<div class="bg-red-900/10 border border-red-900/30 rounded-2xl p-6 flex items-start gap-4">
							<div class="p-2 bg-red-500/20 rounded-lg text-red-400">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
							</div>
							<div>
								<h3 class="text-sm font-bold text-red-400">Kalender bereinigen</h3>
								<p class="text-xs text-red-300/70 mt-1 mb-3">Bevor Sie einen vollständigen Import durchführen, können Sie hier alle aktuellen Termine im System löschen, um Duplikate zu vermeiden.</p>
								<button type="button" onclick={deleteAllAppointments} class="text-xs font-bold bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 py-2 px-4 rounded-lg transition">
									Alle bestehenden Termine löschen
								</button>
							</div>
						</div>
					{/if}

				{:else if step === 2}
					<div class="space-y-6">
						<div class="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5 mb-2">
							<h4 class="text-sm font-bold text-indigo-300 mb-1">Feld-Zuordnung</h4>
							<p class="text-xs text-indigo-200/70">Ordnen Sie die Spalten aus Ihrer CSV den Datenbankfeldern zu.</p>
						</div>

						<div class="grid grid-cols-1 gap-4">
							{#each pbFields as field}
								<div class="flex flex-col gap-1.5 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
									<label for="map-appt-{field.id}" class="text-sm font-medium text-neutral-300">
										{field.label} {#if field.required}<span class="text-red-400 ml-1">*</span>{/if}
									</label>
									<select id="map-appt-{field.id}" bind:value={fieldMapping[field.id]} class="orga-input py-2! text-sm!">
										<option value="">-- Nicht importieren --</option>
										{#each csvHeaders as header}
											<option value={header}>{header}</option>
										{/each}
									</select>
								</div>
							{/each}
						</div>
					</div>

				{:else if step === 3}
					<div class="flex flex-col items-center justify-center py-16">
						{#if isImporting}
							<div class="h-16 w-16 border-4 border-neutral-800 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
							<h3 class="text-xl font-bold text-white mb-2">Importiere Daten...</h3>
							
							<div class="w-full max-w-xs bg-neutral-800 rounded-full h-2.5 mt-4 mb-2 overflow-hidden border border-neutral-700">
								<div class="bg-indigo-500 h-2.5 rounded-full transition-all duration-200" style="width: {(importProgress.current / importProgress.total) * 100}%"></div>
							</div>
							<p class="text-neutral-400 text-sm font-medium">{importProgress.current} von {importProgress.total} verarbeitet</p>
						{:else}
							<div class="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
							</div>
							<h3 class="text-xl font-bold text-white mb-2">Import abgeschlossen</h3>
							<button type="button" onclick={onClosed} class="orga-button-primary py-2.5! px-8! mt-6">Ansicht schließen</button>
						{/if}
					</div>
				{/if}
			</div>

			{#if step === 2}
				<footer class="p-6 border-t border-neutral-800 bg-neutral-950 flex justify-between items-center">
					<button type="button" onclick={reset} class="text-neutral-400 hover:text-white transition text-sm font-medium">Zurück / Neue Datei</button>
					<button type="button" onclick={executeImport} disabled={!isMappingValid} class="orga-button-primary py-2.5! px-8! disabled:opacity-50">
						Jetzt importieren
					</button>
				</footer>
			{/if}
		</div>
	</div>
{/if}