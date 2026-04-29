<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase';
	import { toastService } from '$lib/services/toast.d.svelte';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import DocumentCreator from '$lib/components/DocumentCreator.svelte';

	// --- Interfaces ---
	interface DocumentRecord {
		id: string;
		title: string;
		document_type: { type: string } | string; // PB JSON Feld
		status: 'Entwurf' | 'Eingereicht' | 'In Bearbeitung' | 'Abgeschlossen' | 'Abgelehnt' | 'Storniert';
		issue_date: string;
		due_date: string;
		amount: number;
		file: string[]; // PB Array von Dateinamen
		is_signed: boolean;
		notes: string;
		user: string;
		created: string;
	}

	// --- State ---
	// Statische Werte (die sich zur Laufzeit hier nicht ändern) werden als const deklariert.
	const currentUser = pb.authStore.model;
	
	// Große Datenmengen werden aus Performancegründen mit $state.raw gehalten
	let documents = $state.raw<DocumentRecord[]>([]);
	
	// Interaktiver State
	let isLoading = $state(true);
	let searchQuery = $state('');
	let isCreatorOpen = $state(false);

	// --- Derived Logic (Suche) ---
	const filteredDocuments = $derived.by(() => {
		if (!searchQuery) return documents;
		const q = searchQuery.toLowerCase();
		
		return documents.filter(doc => {
			// Typ sicher extrahieren (wegen JSON Feld)
			const typeStr = typeof doc.document_type === 'object' ? doc.document_type?.type : doc.document_type;
			
			return doc.title.toLowerCase().includes(q) || 
				   doc.status.toLowerCase().includes(q) ||
				   (typeStr && typeStr.toLowerCase().includes(q));
		});
	});

	// --- Lifecycle ---
	// Daten-Fetching zwingend im onMount, niemals in $effect
	onMount(async () => {
		if (!pb.authStore.isValid || !currentUser) {
			goto('/');
			return;
		}
		await loadDocuments();
		isLoading = false;
	});

	async function loadDocuments() {
		try {
			// Admin sieht alle, User nur eigene
			const filter = currentUser?.role === 'admin' ? '' : `user = "${currentUser?.id}"`;
			
			const result = await pb.collection('documents').getFullList<DocumentRecord>({
				filter: filter,
				sort: '-created' // Neueste zuerst
			});
			documents = result;
		} catch (error) {
			console.error('Fehler beim Laden der Dokumente:', error);
			toastService.error('Dokumente konnten nicht geladen werden.');
		}
	}

	// --- Actions ---
	async function deleteDocument(id: string) {
		if (!confirm('Möchten Sie dieses Dokument wirklich unwiderruflich löschen? Die PDF-Datei wird dabei ebenfalls vom Server entfernt.')) return;
		
		try {
			await pb.collection('documents').delete(id);
			toastService.success('Dokument erfolgreich gelöscht.');
			await loadDocuments();
		} catch (error) {
			console.error(error);
			toastService.error('Fehler beim Löschen des Dokuments.');
		}
	}

	// --- Helper ---
	function getStatusColor(status: string) {
		// Angepasst für das Dark Theme
		switch (status) {
			case 'Abgeschlossen': return 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50';
			case 'Eingereicht':
			case 'In Bearbeitung': return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
			case 'Abgelehnt':
			case 'Storniert': return 'bg-red-900/30 text-red-400 border-red-800/50';
			default: return 'bg-neutral-800 text-neutral-400 border-neutral-700'; // Entwurf
		}
	}

	function getDocType(doc: DocumentRecord) {
		if (!doc.document_type) return 'Dokument';
		if (typeof doc.document_type === 'object') return doc.document_type.type || 'Dokument';
		return doc.document_type;
	}

	function getFileUrl(doc: DocumentRecord) {
		if (!doc.file || doc.file.length === 0) return null;
		return pb.files.getURL(doc, doc.file[0]); // Holt die URL der ersten angehängten Datei
	}
</script>

