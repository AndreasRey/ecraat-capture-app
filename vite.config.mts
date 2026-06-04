import path from 'node:path';
import { defineConfig } from 'vite';

const viteConfig = defineConfig((configEnv) => {
    const { mode } = configEnv;
    return {
        clearScreen: mode !== 'development',
        resolve: {
            alias: {
                'capture-core': path.resolve(__dirname, 'src/core_modules/capture-core'),
                'capture-core/*': path.resolve(__dirname, 'src/core_modules/capture-core/*'),
                'capture-ui': path.resolve(__dirname, 'src/core_modules/capture-ui'),
                'capture-ui/*': path.resolve(__dirname, 'src/core_modules/capture-ui/*'),
                'capture-core-utils': path.resolve(__dirname, 'src/core_modules/capture-core-utils'),
                'capture-core-utils/*': path.resolve(__dirname, 'src/core_modules/capture-core-utils/*'),
                '@dhis2/rules-engine-javascript': path.resolve(__dirname, 'packages/rules-engine/src'),
            },
        },
        define: {
            global: 'window',
        },
        build: {
            sourcemap: false,
            chunkSizeWarningLimit: 1500,
            rollupOptions: {
                output: {
                    // Split third-party code into several cacheable vendor chunks.
                    //
                    // The ONLY safe chunk boundary is one that no dependency cycle
                    // crosses; otherwise the two chunks deadlock on init order at
                    // runtime ("X is not a function"). So each group below is either
                    // a SINK (depends on nothing in another split chunk) or a LEAF
                    // CONSUMER (nothing in another split chunk depends on it):
                    //   - vendor-react: react + EVERY package react itself pulls in.
                    //     It must be the full closure, or a leftover leaf (e.g.
                    //     object-assign) stays in `vendor` and re-creates the cycle.
                    //     Nothing react needs lives elsewhere -> sink -> safe.
                    //   - vendor-dhis2 / vendor-maps: leaf consumers (no other
                    //     third-party package imports them) -> safe.
                    //   - vendor: everything else, INCLUDING the redux+rxjs cluster
                    //     kept together. Splitting redux from rxjs is what crashed
                    //     before, so they deliberately stay in one chunk.
                    // This grouping is verified acyclic by scripts/analyzeChunkCycles.mjs.
                    manualChunks(id: string) {
                        if (!id.includes('node_modules')) {
                            return undefined;
                        }
                        // Leave moment alone so the platform's per-locale
                        // dynamic-import chunk splitting keeps working.
                        if (/[\\/]node_modules[\\/]moment[\\/]/.test(id)) {
                            return undefined;
                        }
                        // Map libraries: a leaf consumer (nothing else in
                        // node_modules imports them). Verified acyclic.
                        if (/[\\/]node_modules[\\/](leaflet|leaflet-draw|react-leaflet|@react-leaflet|react-leaflet-draw|react-leaflet-search-unpolyfilled)/.test(id)) {
                            return 'vendor-maps';
                        }
                        // Everything else (react, @dhis2, redux+rxjs, lodash,
                        // emotion, ...) stays together. The cycle analyzer proved
                        // that splitting any of these out (even dependency-free
                        // libs like lodash, due to Rollup's shared-module chunk
                        // assignment) re-introduces a cross-chunk cycle and the
                        // runtime init-order crash. `vendor-maps` is the only
                        // sub-split of node_modules that is verifiably acyclic here.
                        return 'vendor';
                    },
                },
            },
        },
        optimizeDeps: {
            include: [
                // Core React libraries
                'react',
                'react-dom',
                'react-router-dom',
                'history',
                'prop-types',

                // State management
                'redux',
                'react-redux',
                'redux-observable',
                'redux-batched-actions',
                'reselect',
                'rxjs',

                // Query and data fetching
                '@tanstack/react-query',
                '@tanstack/react-query-devtools',

                // DHIS2 libraries
                '@dhis2/ui',
                '@dhis2/app-runtime',
                '@dhis2/rule-engine',
                '@dhis2/d2-i18n',
                '@dhis2/d2-ui-rich-text',

                // Map libraries
                'leaflet',
                'leaflet-draw',
                'react-leaflet',
                'react-leaflet-draw',
                'react-leaflet-search-unpolyfilled',

                // Utilities
                'lodash',
                'uuid',
                'moment',
                'date-fns',
                'loglevel',
                'query-string',

                // UI and styling
                '@emotion/react',
                '@emotion/react/jsx-dev-runtime',
                '@emotion/css',
                'react-jss',
                '@popperjs/core',
                'react-popper',

                // Form and interaction
                'react-select',
                'react-dnd',
                'react-dnd-html5-backend',

                // Other libraries
                'react-html-parser-ultimate',
                'react-transform-tree',
                'd2-utilizr',
            ],
            esbuildOptions: {
                target: 'esnext',
            },
        },
        server: {
            fs: {
                cachedChecks: true,
                strict: false,
            },
            watch: {
                ignored: ['**/node_modules/**', '**/.d2/**'],
            },
        },
        css: {
            devSourcemap: false,
        },
    };
});

export default viteConfig;
