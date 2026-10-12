import test from 'node:test';
test('sky retains dirty lighting while sun moves and solves once after it settles',async()=>{
    const {createServer}=await import('vite');
    const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-test-sky-defer',server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true}});
    try{
        const {Sky}=await server.ssrLoadModule('/src/render/sky.ts');
        let calls=0;
        const state={_dirty:true,deferAtmosphereUpdates:true,updatingSolve:false,lastUpdateSolve:-Infinity,azimuthOverride:225,
            syncFromSettings:()=>{},lut:{isReady:()=>true},shLut:{isReady:()=>true},solve:async()=>{calls++;}};
        for(let frame=0;frame<100;frame++)assert.equal(Reflect.apply(Sky.prototype.update,state,[]),false);
        assert.equal(calls,0);assert.equal(state._dirty,true,'the final lighting change remains queued');
        state.deferAtmosphereUpdates=false;
        assert.equal(Reflect.apply(Sky.prototype.update,state,[]),true);assert.equal(calls,1);
        for(let frame=0;frame<100;frame++)assert.equal(Reflect.apply(Sky.prototype.update,state,[]),false);
        await new Promise(resolve=>setImmediate(resolve));
        assert.equal(calls,1);assert.equal(state.updatingSolve,false);
    }finally{await server.close();}
});
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
import { forestOverlookGroundWeight } from '../src/terrain/forestGroundCoverage.ts';
import { sampleBiomeRgb } from '../src/terrain/authoredHeightmap.ts';
import { buildGroundCoverage, buildLandCoverage, GROUND_COVERAGE_MAP, ROCK_COVERAGE_MAP,
    BEACH_COVERAGE_MAP, DETAIL_COVERAGE_MAP } from '../src/terrain/groundCoverage.ts';
import { createHash } from 'node:crypto';
import { buildRoadDisplayMask, readRoadDisplayMask, ROAD_DISPLAY_MAP } from '../src/terrain/roadBlending.ts';

test('beach selects light blue independently of dark-blue water and blends with adjacent land', () => {
    const width = 257, height = 193;
    const image = { width, height, channels: 3 as const, pixels: new Uint8Array(width * height * 3) };
    for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
        image.pixels.set(col < 85 ? [111,153,191] : col < 170 ? [129,173,206] : [234,215,173], (row * width + col) * 3);
    }
    const maps = buildLandCoverage(image, width, height, 3);
    const beach = readRoadDisplayMask(maps.beach, width, height);
    const physical = new AuthoredSurfaceMap(width, height, image, maps.ground, undefined, maps.rock);
    const withBeach = new AuthoredSurfaceMap(width, height, image, maps.ground, undefined, maps.rock, maps.beach);
    assert.deepEqual(withBeach.data, physical.data, 'snow/sand/road/water channels retain their existing behavior');
    assert.deepEqual(withBeach.grassData, physical.grassData);
    assert.ok(withBeach.beachAt(0, 0) > .99);
    assert.equal(withBeach.beachAt(400, 0), 0, 'dark-blue lake interior is not beach');
    assert.equal(withBeach.beachAt(-400, 0), 0, 'southern desert palette remains desert');
    assert.ok(withBeach.waterAt(0, 0) > .99, 'eligibility still allows water wherever height/level require it');
    let mixed = false;
    for (let col = 158; col < 182; col++) {
        const i = Math.floor(height / 2) * width + col;
        const sum = maps.ground.pixels[i * 3] + maps.ground.pixels[i * 3 + 1] + maps.ground.pixels[i * 3 + 2]
            + maps.rock.pixels[i] + maps.beach.pixels[i];
        assert.ok(sum >= 254 && sum <= 255, 'beach/desert boundary has no untextured hole');
        if (maps.beach.pixels[i] > 0 && maps.beach.pixels[i] < 255) mixed = true;
    }
    assert.equal(mixed, true);
    assert.equal(beach.length, width * height);
});

