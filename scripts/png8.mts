import { deflateSync } from 'node:zlib';

/** Lossless, untagged numeric RGB/grayscale PNG; no gamma or alpha processing. */
export function encodePng8(width: number, height: number, channels: 1 | 3, pixels: Uint8Array): Buffer {
    if (pixels.length !== width * height * channels) throw new Error('Invalid PNG pixel count.');
    function chunk(type: string, data: Buffer): Buffer {
        const payload = Buffer.concat([Buffer.from(type), data]);
        let crc = 0xffffffff;
        for (const byte of payload) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
        const result = Buffer.alloc(data.length + 12);
        result.writeUInt32BE(data.length); payload.copy(result, 4);
        result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
        return result;
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
    header[8] = 8; header[9] = channels === 1 ? 0 : 2;
    const stride = width * channels, rows = Buffer.alloc(height * (stride + 1));
    for (let row = 0; row < height; row++) rows.set(pixels.subarray(row * stride, (row + 1) * stride), row * (stride + 1) + 1);
    return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header),
        chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
