// Deaktiviert Server-Side Rendering für unsere PocketBase-SPA
export const ssr = false;
// Verhindert Prerendering-Fehler bei geschützten Routen (da Auth dynamisch auf dem Client läuft)
export const prerender = false;
// Hängt konsequent einen Slash an URLs an (z.B. /dashboard/)
export const trailingSlash = 'always';