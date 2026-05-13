<script lang="ts">
	import { pb } from '$lib/services/pocketbase';
	import Login from '$lib/components/Login.svelte';
	import { loginUser } from '$lib/services/login';

	let { subtle = false } = $props<{ subtle?: boolean }>();

	let loginDialog: HTMLDialogElement;
	let logoutDialog: HTMLDialogElement;

	let isLoggedIn = $state(pb.authStore.isValid);
	let userEmail = $state(pb.authStore.model?.email || '');
	
	// Sichere Formatierung des Vor- und Nachnamens
	function getFullName(record: any) {
		return record ? `${record.name_first || ''} ${record.name_last || ''}`.trim() : '';
	}
	let userName = $state(getFullName(pb.authStore.model));
	let showLoginModal = $state(false);
	let showLogoutModal = $state(false);

	// Synchronisiere den State mit PocketBase
	$effect(() => {
		const unsubscribe = pb.authStore.onChange(() => {
			isLoggedIn = pb.authStore.isValid;
			userEmail = pb.authStore.model?.email || '';
			userName = getFullName(pb.authStore.model);
		});

		return unsubscribe;
	});

	// Modal-Steuerung
	$effect(() => {
		if (showLoginModal) {
			loginDialog?.showModal();
		} else {
			loginDialog?.close();
		}
	});

	$effect(() => {
		if (showLogoutModal) {
			logoutDialog?.showModal();
		} else {
			logoutDialog?.close();
		}
	});

	export async function handleLogin(email: string, pass: string) {
		const result = await loginUser(email, pass);
		if (result.success) {
			showLoginModal = false;
			// Erfolgreich eingeloggt, Modal schließen
		} else {
			// Fehler wird in der Login-Komponente angezeigt
		}
	}

	export function handleLogout() {
		pb.authStore.clear();
		showLogoutModal = false;
		// Der Layout-Guard leitet automatisch zu /login
	}

	export function openLoginModal() {
		showLoginModal = true;
	}

	export function openLogoutModal() {
		showLogoutModal = true;
	}

	export function closeModals() {
		showLoginModal = false;
		showLogoutModal = false;
	}
</script>

{#if isLoggedIn}
	<div class="flex items-center {subtle ? 'gap-2' : 'gap-4'}">
		<span class="text-sm {subtle ? 'text-neutral-500' : 'text-neutral-700 hidden md:inline'}">Eingeloggt als: {userName}</span>
		<button onclick={openLogoutModal} class="{subtle ? 'text-sm font-semibold hover:text-white transition-colors' : 'orga-button-ghost py-2.5 px-4 text-sm font-semibold'}">
			Abmelden
		</button>
	</div>
{:else}
	<button onclick={openLoginModal} class="{subtle ? 'text-sm font-medium text-neutral-500 hover:text-white transition-colors' : 'orga-button-primary'}">
		{subtle ? 'Mitarbeiter-Login' : 'Anmelden'}
	</button>
{/if}

<!-- Login Modal -->
<dialog bind:this={loginDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-md mx-auto my-auto rounded-3xl">
	<div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
		<button aria-label="Schließen" title="Schließen" onclick={closeModals} class="absolute top-5 right-5 w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center transition-colors">
			<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
		</button>
		<div class="mt-2">
			<Login handleLogin={handleLogin} isLoading={false} errorMsg="" />
		</div>
	</div>
</dialog>

<!-- Logout Modal -->
<dialog bind:this={logoutDialog} class="p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-sm w-full max-w-sm mx-auto my-auto rounded-3xl">
	<div class="bg-white rounded-3xl p-6 md:p-8 w-full relative">
			<h2 class="text-2xl font-bold text-neutral-900 mb-4">Abmelden</h2>
			<p class="mb-6">Sind Sie sicher, dass Sie sich abmelden möchten?</p>
			<div class="flex gap-4 justify-end">
				<button onclick={closeModals} class="orga-button-ghost">Abbrechen</button>
				<button onclick={handleLogout} class="orga-button-primary">Abmelden</button>
			</div>
	</div>
</dialog>