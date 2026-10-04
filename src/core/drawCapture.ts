/** On-demand attribution of actual engine draws, including instanced submissions. */
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';

export interface DrawCaptureRow {
    mesh: string;
    pass: string;
    drawsPerFrame: number;
    indicesPerFrame: number;
    verticesPerFrame: number;
}
export interface DrawCapture {
    frames: number;
    drawsPerFrame: number;
    indicesPerFrame: number;
    rows: DrawCaptureRow[];
}
const capturing = new WeakSet<Scene>();

/** Temporarily wrap rendering entry points; normal frames carry no profiling overhead. */
export function captureDraws(scene: Scene, frames = 120): Promise<DrawCapture> {
    if (!Number.isInteger(frames) || frames < 1 || frames > 600) return Promise.reject(new Error('Capture requires 1–600 frames.'));
    if (scene.isDisposed || capturing.has(scene)) return Promise.reject(new Error('Scene is disposed or already capturing draws.'));
    capturing.add(scene);
    return new Promise((resolve, reject) => {
        const engine = scene.getEngine();
        const elements = engine.drawElementsType, arrays = engine.drawArraysType;
        const passNames = new Map<number, string>([[0, 'main']]);
        for (const target of scene.customRenderTargets) {
            for (const id of target.renderPassIds) passNames.set(id, target.name);
        }
        const rows = new Map<string, DrawCaptureRow>();
        let meshName = 'fullscreen/other', recording = false, completed = 0;
        const restores: (() => void)[] = [];
        for (const mesh of scene.meshes) {
            if (!(mesh instanceof Mesh)) continue;
            const render = mesh.render;
            mesh.render = function (...args: Parameters<Mesh['render']>): Mesh {
                const previous = meshName;
                meshName = this.name;
                try { return render.apply(this, args); }
                finally { meshName = previous; }
            };
            restores.push(() => { mesh.render = render; });
        }
        const record = (count: number, instances: number | undefined, indexed: boolean): void => {
            if (!recording) return;
            const pass = passNames.get(engine.currentRenderPassId) ?? `pass:${engine.currentRenderPassId}`;
            const key = `${pass}\0${meshName}`;
            let row = rows.get(key);
            if (!row) {
                row = { mesh: meshName, pass, drawsPerFrame: 0, indicesPerFrame: 0, verticesPerFrame: 0 };
                rows.set(key, row);
            }
            row.drawsPerFrame++;
            const submitted = count * (instances ?? 1);
            if (indexed) row.indicesPerFrame += submitted;
            else row.verticesPerFrame += submitted;
        };
        engine.drawElementsType = function (mode, start, count, instances): void {
            record(count, instances, true);
            elements.call(this, mode, start, count, instances);
        };
        engine.drawArraysType = function (mode, start, count, instances): void {
            record(count, instances, false);
            arrays.call(this, mode, start, count, instances);
        };
        const before = scene.onBeforeRenderObservable.add(() => { recording = true; });
        const cleanup = (): void => {
            recording = false;
            engine.drawElementsType = elements; engine.drawArraysType = arrays;
            for (const restore of restores) restore();
            scene.onBeforeRenderObservable.remove(before);
            scene.onAfterRenderObservable.remove(after);
            scene.onDisposeObservable.remove(dispose);
            capturing.delete(scene);
        };
        const after = scene.onAfterRenderObservable.add(() => {
            recording = false;
            if (++completed < frames) return;
            cleanup();
            const result = [...rows.values()];
            for (const row of result) {
                row.drawsPerFrame /= frames; row.indicesPerFrame /= frames; row.verticesPerFrame /= frames;
            }
            result.sort((a, b) => b.indicesPerFrame - a.indicesPerFrame || b.drawsPerFrame - a.drawsPerFrame);
            const report = { frames, drawsPerFrame: result.reduce((sum, row) => sum + row.drawsPerFrame, 0),
                indicesPerFrame: result.reduce((sum, row) => sum + row.indicesPerFrame, 0), rows: result };
            console.table(result);
            resolve(report);
        });
        const dispose = scene.onDisposeObservable.add(() => { cleanup(); reject(new Error('Scene disposed during draw capture.')); });
    });
}