test('saved beach coverage and packed rock/beach channels preserve hashes, orientation and normalization', () => {
    const beachBytes = readFileSync(`public/${BEACH_COVERAGE_MAP}`), detailBytes = readFileSync(`public/${DETAIL_COVERAGE_MAP}`);
    const beach = decodeAuthoredPng(beachBytes), detail = decodeAuthoredPng(detailBytes);
    const rock = decodeAuthoredPng(readFileSync(`public/${ROCK_COVERAGE_MAP}`));
    const land = decodeAuthoredPng(readFileSync(`public/${GROUND_COVERAGE_MAP}`));
    const meta = JSON.parse(readFileSync('public/assets/textures/ground-coverage-9.json', 'utf8'));
    assert.equal(createHash('sha256').update(beachBytes).digest('hex'), meta.beachSha256);
    assert.equal(createHash('sha256').update(detailBytes).digest('hex'), meta.detailSha256);
    assert.equal(beach.channels, 1); assert.equal(detail.channels, 3);
    assert.deepEqual(meta.detailChannels, ['rock', 'beach', 'reserved']);
    assert.equal(beach.width, land.width); assert.equal(beach.height, land.height);
    for (let i = 0; i < beach.pixels.length; i++) {
        assert.equal(detail.pixels[i * 3], rock.pixels[i]);
        assert.equal(detail.pixels[i * 3 + 1], beach.pixels[i]);
        assert.equal(detail.pixels[i * 3 + 2], 0);
        assert.ok(land.pixels[i * 3] + land.pixels[i * 3 + 1] + land.pixels[i * 3 + 2] + rock.pixels[i] + beach.pixels[i] <= 255);
    }
    const worldBeach = readRoadDisplayMask(beach, beach.width, beach.height);
    const rgb = new Float32Array(3);
    sampleBiomeRgb(detail, 300, 180, rgb);
    const x = Math.round((300 / 936 + .5) * (beach.width - 1));
    const z = Math.round((180 / 702 + .5) * (beach.height - 1));
    assert.ok(Math.abs(rgb[1] - worldBeach[z * beach.width + x] / 255) < .01);
    const biome = decodeAuthoredPng(readFileSync(`public/${ROADS_BIOME_MAP}`));
    const coverage = new AuthoredSurfaceMap(2049, 1537, biome, land, undefined, rock, beach);
    assert.ok(coverage.beachAt(272.5, 76) > .99, 'Lake Island uses the same beach material');
    assert.equal(coverage.waterAt(272.5, 76), 0, 'island colour does not alter original water classification');
    assert.ok(coverage.hasBeachArea(260, 280, 65, 85));
});

test('saved grayscale road coverage preserves orientation and can change display without changing firmness', () => {
    const road = decodeAuthoredPng(readFileSync(`public/${ROAD_DISPLAY_MAP}`));
    assert.equal(road.channels, 1); assert.ok(road.pixels instanceof Uint8Array);
    assert.equal(road.width, 2049); assert.equal(road.height, 1537);
    const metadata = JSON.parse(readFileSync(`public/${ROAD_DISPLAY_MAP.replace('.png', '.json')}`, 'utf8'));
    assert.equal(createHash('sha256').update(readFileSync(`public/${ROAD_DISPLAY_MAP}`)).digest('hex'), metadata.outputSha256);
    assert.equal(createHash('sha256').update(readFileSync(`public/${ROADS_BIOME_MAP}`)).digest('hex'), metadata.sourceSha256);
    const fixture = { width: 2, height: 2, channels: 1 as const, pixels: new Uint8Array([0,255,64,128]) };
    const display = readRoadDisplayMask(fixture, 3, 3);
    assert.equal(display[0], 255); assert.equal(display[2], 0);
    assert.equal(display[6], 128); assert.equal(display[8], 64);
    assert.equal(display[4], 112, 'linear interpolation preserves grey shoulder coverage');
    const biome = { width: 2, height: 2, channels: 3 as const, pixels: new Uint8Array(12).fill(243) };
    const original = new AuthoredSurfaceMap(3, 3, biome);
    const loaded = new AuthoredSurfaceMap(3, 3, biome, undefined, fixture);
    assert.deepEqual(loaded.data, original.data);
    assert.deepEqual(loaded.roadDisplayData, display);
    const gpu = loaded.visualSurfaceData();
    for (let i = 0; i < display.length; i++) {
        assert.equal(gpu[i * 4 + 2], display[i]);
        for (const channel of [0,1,3]) assert.equal(gpu[i * 4 + channel], original.data[i * 4 + channel]);
    }
    assert.throws(() => readRoadDisplayMask(biome, 3, 3), /grayscale8/);
});

test('road display feather is monotonic, keeps the centre opaque and leaves gameplay channels untouched', () => {
    const size = 41, source = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        source[(y * size + x) * 4] = 17;
        source[(y * size + x) * 4 + 2] = x >= 16 && x <= 24 ? 255 : 0;
    }
    const before = source.slice(), display = buildRoadDisplayMask(source, size, size, 40, 40);
    assert.deepEqual(source, before);
    const offset = 20 * size;
    assert.equal(display[offset + 20], 255);
    assert.equal(display[offset + 10], 0);
    assert.ok(display[offset + 15] > 0 && display[offset + 16] < 255);
    for (let x = 11; x <= 20; x++) assert.ok(display[offset + x] >= display[offset + x - 1]);
    assert.deepEqual(display, buildRoadDisplayMask(source, size, size, 40, 40));
});

