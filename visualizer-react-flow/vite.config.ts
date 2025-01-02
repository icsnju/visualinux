import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';

import './loadenv.mjs';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    define: {
        'process.env': {
            VISUALIZER_DEBUG: process.env.VISUALIZER_DEBUG
        }
    },
    css: {
        postcss: {
            plugins: [tailwindcss],
        },
    },
    resolve: {
        alias: {
            '@app': '/src',
        },
    },
    server: {
        host: '0.0.0.0',
        port: +process.env.VISUALINUX_VISUALIZER_PORT || 3000,
        // does not work; failed to fix.
        // hmr: {
        //     host: 'localhost',
        // },
    },
})
