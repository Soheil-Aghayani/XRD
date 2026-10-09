import { mkdir, copyFile, cp } from 'node:fs/promises';
const files = ['index.html', 'style.css', 'app.js', 'support.js', 'workbook.js', 'science.js', 'references.json', 'favicon.svg'];
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
for (const name of files) await copyFile(new URL(name, import.meta.url), new URL(`dist/${name}`, import.meta.url));
await cp(new URL('./assets/', import.meta.url), new URL('./dist/assets/', import.meta.url), { recursive: true });
await cp(new URL('./vendor/', import.meta.url), new URL('./dist/vendor/', import.meta.url), { recursive: true });
console.log(`Built ${files.length} public assets and icons in dist/`);
