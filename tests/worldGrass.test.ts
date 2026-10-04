import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { MeshSurface } from '../src/terrain/meshSurface.ts';
import { AuthoredSurfaceMap, roadsGrassWeight, decodeAuthoredPng, ROADS_BIOME_MAP } from '../src/terrain/authoredHeightmap.ts';
import { createAuthoredGrassSamplers } from '../src/grass/AuthoredGrassSamplers.ts';
import { grassInteractionAllowed, writeSurfSegments, GRASS_SURF_LIFETIME } from '../src/grass/GrassInteraction.ts';
import { worldGrassSettings } from '../src/grass/WorldGrassSettings.ts';
import { DepthPass } from '../src/render/depthPass.ts';
import { ShadowSystem } from '../src/render/shadows.ts';

const grass = [179, 206, 149].map(value => value / 255);

test('heightmap grass palette excludes road, forest, desert, water and island colours', () => {
    assert.equal(roadsGrassWeight(grass), 1);
    for (const color of [[246,232,208],[124,170,129],[220,177,118],[129,173,206],[111,153,191],[137,147,128]]) {
        assert.equal(roadsGrassWeight(color.map(value => value / 255)), 0);
    }
    assert.equal(roadsGrassWeight(grass.map(value => value + .15)), 0);
});

test('separate grass mask respects PNG orientation and rejects conservative patches outside terrain', () => {
    const image = { width: 3, height: 3, channels: 3, pixels: new Uint8Array(27) };
    image.pixels.set([179,206,149], 0);
    const coverage = new AuthoredSurfaceMap(3, 3, image);
    assert.equal(coverage.grassAt(468, -351), 1);
    assert.equal(coverage.grassAt(-468, 351), 0);
    assert.equal(coverage.data.length, 36, 'four existing terrain channels remain intact');
    assert.equal(coverage.grassData.length, 9);
    assert.ok(coverage.hasGrassArea(200, 468, -351, -250));
    assert.equal(coverage.hasGrassArea(-468, -300, 250, 351), false);
    assert.equal(coverage.hasGrassArea(600, 700, 600, 700), false);
});

test('current biome asset places grass at The Long Green and excludes forest/desert spawns', () => {
    const biome = decodeAuthoredPng(readFileSync(`public/${ROADS_BIOME_MAP}`));
    const coverage = new AuthoredSurfaceMap(2049, 1537, biome);
    assert.ok(coverage.grassAt(-155, 0) > .99);
    assert.equal(coverage.grassAt(-383.5, 52), 0);
    assert.equal(coverage.grassAt(-32.5, 308), 0);
    assert.ok(coverage.hasGrassArea(-160, -144, -8, 8));
});

test('grass samplers ground on triangle planes and reject submerged grass and gaps', () => {
    const surface = new MeshSurface([0,2,0, 10,4,0, 0,2,10], [0,2,1], 16);
    const samplers = createAuthoredGrassSamplers(surface, {
        grassAt: x => x < 7 ? 1 : 0,
        hasGrassArea: () => true,
    }, (x, z, height) => x < 2 && height < 3);
    assert.equal(samplers.grassWeightAt(1,1), 0);
    assert.equal(samplers.excludedAt(1,1), true);
    assert.ok(Math.abs(samplers.heightAt(3,1) - 2.6) < 1e-6);
    assert.equal(samplers.grassWeightAt(3,1), 1);
    assert.ok(Math.abs(samplers.slopeAt!(3,1) - .2) < 1e-6);
    assert.equal(samplers.grassWeightAt(9,9), 0);
    assert.equal(samplers.patchMayContainGrass!(-20,-20,4), false);
});

