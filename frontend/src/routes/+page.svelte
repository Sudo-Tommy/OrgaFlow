<script lang="ts">
	import LandingHeader from "$lib/components/LandingHeader.svelte";
	import LandingHero from "$lib/components/LandingHero.svelte";
	import LandingServices from "$lib/components/LandingServices.svelte";
	import LandingProcess from "$lib/components/LandingProcess.svelte";
	import LandingQuality from "$lib/components/LandingQuality.svelte";
	import LandingCooperation from "$lib/components/LandingCooperation.svelte";
	import LandingTeam from "$lib/components/LandingTeam.svelte";
	import LandingFaq from "$lib/components/LandingFaq.svelte";
	import LandingAppointmentForm from "$lib/components/LandingAppointmentForm.svelte";
	import LandingFooter from "$lib/components/LandingFooter.svelte";
</script>

<div class="orga-layout-wrapper text-neutral-900">
	<LandingHeader />
	
	<main class="flex-1 flex flex-col items-center w-full">
		<LandingHero />
		<LandingServices />
		<LandingProcess />
		<LandingQuality />
		<LandingCooperation />
		<LandingTeam />
		<LandingFaq />
		<LandingAppointmentForm />
	</main>

	<LandingFooter />
</div>
