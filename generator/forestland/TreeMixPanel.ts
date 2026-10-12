import { changeGrassMixShare, type GrassMixEntry } from '../../src/grass/GrassMix.ts';
import { TREE_VARIANTS } from './PinePack.ts';

export class TreeMixPanel {
    private readonly controls: { range: HTMLInputElement; number: HTMLInputElement; output: HTMLOutputElement }[] = [];
    constructor(private mix: GrassMixEntry[], private readonly changed: (mix: GrassMixEntry[]) => void) {
        const panel = document.createElement('section'); panel.className = 'grass-mix-panel'; panel.setAttribute('aria-label', 'Tree model mix');
        const header = document.createElement('div'); header.className = 'grass-mix-header';
        const title = document.createElement('strong'); title.textContent = 'Tree mix';
        const help = document.createElement('p'); help.className = 'help'; help.textContent = 'Total 100%. Changing a share redistributes the others. Zero excludes a tree. Overall density stays the same.';
        header.append(title, help);
        const rows = document.createElement('div'); rows.className = 'grass-mix-rows';
        TREE_VARIANTS.forEach(([, name], index) => {
            const card = document.createElement('div'); card.className = 'grass-mix-card';
            const label = document.createElement('label'), output = document.createElement('output');
            label.htmlFor = `tree-mix-${index}`; label.append(document.createTextNode(name), output);
            const range = document.createElement('input'); range.type = 'range'; range.id = label.htmlFor; range.min = '0'; range.max = '100'; range.step = '1';
            const number = document.createElement('input'); number.type = 'number'; number.min = '0'; number.max = '100'; number.step = '1'; number.setAttribute('aria-label', `${name} percentage`);
            const apply = (value: string): void => {
                if (!Number.isFinite(Number(value))) return;
                this.mix = changeGrassMixShare(this.mix, index, Number(value)); this.sync(); this.changed(this.mix);
            };
            range.addEventListener('input', () => { this.mix = changeGrassMixShare(this.mix, index, Number(range.value)); this.sync(); });
            range.addEventListener('change', () => this.changed(this.mix));
            number.addEventListener('change', () => apply(number.value));
            card.append(label, range, number); rows.append(card); this.controls.push({ range, number, output });
        });
        panel.append(header, rows); document.body.append(panel); document.body.classList.add('has-grass-mix'); this.sync();
    }
    private sync(): void { this.controls.forEach((control, i) => { control.range.value = control.number.value = String(this.mix[i].percentage); control.output.value = `${this.mix[i].percentage}%`; }); }
    setDisabled(disabled: boolean): void { for (const control of this.controls) control.range.disabled = control.number.disabled = disabled; }
}
