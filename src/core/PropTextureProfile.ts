/** Offline derivatives only: model geometry and runtime material settings are preserved. */
export const PROP_ASSETS_1K = [
    ['assets/exalted/exalted_desert.glb', 'terrain/props-1k/desert.glb'],
    ['terrain/forest/pine-pack-forestland.glb', 'terrain/props-1k/pines.glb'],
    ['terrain/forest/coniferous-selected/boulder-plain.glb', 'terrain/props-1k/boulder.glb'],
    ['terrain/forest/blue-spruce/impostor-colour.png', 'terrain/props-1k/impostor-colour.png'],
    ['terrain/forest/blue-spruce/impostor-normal.png', 'terrain/props-1k/impostor-normal.png'],
    ['terrain/forest/blue-spruce/impostor.json', 'terrain/props-1k/impostor.json'],
] as const;
const replacements = new Map<string, string>(PROP_ASSETS_1K);

export function propAssetPath(source: string, oneK = typeof document !== 'undefined' && document.documentElement?.dataset.propTextures === '1k'): string {
    return oneK ? replacements.get(source) ?? source : source;
}
