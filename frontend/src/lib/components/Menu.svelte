<script lang="ts">
	import { page } from '$app/state';
	import { pb } from '$lib/services/pocketbase'; 
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte'; // NEU: Strikte Typisierung für Svelte 5 Snippets
	import MenuButton from '$lib/assets/menu.png';

	// --- Interfaces ---
	export interface NavItem {
		label: string;
		href: string;
		icon?: Snippet; // Svelte 5 Snippet Type statt 'any'
		roles?: string[]; // RBAC - Welche Rollen dürfen diesen Punkt sehen?
	}

	// --- Props ---
	let { items = [] } = $props<{ items: NavItem[] }>();

	// --- State ---
	let isOpen = $state(false);

	// --- Derived & RBAC ---
	const currentUser = pb.authStore.model;
	const userRole = $derived(currentUser?.role || 'guest');
	const activePath = $derived(page.url.pathname);

	// Filtert die Navigation basierend auf den Rollen
	const visibleItems = $derived(
		items.filter(item => {
			if (!item.roles || item.roles.length === 0) return true;
			return item.roles.includes(userRole);
		})
	);

	// --- Actions ---
	const toggleSidebar = () => {
		isOpen = !isOpen;
	};

	const logout = () => {
		pb.authStore.clear();
		goto('/');
	};
</script>

<button
	type="button"
	onclick={toggleSidebar}
	class="fixed top-5 left-5 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg hover:shadow-xl active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/30 md:hidden"
	aria-label={isOpen ? "Menü schließen" : "Menü öffnen"}
>
	<img class="h-6 w-6 object-contain" src={MenuButton} alt="Menu Icon">
</button>

<aside
	class="fixed inset-y-0 left-0 z-40 bg-white border-r border-neutral-200 transition-all duration-300 ease-in-out flex flex-col shadow-2xl md:shadow-none
	{isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-72 md:w-20 lg:w-72"
>
	<div class="h-24 flex items-center px-6 md:px-0 lg:px-8 border-b border-neutral-100 shrink-0 md:justify-center lg:justify-start">
		
		<div class="block md:hidden lg:block w-full">
			<h1 class="text-3xl font-extrabold tracking-tight text-neutral-900">
				Orga<span class="text-indigo-600">Flow</span>
			</h1>
			<p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Seniorenassistenz</p>
		</div>

		<div class="hidden md:flex lg:hidden justify-center w-full">
			<div class="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/30">
				OF
			</div>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto custom-scrollbar py-6 flex flex-col gap-2 px-4 md:px-2 lg:px-4">
		{#each visibleItems as item}
			{@const isActive = activePath === item.href || (item.href !== '/' && activePath.startsWith(item.href))}
			
			<a
				href={item.href}
				onclick={() => (isOpen = false)}
				title={item.label}
				class="group flex items-center rounded-2xl px-4 md:px-0 lg:px-4 py-3.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 relative
				{isActive 
					? 'bg-indigo-50 text-indigo-700 font-extrabold' 
					: 'text-neutral-500 font-bold hover:bg-neutral-50 hover:text-neutral-900'}"
			>
				{#if isActive}
					<div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full block md:hidden lg:block"></div>
				{/if}

				{#if item.icon}
					<span class="flex items-center justify-center w-6 h-6 shrink-0 md:mx-auto lg:mx-0 transition-colors {isActive ? 'text-indigo-600' : 'opacity-70 group-hover:opacity-100'}">
						{@render item.icon()}
					</span>
				{/if}
				
				<span class="ml-3 block md:hidden lg:block truncate text-sm">
					{item.label}
				</span>
			</a>
		{/each}
	</nav>
	
	<div class="p-4 md:p-2 lg:p-4 border-t border-neutral-100 bg-neutral-50/50">
		<button 
			type="button"
			onclick={logout}
			title="Abmelden"
			class="w-full flex items-center justify-start md:justify-center lg:justify-start px-4 md:px-0 lg:px-4 py-3.5 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
		>
			<svg class="w-5 h-5 shrink-0 md:mx-auto lg:mx-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
			</svg>
			<span class="ml-3 block md:hidden lg:block">Abmelden</span>
		</button>
		
		<div class="mt-4 hidden lg:block text-[10px] text-neutral-400 font-bold uppercase tracking-widest text-center">
			OrgaFlow v1.0
		</div>
	</div>
</aside>

{#if isOpen}
	<button 
		type="button"
		aria-label="Menü schließen"
		onclick={() => (isOpen = false)}
		onkeydown={(e) => { if (e.key === 'Escape') isOpen = false; }}
		class="fixed inset-0 z-30 w-full h-full bg-neutral-900/40 backdrop-blur-sm transition-opacity cursor-default border-none outline-none md:hidden"
	></button>
{/if}