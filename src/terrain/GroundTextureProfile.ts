/** Separate comparison-page assets; numeric terrain maps and GLBs are never remapped. */
export const GROUND_TEXTURES_1K = [
    { source: 'terrain/grassland/meadow/Material-326-A_BaseColor.jpg', file: 'meadow-base.png', kind: 'colour' },
    { source: 'terrain/grassland/meadow/Material-326-A_Normal.jpg', file: 'meadow-normal.png', kind: 'normal' },
    { source: 'terrain/grassland/meadow/Material-326-A_ORM.png', file: 'meadow-arm.png', kind: 'linear' },
    ...['forest', 'beach', 'road'].flatMap(set => {
        const folder = set === 'forest' ? 'forest/textures/forrest_ground_01_' : set === 'beach' ? 'sand/beach/aerial_beach_01_' : 'road/asp1/asphalt_snow_';
        return ['diff', 'nor_gl', 'arm'].map((map, i) => ({ source: `terrain/${folder}${map}_2k.${set === 'road' ? 'jpg' : 'png'}`, file: `${set}-${['base', 'normal', 'arm'][i]}.png`, kind: ['colour', 'normal', 'linear'][i] }));
    }),
] as const;
export const GROUND_TEXTURE_1K_ROOT = 'terrain/ground-1k';
const replacements = new Map<string, string>(GROUND_TEXTURES_1K.map(entry => [entry.source, `${GROUND_TEXTURE_1K_ROOT}/${entry.file}`]));

export function groundTexturePath(source: string, oneK = typeof document !== 'undefined' && document.documentElement?.dataset.groundTextures === '1k'): string {
    return oneK ? replacements.get(source) ?? source : source;
}
