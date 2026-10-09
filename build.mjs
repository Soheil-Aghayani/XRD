import { mkdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = ['index.html', 'style.css', 'app.js', 'support.js', 'workbook.js', 'science.js', 'references.json', 'favicon.svg'];
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
for (const name of files) await copyFile(new URL(name, import.meta.url), new URL(`dist/${name}`, import.meta.url));
await cp(new URL('./assets/', import.meta.url), new URL('./dist/assets/', import.meta.url), { recursive: true });
await cp(new URL('./vendor/', import.meta.url), new URL('./dist/vendor/', import.meta.url), { recursive: true });
await cp(new URL('./library/cif/', import.meta.url), new URL('./dist/library/cif/', import.meta.url), { recursive: true });
await copyFile(new URL('./library/manifest.json',import.meta.url),new URL('./dist/library/manifest.json',import.meta.url));
const versioned = [...files.filter(name=>/\.(js|css|json)$/.test(name)), 'vendor/xlsx.mjs'];
const versions = new Map();
const buildHash=createHash('sha256');
for (const name of versioned) buildHash.update(name).update(await readFile(new URL(name,import.meta.url)));
const revision=buildHash.digest('hex').slice(0,12);
for (const name of versioned) versions.set(name,revision);
for (const name of ['index.html',...files.filter(name=>name.endsWith('.js'))]) {
  let content = await readFile(new URL(name,import.meta.url),'utf8');
  for (const [asset,version] of versions) {
    content=content.replaceAll(`"${asset}"`,`"${asset}?v=${version}"`).replaceAll(`'./${asset}'`,`'./${asset}?v=${version}'`).replaceAll(`'${asset}'`,`'${asset}?v=${version}'`);
  }
  await writeFile(new URL(`dist/${name}`,import.meta.url),content);
}
console.log(`Built ${files.length} public assets and icons in dist/`);
