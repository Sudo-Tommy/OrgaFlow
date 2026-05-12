<script lang="ts">
	let { handleLogin, isLoading = false, errorMsg = "" } = $props<{
		handleLogin: (email: string, pass: string) => void;
		isLoading?: boolean;
		errorMsg?: string;
	}>();

	let email = $state("");
	let password = $state("");

	function onSubmit(e: Event) {
		e.preventDefault();
		if (email && password) {
			handleLogin(email, password);
		}
	}
</script>

<!-- Wrapper entfernt sein eigenes Styling, da die Komponente in ein <dialog> injiziert wird -->
<div class="w-full">
	<h2 class="text-2xl font-bold text-neutral-900 text-center mb-6">Willkommen zurück</h2>

	{#if errorMsg}
		<div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
			{errorMsg}
		</div>
	{/if}

	<form onsubmit={onSubmit} class="flex flex-col gap-5">
		<div>
			<label for="email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				placeholder="mail@beispiel.de"
				class="orga-input-clear"
				autocomplete="username"
				required
				disabled={isLoading}
			/>
		</div>

		<div>
			<label for="password" class="block text-sm font-semibold text-neutral-700 mb-1.5">Passwort</label>
			<input 
				id="password" 
				type="password" 
				bind:value={password} 
				placeholder="••••••••" 
				class="orga-input-clear" 
				autocomplete="current-password"
				required 
				disabled={isLoading} 
			/>
		</div>

		<button type="submit" class="orga-button-primary mt-2" disabled={isLoading}>
			{isLoading ? "Wird angemeldet..." : "Anmelden"}
		</button>
	</form>
</div>