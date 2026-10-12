# Exalted Current Work

## Product Direction

The playable **Exalted application** remains the main product under development.
It contains the authored world, avatar, movement, spells, terrain interaction,
water, atmosphere, props, collisions, UI, and other player-facing systems.

Work should be evaluated by how it supports the quality, performance, and
maintainability of this main application.

## Corrected dense forest contour

The 2026-10-12 user concept now defines a curved western canopy edge instead
of the rectangular border strip. The middle pocket curves inward; open mixed
woodland fills the released area. Real trees occupy the first 15 m along the
curved edge; closed-area colliders follow it. The spawn clearing/corridor,
terrain palette, model mixes and grounding rules remain separate constraints.
The reference is saved under `public/terrain/forest/concept`; editable boundary
points live in `src/forest/DenseForestShape.ts`. See [FOREST_NOTES.md](FOREST_NOTES.md).

## Open forest toward Forest Outlook

Ctrl+Shift+P now saves a full-placement orthographic map at 4096x3072, including
forest (overhead spruce crowns) and all authored desert props. It bypasses live
distance/streaming visibility using temporary copies, retains the rig/post chain,
and saves in the screenshot gallery. Ctrl+P keeps its terrain/water map capture.

The accessible woodland west of the closed strip now extends to and around
Forest Outlook: 593 real trees at 8 m spacing, using Medium 1/2, Small 1/2
and Sapling 1/2 at 25/25/15/15/10/10% target shares. The overlook retains an
18 m clearing and a southeast sightline; Cube Spawn's corridor stays clear.
Individual trunk colliders keep this section walkable. Models retain their
pack size ratios, use LOD2 and share the darker foliage material. Existing
closed-strip placement/barriers are unchanged. See [FOREST_NOTES.md](FOREST_NOTES.md).

## Spruce cutout and impostor evaluation

Production grass now gates colour/depth draws by the camera frustum and defers
off-screen placement jobs. Cached patches remain available when turning back;
density and distance defaults stay the same. See [GRASS.md](GRASS.md).

`/spruceland.html` compares the prepared alpha-cutout blue spruce (11,364
triangles) with a two-triangle baked impostor. Seventeen ground/elevated/overhead
albedo and object-normal views are saved under `public/terrain/forest/blue-spruce`.
Both use production lighting and matching alpha-tested camera depth; the full
tree also has matching custom shadow passes. Controls support view, height,
threshold, visibility and depth inspection. The main forest now uses this spruce
impostor inside the corrected dense contour, apart from the first 15 m at its
accessible edge and a 33 m radius around Cube Spawn. Real trees mix
Big 1 and Small 1 LOD2, with a deterministic 25% Small 1 selection and the pack's
relative sizes. Clearing, spacing and barriers stay intact. There are 741 cards,
110 Big 1 and 49 Small 1 trees in the dense section, batched in 32 m chunks.
Both representations warm colour/depth pipelines behind the loading screen.
Main-app real pine foliage now has a darker, cooler albedo tint to approach the
spruce border colour; bark retains its source colour.
See [FOREST_NOTES.md](FOREST_NOTES.md) and the
[asset README](public/terrain/forest/blue-spruce/README.md) for regeneration and
prototype limits.

## Sandy island shoreline

The island now uses the same 30 m beach sand textures and stochastic mapping.
A separate lake-only water/beach eligibility channel fills submerged island-bank
gaps without changing original level inference, river flow or dry island terrain.
Lake level stays 41.669526 m. Typecheck/148 tests and native ground/map checks
passed; the island centre stays dry and 768 submerged bank samples have no gaps.
See [BIOMES_MAPS.md](BIOMES_MAPS.md).

## Lake shoreline correction

Heightmap lake water now follows the largest connected wet basin, using the old
reference outline for identification rather than a hard centroid cut. A 50 m
candidate margin fills submerged shore areas beyond the old outline. The rendered
rim clips at the same +0.025 m offset as the plane, closing thin bank gaps. Lake
level remains about 41.67 m; island/dry land and disconnected pools are excluded.
The rendered/depth/map/swimming footprint is shared; GLB comparison retains its
old boundary behavior. See [HEIGHTMAP_INTEGRATION.md](HEIGHTMAP_INTEGRATION.md).

## Beach ground biome

The light-blue lake/river shore is now Beach, with saved `biome-beach-9.png`
coverage and `aerial_beach_01` colour/OpenGL normal/ARM maps. Texture width is
30 m as specified by the user. Three offset/rotated samples suppress regular
repeats. Runtime packs rock/beach masks into R/G of
`ground-detail-coverage-9.png`; blending is complementary to adjoining land,
with roads as the final overlay. Water eligibility, lake level, geometry,
deformation and the original desert material remain intact. Textures warm
behind loading and share ground samplers; heightmap requests 27 texture slots.
Current supplied maps are 2K (~0.68 px/cm at 30 m); the stated 2.7 px/cm refers to
approximately 8K source resolution. See [BIOMES_MAPS.md](BIOMES_MAPS.md).