test('surf snapshot follows turns, preserves speed strength, wraps ring and recovers after .88 seconds', () => {
    const x = new Float32Array([0,0,1,2,0,0]);
    const y = new Float32Array(6).fill(5);
    const z = new Float32Array([0,1,1,1,0,0]);
    const strength = new Float32Array(6).fill(.8);
    const laid = new Float32Array(6).fill(10);
    const output = new Float32Array(64);
    assert.equal(writeSurfSegments(x,y,z,strength,laid,3,4,10,output), 3);
    assert.deepEqual(Array.from(output.slice(0,7)), [1,5,1,Math.fround(.8),2,5,1]);
    const firstHeading = [output[4]-output[0], output[6]-output[2]];
    const finalHeading = [output[20]-output[16], output[22]-output[18]];
    assert.deepEqual(firstHeading, [1,0]);
    assert.deepEqual(finalHeading, [0,1], 'the older segment preserves the turn instead of flattening the path');
    writeSurfSegments(x,y,z,strength,laid,3,4,10+GRASS_SURF_LIFETIME/2,output);
    assert.ok(Math.abs(output[3] - .2) < 1e-6);
    writeSurfSegments(x,y,z,strength,laid,3,4,10+GRASS_SURF_LIFETIME,output);
    assert.equal(output[3], 0);
    assert.equal(writeSurfSegments(x,y,z,strength,laid,3,0,11,output), 0);
    assert.ok(output.every(value => value === 0), 'reset removes all old path data');
    const ringX = Float32Array.from({length:96}, (_,i)=>i);
    const ring = new Float32Array(96);
    assert.equal(writeSurfSegments(ringX,ring,ring,new Float32Array(96).fill(1),ring,2,60,0,output), 8);
    assert.equal(output[4], 2, 'newest endpoint survives ring wrap and downsampling');
    assert.throws(() => writeSurfSegments(x,y,z,strength,laid,0,0,0,new Float32Array(8)), RangeError);
});

test('avatar interaction rejects airborne, swimming and elevated prop-supported positions', () => {
    assert.ok(grassInteractionAllowed(false,false,false,10,10));
    for (const mode of [[true,false,false],[false,true,false],[false,false,true]] as const) {
        assert.equal(grassInteractionAllowed(...mode,10,10), false);
    }
    assert.equal(grassInteractionAllowed(false,false,false,12,10), false);
});

test('streamed caster removal retains other meshes using shared materials and leaves no stale entries', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const shadows = new ShadowSystem(scene);
    const depth = new DepthPass(scene);
    const a = new Mesh('a',scene), b = new Mesh('b',scene);
    const material = new ShaderMaterial('shared',scene,'test',{});
    const cascadeMaterials = [new ShaderMaterial('shadow0',scene,'test',{}),new ShaderMaterial('shadow1',scene,'test',{})];
    try {
        for (let round=0; round<10; round++) {
            for (const mesh of [a,b]) {
                depth.registerCaster(mesh,material);
                shadows.registerCaster(mesh,cascade=>cascadeMaterials[cascade],2);
            }
            depth.unregisterCaster(a); shadows.unregisterCaster(a);
            assert.deepEqual(depth.rtt.renderList!.map(mesh=>mesh.name),['b']);
            assert.deepEqual(depth.materials,[material]);
            for (let cascade=0; cascade<2; cascade++) assert.deepEqual(shadows.maps[cascade].renderList!.map(mesh=>mesh.name),['b']);
            assert.equal(shadows.maps[2].renderList!.length,0);
            assert.equal(shadows.materials.length,2);
            depth.unregisterCaster(b); shadows.unregisterCaster(b);
            assert.equal(depth.materials.length,0);
            assert.equal(shadows.materials.length,0);
            assert.ok(shadows.maps.every(map=>map.renderList!.length===0));
        }
    } finally { depth.dispose(); shadows.dispose(); scene.dispose(); engine.dispose(); }
});

test('production defaults preserve the three-model mix without Tall grass, reduced density and LOD contract', () => {
    const settings = worldGrassSettings();
    assert.equal(settings.density,3);
    assert.equal(settings.maxSlope,1);
    assert.equal(settings.lodEnabled,false);
    assert.equal(settings.singleLod,1);
    assert.equal(settings.farDistance,70);
    assert.equal(settings.distantLodDistance,120);
    assert.equal(settings.distantGrassDensity,.25);
    assert.equal(settings.windDistance,60);
    assert.deepEqual(settings.grassMix?.map(entry=>entry.percentage),[10,45,45]);
    assert.deepEqual(settings.grassMix?.map(entry=>entry.variant),[
        'grass_medium_01_tiny_d_LOD2',
        'grass_medium_01_small_a_LOD2','grass_medium_01_small_b_LOD2',
    ]);
});