test('ground coverage blends complementary green materials deterministically in world metres', () => {
    const width = 257, height = 193;
    const image = { width, height, channels: 3 as const, pixels: new Uint8Array(width * height * 3) };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        image.pixels.set(x < width / 2 ? [179,206,149] : [124,170,129], (y * width + x) * 3);
    }
    const mask = buildGroundCoverage(image, width, height, 3);
    assert.deepEqual(mask.pixels, buildGroundCoverage(image, width, height, 3).pixels);
    for (let i = 0; i < mask.pixels.length; i += 3) {
        assert.equal(mask.pixels[i] + mask.pixels[i + 1], 255, 'no remaining-ground hole between grass and forest');
        assert.equal(mask.pixels[i + 2], 0);
    }
    const color = new Float32Array(3);
    sampleBiomeRgb(mask, 30, 0, color); assert.ok(color[0] > .99);
    sampleBiomeRgb(mask, -30, 0, color); assert.ok(color[1] > .99);
    sampleBiomeRgb(mask, 0, 0, color); assert.ok(color[0] > .1 && color[1] > .1);
    assert.throws(() => buildGroundCoverage(image, 1, 3), /dimensions/);
});

test('bundled coverage keeps source orientation, overlook correction and shared CPU grass exclusions', () => {
    const bytes = readFileSync(`public/${GROUND_COVERAGE_MAP}`);
    const metadata = JSON.parse(readFileSync('public/assets/textures/ground-coverage-9.json', 'utf8'));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.outputSha256);
    const biomeBytes = readFileSync(`public/${ROADS_BIOME_MAP}`);
    assert.equal(createHash('sha256').update(biomeBytes).digest('hex'), metadata.sourceSha256);
    const mask = decodeAuthoredPng(bytes), biome = decodeAuthoredPng(biomeBytes);
    assert.equal(mask.channels, 3); assert.equal(mask.width, 2049); assert.equal(mask.height, 1537);
    for (let i = 0; i < mask.pixels.length; i += 3) assert.ok(mask.pixels[i] + mask.pixels[i + 1] + mask.pixels[i + 2] <= 255);
    const color = new Float32Array(3);
    sampleBiomeRgb(mask, -155, 0, color); assert.ok(color[0] > .99, 'The Long Green');
    sampleBiomeRgb(mask, -383.5, 52, color); assert.ok(color[1] > .99, 'The Thornwood');
    sampleBiomeRgb(mask, -250, 120, color); assert.ok(color[1] > .99, 'Forest Overlook');
    sampleBiomeRgb(mask, -32.5, 308, color); assert.ok(color[2] > .99, 'Desert Start');
    const coverage = new AuthoredSurfaceMap(mask.width, mask.height, biome, mask);
    assert.ok(coverage.grassAt(-155, 0) > .99);
    assert.equal(coverage.grassAt(-383.5, 52), 0);
    assert.equal(coverage.grassAt(-250, 120), 0);
    assert.equal(coverage.grassAt(270, 100), 0, 'painted lake stays excluded');
    const existing = new AuthoredSurfaceMap(mask.width, mask.height, biome);
    assert.deepEqual(coverage.data, existing.data, 'deformation, roads and water channels remain unchanged');
    let transitions = 0;
    for (let i = 0; i < mask.pixels.length; i += 3) {
        if (mask.pixels[i] < 30 || mask.pixels[i + 1] < 30 || mask.pixels[i + 2] !== 0) continue;
        const column = (i / 3) % mask.width, row = Math.floor(i / 3 / mask.width);
        // grassData is in increasing world X order, opposite PNG columns.
        const grassIndex = row * mask.width + mask.width - 1 - column;
        const surfaceOffset = grassIndex * 4;
        const available = 1 - Math.min(1, (coverage.data[surfaceOffset] + coverage.data[surfaceOffset + 3]) / 255);
        const road = Math.max(coverage.roadDisplayData[grassIndex], coverage.data[surfaceOffset + 2]) / 255;
        assert.ok(Math.abs(coverage.grassData[grassIndex] - mask.pixels[i] * available * (1 - road)) <= 2);
        transitions++;
    }
    assert.ok(transitions > 100, 'shared vegetation coverage retains a substantial blended forest boundary');
});

