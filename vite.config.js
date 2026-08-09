import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';

// ForgeKit issues a locally-trusted cert for this site's domain, so the Vite
// dev server can speak HTTPS on the same hostname. Without it, an http://
// dev-server subresource on an https:// page is blocked as mixed content.
const certDir = 'C:/ForgeKit/certs/domains/portfolio.test';
const devServerHttps = fs.existsSync(`${certDir}/cert.pem`) && fs.existsSync(`${certDir}/key.pem`)
    ? {
          cert: fs.readFileSync(`${certDir}/cert.pem`),
          key: fs.readFileSync(`${certDir}/key.pem`),
      }
    : undefined;

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        tailwindcss(),
        vue(),
    ],
    server: {
        // Bind every interface so the dev server is reachable at
        // portfolio.test rather than whichever loopback Node picks first.
        host: '0.0.0.0',
        https: devServerHttps,
        cors: true,
        // Written verbatim into public/hot and used by @vite() for every
        // request, so it must be a hostname the browser can reach.
        origin: devServerHttps ? 'https://portfolio.test:5173' : 'http://portfolio.test:5173',
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
