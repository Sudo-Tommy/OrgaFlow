<script lang="ts">
    let { appointments = [], clients = [], onNewAppointment } = $props<{ appointments: any[], clients: any[], onNewAppointment?: (date: Date) => void }>();

    let viewMode = $state<"month" | "week">("month");
    let currentDate = $state(new Date());
    let selectedDate = $state<Date | null>(new Date());
    let selectedClientId = $state<string>("all");

    // Filtert die Termine basierend auf dem gewählten Klienten
    let filteredAppointments = $derived.by(() => {
        if (selectedClientId === "all") return appointments;
        return appointments.filter((app: any) => {
            if (!app.client) return false;
            if (Array.isArray(app.client)) return app.client.includes(selectedClientId);
            return app.client === selectedClientId;
        });
    });

    function isSameDay(d1: Date, d2: Date) {
        return d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    }

    function getAppsForDate(date: Date): any[] {
        return filteredAppointments.filter((app: any) => {
            if (!app.appointment) return false;
            return isSameDay(new Date(app.appointment), date);
        }).sort((a: any, b: any) => new Date(a.appointment).getTime() - new Date(b.appointment).getTime());
    }

    // Berechnet das Raster (Grid) für den Kalender
    let calendarDays = $derived.by(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        const days = [];

        if (viewMode === "month") {
            const firstDay = new Date(y, m, 1);
            let startDay = firstDay.getDay();
            if (startDay === 0) startDay = 7;
            startDay -= 1;

            const prevMonthLastDay = new Date(y, m, 0).getDate();
            for (let i = startDay - 1; i >= 0; i--) {
                const d = new Date(y, m - 1, prevMonthLastDay - i);
                days.push({ date: d, isCurrentMonth: false, apps: getAppsForDate(d) });
            }
            const lastDay = new Date(y, m + 1, 0).getDate();
            for (let i = 1; i <= lastDay; i++) {
                const d = new Date(y, m, i);
                days.push({ date: d, isCurrentMonth: true, apps: getAppsForDate(d) });
            }
            const remaining = 42 - days.length;
            for (let i = 1; i <= remaining; i++) {
                const d = new Date(y, m + 1, i);
                days.push({ date: d, isCurrentMonth: false, apps: getAppsForDate(d) });
            }
        } else {
            // Wochenansicht
            const monday = new Date(currentDate);
            const day = monday.getDay();
            const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
            monday.setDate(diff);
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push({ date: d, isCurrentMonth: d.getMonth() === m, apps: getAppsForDate(d) });
            }
        }
        return days;
    });

    let selectedDayAppointments = $derived.by(() => {
        if (!selectedDate) return [];
        return getAppsForDate(selectedDate);
    });

    // Navigation
    function next() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (viewMode === 'month' ? 1 : 0), currentDate.getDate() + (viewMode === 'week' ? 7 : 0));
    }
    function prev() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - (viewMode === 'month' ? 1 : 0), currentDate.getDate() - (viewMode === 'week' ? 7 : 0));
    }
    function today() {
        currentDate = new Date();
        selectedDate = new Date();
    }
    function selectDay(date: Date) {
        selectedDate = date;
    }

    let monthName = $derived(currentDate.toLocaleString('de-DE', { month: 'long' }));
    let year = $derived(currentDate.getFullYear());
    const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    // --- Wochenansicht Styling-Berechnungen ---
    const HOUR_HEIGHT = 64; // Höhe einer Stunde in Pixeln (entspricht h-16)

    function getAppTop(app: any) {
        if (!app.appointment) return 0;
        const d = new Date(app.appointment);
        return (d.getHours() * HOUR_HEIGHT) + ((d.getMinutes() / 60) * HOUR_HEIGHT);
    }

    function getAppHeight(app: any) {
        let durationMinutes = 60; // Standardmäßig 1 Stunde Platzbedarf
        // Wenn eine Zeiterfassung vorliegt, die echte Dauer berechnen!
        if (app.expand?.time_record?.[0]?.start && app.expand?.time_record?.[0]?.end) {
            const diffMs = new Date(app.expand.time_record[0].end).getTime() - new Date(app.expand.time_record[0].start).getTime();
            if (diffMs > 0) durationMinutes = Math.round(diffMs / 60000);
        }
        return Math.max(30, durationMinutes) / 60 * HOUR_HEIGHT - 2; // Mindestens 30 Min hoch, -2px für Abstand
    }
</script>

