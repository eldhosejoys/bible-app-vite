import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const swSrcPath = path.join(__dirname, 'public', 'sw.js');
const swDistPath = path.join(distDir, 'sw.js');

// Read all JS and CSS assets directly from the dist/assets directory
// to ensure all code-split chunk files are pre-cached.
const assetsDir = path.join(distDir, 'assets');
let assetFiles = [];

if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    assetFiles = files
        .filter(f => f.endsWith('.js') || f.endsWith('.css'))
        .map(f => `/assets/${f}`);
} else {
    console.warn('⚠️ dist/assets directory not found!');
}

console.log('📦 Found build assets to pre-cache:');
assetFiles.forEach(f => console.log(`   - ${f}`));

// Read the service worker
let swContent = fs.readFileSync(swSrcPath, 'utf-8');

// Find the urlsToCache array and inject the asset files
// We'll add them after the "/index.html" entry
const insertAfter = '"/index.html",';
const assetsToInsert = assetFiles.map(f => `  "${f}",`).join('\n');

if (swContent.includes(insertAfter)) {
    swContent = swContent.replace(
        insertAfter,
        `${insertAfter}\n  // Auto-generated: Vite build assets\n${assetsToInsert}`
    );
} else {
    // Fallback: add after the first entry
    swContent = swContent.replace(
        'const urlsToCache = [',
        `const urlsToCache = [\n  // Auto-generated: Vite build assets\n${assetsToInsert}`
    );
}

// Write the modified service worker to dist
fs.writeFileSync(swDistPath, swContent, 'utf-8');

console.log(`✅ Injected ${assetFiles.length} build assets into dist/sw.js`);
