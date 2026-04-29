<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';

	let { isOpen, onClosed, onImportComplete } = $props<{
		isOpen: boolean;
		onClosed: () => void;
		onImportComplete: () => void;
	}>();

	// --- State-Management (Svelte 5) ---
	let step = $state<1 | 2 | 3>(1);
	let file = $state<File | null>(null);
	
	let csvHeaders = $state<string[]>([]);
	let csvRows = $state<any[]>([]);
	let fieldMapping = $state<Record<string, string>>({});
	
	let addressMode = $state<'split' | 'combined'>('combined');

	let importProgress = $state({ current: 0, total: 0, errors: 0 });
	let isImporting = $state(false);

	// Definition unserer PocketBase Zielfelder
	const pbFields = [
		{ id: 'name_first', label: 'Vorname', required: true },
		{ id: 'name_last', label: 'Nachname', required: true },
		{ id: 'salutation', label: 'Anrede', required: false },
		{ id: 'birthdate', label: 'Geburtsdatum', required: false },
		{ id: 'email', label: 'E-Mail', required: false },
		{ id: 'phone', label: 'Festnetz', required: false },
		{ id: 'handy', label: 'Mobil', required: false },
		{ id: 'marital_status', label: 'Familienstand', required: false },
		{ id: 'level_of_care', label: 'Pflegegrad', required: false },
		{ id: 'notes', label: 'Notizen (Intern)', required: false },
		{ id: '_company_name', label: 'Firma (Name für Verknüpfung)', required: false },
		{ id: '_employee_name', label: 'Mitarbeiter (Name für Verknüpfung)', required: false },
	];

	const addressFieldsSplit = [
		{ id: 'street', label: 'Straße' },
		{ id: 'housenr', label: 'Hausnummer' },
		{ id: 'zip', label: 'PLZ' },
		{ id: 'city', label: 'Ort' }
	];

	// Abgeleiteter Status: Pflichtfelder geprüft?
	const isMappingValid = $derived(
		pbFields.filter(f => f.required).every(f => fieldMapping[f.id])
	);

	/**
	 * Schritt 1: CSV Ninox Parser
	 */
	async function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;
		
		file = target.files[0];
		const text = await file.text();
		
		const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
		if (lines.length === 0) {
			toastService.error('Die CSV-Datei ist leer.');
			return;
		}

		const parseLine = (line: string) => {
			const regex = /(".*?"|[^";\s][^";]*[^";\s]|[^";\s]+|(?<=;)(?=;)|(?<=^)(?=;)|(?<=;)(?=$))/g;
			return (line.match(regex) || []).map(val => val.replace(/^"|"$/g, '').trim());
		};

		csvHeaders = parseLine(lines[0]);
		csvRows = lines.slice(1).map(line => {
			const values = parseLine(line);
			const rowObj: Record<string, string> = {};
			csvHeaders.forEach((header, index) => {
				rowObj[header] = values[index] || '';
			});
			return rowObj;
		});

		// Auto-Mapping Heuristik
		let initialMapping: Record<string, string> = {};
		[...pbFields, ...addressFieldsSplit, { id: '_combined_address', label: '' }].forEach(field => {
			const match = csvHeaders.find(h => h.toLowerCase().includes(field.id.replace('_', '')) || h.toLowerCase().includes(field.label.toLowerCase()));
			if (match) initialMapping[field.id] = match;
		});
		fieldMapping = initialMapping;
		step = 2; 
	}

	/**
	 * Hilfsfunktion: Splitter für unstrukturierte Ninox-Adressen
	 */
	function parseCombinedAddress(rawAddress: string) {
		let street = '', housenr = '', zip = '', city = '';
		if (!rawAddress) return { street, housenr, zip, city };

		const cleaned = rawAddress.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
		const zipMatch = cleaned.match(/\b\d{5}\b/);
		
		if (zipMatch) {
			zip = zipMatch[0];
			const afterZip = cleaned.substring(cleaned.indexOf(zip) + 5).replace(/^[,\s]+/, '');
			city = afterZip.split(',')[0].trim(); 
			
			const beforeZip = cleaned.substring(0, cleaned.indexOf(zip)).replace(/[,\s]+$/, '');
			const streetMatch = beforeZip.match(/^(.*?)\s+((?:\d+[a-zA-Z]?(-\d+[a-zA-Z]?)?\s*)+)$/);
			if (streetMatch) {
				street = streetMatch[1].trim();
				housenr = streetMatch[2].trim();
			} else {
				street = beforeZip.trim();
			}
		} else {
			street = rawAddress;
		}

		return { street, housenr, zip, city };
	}

	/**
	 * Schritt 3: Ausführung und DB-Import
	 */
	async function executeImport() {
		if (isImporting) return;
		isImporting = true;
		step = 3;
		importProgress = { current: 0, total: csvRows.length, errors: 0 };

		for (const row of csvRows) {
			try {
				const payload: any = {};
				
				// Standard-Felder
				pbFields.forEach(field => {
					const csvColName = fieldMapping[field.id];
					if (csvColName && row[csvColName]) {
						if (!field.id.startsWith('_')) {
							payload[field.id] = row[csvColName];
						}
					}
				});

				// Adress-Verarbeitung
				if (addressMode === 'combined' && fieldMapping['_combined_address']) {
					const rawAddr = row[fieldMapping['_combined_address']];
					const parsed = parseCombinedAddress(rawAddr);
					payload.street = parsed.street;
					payload.housenr = parsed.housenr;
					payload.zip = parsed.zip;
					payload.city = parsed.city;
				} else if (addressMode === 'split') {
					addressFieldsSplit.forEach(field => {
						const csvColName = fieldMapping[field.id];
						if (csvColName && row[csvColName]) payload[field.id] = row[csvColName];
					});
				}

				// Notizen in JSON umwandeln
				if (payload.notes) {
					payload.special_scheduling_details = { notes: payload.notes };
					delete payload.notes;
				}

				if (!payload.level_of_care) payload.level_of_care = "0";

				await pb.collection('clients').create(payload);
				importProgress.current++;
				
			} catch (error) {
				console.error('Import Fehler Zeile:', row, error);
				importProgress.errors++;
			}
		}

		isImporting = false;
		if (importProgress.errors === 0) {
			toastService.success(`${importProgress.current} Klienten importiert!`);
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
	<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
		
		<div class="bg-neutral-800 border border-neutral-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
			
			<header class="p-6 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50">
				<div>
					<h2 class="text-xl font-bold text-white">Datenimport (Ninox CSV)</h2>
					<p class="text-xs text-neutral-400 mt-1">Schritt {step} von 3</p>
				</div>
				<button aria-label="Fenster schließen" onclick={onClosed} disabled={isImporting} class="p-2 hover:bg-neutral-700 rounded-full text-neutral-400 disabled:opacity-50">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</header>

			<div class="p-8 overflow-y-auto flex-1 custom-scrollbar">
				
				{#if step === 1}
					<div class="flex flex-col items-center justify-center py-12 border-2 border-dashed border-neutral-600 rounded-xl transition">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
						<h3 class="text-lg font-medium text-white mb-2">Ninox CSV-Datei hochladen</h3>
						<label for="csv-upload" class="orga-button-primary cursor-pointer mt-4 py-2.5! px-6!">
							Datei auswählen
							<input id="csv-upload" type="file" accept=".csv" onchange={handleFileUpload} class="hidden" />
						</label>
					</div>

				{:else if step === 2}
					<div class="space-y-8">
						<div class="border border-neutral-700 rounded-xl p-5">
							<h4 class="text-sm font-bold text-white mb-3">Wie liegen die Adressen in der CSV vor?</h4>
							<div class="flex gap-6">
								<label for="mode-combined" class="flex items-center gap-2 cursor-pointer text-sm text-black bg-white rounded-2xl p-1">
									<input id="mode-combined" type="radio" bind:group={addressMode} value="combined" class="text-indigo-500 focus:ring-indigo-500 bg-neutral-800 border-neutral-600">
									In einem Feld (wird automatisch aufgeteilt)
								</label>
								<label for="mode-split" class="flex items-center gap-2 cursor-pointer text-sm text-black bg-white rounded-2xl p-1">
									<input id="mode-split" type="radio" bind:group={addressMode} value="split" class="text-indigo-500 focus:ring-indigo-500 bg-neutral-800 border-neutral-600">
									In einzelnen Spalten
								</label>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
							<div class="space-y-4">
								<h4 class="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-neutral-700 pb-2">Stammdaten</h4>
								{#each pbFields as field}
									<div class="flex flex-col gap-1">
										<label for="map-std-{field.id}" class="text-xs text-white">
											{field.label} {#if field.required}<span class="text-red-400">*</span>{/if}
										</label>
										<select id="map-std-{field.id}" bind:value={fieldMapping[field.id]} class="orga-input py-2! text-sm! text-black bg-white">
											<option value="">-- Überspringen --</option>
											{#each csvHeaders as header}
												<option value={header}>{header}</option>
											{/each}
										</select>
									</div>
								{/each}
							</div>

							<div class="space-y-4">
								<h4 class="text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-neutral-700 pb-2">Adresse</h4>
								
								{#if addressMode === 'combined'}
									<div class="flex flex-col gap-1 p-4 rounded-lg border border-neutral-700">
										<label for="map-combined-addr" class="text-xs text-black bg-white rounded-2xl p-1">Ganze Adresse (z.B. Strasse 12, 12345 Ort)</label>
										<select id="map-combined-addr" bind:value={fieldMapping['_combined_address']} class="orga-input py-2! text-sm! mt-2">
											<option value="">-- Überspringen --</option>
											{#each csvHeaders as header}
												<option class="text-black" value={header}>{header}</option>
											{/each}
										</select>
									</div>
								{:else}
									{#each addressFieldsSplit as field}
										<div class="flex flex-col gap-1">
											<label for="map-split-{field.id}" class="text-xs text-neutral-400">{field.label}</label>
											<select id="map-split-{field.id}" bind:value={fieldMapping[field.id]} class="orga-input py-2! text-sm!">
												<option value="">-- Überspringen --</option>
												{#each csvHeaders as header}
													<option value={header}>{header}</option>
												{/each}
											</select>
										</div>
									{/each}
								{/if}
							</div>
						</div>
					</div>

				{:else if step === 3}
					<div class="flex flex-col items-center justify-center py-16">
						{#if isImporting}
							<div class="h-16 w-16 border-4 border-neutral-700 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
							<h3 class="text-xl font-bold text-black mb-2">Importiere Daten...</h3>
							<p class="text-neutral-400">{importProgress.current} von {importProgress.total} verarbeitet</p>
						{:else}
							<div class="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
							</div>
							<h3 class="text-xl font-bold text-black mb-2">Import abgeschlossen</h3>
							<button type="button" onclick={onClosed} class="orga-button-primary py-2! px-8! mt-4">Fenster schließen</button>
						{/if}
					</div>
				{/if}
			</div>

			{#if step === 2}
				<footer class="p-6 border-t border-neutral-700 flex justify-between items-center">
					<button type="button" onclick={reset} class="text-neutral-400 hover:text-black transition text-sm">Zurück</button>
					<button type="button" onclick={executeImport} disabled={!isMappingValid} class="orga-button-primary py-2.5! px-8! disabled:opacity-50">
						Jetzt importieren
					</button>
				</footer>
			{/if}
		</div>
	</div>
{/if}