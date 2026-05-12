export function useClientFilter(clientsProvider: () => any[]) {
    let searchQuery = $state("");
    let statusFilter = $state("all");

    let filtered = $derived.by(() => {
        const list = clientsProvider();
        if (!list) return [];
        
        return list.filter(client => {
            const query = searchQuery.toLowerCase();
            const fullName = `${client?.name_first || ''} ${client?.name_last || ''}`.toLowerCase();
            const matchQuery = !query || fullName.includes(query) || (client?.email || '').toLowerCase().includes(query);
            
            // Case-Insensitive Abgleich für den Status, um Fehler zwischen 'Aktiv' und 'aktiv' zu vermeiden
            const matchStatus = statusFilter === 'all' || (client?.status || '').toLowerCase() === statusFilter.toLowerCase();
            
            return matchQuery && matchStatus;
        });
    });

    return {
        get searchQuery() { return searchQuery; },
        set searchQuery(v) { searchQuery = v; },
        get statusFilter() { return statusFilter; },
        set statusFilter(v) { statusFilter = v; },
        get filtered() { return filtered; }
    };
}