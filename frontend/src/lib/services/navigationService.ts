/**
 * Scrollt weich zu einem bestimmten Bereich der Seite.
 */
export function scrollToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Führt eine Telefon-Aktion aus
 */
export function callPhone(phone: string) {
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
}