<div class="orga-calendar-wrapper">
    <!-- Toolbar -->
    <div class="orga-calendar-toolbar">
        <div class="flex items-center gap-2">
            <button onclick={today} class="px-3 py-1.5 text-sm font-bold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-lg shadow-sm transition-colors">Heute</button>
            <div class="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 shadow-sm">
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button onclick={prev} class="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg></button>
                <span class="w-28 text-center font-bold text-neutral-800 text-sm">{monthName} {year}</span>
                <!-- svelte-ignore a11y_consider_explicit_label -->
                <button onclick={next} class="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg></button>
            </div>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3">
            <!-- Ansicht-Toggle -->
            <div class="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 shadow-inner shrink-0">
                <button onclick={() => viewMode = 'month'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {viewMode === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Monat</button>
                <button onclick={() => viewMode = 'week'} class="px-3 py-1 text-xs font-bold rounded-md transition-colors {viewMode === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'}">Woche</button>
            </div>
            <!-- Klienten-Filter -->
            <select bind:value={selectedClientId} class="bg-white border border-neutral-200 text-sm font-semibold text-neutral-700 rounded-lg px-3 py-1.5 shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full sm:w-auto cursor-pointer">
                <option value="all">Alle Klienten</option>
                {#each clients as c (c.id)}
                    <option value={c.id}>{c.name_first} {c.name_last}</option>
                {/each}
            </select>
        </div>
    </div>

    {#if viewMode === 'month'}
        <!-- === MONATSANSICHT === -->
        <div class="orga-calendar-header">
            {#each weekdays as day}
                <div class="py-2.5 text-center text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider border-r border-neutral-100 last:border-0">{day}</div>
            {/each}
        </div>

        <div class="orga-calendar-grid">
            {#each calendarDays as day}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div onclick={() => selectDay(day.date)} class="orga-calendar-day group md:min-h-30 lg:min-h-35 {selectedDate && isSameDay(day.date, selectedDate) ? 'ring-2 ring-inset ring-indigo-500 z-10' : ''} {!day.isCurrentMonth ? 'opacity-50' : ''}">
                    <div class="flex justify-between items-start w-full">
                        <button onclick={(e) => { e.stopPropagation(); onNewAppointment?.(day.date); }} class="hidden md:flex w-6 h-6 mt-0.5 ml-0.5 items-center justify-center text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Neuer Termin">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <span class="w-6 h-6 sm:w-7 sm:h-7 mx-auto sm:mx-0 sm:ml-auto flex items-center justify-center text-[10px] sm:text-xs font-bold rounded-full {isSameDay(day.date, new Date()) ? 'bg-indigo-600 text-white shadow-md' : 'text-neutral-700'}">
                            {day.date.getDate()}
                        </span>
                    </div>
                    <!-- Mobile Variante: Nur farbige Punkte -->
                    <div class="flex md:hidden flex-wrap gap-1 justify-center sm:justify-end mt-1.5 px-0.5">
                        {#each day.apps.slice(0, 4) as app}
                            <span class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm {app.is_private ? 'bg-rose-500' : 'bg-indigo-500'}" title={app.description || 'Termin'}></span>
                        {/each}
                        {#if day.apps.length > 4}
                            <span class="text-[8px] font-bold text-neutral-400">+{day.apps.length - 4}</span>
                        {/if}
                    </div>
                    <!-- Desktop Variante: Echte Terminkarten im Tages-Feld -->
                    <div class="hidden md:flex flex-col gap-1.5 mt-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 pb-0.5">
                        {#each day.apps as app}
                            <a href="/appointments/{app.id}" class="block px-2 py-1.5 rounded-lg border border-transparent shadow-sm hover:shadow-md transition-all hover:-translate-y-px {app.is_private ? 'bg-rose-50 hover:border-rose-200 text-rose-800' : 'bg-indigo-50 hover:border-indigo-200 text-indigo-800'}" title={app.description}>
                                <div class="flex items-center gap-1 mb-0.5">
                                    <span class="font-bold text-[11px] leading-none">{new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {#if app.is_private}<span class="text-[9px]">🔒</span>{/if}
                                </div>
                                <div class="text-xs font-semibold truncate text-neutral-900">{app.expand?.client?.[0] ? app.expand.client[0].name_first + ' ' + app.expand.client[0].name_last : 'Kein Klient'}</div>
                                <div class="text-[10px] truncate opacity-80 mt-0.5">{app.description || 'Termin'}</div>
                            </a>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <!-- === WOCHENANSICHT (Stunden-Raster) === -->
        <div class="flex border-b border-neutral-100 bg-neutral-50/80 z-20 sticky top-0">
            <div class="w-12 sm:w-16 flex-none border-r border-neutral-100"></div>
            <div class="flex-1 grid grid-cols-7">
                {#each calendarDays as day, i}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div onclick={() => selectDay(day.date)} class="py-2 text-center border-r border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-100 transition-colors {selectedDate && isSameDay(day.date, selectedDate) ? 'bg-indigo-50/50' : ''}">
                        <div class="text-[10px] sm:text-xs font-bold {isSameDay(day.date, new Date()) ? 'text-indigo-500' : 'text-neutral-500'} uppercase tracking-wider">{weekdays[i]}</div>
                        <div class="text-sm sm:text-base font-bold {isSameDay(day.date, new Date()) ? 'text-indigo-600' : 'text-neutral-900'}">{day.date.getDate()}</div>
                    </div>
                {/each}
            </div>
        </div>
        
        <div class="flex overflow-y-auto custom-scrollbar relative h-125 md:h-150 bg-white">
            <div class="w-12 sm:w-16 flex-none border-r border-neutral-100 bg-neutral-50 sticky left-0 z-20">
                {#each Array(24) as _, hour}
                    <div class="h-16 border-b border-neutral-100 text-right pr-1 sm:pr-2 pt-1 text-[10px] sm:text-xs text-neutral-400 font-medium">{hour}:00</div>
                {/each}
            </div>
            <div class="flex-1 relative h-384">
                <div class="absolute inset-0 flex flex-col pointer-events-none z-0">
                    {#each Array(24) as _, hour}
                        <div class="h-16 border-b border-neutral-100 w-full shrink-0"></div>
                    {/each}
                </div>
                <div class="absolute inset-0 grid grid-cols-7 z-10">
                    {#each calendarDays as day}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div onclick={() => selectDay(day.date)} class="relative border-r border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50/30 transition-colors {selectedDate && isSameDay(day.date, selectedDate) ? 'bg-indigo-50/20' : ''}">
                            {#each day.apps as app}
                                <a href="/appointments/{app.id}" class="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md p-1 sm:p-1.5 text-[10px] sm:text-xs overflow-hidden transition-all border shadow-sm hover:shadow-md hover:z-20 {app.is_private ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}" style="top: {getAppTop(app)}px; height: {getAppHeight(app)}px;" title={app.description}>
                                    <div class="font-bold flex items-center gap-1 mb-0.5">
                                        <span>{new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                                        {#if app.is_private}<span class="text-[8px] sm:text-[10px]">🔒</span>{/if}
                                    </div>
                                    <div class="truncate font-semibold">{app.expand?.client?.[0] ? app.expand.client[0].name_first + ' ' + app.expand.client[0].name_last : 'Kein Klient'}</div>
                                    <div class="truncate opacity-75">{app.description || 'Termin'}</div>
                                </a>
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    <!-- Detail-Ansicht für den ausgewählten Tag -->
    {#if selectedDate}
        <!-- Wird auf dem Desktop ausgeblendet (md:hidden), da die Termine dort ohnehin im Kalender selbst stehen -->
        <div class="p-6 bg-neutral-50/50 border-t border-neutral-100 flex-1 md:hidden">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-neutral-900 flex items-center gap-2"><span>📅</span> Termine für den {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</h3>
                <button onclick={() => onNewAppointment?.(selectedDate as Date)} class="text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors">+ Hinzufügen</button>
            </div>
            {#if selectedDayAppointments.length === 0}
                <p class="text-sm text-neutral-500 italic">Keine Termine an diesem Tag.</p>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#each selectedDayAppointments as app}
                        <a href="/appointments/{app.id}" class="block bg-white p-4 rounded-xl border border-neutral-200 hover:border-indigo-300 hover:shadow-md transition-all group">
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-sm font-bold {app.is_private ? 'text-rose-600' : 'text-indigo-600'}">{new Date(app.appointment).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                                {#if app.expand?.client?.[0]}
                                    <span class="text-xs font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md truncate max-w-37.5">{app.expand.client[0].name_first} {app.expand.client[0].name_last}</span>
                                {/if}
                            </div>
                            <p class="text-sm text-neutral-800 font-medium line-clamp-2">{app.description || 'Keine Beschreibung'}</p>
                        </a>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>