module.exports = (local, optimize, basePath, define = {}) => ({
    logLevel: local ? 'silent' : 'debug',
    bundle: true,
    minify: optimize,
    sourcemap: optimize ? 'external' : true,
    sourcemap: true,
    watch: !!local,
    entryPoints: ['src/index.tsx'],
    outdir: 'build/app',
    publicPath: `${basePath || ''}/app`,
    define: {
        'global': 'window',
    },
    loader: {
        '.eot': 'file',
        '.mp3': 'file',
        '.png': 'file',
        '.svg': 'file',
        '.ttf': 'file',
        '.wav': 'file',
        '.woff': 'file',
        '.woff2': 'file',
    },
});