test('desert blends with grass and forest and continues beneath a road overlay without uncovered strips', () => {
    const width = 257, height = 5;
    for (const other of [[179,206,149], [124,170,129]]) {
        const image = { width, height, channels: 3 as const, pixels: new Uint8Array(width * height * 3) };
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            image.pixels.set(x < 126 ? [234,215,173] : x > 130 ? other : [246,232,208], (y * width + x) * 3);
        }
        const { ground: mask, rock } = buildLandCoverage(image, width, height, 3);
        for (let i = 0; i < mask.pixels.length; i += 3) {
            const total = mask.pixels[i] + mask.pixels[i + 1] + mask.pixels[i + 2] + rock.pixels[i / 3];
            assert.ok(total >= 254 && total <= 255, 'road fade has fully textured land underneath');
        }
        const color = new Float32Array(3);
        sampleBiomeRgb(mask, 30, 0, color); assert.ok(color[2] > .99);
        sampleBiomeRgb(mask, -30, 0, color); assert.ok(color[other[0] === 179 ? 0 : 1] > .99);
        sampleBiomeRgb(mask, 0, 0, color);
        assert.ok(color[2] > .1 && color[0] + color[1] > .1, 'road lies above a blended soil boundary');
    }
});

test('rock coverage corrects northern sand, preserves the southern desert and forest overlook, and keeps other gameplay channels', () => {
    const rockBytes = readFileSync(`public/${ROCK_COVERAGE_MAP}`);
    const rock = decodeAuthoredPng(rockBytes);
    const biome = decodeAuthoredPng(readFileSync(`public/${ROADS_BIOME_MAP}`));
    const land = decodeAuthoredPng(readFileSync(`public/${GROUND_COVERAGE_MAP}`));
    const metadata = JSON.parse(readFileSync('public/assets/textures/ground-coverage-9.json', 'utf8'));
    assert.equal(createHash('sha256').update(rockBytes).digest('hex'), metadata.rockSha256);
    assert.equal(rock.channels, 1); assert.ok(rock.pixels instanceof Uint8Array);
    for (let i = 0; i < rock.pixels.length; i++) {
        assert.ok(land.pixels[i * 3] + land.pixels[i * 3 + 1] + land.pixels[i * 3 + 2] + rock.pixels[i] <= 255);
    }
    const original = new AuthoredSurfaceMap(2049, 1537, biome);
    const corrected = new AuthoredSurfaceMap(2049, 1537, biome, land, undefined, rock);
    assert.ok(original.sample(-5, -210, new Float32Array(2))[1] > .9);
    assert.ok(corrected.rockAt(-5, -210) > .99);
    assert.ok(corrected.sample(-5, -210, new Float32Array(2))[1] < .01);
    const color = new Float32Array(3);
    sampleBiomeRgb(land, -5, -210, color); assert.ok(color[2] < .01);
    assert.ok(corrected.rockAt(-300, -180) > .99, 'eastern rocky mountains');
    assert.equal(corrected.rockAt(-250, 120), 0, 'forest overlook');
    assert.equal(corrected.rockAt(-32.5, 308), 0, 'southern desert');
    sampleBiomeRgb(land, -32.5, 308, color); assert.ok(color[2] > .99);
    for (let i = 0; i < original.data.length; i += 4) for (const channel of [0,2,3]) {
        assert.equal(corrected.data[i + channel], original.data[i + channel]);
    }
});

test('temporary forest ground covers the mapped overlook outcrop without recolouring other biomes or distant rocks', () => {
    const biome = decodeAuthoredPng(readFileSync(`public/${ROADS_BIOME_MAP}`));
    const color = new Float32Array(3);
    for (const [x, z] of [[-250,120],[-260,130],[-245,100],[-230,80],[-280,150],[-300,130],[-260,180],[-260,60]]) {
        sampleBiomeRgb(biome, x, z, color);
        assert.equal(forestOverlookGroundWeight(x, z, color), 1, `overlook ground at ${x},${z}`);
    }
    sampleBiomeRgb(biome, -190, 130, color);
    assert.equal(forestOverlookGroundWeight(-190, 130, color), 0, 'adjacent grass remains grass');
    for (const rgb of [[246,232,208],[243,246,249],[179,206,149],[129,173,206],[234,215,173]]) {
        assert.equal(forestOverlookGroundWeight(-250, 120, rgb.map(value => value / 255)), 0);
    }
    const rock = [162,153,144].map(value => value / 255);
    assert.equal(forestOverlookGroundWeight(-250, -120, rock), 0, 'mountain rock remains unchanged');
    assert.equal(forestOverlookGroundWeight(-250, 300, rock), 0, 'desert rock remains unchanged');
    const edge = forestOverlookGroundWeight(-248 + 74 * 1.05, 125, rock);
    assert.ok(edge > 0 && edge < 1, 'regional edge blends smoothly');
});

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
    assert.equal(settings.nearDistance,22);
    assert.equal(settings.singleLod,2);
    assert.equal(settings.importedNearLod,2);
    assert.equal(settings.farDistance,22);
    assert.equal(settings.distantLodDistance,90);
    assert.equal(settings.distantGrassDensity,.25);
    assert.equal(settings.windDistance,60);
    assert.deepEqual(settings.grassMix?.map(entry=>entry.percentage),[10,45,45]);
    assert.deepEqual(settings.grassMix?.map(entry=>entry.variant),[
        'grass_medium_01_tiny_d_LOD2',
        'grass_medium_01_small_a_LOD2','grass_medium_01_small_b_LOD2',
    ]);
});

