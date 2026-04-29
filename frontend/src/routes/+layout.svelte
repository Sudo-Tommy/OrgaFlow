<script lang="ts">
	import "../app.css";
	import Menu from "$lib/components/Menu.svelte";
	import { pb } from "$lib/services/pocketbase";
	import { onMount } from "svelte";

	export const prerender = true;
	export const ssr = false;
	export const trailingSlash = 'always';

	let { children } = $props();

	// --- Svelte 5 Reactivity für den Login-Status ---
	let isLoggedIn = $state(pb.authStore.isValid);

	onMount(() => {
		// Hält den Status absolut synchron.
		const unsubscribe = pb.authStore.onChange(() => {
			isLoggedIn = pb.authStore.isValid;
		});
		return () => unsubscribe();
	});
</script>

{#snippet iconDashboard()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
{/snippet}

{#snippet iconProfile()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
{/snippet}

{#snippet iconClients()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
{/snippet}

{#snippet iconInsurance()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
{/snippet}

{#snippet iconCalendar()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
{/snippet}

{#snippet iconAdmin()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
{/snippet}

<div class="min-h-screen bg-neutral-50 text-neutral-900 font-sans antialiased selection:bg-indigo-500/30 flex flex-col relative">
	
	{#if isLoggedIn}
		{@const navItems = [
			{ label: 'Dashboard', href: '/dashboard', icon: iconDashboard },
			{ label: 'Termine', href: '/appointments', icon: iconCalendar },
			{ label: 'Klienten', href: '/clients', icon: iconClients },
			{ label: 'Krankenkassen', href: '/insurancies', icon: iconInsurance },
			{ label: 'Firmendaten', href: '/company', icon: iconClients },
			{ label: 'Dokumente', href: '/documents', icon: iconInsurance }, // Du kannst hier das Insurance-Icon oder ein eigenes Dokument-Icon verwenden
			{ label: 'Kontakte', href: '/contacts', icon: iconProfile },
			{ label: 'Mein Profil', href: '/profile', icon: iconProfile },
			{ label: 'System-Admin', href: '/admin', icon: iconAdmin, roles: ['admin'] }
		]}
		<Menu items={navItems} />
	{/if}

	<div class="relative w-dull h-full flex-1 flex flex-col">
		{@render children()}
	</div>
</div>