/** Build the ground-and-props comparison as the root app without editing source HTML. */
import { build } from 'vite';
import { renameSync } from 'node:fs';

await build({ mode: 'ground-props-1k', build: { outDir: 'dist-1k', rollupOptions: { input: 'index-1k-props.html' } } });
renameSync('dist-1k/index-1k-props.html', 'dist-1k/index.html');
console.log('1K ground and props package: dist-1k/ (main page: index.html)');