## Closed eastern forest trial

The main heightmap world now places **1,169** replacement `Pine_big_1` trees in
the forest's eastern **116 m** strip (Babylon X <= -352), at 5.5 m spacing and
about 20 m height. Trees use **LOD2 everywhere**, in 48 independent 32 m chunks;
LOD1 meshes/materials/buffers are no longer created or warmed. Production
lighting, alpha-tested depth and loading-screen draw warm-up are retained.
Tree shadow casting and wind remain off. The spawn keeps its 18 m clearing and
a 16 m wide exit corridor toward positive X; 1,401 independent flight-height
barrier cylinders close the rest of the stand. The overlook remains accessible.

The Benchmark camera mode menu offers separate **Automatic forest route** and
**Automatic grassland route** options. The forest route has a fixed 30-second
ground-edge pass followed by an aerial canopy sweep, three seconds of preparation,
and restoration/cancellation behavior shared with the grass route. **Forest trees**
can be toggled before a run for comparison. Route kind, name, version, height,
pitch and yaw are exported. Typecheck/all 143 Node tests passed; a native WebGPU
run completed all 30 seconds, checked ground/aerial views, tree-off recording
and Escape restoration. No build or Playwright. Full forest integration remains
deferred; see [FOREST_NOTES.md](FOREST_NOTES.md).

## Main Application

The main Exalted application includes:

- the authored Exalted world based on the supplied map and world assets;
- the main avatar and animation system;
- walking, running, flying, swimming, and terrain grounding;
- snow, sand, and other biome-specific ground deformation;
- spells and environmental interaction;
- water, waterfall, wind, sky, lighting, shadows, and post-processing;
- biome props, collisions, spawn locations, and world navigation;
- production UI and performance controls.

The authored world and its Blender-to-Babylon asset pipeline are the production
priority.

The main app now uses the roads heightmap and biome map by default. Implementation,
validation and remaining visual checks are recorded in
[HEIGHTMAP_INTEGRATION.md](HEIGHTMAP_INTEGRATION.md). `?terrain=glb` retains the old
terrain for comparison; the authored Grassland lab still uses the GLB.

Desert props now retain approximately 25% of authored placements at the current
half-size world scale to reduce crowding. Stable placement selection is shared
by all material parts, render passes and collision extraction; surviving props
keep their positions, rotations and sizes. See `world/desertDensity.ts`.

Desert props use 64 m spatial chunks with shared near/far rendering batches per
camera and shadow cascade. Independent pass culling reduces submitted geometry
while keeping authored placement, density and collisions unchanged. See
[DESERT_PROPS.md](DESERT_PROPS.md).
Desert ground uses the previous imported GLB floor texture set again. The
`aerial_beach_01` colour/normal/ARM experiment passed typecheck, 131 tests and a
native WebGPU visual check, then was reverted at the user's request. Assets and
results remain documented in [DESERT_PROPS.md](DESERT_PROPS.md). Improved biome
blending remains active.

The main app now includes a collapsed recording benchmark above Avatar Colors,
with manual recording and a repeatable automatic grassland camera route.
See [BENCHMARK.md](BENCHMARK.md) for metrics, comparison guidance, and the flag
that removes the panel for a future public release.

## Supporting Utilities

Main-app Ctrl+P now captures the complete authored terrain from a north-up
orthographic offscreen camera at 2048 × 1536, into the existing Screenshots
gallery. P retains viewport capture. The map uses current ground material
textures/coverage and water geometry, with map lighting and flat blue water;
it excludes streamed vegetation/props, avatar and temporal camera effects.
The gameplay camera/post chain remain intact and temporary resources are
disposed after capture. See the controls in [README.md](README.md).

The following are side utilities and research environments. They are useful for
developing and validating individual systems, but they are not replacements for
the main Exalted application.

### Procedural world generator

The files under `generator/` explore procedural elevation, biomes, hydrology,
roads, landmarks, placement, terrain rendering, and deformation for a separate
generated world.

The generated world's dimensions, terrain representation, materials, and
content rules do not define the authored Exalted map. Technology may be moved
from the generator into the main application only through an explicit
integration decision.

### Grass Lab

The Grass Lab compares procedural, imported, and hybrid grass blades using
deterministic placement, wind, interaction, LOD, and performance measurements.
Its reusable subsystem now supplies production grass in the authored Exalted
world; the lab remains available for isolated tuning and comparisons.

