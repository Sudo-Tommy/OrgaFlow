<script lang="ts">
	import Login from "$lib/components/Login.svelte";
	import { loginUser } from "$lib/services/login";
	import { goto } from "$app/navigation";

	let isLoading = $state(false);
	let errorMsg = $state("");

	async function onLogin(email: string, pass: string) {
		isLoading = true;
		errorMsg = "";

		const result = await loginUser(email, pass);

		if (result.success) {
			// Bei erfolgreichem Login aufs Dashboard weiterleiten
			goto("/dashboard");
		} else {
			errorMsg = result.error || "Ein unbekannter Fehler ist aufgetreten.";
		}

		isLoading = false;
	}
</script>

<svelte:head>
	<title>Anmelden - OrgaFlow</title>
</svelte:head>

<!-- Die Flex-Container-Klassen zentrieren die Login-Card vertikal und horizontal auf der restlichen leeren Fläche -->
<div class="flex-1 flex items-center justify-center p-4">
	<Login handleLogin={onLogin} {isLoading} {errorMsg} />
</div>