<script lang="ts">
    import { useBwaService } from "$lib/services/bwaService.svelte";
    import { orgaStore } from "$lib/stores/orgaStore.svelte";

    const bwa = useBwaService();
</script>

<div class="orga-page-header animate-enter">
    <div>
        <h1 class="orga-page-title">BWA & Statistik</h1>
        <p class="orga-page-subtitle">Ihre betriebswirtschaftliche Auswertung, Umsätze und Leistungszahlen.</p>
    </div>
    <div class="flex items-center gap-3">
        <label for="year-select" class="text-sm font-semibold text-neutral-600">Geschäftsjahr:</label>
        <select id="year-select" bind:value={bwa.selectedYear} class="orga-input-clear py-2 w-32 cursor-pointer font-bold text-indigo-700 bg-white">
            {#each bwa.availableYears as year}
                <option value={year}>{year}</option>
            {/each}
        </select>
    </div>
</div>

{#if orgaStore.invoices?.isLoading || orgaStore.appointments?.isLoading}
    <div class="text-center py-12 text-neutral-500 font-medium animate-pulse animate-enter delay-100">Berechne Statistiken...</div>
{:else}
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 animate-enter delay-100">
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner shrink-0">💶</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Jahres-Umsatz</p>
                <p class="text-2xl font-black text-neutral-900">{bwa.yearlyStats.totals.revenueBrutto.toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner shrink-0">⏱️</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Leistungsstunden</p>
                <p class="text-2xl font-black text-neutral-900">{bwa.yearlyStats.totals.hours.toFixed(1).replace('.', ',')} h</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shadow-inner shrink-0">🚗</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Gefahrene Strecke</p>
                <p class="text-2xl font-black text-neutral-900">{bwa.yearlyStats.totals.km.toFixed(1).replace('.', ',')} km</p>
            </div>
        </div>
        <div class="orga-card-white p-6 flex items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl shadow-inner shrink-0">📉</div>
            <div>
                <p class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Ausgaben / Spesen</p>
                <p class="text-2xl font-black text-neutral-900">{bwa.yearlyStats.totals.expenses.toFixed(2).replace('.', ',')} €</p>
            </div>
        </div>
    </div>

    <!-- Datentabelle -->
    <div class="orga-card-white overflow-hidden animate-enter delay-200">
        <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left border-collapse min-w-[700px]">
                <thead class="bg-neutral-50/80 border-b border-neutral-100">
                    <tr>
                        <th class="p-4 font-bold text-neutral-800">Monat</th>
                        <th class="p-4 font-bold text-neutral-800 text-right">Geleistete Stunden</th>
                        <th class="p-4 font-bold text-neutral-800 text-right">Gefahrene KM</th>
                        <th class="p-4 font-bold text-neutral-800 text-right">Ausgaben</th>
                        <th class="p-4 font-bold text-indigo-700 text-right bg-indigo-50/30">Umsatz Brutto</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-neutral-50">
                    {#each bwa.yearlyStats.months as m}
                        <tr class="hover:bg-neutral-50/50 transition-colors">
                            <td class="p-4 font-semibold text-neutral-900">{m.month}</td>
                            <td class="p-4 text-neutral-600 text-right">{m.hours ? m.hours.toFixed(1).replace('.', ',') + ' h' : '-'}</td>
                            <td class="p-4 text-neutral-600 text-right">{m.km ? m.km.toFixed(1).replace('.', ',') + ' km' : '-'}</td>
                            <td class="p-4 text-rose-600 font-medium text-right">{m.expenses ? m.expenses.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                            <td class="p-4 text-indigo-700 font-bold text-right bg-indigo-50/10">{m.revenueBrutto ? m.revenueBrutto.toFixed(2).replace('.', ',') + ' €' : '-'}</td>
                        </tr>
                    {/each}
                    <tr class="bg-neutral-50 border-t-2 border-neutral-200">
                        <td class="p-4 font-black text-neutral-900">Jahres-Summe</td>
                        <td class="p-4 font-black text-neutral-900 text-right">{bwa.yearlyStats.totals.hours.toFixed(1).replace('.', ',')} h</td>
                        <td class="p-4 font-black text-neutral-900 text-right">{bwa.yearlyStats.totals.km.toFixed(1).replace('.', ',')} km</td>
                        <td class="p-4 font-black text-rose-600 text-right">{bwa.yearlyStats.totals.expenses.toFixed(2).replace('.', ',')} €</td>
                        <td class="p-4 font-black text-indigo-700 text-right bg-indigo-50/30 text-lg">{bwa.yearlyStats.totals.revenueBrutto.toFixed(2).replace('.', ',')} €</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
{/if}