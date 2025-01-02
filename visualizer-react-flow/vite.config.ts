import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

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
        port: 9802,
        // does not work; failed to fix.
        // hmr: {
        //     host: 'localhost',
        // },
    },
})