`/generator/grassland.html` is the authored-world counterpart to the generated
grass benchmark. It shares the lab controls, loads the production half-scale
`alpha-map.glb`, and places imported LOD1/LOD2 grass on the authored grassland
palette with exact triangle grounding and a moving patch window. It remains an
isolated utility with lab lighting and ground rendering. The main app now uses
the shared subsystem with heightmap biome classification, a Tiny D / Small A / Small B 10/45/45 model
mix at density 3, avatar walking/surf interaction and a production depth pass.
Tall grass is removed. Grass surfing uses green sides and tiny blade-shaped
particles in the shared spray pool. Grass receives world shadows but does not cast shadows. Its biome ground uses
the same tiled Material-326-A PBR texture set as Grassland, at a 4 m repeat. See
[GRASS.md](GRASS.md) for contracts, validation and the measured geometry cost. See [README.md](README.md#grassland-lab)
for controls and [HISTORY_DOCS.md](HISTORY_DOCS.md#grassland-lab-technical-notes)
for implementation details and streaming limitations.

### Forestland Lab

The main app's forest biome ground now uses the supplied `forrest_ground_01`
colour/normal/ARM textures, tiled at 4 m and blended using the current biome PNG
until dedicated masks are authored. This ground-only integration does not add
trees. See [FOREST_NOTES.md](FOREST_NOTES.md) for its contract and asset findings.
Heightmap grass/forest/desert now blend using the generated packed
`ground-coverage-9.png`, shared with grass placement. Complementary weights and
4–6 m transitions remove pale seams; land extends beneath the existing road
overlay. See [BIOMES_MAPS.md](BIOMES_MAPS.md) for regeneration and channel meanings.
Heightmap road display edges now use a separate 1.1 m Gaussian feather and a
single final material overlay. Original gameplay road firmness and deformation
channels are retained; grass clears the firm road and thins through shoulders.
The road display mask is now saved and loaded from
`public/assets/textures/mask-roads-9.png`, with provenance JSON and a regeneration
script. Different road materials will use a separate selection/weight map.
Heightmap rock ground now uses `river_small_rocks` colour/normal/ARM from
`public/terrain/rock/river/` and the saved `biome-rock-9.png` mask. Three randomized
texture samples suppress the visible regular repeat, with matching normal/ARM
transforms and stable world-space placement. The previous `rock/03` set is
retained as a tested reference. The northern
sandy-painted corridor is corrected to rock in both rendering and sand softness;
southern desert, snow, roads, water and forest overlook remain intact. Land/rock
masks regenerate together; see [BIOMES_MAPS.md](BIOMES_MAPS.md).

`/forestland.html` populates the current heightmap's dark-green forest biome with
12 pine-pack variants with authored LOD1/LOD2 and a bottom percentage mix panel, using deterministic
32 m chunk batches, exact grounding, camera controls and a 30-second benchmark.
It remains a supporting lab; production forest integration is unchanged. See
[generator/forestland/README.md](generator/forestland/README.md).

### World editor

The planned browser world editor supports regional inspection, placement,
anchors, masks, metadata, and Blender round trips. It is an authoring utility;
the playable Exalted application remains the authority for final runtime
behavior and validation.

### Avatar and garment editors

Avatar utilities support inspection, export, editing, reimport, skeleton and
animation validation, modular appearance, and garment experiments. A future
Garment Lab may test skinned clothing and Verlet or XPBD secondary motion.

These utilities produce assets and manifests for the main avatar system. They
are not separate player applications.

### Performance and asset demos

Forest, mountain, forest-road, and similar pages are isolated demonstrations.
They may remain in JavaScript where appropriate and do not need to follow every
main-application migration decision. Their results should be documented before
production techniques are moved into Exalted.

## Blender-to-Babylon Technical Brief

The current Blender-to-Babylon technical brief will be revised. After approval,
the revised brief will become the base production contract between Blender
artists and Babylon developers for the authored Exalted world.

The revised brief should define:

- the exact scope of the authored map;
- world dimensions, origin, scale, axes, and North direction;
- Blender and Babylon ownership;
- terrain, biome, prop, placement, collision, and anchor delivery;
- material-mask and embedded-texture conventions;
- reusable asset, pivot, naming, and LOD requirements;
- runtime manifests and versioning;
- validation and performance budgets;
- the representative-biome approval process;
- asset provenance and licensing.

The brief does not govern the procedural generator unless a requirement is
explicitly shared between both projects.

## Current Terrain Direction

For the authored map, the current working decision is:

- use one optimized terrain geometry level;
- do not create routine terrain LOD meshes;
- use streaming or chunking only when loading, culling, editing, masks, or
  measured performance requires it;
- allow separate distant mountain or skyline proxies where useful;
- apply LOD primarily to trees, rocks, bushes, grass, and other props;
- use image-based masks for smooth terrain material blending independent of
  mesh density;
- use `public/assets/textures/vis_ground_heightmap-11.png` for the default
  400-by-400 terrain grid and `vertex_color_4k-9.png` for its biome colour,
  road and soft-ground masks; retain the GLB source and its original biome-map
  behaviour in `?terrain=glb`;
- use `BIOME_SPLAT_MAP.md` as the delivery contract for the future explicit
  RGBA material-weight map;
- keep terrain collision separate when the visual mesh is unsuitable.

The main app currently includes a 3 m reflective test cube ten metres left of
the default avatar spawn. Its bottom is 0.5 m above the sampled terrain. A
512-pixel dynamic reflection probe retains its last capture and refreshes only
while the avatar is within 20 m, at one cubemap update every four frames.

A second 1.5 m shader test cube sits ten metres right of the default spawn with
the same 0.5 m clearance. Its animated crystalline violet/cyan surface emits HDR
edges and veins into the existing bloom chain. Within 3 m it offers an E-key
interaction; activation dissolves the cube and grows a persistent animated
magical portal ring in its place. The ring contains a blended HDR vortex surface
with counter-rotating spiral currents, travelling sparks and a feathered edge.
At activation the complete portal snaps parallel to the nearest vertical cube
face toward the avatar, then retains that orientation.
Crossing within 1.5 m of the completed portal shows a world-anchored `Portal
entered` label and dispatches `exalted:portal-entered` on `window`. The event is
edge-triggered and fires again only after the avatar leaves and re-enters. Entry
remains locked until the dissolve and portal-growth animation finishes, followed
by a 0.45-second settling delay, so an avatar already inside the radius sees the
complete transition before the label and event appear.

The existing `alpha-map.glb` is approximately 329,000 triangles and is a
reasonable starting point for a single-level terrain, subject to validation on
the target laptop and desktop hardware.

The 50% authored-world scale established in `halved.html` is now the production
scale used by `index.html`. It compresses terrain geometry and authored world
coordinates to approximately 936 x 702 metres, moves prop placements and water
with that terrain, and keeps the avatar, prop geometry, movement units, and
metre-based terrain texture density at their original physical scale.

The reflective and magical portal cube prototypes remain in source for later
use, but neither demo cube is instantiated in the production world.

Because halving both horizontal axes makes unchanged authored placements four
times denser per square metre, the runtime deterministically retains 30% of
large desert boulders. Small stones and vegetation retain their authored counts,
and collision cylinders are created only for retained boulders.

## Representative Biome Delivery

The first artist validation package should be one complete biome. Desert is a
suitable first biome because it tests terrain blending, roads, rocks, sparse
vegetation, placement, collision, sand deformation, lighting, and long-distance
readability.

The proposed minimum delivery for that biome is:

```text
biome_desert/
в”њв”Ђв”Ђ desert.glb
в”њв”Ђв”Ђ desert_material_mask.png
в””в”Ђв”Ђ README.md
```

- `desert.glb` contains the optimized terrain or biome geometry, reusable props,
  authored placements, UVs, materials, and embedded PBR textures.
- `desert_material_mask.png` is a non-color RGBA image that controls the blend
  between surfaces such as sand, dirt, rock, and path.
- `README.md` records scale, axes, mask-channel meanings, texture tiling scale,
  Blender version, and export settings.

The desert GLB is a useful reference for reusable props and authored placement.
Its existing terrain material arrangement is not automatically the final
material pipeline.

## Working Principles

1. Develop player-facing systems in the main Exalted application.
2. Use separate labs for uncertain or performance-sensitive techniques.
3. Keep lab code portable, but integrate it only after visual and performance
   validation.
4. Treat Blender-authored assets and Babylon runtime behavior as a documented
   contract.
5. Avoid allowing generator assumptions to redefine the authored world.
6. Validate production assets with the real Exalted camera, controller,
   lighting, materials, and target hardware.
7. Preserve editable source files, runtime exports, manifests, versions, and
   license information.

## Near-Term Priorities

1. Revise and approve the Blender-to-Babylon technical brief.
2. Lock the authored-world coordinate and scale contract.
3. Define and validate the first complete biome delivery.
4. Use the desert as the initial representative biome unless another biome is
   selected during brief revision.
5. Test its terrain masks, embedded materials, reusable props, collisions,
   authored placement data, and sand deformation in the main Exalted
   application.
6. Continue grass, forest, avatar, and editor research in isolated utilities.
7. Move successful utility systems into the main application through measured,
   reviewable integration stages.
