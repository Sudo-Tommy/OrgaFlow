<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	let { items } = $props<{
		items: Array<{ label: string; href: string; icon: Snippet; roles?: string[] }>;
	}>();

	let currentPath = $derived($page.url.pathname);
</script>

<aside class="w-64 bg-neutral-950 text-neutral-400 flex-col border-r border-neutral-900 hidden md:flex">
	<div class="p-6 mb-4">
		<h2 class="text-white font-bold text-2xl tracking-tight">OrgaFlow</h2>
		<p class="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Seniorenassistenz</p>
	</div>
	<nav class="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pb-6">
		{#each items as item}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 font-medium group {currentPath.startsWith(item.href) ? 'bg-indigo-500/15 text-indigo-300 shadow-inner' : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100'}"
			>
				<span class="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 {currentPath.startsWith(item.href) ? 'text-indigo-400' : ''}">
					{@render item.icon()}
				</span>
				{item.label}
			</a>
		{/each}
	</nav>
</aside>