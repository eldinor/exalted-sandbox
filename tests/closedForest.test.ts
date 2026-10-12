import test from 'node:test';
import assert from 'node:assert/strict';
import { CLOSED_FOREST, forestLod, placeClosedForest, type ForestSampling, forestAccessExcluded, usesBorderImpostor, realForestVariant } from '../src/forest/ClosedForestPlacement.ts';
import { PropCollisions } from '../src/world/propCollisions.ts';
import { OPEN_FOREST, OPEN_FOREST_MIX, openForestExcluded, placeOpenForest } from '../src/forest/OpenForestPlacement.ts';
import type { PinePrototype } from '../src/forest/PinePack.ts';

const support = new Float32Array([0, 0, 0]);
const sampling = (): ForestSampling => ({ minX: -468, maxX: 468, minZ: -351, maxZ: 351,
    minY: 0, maxY: 200, forestAt: (_x, z) => z > -100 && z < 200,
    heightAt: (x, z) => 70 + x * .01 + z * .02, slopeAt: () => .1, submergedAt: () => false });

const openModels: PinePrototype[] = OPEN_FOREST_MIX.map(entry=>({name:entry.variant,near:[],far:[],
    height:entry.variant.includes('medium')?10:entry.variant.includes('small')?5:2,rootSupport:support}));
test('open woodland deterministically fills only the extension with all six models and clear viewpoints',()=>{
    const sample=sampling(),a=placeOpenForest(sample,openModels,10),b=placeOpenForest(sample,openModels,10);
    assert.deepEqual(a,b);assert.ok(a.trees.length>200);
    assert.equal(new Set(a.trees.map(tree=>tree.variant)).size,6);assert.equal(a.colliders.length,a.trees.length);
    for(const site of a.trees){
        assert.ok(site.x>OPEN_FOREST.minX+2&&site.x<=OPEN_FOREST.maxX);
        assert.equal(openForestExcluded(site.x,site.z),false);
        assert.ok(Math.abs(site.y-(sample.heightAt(site.x,site.z)-.03))<1e-8);
        assert.ok(site.scale>=1.19&&site.scale<=1.61,'all models retain pack proportions');
    }
    assert.equal(openForestExcluded(-248,125),true);
    assert.equal(openForestExcluded(-207,80),true,'overlook sightline stays clear');
    assert.ok(a.trees.some(tree=>Math.hypot(tree.x+248,tree.z-125)<40),'trees surround the overlook clearing');
});
test('open trees exclude roads, water and steep slopes and collide only with their own trunks',()=>{
    const sample=sampling();sample.forestAt=(_x,z)=>!(z>20&&z<40);
    sample.submergedAt=(_x,z)=>z>150;sample.slopeAt=(_x,z)=>z<0?.9:.1;
    const placed=placeOpenForest(sample,openModels,10);
    assert.ok(placed.trees.length>0);
    for(const tree of placed.trees){assert.ok(tree.z>=0&&tree.z<=150);assert.ok(tree.z<=18||tree.z>=42);}
    const collisions=new PropCollisions();for(const trunk of placed.colliders)collisions.add(trunk);
    const trunk=placed.colliders[0],position={x:trunk.x-2,y:trunk.minY+1,z:trunk.z};
    collisions.move(position,{x:4,z:0},1);assert.ok(position.x<trunk.x,'walking stops at the trunk');
    const flight={x:trunk.x-2,y:trunk.maxY+2,z:trunk.z};
    collisions.move(flight,{x:4,z:0},1);assert.ok(flight.x>trunk.x,'the new forest is not a flight-height area barrier');
});

test('impostor expansion preserves sites/barriers and real trees protect the edge and spawn ring', () => {
    const placement = placeClosedForest(sampling(), support, 10);
    const real = placement.trees.filter(site => !usesBorderImpostor(site.x,site.z));
    const cards = placement.trees.filter(site => usesBorderImpostor(site.x,site.z));
    assert.ok(cards.length > placement.trees.length * .7,'most trees now use the cheap representation');
    assert.equal(real.length+cards.length,placement.trees.length);
    assert.ok(real.some(site=>site.x>-367));
    assert.ok(real.some(site=>Math.hypot(site.x+383.5,site.z-52)>18&&Math.hypot(site.x+383.5,site.z-52)<33));
    for(const site of cards) {
        assert.ok(site.x<=-367);
        assert.ok(Math.hypot(site.x+383.5,site.z-52)>33);
    }
    const small=real.filter(site=>realForestVariant(site.x,site.z)==='Pine_small_1');
    assert.ok(small.length>real.length*.15&&small.length<real.length*.35,'stable approximate 25% Small 1 share');
    assert.deepEqual(real.map(site=>realForestVariant(site.x,site.z)),real.map(site=>realForestVariant(site.x,site.z)));
    assert.deepEqual(placeClosedForest(sampling(),support,10),placement,'representation selection does not alter placement or barriers');
});

