<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/services/pocketbase'; 
	import { toastService } from '$lib/services/toast.d.svelte'; 
	import { goto } from '$app/navigation';

	import logo from '$lib/assets/logo_heart.png';

	// --- State ---
	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);

	// --- Dynamische Begrüßung ---
	const currentHour = new Date().getHours();
	let greeting = $state('Willkommen');

	if (currentHour >= 5 && currentHour < 12) {
		greeting = 'Guten Morgen';
	} else if (currentHour >= 12 && currentHour < 18) {
		greeting = 'Guten Tag';
	} else if (currentHour >= 18 && currentHour < 23) {
		greeting = 'Guten Abend';
	} else {
		greeting = 'Gute Nacht';
	}

	onMount(() => {
		// Falls der Nutzer bereits einen gültigen Token hat, direkt weiterleiten
		if (pb.authStore.isValid) {
			goto('/dashboard');
		}
	});

	async function handleLogin(event: SubmitEvent) {
		event.preventDefault();
		
		if (isLoading) return;
		isLoading = true;

		try {
			await pb.collection('users').authWithPassword(email, password);
			// Persönliche Begrüßung beim erfolgreichen Login!
			toastService.success(`${greeting}! Login erfolgreich.`);
			goto('/dashboard');
		} catch (error: any) {
			console.error('Login Error:', error);
			if (error?.status === 400) {
				toastService.error('E-Mail oder Passwort ist falsch.');
			} else {
				toastService.error('Login fehlgeschlagen. Bitte Server-Verbindung prüfen.');
			}
			pb.authStore.clear();
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen w-full flex flex-col items-center justify-center bg-neutral-50 p-4 relative overflow-hidden">
	
	<div class="absolute -top-32 -left-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none"></div>
	<div class="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none"></div>

	<div class="bg-white/80 backdrop-blur-xl border border-neutral-200 p-8 md:p-10 rounded-3xl shadow-xl max-w-md w-full relative z-10">
		
		<div class="mb-10 text-center">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 mb-6 shadow-sm p-3">
				<img src={logo} alt="OrgaFlow Logo" class="w-full h-full object-contain" />
			</div>
		
			<h1 class="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight">{greeting}!</h1>
			<p class="text-indigo-600 font-extrabold tracking-widest uppercase text-[10px] mt-3">OrgaFlow • Seniorenassistenz</p>
			<p class="text-neutral-400 font-bold tracking-widest uppercase text-[9px] mt-1">by Tommy Jenzsch</p>
		</div>
			
		<form onsubmit={handleLogin} class="space-y-6">
			<div>
				<label for="email" class="block text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">E-Mail Adresse</label>
				<input 
					id="email"
					type="email" 
					bind:value={email} 
					placeholder="name@beispiel.de"
					class="orga-input-clear py-3.5! px-4! w-full rounded-2xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner text-sm"
					required 					
				/>
			</div>

			<div>
				<label for="password" class="flex items-center justify-between text-xs font-extrabold text-neutral-500 uppercase tracking-widest mb-1.5">
					<span>Passwort</span>
					<button type="button" aria-label="Passwort vergessen" class="text-indigo-500 hover:text-indigo-700 text-[10px] font-bold transition-colors focus:outline-none">
						Vergessen?
					</button>
				</label>
				<input 
					id="password"
					type="password" 
					bind:value={password} 
					placeholder="••••••••"
					class="orga-input-clear py-3.5! px-4! w-full rounded-2xl bg-neutral-50 border border-neutral-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner text-sm"
					required 
				/>
			</div>

			<div class="pt-4">
				<button 
					type="submit" 
					disabled={isLoading || !email || !password}
					aria-label="Einloggen"
					class="orga-button-primary w-full py-3.5! flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 text-xs! sm:text-sm! uppercase tracking-widest font-extrabold transition-all disabled:opacity-50"
				>
					{#if isLoading}
						<div class="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
						Wird eingeloggt...
					{:else}
						Sicher Einloggen
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" /></svg>
					{/if}
				</button>
			</div>
		</form>

		<div class="mt-8 text-center border-t border-neutral-100 pt-6">
			<p class="text-[10px] text-neutral-400 font-medium leading-relaxed">
				&copy; {new Date().getFullYear()} Seniorenassistenz Jenzsch.<br/>
				Gesicherter Systemzugriff.
			</p>
		</div>
	</div>
</div>