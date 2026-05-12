<script lang="ts">
	import { orgaStore } from "$lib/stores/orgaStore.svelte";
</script>

<div class="orga-dashboard-header animate-enter">
	<h1 class="orga-dashboard-title">Dashboard</h1>
	<p class="orga-dashboard-subtitle">Willkommen zurück! Hier ist Ihre aktuelle Übersicht.</p>
</div>

<div class="orga-dashboard-grid">
	<div class="orga-dashboard-card animate-enter delay-100">
		<h2 class="orga-dashboard-card-title"><span>📅</span> Aktuelle Termine</h2>
		<p class="orga-dashboard-card-text">Heute stehen keine Termine an.</p>
	</div>

	<div class="orga-dashboard-card animate-enter delay-200">
		<h2 class="orga-dashboard-card-title"><span>📋</span> Offene Aufgaben</h2>
		<p class="orga-dashboard-card-text">Keine offenen Aufgaben.</p>
	</div>

	<div class="orga-dashboard-card animate-enter delay-300">
		<h2 class="orga-dashboard-card-title"><span>🔔</span> Neue Updates</h2>
		<p class="orga-dashboard-card-text">Alles auf dem neuesten Stand.</p>
	</div>
</div>