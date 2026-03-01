import { defineConfig } from 'vite'

export default defineConfig({
    // If deployed to a subfolder (e.g. GitHub Pages /robotSim2/), change base to '/robotSim2/'
    // For Netlify / Vercel / root deploy leave as '/'
    base: './',

    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'esbuild',
        // Increase chunk size limit slightly (Three.js is large)
        chunkSizeWarningLimit: 2500,
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three'],
                    blockly: ['blockly'],
                }
            }
        }
    },

    optimizeDeps: {
        include: ['three', 'blockly', 'stats.js']
    },

    server: {
        port: 9092
    }
})
