import { orgaStore } from "$lib/stores/orgaStore.svelte";

export function useBwaService() {
    let selectedYear = $state(new Date().getFullYear());

    let availableYears = $derived.by(() => {
        const years = new Set<number>();
        years.add(new Date().getFullYear()); // Aktuelles Jahr immer anzeigen
        
        (orgaStore.invoices?.data || []).forEach((inv: any) => {
            if (inv.issue_date) years.add(new Date(inv.issue_date).getFullYear());
        });
        (orgaStore.appointments?.data || []).forEach((app: any) => {
            if (app.appointment) years.add(new Date(app.appointment).getFullYear());
        });
        
        return Array.from(years).sort((a, b) => b - a); // Absteigend sortieren
    });

    let yearlyStats = $derived.by(() => {
        const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
        const stats = months.map(m => ({ month: m, revenueNetto: 0, revenueBrutto: 0, km: 0, hours: 0, expenses: 0 }));
        let totals = { revenueNetto: 0, revenueBrutto: 0, km: 0, hours: 0, expenses: 0 };

        // Rechnungen (Umsätze) aggregieren
        (orgaStore.invoices?.data || []).forEach((inv: any) => {
            if (!inv.issue_date) return;
            const d = new Date(inv.issue_date);
            if (d.getFullYear() === selectedYear) {
                // Nur valide Umsätze zählen (keine Entwürfe, Stornos oder Ablehnungen)
                if (inv.status === 'Eingereicht' || inv.status === 'Abgeschlossen' || inv.status === 'In Bearbeitung') {
                    const monthIdx = d.getMonth();
                    stats[monthIdx].revenueNetto += (inv.netto || 0);
                    stats[monthIdx].revenueBrutto += (inv.brutto || 0);
                    totals.revenueNetto += (inv.netto || 0);
                    totals.revenueBrutto += (inv.brutto || 0);
                }
            }
        });

        // Termine (Fahrten, Zeiten, Ausgaben) aggregieren
        (orgaStore.appointments?.data || []).forEach((app: any) => {
            if (!app.appointment) return;
            const d = new Date(app.appointment);
            if (d.getFullYear() === selectedYear) {
                const monthIdx = d.getMonth();

                // Zeiten berechnen (Millisekunden zu Stunden)
                if (app.expand?.time_record) {
                    app.expand.time_record.forEach((tr: any) => {
                        if (tr.start && tr.end) {
                            const diffMs = new Date(tr.end).getTime() - new Date(tr.start).getTime();
                            if (diffMs > 0) {
                                const h = diffMs / 3600000;
                                stats[monthIdx].hours += h;
                                totals.hours += h;
                            }
                        }
                    });
                }

                // Fahrten addieren
                if (app.expand?.drive_record) app.expand.drive_record.forEach((dr: any) => { stats[monthIdx].km += (dr.km || 0); totals.km += (dr.km || 0); });
                
                // Ausgaben addieren
                if (app.expand?.expenditures) app.expand.expenditures.forEach((ex: any) => { stats[monthIdx].expenses += (ex.sum || 0); totals.expenses += (ex.sum || 0); });
            }
        });

        return { months: stats, totals };
    });

    return {
        get selectedYear() { return selectedYear; }, set selectedYear(v) { selectedYear = v; },
        get availableYears() { return availableYears; },
        get yearlyStats() { return yearlyStats; }
    };
}