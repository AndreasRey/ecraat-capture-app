/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    name: 'ecraat-data-capture',
    title: 'Data Capture',
    type: 'app',
    direction: 'auto',
    entryPoints: {
        app: './src/index.tsx',
    },
    shortcuts: [
        {
            name: 'Search TEI',
            url: '#/search',
        },
    ],

    viteConfigExtensions: './vite.config.mts',
};

module.exports = config;
