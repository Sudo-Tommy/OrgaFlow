<script lang="ts">
	import { slide, fade } from 'svelte/transition';

	// --- Datenstruktur für die Tipps ---
	const allTips = [
		{
			id: 1,
			title: 'Automatisierte Abrechnung',
			description: 'Wussten Sie schon? Der Dokument-Assistent sammelt automatisch alle Zeiten und Auslagen eines Monats und erstellt fertige Entlastungsbetrag-Rechnungen.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
			color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
		},
		{
			id: 2,
			title: 'Fahrtkosten nicht vergessen',
			description: 'Tragen Sie nach jedem Termin direkt die gefahrenen Kilometer im Reiter "Fahrt & Ausgaben" ein. Sie werden bei der Abrechnung automatisch berücksichtigt.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
			color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
		},
		{
			id: 3,
			title: 'Private vs. Kassen-Termine',
			description: 'Markieren Sie Termine, die nicht über die Pflegekasse laufen, als "Privat". Diese werden farblich getrennt und aus SGB-Nachweisen herausgehalten.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>`,
			color: 'text-amber-600 bg-amber-50 border-amber-100'
		},
		{
			id: 4,
			title: 'KI-Klienten Erkennung',
			description: 'Wenn Sie in den Notizen eines Termins den Nachnamen eines Klienten erwähnen, schlägt OrgaFlow Ihnen diesen automatisch zur Zuweisung vor!',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>`,
			color: 'text-blue-600 bg-blue-50 border-blue-100'
		},
		{
			id: 5,
			title: 'Netzwerk aufbauen',
			description: 'Verknüpfen Sie Ärzte oder Angehörige im Bereich "Kontakte" direkt mit dem jeweiligen Klienten, um alle Ansprechpartner sofort griffbereit zu haben.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`,
			color: 'text-purple-600 bg-purple-50 border-purple-100'
		},
		{
			id: 6,
			title: 'Pflegegrad-Historie',
			description: 'Hinterlegen Sie den aktuellen Pflegegrad im Klientenprofil, um später prüfen zu können, ob das Budget nach §45b SGB XI ideal ausgeschöpft wird.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`,
			color: 'text-rose-600 bg-rose-50 border-rose-100'
		},
		{
			id: 7,
			title: 'Professionelles Branding',
			description: 'Laden Sie Ihr Logo in den Unternehmensdaten hoch. OrgaFlow platziert es automatisch im Briefkopf all Ihrer erstellten PDF-Dokumente.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`,
			color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
		},
		{
			id: 8,
			title: 'Der Blitz-Termin',
			description: 'Nutzen Sie in der mobilen Ansicht den schwebenden Plus-Button oder klicken Sie auf dem Desktop direkt auf einen Kalendertag, um sofort einen Termin zu erstellen.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
			color: 'text-yellow-600 bg-yellow-50 border-yellow-100'
		},
		{
			id: 9,
			title: 'Zentrale Spesenbuchhaltung',
			description: 'Auslagen für Klienten (z.B. Café, Zoo) fließen über die Termin-Eingabemaske direkt als "Ausgabe" in Ihre OrgaFlow-Buchhaltung.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>`,
			color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
		},
		{
			id: 10,
			title: 'Kataloge anpassen',
			description: 'Fehlt eine Krankenkasse oder Tätigkeit? Als Admin können Sie in den Einstellungen die Dropdown-Listen dauerhaft und systemweit erweitern.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>`,
			color: 'text-slate-600 bg-slate-50 border-slate-100'
		},
		{
			id: 11,
			title: 'Magische Platzhalter',
			description: 'Nutzen Sie Platzhalter wie {{name}} oder {{datum}} in Ihren Dokument-Vorlagen, um blitzschnell fehlerfreie, personalisierte Briefe zu generieren.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
			color: 'text-blue-600 bg-blue-50 border-blue-100'
		},
		{
			id: 12,
			title: 'Mitarbeiter-Zuweisung',
			description: 'Haben Sie ein Team? Sie können jedem Klienten einen festen Betreuer zuweisen. Das System filtert die Terminübersicht dann automatisch.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`,
			color: 'text-cyan-600 bg-cyan-50 border-cyan-100'
		},
		{
			id: 13,
			title: 'Vergangene Termine',
			description: 'Vergangene Termine werden im Kalender leicht grau dargestellt. So sehen Sie sofort, wo vielleicht noch eine Zeiterfassung nachgetragen werden muss.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
			color: 'text-gray-600 bg-gray-50 border-gray-100'
		},
		{
			id: 14,
			title: 'Vollständig Mobil-Optimiert',
			description: 'OrgaFlow ist komplett responsiv! Probieren Sie den Kalender auf dem Smartphone aus – er verwandelt sich in eine komfortable Agenda-Listenansicht.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`,
			color: 'text-teal-600 bg-teal-50 border-teal-100'
		},
		{
			id: 15,
			title: 'Digitale Signatur',
			description: 'Hinterlegen Sie im Profil einmalig Ihre digitale Unterschrift. Diese wird auf Wunsch unter offizielle Abrechnungen und Arbeitszeitnachweise gedruckt.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>`,
			color: 'text-purple-600 bg-purple-50 border-purple-100'
		},
		{
			id: 16,
			title: 'Die IK-Nummer',
			description: 'Für die direkte Abrechnung mit Pflegekassen benötigen Sie Ihre IK-Nummer. Diese können Sie zentral im Menüpunkt "Unternehmen" abspeichern.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>`,
			color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
		},
		{
			id: 17,
			title: 'Pflege-Einrichtungen',
			description: 'Ordnen Sie Klienten direkt ihren Seniorenheimen zu. Das hilft bei der Fahrtroutenplanung und schnellen Ansprechpartner-Suche.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`,
			color: 'text-orange-600 bg-orange-50 border-orange-100'
		},
		{
			id: 18,
			title: 'Tagesform Begrüßung',
			description: 'Schon gemerkt? Das System begrüßt Sie auf dem Dashboard passend zur jeweiligen Tageszeit. Ein kleiner Motivationsschub für den Alltag!',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>`,
			color: 'text-pink-600 bg-pink-50 border-pink-100'
		},
		{
			id: 19,
			title: 'Passwort-Sicherheit',
			description: 'Denken Sie daran, Ihr Passwort regelmäßig über die Profilseite zu erneuern. Ein starkes Passwort ist der beste Schutz für sensible Gesundheitsdaten.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>`,
			color: 'text-red-600 bg-red-50 border-red-100'
		},
		{
			id: 20,
			title: 'Druckfertiger PDF-Export',
			description: 'Jeder generierte Rechnungsentwurf lässt sich über das Dokumenten-Menü serverseitig als perfekt formatiertes, druckfertiges PDF herunterladen.',
			icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>`,
			color: 'text-blue-600 bg-blue-50 border-blue-100'
		}
	];
	// --- State ---
	let visibleTips = $state([...allTips]);

	// --- Action ---
	function dismissTip(id: number) {
		visibleTips = visibleTips.filter(tip => tip.id !== id);
	}
</script>

{#if visibleTips.length > 0}
	<div class="mb-8 w-full" in:fade={{duration: 300}}>
		<div class="flex justify-between items-end mb-4 px-1 w-full">
			<h2 class="text-base md:text-lg font-extrabold text-neutral-900 flex items-center gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				OrgaFlow Tipps
			</h2>
			<span class="text-[10px] md:text-xs font-bold text-neutral-400 uppercase tracking-widest">{visibleTips.length} verbleibend</span>
		</div>

		<div class="flex gap-4 overflow-x-auto custom-scrollbar pb-4 snap-x snap-mandatory hide-scroll-on-mobile w-full">
			{#each visibleTips as tip (tip.id)}
				<div 
					out:slide={{axis: 'x', duration: 300}} 
					class="relative min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px] bg-white border border-neutral-200 rounded-3xl p-5 md:p-6 shadow-sm snap-center shrink-0 flex flex-col group hover:shadow-md hover:border-neutral-300 transition-all"
				>
					<button 
						type="button" 
						aria-label="Tipp ausblenden" 
						onclick={() => dismissTip(tip.id)} 
						class="absolute top-4 right-4 p-1.5 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors opacity-70 group-hover:opacity-100 focus:outline-none"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>

					<div class="h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center border {tip.color} mb-4 shrink-0">
						<div class="h-5 w-5 md:h-6 md:w-6">{@html tip.icon}</div>
					</div>
					
					<h3 class="text-sm md:text-base font-extrabold text-neutral-900 mb-2 leading-tight pr-6">{tip.title}</h3>
					<p class="text-[11px] md:text-xs text-neutral-500 leading-relaxed font-medium flex-1">{tip.description}</p>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* Versteckt den Scrollbalken auf mobilen Geräten für einen sauberen Look, lässt ihn aber auf Desktop (für Mausbedienung) sichtbar. */
	@media (max-width: 768px) {
		.hide-scroll-on-mobile::-webkit-scrollbar {
			display: none;
		}
		.hide-scroll-on-mobile {
			-ms-overflow-style: none;  /* IE and Edge */
			scrollbar-width: none;  /* Firefox */
		}
	}
</style>