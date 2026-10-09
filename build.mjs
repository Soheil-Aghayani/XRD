import { mkdir, copyFile } from 'node:fs/promises';
const files = ['index.html', 'style.css', 'app.js', 'science.js', 'references.json', 'favicon.svg'];
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
for (const name of files) await copyFile(new URL(name, import.meta.url), new URL(`dist/${name}`, import.meta.url));
console.log(`Built ${files.length} public assets in dist/`);
