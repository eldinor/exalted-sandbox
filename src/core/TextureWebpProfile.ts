/** Main-app surface images only. Numeric height/biome maps never call this helper. */
export function surfaceTexturePath(source: string, enabled = typeof document !== 'undefined' && document.documentElement?.dataset.surfaceTextures === 'webp'): string {
    if (!enabled || !source.startsWith('terrain/') || !source.endsWith('.png') || /\/height-\d+\.png$/.test(source)) return source;
    return `textures-webp-80/${source.slice(0, -4)}.webp`;
}

const MODEL_SOURCES = new Set([
    'assets/exalted/exalted_desert.glb', 'terrain/grassland/grass_medium_01_1k.glb',
    'terrain/grassland/dandelions/dandelions.glb', 'terrain/grassland/daisies/daisies.glb',
    'terrain/forest/pine-pack-forestland.glb', 'terrain/forest/fir-pack-selected.glb',
    'terrain/forest/coniferous-selected/boulder-plain.glb',
]);
export function modelTexturePath(source: string, enabled = typeof document !== 'undefined' && document.documentElement?.dataset.surfaceTextures === 'webp'): string {
    return enabled && MODEL_SOURCES.has(source) ? `textures-webp-80/${source}` : source;
}
