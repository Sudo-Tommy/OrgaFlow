import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite'; // <-- NEU: Tailwind v4 Plugin
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(), // <-- WICHTIG: Tailwind-Plugin aktivieren
		sveltekit()
	],
	define: {
		global: 'window' // <-- Unser Fix für PDFKit
	}
});