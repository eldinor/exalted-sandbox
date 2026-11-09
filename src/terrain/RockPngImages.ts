import { surfaceTexturePath } from '../core/TextureWebpProfile.ts';
/** Ordinary image downloads: main-app WebP surfaces and unchanged PNG displacement. */
import { readAsset } from '../core/assetDownload.ts';
import { ROCK_ARRAY_SIZE, ROCK_ARRAY_LAYERS, ROCK_IMAGE_ROOT } from './RockArrayProfile.ts';

export async function readRockPng(url: string, size = ROCK_ARRAY_SIZE): Promise<Uint8Array> {
    return readAsset(url, async response => {
        const image = await createImageBitmap(await response.blob(), {
            colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none',
        });
        const canvas = document.createElement('canvas');
        try {
            if (image.width !== size || image.height !== size) throw new Error(`Expected ${size} x ${size} rock image.`);
            canvas.width = size; canvas.height = size;
            const context = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
            if (!context) throw new Error('Cannot read rock PNG pixels.');
            context.drawImage(image, 0, 0);
            return new Uint8Array(context.getImageData(0, 0, size, size).data);
        } finally {
            image.close();
            canvas.width = canvas.height = 0;
        }
    });
}

/** Heights travel in opaque grayscale images to avoid Canvas alpha premultiplication. */
export async function loadRockPngArray(map: 'base' | 'normal' | 'arm-height', baseUrl: string): Promise<Uint8Array> {
    const layerBytes = ROCK_ARRAY_SIZE * ROCK_ARRAY_SIZE * 4;
    const data = new Uint8Array(layerBytes * ROCK_ARRAY_LAYERS);
    for (let layer = 0; layer < ROCK_ARRAY_LAYERS; layer++) {
        const root = `${baseUrl}${ROCK_IMAGE_ROOT}/`;
        const pixels = await readRockPng(`${baseUrl}${surfaceTexturePath(`${ROCK_IMAGE_ROOT}/${map === 'arm-height' ? 'arm' : map}-${layer}.png`)}`);
        if (map === 'arm-height') {
            const height = await readRockPng(`${root}height-${layer}.png`);
            for (let i = 0; i < layerBytes; i += 4) pixels[i + 3] = height[i];
        }
        data.set(pixels, layer * layerBytes);
    }
    return data;
}