test('production adapter warms real draw variants and recycles depth registrations without grass shadows', async (t) => {
    const { createServer } = await import('vite');
    const { Vector2, Vector3 } = await import('@babylonjs/core/Maths/math.vector');
    const { VertexData } = await import('@babylonjs/core/Meshes/mesh.vertexData');
    const { Color3 } = await import('@babylonjs/core/Maths/math.color');
    const { RawTexture } = await import('@babylonjs/core/Materials/Textures/rawTexture');
    const { FreeCamera } = await import('@babylonjs/core/Cameras/freeCamera');
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
        new FreeCamera('warm-up-camera', new Vector3(0, 2, -5), scene);
        grass.warmUpGeometry = geometry;
        grass.renderer.prepareStaticMaterials();
        for (const staticGrass of [false, true]) grass.passMaterial('GRASS_PREPASS', staticGrass);
        // NullEngine cannot compile WGSL. Exercise the real probe lifecycle;
        // native WebGPU remains responsible for validating pipeline creation.
        for (const material of [...grass.renderer.materials, ...grass.passMaterials]) {
            t.mock.method(material, 'isReady', () => true);
        }
        await grass.warmUp();
        const probes = scene.meshes.filter(mesh => mesh.name.startsWith('grass-warm-up:'));
        assert.equal(probes.length, grass.renderer.materials.length);
        assert.ok(probes.every(mesh => mesh.isEnabled() && mesh.isVisible && mesh.alwaysSelectAsActiveMesh));
        assert.ok(probes.every(mesh => mesh.thinInstanceCount === 1));
        assert.deepEqual(new Set(probes.map(mesh => mesh.material)), new Set(grass.renderer.materials));
        assert.equal(depth.rtt.renderList!.length, probes.length);
        assert.equal(new Set(depth.materials).size, 2, 'both static and dynamic depth variants participate');
        assert.ok(shadows.maps.every(map => map.renderList!.length === 0));
        grass.finishWarmUp();
        grass.finishWarmUp();
        assert.ok(probes.every(mesh => mesh.isDisposed()));
        assert.equal(depth.rtt.renderList!.length, 0);
        assert.equal(depth.materials.length, 0);
        await grass.warmUp();
        grass.finishWarmUp();
        assert.equal(depth.materials.length, 0, 'repeated warm-up does not accumulate registrations');
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
        const camera = scene.activeCamera!;
        camera.position.set(0,2,-5);
        const actor = { position: new Vector3(), surf: 0, flight: {active:false}, rocketJump: {active:false}, swimming: {active:false} };
        const wake = {copyInteractionSegments:()=>0}, lights = {apply:()=>{}};
        camera.setTarget(new Vector3(0,2,100));
        grass.update(0,camera.position,actor,wake,lights);
        const front = scene.meshes.filter(mesh=>mesh.name.startsWith('grass:')&&mesh.isEnabled()&&mesh.getBoundingInfo().boundingBox.minimum.z>5);
        assert.ok(front.length>0,'forward view retains grass in front of the camera');
        const frontGeometry = front.map(mesh=>mesh.geometry);
        camera.setTarget(new Vector3(0,2,-100));
        grass.update(0,camera.position,actor,wake,lights);
        assert.ok(front.every(mesh=>!mesh.isEnabled()),'opposite view disables completed forward grass patches');
        assert.ok(front.every(mesh=>!depth.rtt.renderList!.includes(mesh)),'opposite grass also leaves camera depth');
        camera.setTarget(new Vector3(0,2,100));
        grass.update(0,camera.position,actor,wake,lights);
        assert.ok(front.every((mesh,index)=>mesh.isEnabled()&&mesh.geometry===frontGeometry[index]),'turning back restores cached geometry immediately');
        assert.equal(new Set(depth.rtt.renderList).size,depth.rtt.renderList!.length);
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
