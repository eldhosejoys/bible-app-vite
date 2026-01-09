import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swPath = path.join(__dirname, 'public', 'sw.js');

// Read the service worker file
let swContent = fs.readFileSync(swPath, 'utf-8');

// Generate version based on timestamp (e.g., "v1736409600000")
const newVersion = `v${Date.now()}`;

// Replace the version line
swContent = swContent.replace(
    /const CACHE_VERSION = "[^"]+";/,
    `const CACHE_VERSION = "${newVersion}";`
);

// Write back
fs.writeFileSync(swPath, swContent, 'utf-8');

console.log(`✅ Updated service worker cache version to: ${newVersion}`);
