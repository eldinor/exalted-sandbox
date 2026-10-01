/** Temporary team-facing avatar fabric palette controls. */

import type { AvatarPaletteSlot, Character } from '../character/character.ts';
import './avatarColors.css';

interface FabricControl {
    label: string;
    slot: AvatarPaletteSlot;
}

const FABRICS: readonly FabricControl[] = [
    { label: 'Robe & sleeves', slot: 0 },
    { label: 'Mantle', slot: 1 },
    { label: 'Collar lining', slot: 2 },
    { label: 'Trim & scarf', slot: 5 },
];

const PRESETS = {
    Indigo: ['#30416d', '#4d5c77', '#84827e', '#617a98'],
    Crimson: ['#4b1019', '#7b2934', '#ded0b9', '#d1a04c'],
    Forest: ['#173326', '#31553d', '#d7cbb2', '#9fb272'],
    Violet: ['#29164a', '#563b73', '#ddd5e8', '#5faabe'],
} as const;

function linearToSrgb(value: number): number {
    return value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
}

function srgbToLinear(value: number): number {
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function byteHex(value: number): string {
    return Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0');
}

function linearColorToHex(color: readonly [number, number, number]): string {
    return `#${byteHex(linearToSrgb(color[0]))}${byteHex(linearToSrgb(color[1]))}${byteHex(linearToSrgb(color[2]))}`;
}

function applyHex(character: Character, slot: AvatarPaletteSlot, hex: string): void {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    character.setPaletteColor(slot, srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

/** Create a collapsible visual-test panel without becoming part of gameplay UI. */
export class AvatarColors {
    readonly root = document.createElement('aside');
    private readonly inputs = new Map<AvatarPaletteSlot, HTMLInputElement>();

    constructor(private readonly character: Character) {
        this.root.className = 'avatar-colors';
        this.root.setAttribute('aria-label', 'Avatar color testing');

        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Avatar colors';
        details.append(summary);

        const fields = document.createElement('div');
        fields.className = 'avatar-colors-fields';
        for (const fabric of FABRICS) {
            const label = document.createElement('label');
            const text = document.createElement('span');
            text.textContent = fabric.label;
            const input = document.createElement('input');
            input.type = 'color';
            input.value = linearColorToHex(character.getPaletteColor(fabric.slot));
            input.setAttribute('aria-label', fabric.label);
            input.addEventListener('input', () => applyHex(character, fabric.slot, input.value));
            this.inputs.set(fabric.slot, input);
            label.append(text, input);
            fields.append(label);
        }
        details.append(fields);

        const presets = document.createElement('div');
        presets.className = 'avatar-colors-presets';
        for (const [name, colors] of Object.entries(PRESETS)) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = name;
            button.addEventListener('click', () => this.applyPreset(colors));
            presets.append(button);
        }
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.textContent = 'Reset';
        reset.addEventListener('click', () => {
            character.resetPalette();
            this.syncInputs();
        });
        presets.append(reset);
        details.append(presets);
        this.root.append(details);
        document.body.append(this.root);
    }

    private applyPreset(colors: readonly string[]): void {
        for (let i = 0; i < FABRICS.length; i++) {
            applyHex(this.character, FABRICS[i].slot, colors[i]);
        }
        this.syncInputs();
    }

    private syncInputs(): void {
        for (const fabric of FABRICS) {
            const input = this.inputs.get(fabric.slot);
            if (input) input.value = linearColorToHex(this.character.getPaletteColor(fabric.slot));
        }
    }

    dispose(): void { this.root.remove(); }
}
