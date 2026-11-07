/** Separate GitHub project-Pages package; leave the normal hosting build intact. */
import { build } from 'vite';
import { writeFileSync } from 'node:fs';

await build({ base: '/exalted-sandbox/', build: { outDir: 'dist-pages' } });
writeFileSync('dist-pages/.nojekyll', '');
console.log('GitHub Pages package: dist-pages/ (https://eldinor.github.io/exalted-sandbox/)');
