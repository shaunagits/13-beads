import { defineConfig } from 'vite';

// Relative asset paths so the game works at a domain root or under a subpath such as /13-beads.
export default defineConfig({ base: './' });