<div class="min-h-screen bg-neutral-900 flex flex-col md:pl-20 lg:pl-72 transition-all relative">
	
	<header class="bg-neutral-800 border-b border-neutral-700 p-6 lg:px-10 sticky top-0 z-30 shadow-sm shrink-0">
		<div class="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
			
			<div class="pl-14 md:pl-0"> 
				<h1 class="text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
					Dokumente
				</h1>
				<p class="text-sm text-neutral-400 mt-1 font-medium">Rechnungen, Nachweise und Verträge verwalten.</p>
			</div>

			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
				<div class="relative w-full sm:w-72 shrink-0">
					<input 
						type="text" 
						bind:value={searchQuery} 
						placeholder="Titel, Typ oder Status..." 
						aria-label="Dokumente durchsuchen"
						class="w-full bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-xl pl-11 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
					/>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
				</div>
				
				<button 
					type="button" 
					onclick={() => isCreatorOpen = true} 
					class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-2.5 px-6 flex-1 sm:flex-none flex items-center justify-center whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" /></svg>
					Neues Dokument
				</button>
			</div>
		</div>
	</header>

	<main class="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full pb-32">
		{#if isLoading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
			</div>
		{:else if documents.length === 0}
			<div class="bg-neutral-800 border border-neutral-700 rounded-3xl p-12 text-center shadow-sm max-w-2xl mx-auto mt-10">
				<div class="mx-auto w-20 h-20 bg-neutral-900 text-indigo-500 rounded-full flex items-center justify-center mb-6">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
				</div>
				<h3 class="text-xl font-bold text-white">Noch keine Dokumente</h3>
				<p class="text-neutral-400 mt-2">Das System hat noch keine Dokumente erfasst. Erstellen Sie jetzt Ihre erste Rechnung oder einen Arbeitszeitnachweis.</p>
				<button 
					onclick={() => isCreatorOpen = true} 
					class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-2.5 px-6 mt-8 mx-auto inline-flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-800"
				>
					Dokument erstellen
				</button>
			</div>
		{:else if filteredDocuments.length === 0}
			<div class="text-center py-20">
				<p class="text-neutral-400 font-medium text-lg">Keine Dokumente für "{searchQuery}" gefunden.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" in:fade>
				{#each filteredDocuments as doc (doc.id)}
					{@const fileUrl = getFileUrl(doc)}
					
					<div class="bg-neutral-800 p-6 flex flex-col justify-between border border-neutral-700 hover:border-neutral-500 rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
						<div>
							<div class="flex justify-between items-start mb-4 gap-3">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm {getDocType(doc).includes('Rechnung') ? 'bg-indigo-900/30 text-indigo-400' : 'bg-neutral-900 text-neutral-400'}">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
									</div>
									<h3 class="font-extrabold text-white text-lg leading-tight line-clamp-2">
										{doc.title}
									</h3>
								</div>
							</div>
							
							<div class="mb-5 flex flex-wrap gap-2">
								<span class="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-neutral-900 text-neutral-300 border-neutral-700">
									{getDocType(doc)}
								</span>
								<span class="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border {getStatusColor(doc.status)}">
									{doc.status}
								</span>
							</div>

							<div class="space-y-3 text-sm text-neutral-400 mb-6 bg-neutral-900/50 border border-neutral-700/50 p-4 rounded-xl">
								<div class="flex justify-between items-center">
									<span class="font-medium">Ausgestellt:</span>
									<span class="font-bold text-white">{new Date(doc.issue_date).toLocaleDateString('de-DE')}</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="font-medium">Betrag:</span>
									<span class="font-black text-indigo-400 text-base">{doc.amount.toFixed(2)} €</span>
								</div>
							</div>
						</div>
						
						<div class="flex gap-2 mt-auto border-t border-neutral-700 pt-4">
							{#if fileUrl}
								<a 
									href={fileUrl} 
									target="_blank" 
									rel="noopener noreferrer"
									aria-label="PDF für {doc.title} in neuem Tab ansehen"
									class="flex-1 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-center text-sm font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center gap-2"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
									PDF ansehen
								</a>
							{:else}
								<div class="flex-1 py-2.5 bg-neutral-900 text-neutral-500 text-center text-sm font-bold rounded-xl cursor-not-allowed">
									Keine Datei
								</div>
							{/if}

							<button 
								type="button" 
								aria-label="Dokument löschen"
								onclick={() => deleteDocument(doc.id)} 
								class="px-4 py-2.5 bg-neutral-800 border border-neutral-700 hover:bg-red-900/30 hover:border-red-800 hover:text-red-400 text-neutral-500 text-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
							>
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if isCreatorOpen}
	<DocumentCreator 
		isOpen={isCreatorOpen} 
		onClosed={() => isCreatorOpen = false} 
		onCreated={loadDocuments} 
	/>
{/if}