test('production adapter recycles depth registrations and never registers grass shadows', async () => {
    const { createServer } = await import('vite');
    const { Vector2, Vector3 } = await import('@babylonjs/core/Maths/math.vector');
    const { VertexData } = await import('@babylonjs/core/Meshes/mesh.vertexData');
    const { Color3 } = await import('@babylonjs/core/Maths/math.color');
    const { RawTexture } = await import('@babylonjs/core/Materials/Textures/rawTexture');
    const server = await createServer({ configFile:false, cacheDir:'node_modules/.vite-test-world-grass', server:{middlewareMode:true}, appType:'custom', optimizeDeps:{noDiscovery:true} });
    const engine = new NullEngine(), scene = new Scene(engine);
    const shadows = new ShadowSystem(scene), depth = new DepthPass(scene);
    try {
        const { WorldGrass } = await server.ssrLoadModule('/src/world/worldGrass.ts');
        const { ExaltedWorld } = await server.ssrLoadModule('/src/terrain/exaltedWorld.ts');
        const world = new ExaltedWorld(scene);
        world.surface = new MeshSurface([-250,0,-250,250,0,-250,-250,0,250,250,0,250],[0,2,1,1,2,3],16);
        const image = {width:2,height:2,channels:3,pixels:new Uint8Array([179,206,149,179,206,149,179,206,149,179,206,149])};
        world.biomeSurface = new AuthoredSurfaceMap(2,2,image);
        const terrain = {heightfield:world, heightAt:(x:number,z:number)=>world.surface.sample(x,z)};
        const sky = {lut:RawTexture.CreateRGBATexture(new Uint8Array([0,0,0,255]),1,1,scene),sunDir:new Vector3(0,1,0),sunRadiance:new Color3(1,1,1),sh:new Float32Array(36)};
        const grass = new WorldGrass(scene,terrain,sky,shadows,depth);
        Object.assign(grass.settings,{density:.03,farDistance:24,distantLodDistance:40});
        const geometry = new VertexData();
        geometry.positions=[0,0,0,.1,0,0,0,1,0];geometry.normals=[0,0,1,0,0,1,0,0,1];geometry.indices=[0,1,2];
        const prototypes=new Map();
        for(const entry of grass.settings.grassMix)for(const lod of [1,2]){
            const name=entry.variant.replace(/_LOD2$/,`_LOD${lod}`);
            prototypes.set(name,{name,geometry,triangles:1,authoredHeight:1});
        }
        grass.renderer.setImportedPrototypes(prototypes);
        const context={cameraPosition:new Vector3(),windCameraPosition:new Vector3(),elapsedSeconds:0,impacts:[],surfSegmentCount:0};
        for(let frame=0;frame<500;frame++)grass.renderer.update(context);
        assert.equal(grass.streamingStats.queued,0);
        const meshCount=scene.meshes.filter(mesh=>mesh.name.startsWith('grass:')).length;
        assert.ok(meshCount>0);
        assert.ok(depth.rtt.renderList!.length>0);
        assert.ok(shadows.maps.every(map=>map.renderList!.length===0),'grass casts no shadows');
        for(const x of [160,0,160,0]){
            context.cameraPosition.x=x;context.windCameraPosition.x=x;
            for(let frame=0;frame<500;frame++)grass.renderer.update(context);
            assert.equal(grass.streamingStats.queued,0);
            assert.equal(new Set(depth.rtt.renderList).size,depth.rtt.renderList!.length);
            assert.equal(depth.materials.length,depth.rtt.renderList!.length);
            assert.equal(shadows.materials.length,0);
            assert.ok(shadows.maps.every(map=>map.renderList!.length===0),'movement never registers grass shadows');
            assert.ok(scene.meshes.filter(mesh=>mesh.name.startsWith('grass:')).length<=meshCount+8,'patch pool stays bounded across movement');
        }
        grass.settings.enabled=false;grass.renderer.update(context);
        assert.equal(depth.rtt.renderList!.length,0);
        assert.ok(shadows.maps.every(map=>map.renderList!.length===0));
        grass.dispose();
        assert.equal(scene.meshes.filter(mesh=>mesh.name.startsWith('grass')).length,0);
        assert.equal(depth.materials.length,0);
        assert.equal(shadows.materials.length,0);
        world.dispose();
    } finally {depth.dispose();shadows.dispose();scene.dispose();engine.dispose();await server.close();}
});
