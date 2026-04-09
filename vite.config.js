import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
const pdfjsPackageDir = dirname(require.resolve('pdfjs-dist/package.json'));
const pdfjsStandardFontsDir = resolve(pdfjsPackageDir, 'standard_fonts');
const pdfjsStandardFontsPublicPath = '/pdfjs-standard-fonts/';

function getContentType(filePath) {
    if (filePath.endsWith('.ttf')) {
        return 'font/ttf';
    }
    if (filePath.endsWith('.pfb')) {
        return 'application/x-font-type1';
    }
    return 'text/plain; charset=utf-8';
}

function pdfjsStandardFontsPlugin() {
    let resolvedConfig = null;

    return {
        name: 'pdfjs-standard-fonts',
        configResolved(config) {
            resolvedConfig = config;
        },
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const requestPath = req.url?.split('?')[0] || '';
                if (!requestPath.startsWith(pdfjsStandardFontsPublicPath)) {
                    next();
                    return;
                }

                const fileName = decodeURIComponent(requestPath.slice(pdfjsStandardFontsPublicPath.length));
                const filePath = resolve(pdfjsStandardFontsDir, fileName);

                if (!filePath.startsWith(pdfjsStandardFontsDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                    next();
                    return;
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', getContentType(filePath));
                fs.createReadStream(filePath).pipe(res);
            });
        },
        writeBundle() {
            const outDir = resolve(resolvedConfig?.root || process.cwd(), resolvedConfig?.build?.outDir || 'dist');
            const targetDir = resolve(outDir, pdfjsStandardFontsPublicPath.replace(/^\/|\/$/g, ''));
            fs.mkdirSync(targetDir, { recursive: true });
            fs.cpSync(pdfjsStandardFontsDir, targetDir, { recursive: true });
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    plugins: [react(), pdfjsStandardFontsPlugin()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    // prevent vite from obscuring rust errors
    clearScreen: false,
    // tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
    },
    // to make use of `TAURI_DEBUG` and other env variables
    // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                daemon: resolve(__dirname, 'daemon.html'),
            },
        },
        // Tauri supports es2021
        target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari11',
        // don't minify for debug builds
        minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
        // produce sourcemaps for debug builds
        sourcemap: !!process.env.TAURI_DEBUG,
    },
}));
