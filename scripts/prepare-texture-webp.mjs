/** Convert only production PNG surface images; originals and numeric maps are read-only. */
import { spawnSync } from 'node:child_process';
import { PRODUCTION_SOURCE_ASSETS, productionAssetFiles } from './production-assets.mjs';

const files = productionAssetFiles('public', PRODUCTION_SOURCE_ASSETS, false)
    .filter(name => name.startsWith('terrain/') && name.endsWith('.png') && !/\/height-\d+\.png$/.test(name));
const result = spawnSync('python', ['scripts/prepare-texture-webp.py'], {
    input: JSON.stringify({files, models: PRODUCTION_SOURCE_ASSETS.filter(name=>name.endsWith('.glb')&&name!=='assets/exalted/alpha-map.glb')}), encoding: 'utf8', maxBuffer: 1024 * 1024,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`WebP preparation failed (${result.status}). Requires Python/Pillow with WebP support.`);
