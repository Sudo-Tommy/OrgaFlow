<script lang="ts">
	import LoginLogout from "$lib/components/LoginLogout.svelte";
	import { page } from "$app/stores";
	import { slide } from "svelte/transition";
	import type { Snippet } from "svelte";
	import { getMailboxService } from "$lib/services/mailboxService.svelte";
	import { useRequestAdmin } from "$lib/services/requestAdminService.svelte";
	import { onMount, onDestroy } from "svelte";

	let { items = [] } = $props<{
		items?: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
	}>();

	let currentPath = $derived($page.url.pathname);
	let isMobileMenuOpen = $state(false);

	function toggleMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	const mailboxService = getMailboxService();
	const reqAdmin = useRequestAdmin();
	
	let isNotificationsOpen = $state(false);

	onMount(() => {
		// Initialer Ladevorgang für Badge-Counts im Hintergrund
		mailboxService.loadFolders();
		reqAdmin.init();
	});

	onDestroy(() => {
		reqAdmin.cleanup();
	});

	let unreadMails = $derived(mailboxService.totalUnread || 0);
	let pendingRequests = $derived(reqAdmin.requests.filter(r => r.status === 'requested').length);
	let totalNotifications = $derived(unreadMails + pendingRequests);
</script>

<!-- Kopfzeile mit dynamischem Einbezug der Safe-Area (iPhone Notch etc.) via CSS env() -->
<header class="bg-white/90 backdrop-blur-md border-b border-neutral-200/60 px-4 md:px-6 flex flex-col z-30 sticky top-0 transition-all pt-[max(env(safe-area-inset-top,0px),0.75rem)] md:pt-[max(env(safe-area-inset-top,0px),1rem)]">
	<div class="flex items-center justify-between pb-3 md:pb-4 w-full">
		<div class="flex items-center gap-3">
			<!-- Hamburger Icon nur auf Mobile -->
			<button 
				aria-label={isMobileMenuOpen ? "Menü schließen" : "Menü öffnen"} 
				class="md:hidden p-2 -ml-2 text-neutral-600 hover:text-indigo-600 rounded-xl hover:bg-neutral-100 transition-all active:scale-95"
				onclick={toggleMenu}
			>
				<svg class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					{#if isMobileMenuOpen}
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>
			
			<!-- Logo auf Mobile anzeigen, da die Sidebar ja ausgeblendet ist -->
			<div class="md:hidden flex items-center gap-1.5 font-bold tracking-tight text-neutral-900 text-xl">
				OrgaFlow
			</div>
		</div>
		
		<div class="flex items-center gap-2 sm:gap-4">
			<!-- Benachrichtigungs-Glocke -->
			<div class="relative flex items-center">
				<button 
					class="p-2 text-neutral-500 hover:text-indigo-600 transition-colors relative rounded-full hover:bg-neutral-100 outline-none"
					onclick={() => isNotificationsOpen = !isNotificationsOpen}
					aria-label="Benachrichtigungen"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
					</svg>
					{#if totalNotifications > 0}
						<span class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
						</span>
					{/if}
				</button>

				{#if isNotificationsOpen}
					<!-- Backdrop zum Schließen beim Klicken ins Leere -->
					<button class="fixed inset-0 w-full h-full cursor-default z-40" onclick={() => isNotificationsOpen = false} tabindex="-1" aria-label="Schließen"></button>
					
					<div class="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50 animate-enter">
						<div class="p-4 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center">
							<h3 class="font-bold text-neutral-900">Benachrichtigungen</h3>
							{#if totalNotifications > 0}
								<span class="text-xs font-bold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">{totalNotifications}</span>
							{/if}
						</div>
						<div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
							{#if totalNotifications === 0}
								<div class="p-8 text-center flex flex-col items-center justify-center">
									<span class="text-3xl mb-3 opacity-50">✨</span>
									<p class="text-sm font-semibold text-neutral-900">Alles erledigt!</p>
									<p class="text-xs text-neutral-500 mt-1">Du hast keine neuen Benachrichtigungen.</p>
								</div>
							{:else}
								<div class="flex flex-col">
									{#if unreadMails > 0}
										<a href="/dashboard" onclick={() => isNotificationsOpen = false} class="p-4 border-b border-neutral-50 hover:bg-neutral-50 transition-colors flex items-start gap-3 cursor-pointer">
											<div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">✉️</div>
											<div>
												<p class="text-sm font-bold text-neutral-900">{unreadMails} ungelesene E-Mail{unreadMails > 1 ? 's' : ''}</p>
												<p class="text-xs text-neutral-500 mt-0.5">Posteingang überprüfen.</p>
											</div>
										</a>
									{/if}
									{#if pendingRequests > 0}
										<a href="/dashboard" onclick={() => isNotificationsOpen = false} class="p-4 hover:bg-neutral-50 transition-colors flex items-start gap-3 cursor-pointer">
											<div class="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 shadow-inner">📬</div>
											<div>
												<p class="text-sm font-bold text-neutral-900">{pendingRequests} Terminanfrage{pendingRequests > 1 ? 'n' : ''}</p>
												<p class="text-xs text-neutral-500 mt-0.5">Neu auf dem Dashboard eingetroffen.</p>
											</div>
										</a>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<LoginLogout />
		</div>
	</div>

	<!-- Aufklappbares Mobile Menü, klebt nahtlos unter dem Header -->
	{#if isMobileMenuOpen}
		<nav transition:slide={{ duration: 250, axis: 'y' }} class="md:hidden border-t border-neutral-200/60 py-4 w-full bg-white/95 backdrop-blur-xl absolute top-full left-0 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-b-3xl">
			<!-- Kompaktes Grid-Layout wie auf dem Homescreen von Handys, um vertikalen Platz massiv zu sparen -->
			<div class="grid grid-cols-3 sm:grid-cols-4 gap-2 px-4 max-h-[70vh] overflow-y-auto custom-scrollbar pb-2">
				{#each items as item}
					<a
						href={item.href}
						class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl transition-all font-semibold text-[10px] sm:text-xs text-center {currentPath.startsWith(item.href) ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 ring-1 ring-indigo-500/10' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 border border-transparent'}"
						onclick={() => isMobileMenuOpen = false}
					>
						<span class="w-6 h-6 shrink-0 {currentPath.startsWith(item.href) ? 'text-indigo-600' : 'opacity-70'}">
							{@render item.icon()}
						</span>
						<span class="truncate w-full mt-1">{item.label}</span>
					</a>
				{/each}
			</div>
		</nav>
	{/if}
</header>

<!-- Backdrop (Der abgedunkelte Hintergrund). Ein Klick daneben schließt das Menü -->
{#if isMobileMenuOpen}
	<!-- z-20 unterhalb der z-30 header -->
	<button aria-label="Menü schließen" class="fixed inset-0 bg-neutral-900/10 backdrop-blur-sm z-20 md:hidden block" onclick={toggleMenu}></button>
{/if}