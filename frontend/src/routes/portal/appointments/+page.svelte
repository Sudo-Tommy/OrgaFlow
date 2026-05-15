<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    
    let appointments = $state<any[]>([]);
    let isLoading = $state(true);
    let errorMsg = $state("");

    // Dynamischer API-Wächter für lokale und Live-Tests
    const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

    onMount(async () => {
        const token = localStorage.getItem('portal_token');
        if (!token) {
            goto('/portal');
            return;
        }

        try {
            const res = await fetch(`${apiBaseUrl}/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('portal_token');
                goto('/portal');
                return;
            }

            if (!res.ok) throw new Error("Fehler beim Laden der Termine.");
            
            const data = await res.json();
            appointments = data.appointments || [];
        } catch (err: any) {
            errorMsg = err.message;
        } finally {
            isLoading = false;
        }
    });
</script>

<svelte:head><title>Meine Termine - Klienten-Portal</title></svelte:head>

<div class="w-full max-w-4xl mx-auto h-full flex flex-col pt-4 sm:pt-6 animate-enter">
    <div class="mb-8">
        <h1 class="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">Meine geplanten Termine</h1>
        <p class="text-neutral-500">Ihre zukünftigen und die zuletzt stattgefundenen Termine im Überblick.</p>
    </div>

    {#if isLoading}
        <div class="flex-1 flex flex-col items-center justify-center py-20 animate-pulse">
            <div class="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
            <p class="text-neutral-500 font-medium">Lade Termine...</p>
        </div>
    {:else if errorMsg}
        <div class="bg-rose-50 text-rose-700 p-6 rounded-2xl border border-rose-200 text-center shadow-sm">
            <span class="text-3xl block mb-2">⚠️</span>
            <p class="font-bold">{errorMsg}</p>
        </div>
    {:else if appointments.length === 0}
        <div class="bg-white border border-neutral-200 rounded-3xl p-12 text-center shadow-sm">
            <span class="text-5xl block mb-4 opacity-50">📅</span>
            <h3 class="text-xl font-bold text-neutral-900 mb-2">Keine Termine gefunden</h3>
            <p class="text-neutral-500">Es sind aktuell keine zukünftigen Termine für Sie geplant.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-4 pb-12">
            {#each appointments as app}
                <div class="bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center transition-all hover:shadow-md hover:border-brand-200">
                    <div class="flex flex-col items-center justify-center bg-brand-50 text-brand-700 rounded-xl w-16 h-16 shrink-0 border border-brand-100 shadow-inner">
                        <span class="text-xs font-bold uppercase tracking-wider">{new Date(app.appointment).toLocaleDateString('de-DE', { month: 'short' })}</span>
                        <span class="text-2xl font-black leading-none">{new Date(app.appointment).getDate()}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-3 mb-1">
                            <span class="text-sm font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-100 shrink-0">
                                {new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </span>
                            {#if new Date(app.appointment).getTime() < new Date().getTime()}
                                <span class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-100 px-2 py-0.5 rounded-md shrink-0">Vergangen</span>
                            {/if}
                        </div>
                        <h3 class="text-lg font-bold text-neutral-900 mt-2 truncate">{app.description || 'Betreuungstermin'}</h3>
                        <p class="text-sm text-neutral-500 mt-1">Ihre Seniorenassistenz</p>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>
