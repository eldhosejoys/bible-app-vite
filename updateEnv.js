import * as fs from 'node:fs';
const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

const envKey = 'VITE_APP_BUILD_DATE';

const newEnvContent = `${envKey}=${currentDate}\n`;

fs.writeFileSync('.env.production', newEnvContent);
fs.writeFileSync('.env.development', newEnvContent);

console.log(`${envKey} updated to ${currentDate}`);