test('closed forest repeats one big model deterministically only on the chart eastern edge', () => {
    const sample = sampling(), a = placeClosedForest(sample, support, 10), b = placeClosedForest(sample, support, 10);
    assert.deepEqual(a, b); assert.ok(a.trees.length > 400);
    assert.equal(CLOSED_FOREST.variant, 'Pine_big_1');
    for (const site of a.trees) {
        assert.ok(site.x <= -354 && site.x >= -463);
        assert.equal(forestAccessExcluded(site.x, site.z), false);
        assert.ok(site.scale >= 1.8 && site.scale <= 2.2);
        assert.ok(Math.abs(site.y - (sample.heightAt(site.x, site.z) - .03)) < 1e-8);
    }
});

test('trees conservatively exclude other biomes, roads, water and steep terrain', () => {
    const sample = sampling();
    sample.forestAt = (_x, z) => z > 0 && !(z > 50 && z < 65);
    sample.submergedAt = (_x, z) => z > 100;
    sample.slopeAt = (_x, z) => z < 20 ? .8 : .1;
    const { trees } = placeClosedForest(sample, support, 10);
    assert.ok(trees.length > 0);
    for (const tree of trees) {
        assert.ok(tree.z >= 20 && tree.z <= 100);
        assert.ok(tree.z <= 48 || tree.z >= 67);
    }
});

test('the overlapping closed-area barrier stops walking, flight and fast crossings between trees', () => {
    const sample = sampling(), placement = placeClosedForest(sample, support, 10), collisions = new PropCollisions();
    for (const collider of placement.barriers) collisions.add(collider);
    for (const y of [70, 300, 1100]) for (let z = 0; z < 100; z += 1.1) {
        const point = { x: -330, y, z }, velocity = { x: -100, z: 0 };
        collisions.move(point, velocity, 1);
        assert.ok(point.x > -420, `Crossed barrier at height ${y}, z=${z}`);
    }
    const clear = { x: -390, y: 70, z: -200 };
    collisions.move(clear, { x: -100, z: 0 }, .5);
    assert.equal(clear.x, -440);
});

test('removing forest colliders preserves desert collisions and cleans the grid', () => {
    const collisions = new PropCollisions(), desert = { x: 0, z: 0, radius: 2, minY: 0, maxY: 5 };
    collisions.add(desert);
    const barriers = placeClosedForest(sampling(), support, 10).barriers;
    for (const barrier of barriers) collisions.add(barrier);
    for (const barrier of barriers) { collisions.remove(barrier); collisions.remove(barrier); }
    assert.deepEqual(collisions.colliders, [desert]);
    assert.equal(collisions.query(-450, 0, -410, 0, .32).size, 0);
    for (const cell of collisions.cells.values()) assert.deepEqual(cell, [desert]);
});

test('LOD includes camera altitude, keeps distant authored crowns, and culls beyond the outer distance', () => {
    assert.equal(forestLod(-440, 70, 50, { x: -420, y: 80, z: 50 }), 1);
    assert.equal(CLOSED_FOREST.nearDistance, 0);
    assert.equal(forestLod(-440, 70, 50, { x: -420, y: 180, z: 50 }), 1);
    assert.equal(forestLod(-440, 70, 50, { x: 400, y: 80, z: 50 }), -1);
});


test('doubling the strip reserves an accessible spawn clearing and continuous western exit corridor', () => {
    const placement = placeClosedForest(sampling(), support, 10), collisions = new PropCollisions();
    assert.equal(CLOSED_FOREST.eastBoundary, -352);
    for (const barrier of placement.barriers) {
        collisions.add(barrier);
        assert.equal(forestAccessExcluded(barrier.x, barrier.z, barrier.radius), false);
    }
    assert.ok(placement.trees.some(site => site.x > -410), 'trees fill the newly added half');
    for (const z of [46, 52, 58]) {
        const position = { x: -383.5, y: 70, z };
        collisions.move(position, { x: 100, z: 0 }, .6);
        assert.equal(position.x, -323.5, 'spawn can exit along the corridor');
    }
    for (let angle = 0; angle < Math.PI * 2; angle += .1) {
        const x = -383.5 + Math.cos(angle) * 17, z = 52 + Math.sin(angle) * 17;
        for (const barrier of collisions.query(x, z, x, z, .32)) {
            assert.ok(Math.hypot(x - barrier.x, z - barrier.z) > barrier.radius + .32);
        }
    }
});
