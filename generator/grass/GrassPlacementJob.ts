import type { GrassSamplers } from './grassTypes.ts';
import { grassCandidateSeed, grassHash as hash, writeGrassMatrix } from './GrassDistribution.ts';

export interface GrassPlacementConfig {
    density: number;
    height: number;
    width: number;
    nearImported: boolean;
    midImported: boolean;
    variants?: readonly { weight: number; heightRatio: number }[];
}

/** Resumable deterministic placement with typed buffers and no per-blade objects. */
export class GrassPlacementJob {
    readonly cells: number;
    readonly nearBuffer: Float32Array;
    readonly midBuffer: Float32Array;
    readonly variantIndices: Uint8Array | null;
    readonly variantCounts: Uint32Array | null;
    readonly variantMaxHeights: Float32Array | null;
    readonly variantMaxWidths: Float32Array | null;
    cursor = 0;
    count = 0;
    minY = Infinity;
    maxY = -Infinity;
    maxHeight = 0;
    maxWidth = 0;

    constructor(readonly patchX: number, readonly patchZ: number, private readonly config: GrassPlacementConfig, private readonly samplers: GrassSamplers, nearBuffer?: Float32Array, midBuffer?: Float32Array) {
        this.cells = Math.floor(16 / (0.42 / Math.sqrt(config.density)));
        const capacity = this.cells * this.cells * 16;
        this.variantIndices = config.variants ? new Uint8Array(this.cells * this.cells) : null;
        this.variantCounts = config.variants ? new Uint32Array(config.variants.length) : null;
        this.variantMaxHeights = config.variants ? new Float32Array(config.variants.length) : null;
        this.variantMaxWidths = config.variants ? new Float32Array(config.variants.length) : null;
        this.nearBuffer = nearBuffer && nearBuffer.length >= capacity ? nearBuffer : new Float32Array(capacity);
        this.midBuffer = config.nearImported === config.midImported ? this.nearBuffer
            : midBuffer && midBuffer !== this.nearBuffer && midBuffer.length >= capacity ? midBuffer : new Float32Array(capacity);
    }

    get done(): boolean { return this.cursor >= this.cells * this.cells; }

    advance(candidates: number): void {
        const end = Math.min(this.cells * this.cells, this.cursor + candidates);
        for (; this.cursor < end; this.cursor++) {
            const seed = grassCandidateSeed(this.patchX, this.patchZ, this.cursor);
            const x = this.patchX * 16 + hash(seed) * 16;
            const z = this.patchZ * 16 + hash(seed + 11) * 16;
            const weight = this.samplers.grassWeightAt(x, z);
            const coverage = Math.max(0, Math.min(1, (weight - .06) / .48));
            if (coverage <= 0 || hash(seed + 23) > coverage || this.samplers.excludedAt(x, z)) continue;
            if (this.samplers.slopeAt) {
                if (this.samplers.slopeAt(x, z) > .4) continue;
            } else {
                const dx = this.samplers.heightAt(x + 1, z) - this.samplers.heightAt(x - 1, z);
                const dz = this.samplers.heightAt(x, z + 1) - this.samplers.heightAt(x, z - 1);
                if (Math.hypot(dx, dz) > .8) continue;
            }
            let variant = 0, heightRatio = 1;
            if (this.config.variants) {
                let selection = hash(seed + 127);
                const variants = this.config.variants;
                while (variant < variants.length - 1 && selection >= variants[variant].weight) selection -= variants[variant++].weight;
                heightRatio = variants[variant].heightRatio;
                if (this.variantIndices && this.variantCounts) {
                    this.variantIndices[this.count] = variant;
                    this.variantCounts[variant]++;
                }
            }
            const height = this.config.height * heightRatio * (.65 + hash(seed + 31) * .7);
            const width = this.config.width * (.78 + hash(seed + 47) * .44);
            const yaw = (hash(seed + 59) * 2 - 1) * Math.PI;
            const pitch = (hash(seed + 71) * 2 - 1) * Math.PI / 18;
            const roll = (hash(seed + 83) * 2 - 1) * Math.PI / 18;
            const spreadX = .8 + hash(seed + 97) * .4;
            const spreadZ = .8 + hash(seed + 109) * .4;
            if (this.variantMaxHeights && this.variantMaxWidths) {
                this.variantMaxHeights[variant] = Math.max(this.variantMaxHeights[variant], height);
                this.variantMaxWidths[variant] = Math.max(this.variantMaxWidths[variant], height * spreadX, height * spreadZ);
            }
            const y = this.samplers.heightAt(x, z) + .015;
            writeGrassMatrix(this.nearBuffer, this.count * 16, x, y, z, (this.config.nearImported ? height : width) * spreadX, height, (this.config.nearImported ? height : width) * spreadZ, pitch, yaw, roll);
            if (this.midBuffer !== this.nearBuffer) writeGrassMatrix(this.midBuffer, this.count * 16, x, y, z, (this.config.midImported ? height : width) * spreadX, height, (this.config.midImported ? height : width) * spreadZ, pitch, yaw, roll);
            this.count++;
            this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y);
            this.maxHeight = Math.max(this.maxHeight, height);
            this.maxWidth = Math.max(this.maxWidth, width * spreadX, width * spreadZ, height * spreadX, height * spreadZ);
        }
    }
}
