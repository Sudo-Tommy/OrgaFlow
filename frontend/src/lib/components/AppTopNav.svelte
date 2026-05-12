<script lang="ts">
	import LoginLogout from "$lib/components/LoginLogout.svelte";
	import { page } from "$app/stores";
	import { slide } from "svelte/transition";
	import type { Snippet } from "svelte";

	let { items = [] } = $props<{
		items?: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
	}>();

	let currentPath = $derived($page.url.pathname);
	let isMobileMenuOpen = $state(false);

	function toggleMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}
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
		
		<div class="flex items-center gap-4">
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