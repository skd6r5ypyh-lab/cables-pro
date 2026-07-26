
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('build', 'dist/js', { recursive: true });

let html = await readFile('index.html', 'utf8');
await writeFile('dist/index.html', html);
console.log('Cables Pro V8 build complete.');
