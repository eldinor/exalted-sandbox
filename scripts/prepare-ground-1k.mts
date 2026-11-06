import { spawnSync } from 'node:child_process';
import { GROUND_TEXTURES_1K, GROUND_TEXTURE_1K_ROOT } from '../src/terrain/GroundTextureProfile.ts';

const result = spawnSync('python', ['scripts/prepare-ground-1k.py'], {
    input: JSON.stringify({ root: GROUND_TEXTURE_1K_ROOT, textures: GROUND_TEXTURES_1K }),
    encoding: 'utf8', maxBuffer: 1024 * 1024,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Ground PNG preparation failed (${result.status}). Requires Python with Pillow.`);
