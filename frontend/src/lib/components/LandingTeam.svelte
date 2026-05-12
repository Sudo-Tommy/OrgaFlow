<script lang="ts">
    import { getTeamMembers } from "$lib/services/landingContentService";
    import { callPhone } from "$lib/services/navigationService";
    const team = getTeamMembers();
</script>

<div class="w-full bg-neutral-100 py-20 px-4 border-y border-neutral-200">
    <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Ihre Ansprechpartner vor Ort</h2>
            <p class="text-lg text-neutral-500">Persönliche Betreuung fängt bei einem bekannten Gesicht an. Rufen Sie uns einfach unverbindlich an.</p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {#each team as member}
                <div class="orga-card-white p-8 text-center flex flex-col items-center">
                    <div class="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
                        {member.initial}
                    </div>
                    <h3 class="text-2xl font-bold mb-1">{member.name}</h3>
                    <p class="text-neutral-500 font-medium mb-6">Zuständig für {member.region}</p>
                    <button onclick={() => callPhone(member.phone)} class="orga-button-primary w-full shadow-none text-lg">📞 {member.phone}</button>
                </div>
            {/each}
        </div>
    </div>
</div>