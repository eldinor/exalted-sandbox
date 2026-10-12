import assert from "node:assert/strict";
import test from "node:test";
import { mapScreenshotFraming } from '../src/ui/mapScreenshotFraming.ts';
import { MapPropSnapshot } from '../src/ui/mapPropSnapshot.ts';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';

test('prop map snapshots retain all placements and isolate temporary meshes/materials from gameplay',()=>{
    const engine=new NullEngine(),scene=new Scene(engine);
    const source=new ShaderMaterial('live',scene,{vertex:'test',fragment:'test'},{attributes:['position'],defines:['#define ORIGINAL']});
    source.setVector3('cameraPos',new Vector3(1,2,3));source.setFloat('cullDistance',90);
    const geometry=new VertexData();geometry.positions=[0,0,0,1,0,0,0,1,0];geometry.indices=[0,1,2];
    const matrices=new Float32Array([...Matrix.Translation(-100,0,0).m,...Matrix.Translation(100,0,0).m]);
    const snapshot=new MapPropSnapshot(scene,0x10000000,new Vector3(0,900,0));
    const a=snapshot.add('a',geometry,source,matrices),b=snapshot.add('b',geometry,source,matrices);
    assert.equal(a.thinInstanceCount,2);assert.equal(b.thinInstanceCount,2);
    assert.notEqual(a.geometry,b.geometry);assert.equal(a.material,b.material);
    assert.equal(a.layerMask,0x10000000);assert.equal(a.renderingGroupId,0);
    assert.deepEqual(source.options.defines,['#define ORIGINAL']);
    assert.ok(a.material.options.defines.includes('#define MAP_SCREENSHOT'));
    snapshot.dispose();assert.equal(scene.meshes.length,0);assert.equal(scene.materials.length,1);
    assert.equal(scene.materials[0],source);scene.dispose();engine.dispose();
});

test('whole-map orthographic framing fits every terrain corner with margins at different image aspects', () => {
    for (const [width, height] of [[2048,1536],[1600,900],[900,1600]]) {
        const frame = mapScreenshotFraming(-468, 468, -351, 351, width, height);
        assert.ok(Math.abs(frame.halfWidth / frame.halfHeight - width / height) < 1e-10);
        for (const x of [-468,468]) for (const z of [-351,351]) {
            assert.ok(Math.abs(x - frame.x) < frame.halfWidth);
            assert.ok(Math.abs(z - frame.z) < frame.halfHeight);
        }
    }
    const shifted = mapScreenshotFraming(10, 50, -100, -20);
    assert.equal(shifted.x, 30); assert.equal(shifted.z, -60);
    assert.throws(() => mapScreenshotFraming(0, 0, -1, 1), /bounds/);
});
import { unzipSync } from "fflate";
import {
    createScreenshotZip, ScreenshotCollection, screenshotFilename,
} from "../src/ui/screenshotCollection.ts";

test("screenshot filenames are safe and timestamped", () => {
    assert.equal(
        screenshotFilename(new Date("2026-09-22T12:34:56.789Z")),
        "exalted-screenshot-2026-09-22T12-34-56-789Z.png",
    );
});

test("collection replaces and revokes the oldest screenshot at capacity", () => {
    const revoked: string[] = [];
    let url = 0;
    const collection = new ScreenshotCollection(2, () => `blob:${++url}`, (value) => revoked.push(value));
    const first = collection.add(new Blob(["first"]));
    const second = collection.add(new Blob(["second"]));
    const third = collection.add(new Blob(["third"]));

    assert.deepEqual(collection.entries.map((entry) => entry.id), [second.id, third.id]);
    assert.deepEqual(revoked, [first.url]);
});

test("delete and clear revoke retained object URLs", () => {
    const revoked: string[] = [];
    let url = 0;
    const collection = new ScreenshotCollection(12, () => `blob:${++url}`, (value) => revoked.push(value));
    const first = collection.add(new Blob(["first"]));
    const second = collection.add(new Blob(["second"]));

    assert.equal(collection.remove(first.id), true);
    assert.equal(collection.remove(999), false);
    collection.clear();
    assert.deepEqual(revoked, [first.url, second.url]);
    assert.equal(collection.entries.length, 0);
});

test("ZIP export contains every retained PNG under its download filename", async () => {
    const collection = new ScreenshotCollection(12, () => "blob:test", () => undefined);
    collection.add(new Blob([new Uint8Array([1, 2, 3])]), new Date("2026-09-22T10:00:00Z"));
    collection.add(new Blob([new Uint8Array([4, 5])]), new Date("2026-09-22T10:00:01Z"));

    const files = unzipSync(await createScreenshotZip(collection.entries));
    assert.deepEqual(Object.keys(files), collection.entries.map((entry) => entry.filename));
    assert.deepEqual([...files[collection.entries[0].filename]], [1, 2, 3]);
    assert.deepEqual([...files[collection.entries[1].filename]], [4, 5]);
});
