# Exalted application architecture

This document describes the production world application served by `index.html`.
It covers the TypeScript code under `src`, its runtime order, major data paths,
and extension points. The supporting grass/forest labs and asset tools are utilities and
are described separately under [Demo boundaries](#demo-boundaries).

## System overview

Exalted is a WebGPU-only Babylon.js application. It uses Babylon for device and
scene management, resources, cameras, meshes, and render passes. World simulation,
terrain deformation, character animation, spells, atmosphere, shadows, and
post-processing are custom systems with custom WGSL.

`src/main.ts` is the composition root. It creates systems in dependency order,
warms their GPU resources, and runs one ordered update loop. Systems own their
resources and expose small methods such as `update`, `warmUp`, `reset`, and
`registerPrepass`. There is no general entity-component framework or event bus.

```mermaid
flowchart TD
    HTML[index.html] --> Main[src/main.ts]
    Main --> Core[core: settings, input, camera, performance]
    Main --> Terrain[terrain: authored world, local deformation, probes]
    Main --> Render[render: sky, shadows, depth prepass]
    Main --> Character[character: movement, procedural figure, cloth]
    Main --> World[world: props, collision, persistent water]
    Main --> Spells[spells: coordinator and pooled spell resources]
    Main --> VFX[vfx: spray, wake, flight and water effects]
    Main --> Post[post: screen-space render chain]
    Main --> UI[ui: spawn controls, tuning, diagnostics, Inspector]
    Registry[shaders/registry.ts] --> WGSL[shaders/**/*.wgsl]
    Terrain --> Registry
    Render --> Registry
    Character --> Registry
    Spells --> Registry
    VFX --> Registry
```

## Runtime modes

The default mode loads the authored Exalted world:

- `vis_ground_heightmap-11.png` supplies native 16-bit heights for a
  400-by-400 grid; `vertex_color_4k-9.png` supplies biome colour and masks.
- `?terrain=glb` retains `alpha-map.glb` and its previous biome-map behaviour.
- The original terrain and authored map coordinates use the production 0.5
  scale, yielding an approximately 936 x 702 metre world while avatars, prop
  geometry, movement and effects remain metre-sized.
- `exalted_desert.glb` supplies authored desert vegetation and rocks.
- Shared Grassland geometry streams onto the authored grass biome, with avatar
  walking/surf bending and a matching production depth pass. Density is 3; grass
  receives shadows but does not cast them. See [GRASS.md](GRASS.md).
- A separate flower-family adapter streams dandelion colonies using the same
  patch/interactions infrastructure. Colour/depth share alpha cutout and fade;
  flower density/mix and diagnostics remain separate, with future daisies in mind.
- Heightmap textured ground blends grass, forest and desert using the generated
  linear RGB `ground-coverage-9.png`, also read by CPU grass placement. Existing
  snow, road, water and deformation masks remain separate. See
  A saved `biome-rock-9.png` supplies rock ground and removes sand softness in
  the corrected northern corridor. See [BIOMES_MAPS.md](BIOMES_MAPS.md) for
  preparation and the 27-texture device limit. Beach coverage is saved separately
  and packed with rock into `ground-detail-coverage-9.png` (R rock, G beach),
  retaining water eligibility independently. `BeachGround.ts` owns the supplied
  aerial beach colour/normal/ARM maps at 30 m physical width; stochastic sampling
  shares the rock implementation and existing repeat samplers.
- Water geometry is derived from the selected terrain triangles and water mask plus
  `world/waterReference.json`.
- The spawn bar exposes named locations and texture and wind controls.
- The interactive crystalline Cube is anchored to `FOREST_CUBE_SPAWN`, converted
  from chart coordinates once and grounded on the selected terrain. E dissolves
  it into a persistent portal; entry publishes `exalted:portal-entered` with the
  legacy ID/position payload. Reflection Cube/probe is absent from main startup.

`?terrain=procedural` selects the original procedural snow terrain. It uses
the nested clipmap and generated heightfield and keeps geometric snow deformation
available as an isolated reference mode. Authored world water and desert props are
only created for the Exalted mode.

`?gpuTiming=1` enables Babylon GPU timestamp capture where the browser and driver
support it. It remains opt-in because unsupported timestamp writes can invalidate
a WebGPU command buffer.

## Startup and ownership

Startup is deliberately sequential because later systems consume resources owned
by earlier ones.

1. Validate the required canvas and WebGPU support.
2. Create and initialize `WebGPUEngine`.
3. Register raw WGSL sources in Babylon's shader stores.
4. Create the `Scene`, camera rig, analytic sky, cascaded shadows, and depth
   prepass.
5. Build the selected terrain mode.
6. In Exalted mode, derive persistent water and load authored desert props.
7. Create the movement controller and place it at the initial spawn.
8. Create the procedural character, shared spray pool, terrain contact system,
   surf wake, flight feedback, water effects, and spells.
9. Connect collision, prepass, shadow, spell-light, and settings dependencies.
10. Create post-processing and UI.
11. Warm materials, meshes, render targets, and post passes behind the loading
    screen.
12. Render three complete warm-up frames, then start the normal render loop.

The owner that constructs a resource normally disposes it through the scene
disposal lifecycle. Shared pools remain owned by their top-level system:

- `Terrain` owns deformable terrain state and terrain materials.
- `WorldGrass` owns streamed grass patches and shared pass materials, unregistering
  culled/disposed meshes from the depth target. Grass is excluded from shadow targets.
- `Character` owns procedural figure meshes, materials, skeleton data, and cloth.
- `SprayField` owns the bounded particle pool used by movement, water, and spells.
- `SpellSystem` owns spell instances, pooled water strands, crystals, and lights.
- `PostChain` owns temporal history and its post-process passes.

After startup, `globalThis.EXALTED` exposes the constructed runtime for browser
inspection. It is a typed diagnostics surface, not an internal dependency locator.

## Frame lifecycle

Ordering in the frame loop is part of the architecture. Moving a step can produce
one-frame lag, stale shadow matrices, missed deformation brushes, or particles
uploaded after their emitters run.

```mermaid
sequenceDiagram
    participant Input
    participant Character
    participant Camera
    participant World
    participant VFX
    participant Scene
    participant Post
    participant UI

    Input->>Input: poll keyboard and pointer
    Character->>Character: movement, flight or swimming
    Character->>Character: solve figure and cloth
    Character->>World: stamp planted-foot contact
    Camera->>Camera: follow controller and resolve obstacles
    Post->>Camera: apply projection jitter
    World->>World: sky and stabilized shadows
    World->>World: spells enqueue deformation and effects
    World->>World: terrain, props and persistent water
    Character->>Character: upload final pose with current shadows
    VFX->>VFX: wake, flight, water effects, spray upload
    Scene->>Scene: depth targets and beauty rendering
    Post->>Post: advance temporal history
    UI->>UI: collect performance data and refresh diagnostics
    Input->>Input: clear one-frame input state
```

Before each frame, pending resize or render-scale changes are applied. They are
queued from DOM callbacks because reconfiguring the WebGPU canvas while a command
buffer still references its swap texture is unsafe.

Spawn changes are also consumed at the frame boundary. A spawn transition resets
input, spells, the ground probe, character movement and pose, contact history,
wake and spray state, camera state, and temporal post history before selecting the
new UI location.

## Terrain and biome data

`Terrain` is the facade used by movement, rendering, effects, and spells. It
selects one of two base surfaces:

- `ExaltedWorld` generates the roads heightmap grid or loads the comparison GLB.
  Both sources retain a CPU `MeshSurface` and expose triangle height, normal and
  biome-weight queries. Its constructor defaults to GLB for supporting utilities;
  `src/main.ts` explicitly selects heightmap unless `?terrain=glb` is requested.
- `Heightfield` generates the procedural terrain textures and CPU sampling data.

In heightmap mode, `AuthoredSurfaceMap` derives a 2049-by-1537 linear RGBA texture
from the roads RGB map: snow, sand, road and water. CPU softness queries and GPU
simulation/beauty/depth/shadow displacement sample the same weights. Local detail
selection scans conservative map coverage inside each triangle's bounding box.
The colour map uses the existing measured PNG palettes; it is not an explicit
artist-authored RGBA splat map. GLB comparison mode retains its vertex-colour
classification through `surfaceTypes.ts`.

`LocalTerrain` extracts the deformable region near the active world position.
`DeformationField` owns a persistent, camera-following pair of GPU state buffers.
Feet, surfing, and spells enqueue brushes into the same state. The terrain beauty,
depth, and shadow shaders read the same deformation include so displaced geometry
and its shadows agree.

`GroundProbe` reads localized GPU-ground information back for alignment where
needed. Imported terrain collision and general character grounding use the retained
CPU triangle surface rather than a separate collision GLB.

## Props, LOD, and collision

`DesertProps` imports authored desert placements, groups compatible geometry and
materials, and renders repeated content with thin instances. Near and far buffers
provide the current two-level prop LOD system. Wind deformation is applied in the
prop shaders and shared with relevant depth and shadow passes.

Desert props now stream through 64 m spatial chunks, merging selected placements
into shared near/far batches per camera and shadow cascade. Conservative individual
prop bounds cull each pass independently; off-camera shadow casters remain eligible.
Fixed typed buffers and shared geometry/materials are reused across movement and
teleports. See [DESERT_PROPS.md](DESERT_PROPS.md) for diagnostics and measured cost.

Desert placement density now follows world area scale: at 0.5 world scale,
roughly 25% of authored placements survive. A stable hash of horizontal placement
coordinates gives all material primitives at the same origin one decision and
keeps selection identical across terrain sources and height rebasing. The
selection runs before instance batching and collider extraction, preserving
survivor transforms and removing collisions for omitted props. This supersedes
the earlier 30% large-boulder-only thinning. Full-size reference worlds retain
all placements. Visibility distances and LOD remain metre-based.

`PropCollisions` builds inexpensive collision primitives for meaningful solid
props. Rocks, quiver trunks, cacti and woody Searsia stems can block character
and camera movement; foliage and soft plants are excluded. `propColliderGeometry`
uses full-detail vertices and the same transferred placement as rendering;
lower stem geometry determines trunk width. The movement solver supports swept horizontal collision,
sliding, vertical separation, recovery from overlap, and flat-top support for
landing.

Terrain itself currently uses a generated grid (or comparison GLB) as one mesh. Dedicated terrain
LOD is deferred because there is one world terrain asset; biome vegetation and
future repeated assets are the higher-value LOD targets.

## Character and movement

`CharacterController` owns authoritative motion state. Walking, surfing,
swimming, and timed flight share its position, velocity, facing, grounding, lean,
and animation signals. Mode-specific helpers consume narrow terrain and camera
contracts rather than the complete renderer.

`Character` is the rendering owner. The avatar is generated procedurally:

- `figure.ts` defines skeleton state and pose solving.
- `build.ts` constructs skinned geometry.
- `cloth.ts` simulates garment panels with Verlet constraints and collision.
- `snowContact.ts` converts planted feet and surfing movement into terrain
  deformation and spray.

The controller updates before the figure. Contact updates after pose solving so a
footprint uses the solved boot position. Final GPU pose synchronization happens
after shadows update so character materials receive current-frame cascade data.

See [AVATAR.md](AVATAR.md) for the asset-editing and replacement strategy.

## Water

World water is split by responsibility:

- `waterGeometry.ts` derives lake and river meshes from authored terrain.
- `waterSurface.ts` provides swimming samples and waterfall emitter clusters.
- `WorldWater` renders persistent lake and river surfaces and owns ripple state.
- `Swimming` controls avatar motion on valid deep-water coverage.
- `WaterEffects` turns swimming and nearby waterfall sites into ripples, spray,
  and mist through the shared particle pool.

Water construction validates that the terrain contains loaded Exalted vertex data.
Heightmap mode samples painted water on finer triangles that preserve the source
triangle planes, excluding northern ocean geometry before tessellation. It keeps
the lake five runtime metres above the median painted shoreline height
(approximately 41.67 m for version 11), shared by rendering and swimming.
`HEIGHTMAP_LAKE_LEVEL_OFFSET` records the requested rise. GLB mode retains Y=0. Only
painted water boundaries need finer geometry; wet interiors retain coarse planes.
Heightmap mode uses a smaller exclusion around near-vertical river faces.
This keeps procedural mode from accidentally entering an authored-world-only path.

## Spells and shared effects

`SpellSystem` is the coordinator for keyboard routing, cast lifecycle, reset,
warm-up, prepass registration, and triangle accounting. Individual spell classes
own their state machines and geometry but receive a shared `SpellContext`.

Shared resources keep spell cost bounded:

- `WaterBody` provides a fixed pool of swept water strands.
- `CrystalField` provides pooled crystal geometry.
- `SpellLights` provides four light slots consumed by world materials.
- `SprayField` provides one fixed-capacity particle pool.
- All terrain changes pass through `DeformationField.brush()`.

This means active spell count changes buffer contents and visibility rather than
creating an unbounded number of render resources.

Melt (`Thaw`, spell 9) keeps its terrain recovery, crystal melting, warm light
and mist. Its legacy snow/slush runoff curve is disabled (`SHOW_RUNOFF = false`)
and acquires no shared-water strand, so the ice-like trace is no longer drawn.

## Rendering pipeline

The custom renderer has four connected layers:

1. `Sky` solves the atmosphere LUT, sun radiance, irradiance, and sky rendering.
2. `ShadowSystem` renders three stabilized custom cascades. Each caster supplies
   the vertex shader that matches its displaced or animated beauty geometry.
3. `DepthPass` renders camera-space depth and the material mask used by
   screen-space effects.
4. `PostChain` applies TAA, SSR, light shafts, bloom downsample and blur, depth
   of field, tonemapping, and sharpening.

Terrain and persistent world water use rendering group 1, while the shared spray
mesh uses group 2. Automatic depth clearing for groups 1 and 2 is disabled in
`main.ts`, allowing later translucent effects to test against existing world
depth. Individual spell and effect meshes choose their group according to their
depth and blending requirements.

The projection jitter is published before the depth prepass and beauty render so
both see the same transform. Temporal history is reset after teleportation,
texture-mode changes, and other discontinuities.

## Shader organization

`shaders/registry.ts` registers immutable maps of complete WGSL stages and shared
Babylon `#include` fragments. Registration is idempotent and happens before any
custom material is constructed.

`shaders/lib` contains logic shared across passes. Geometry-changing and
classification logic belongs here when beauty, depth, shadow, or simulation passes
must agree. Post-process shaders live under `shaders/post`.

Several specialized systems register their own shaders beside their implementation
when the shaders are private to that system, such as world water and post effects.

## Settings, input, UI, and diagnostics

`core/settings.ts` exports:

- `S`, the flat settings object read in hot paths.
- `SCHEMA`, metadata used to construct controls.
- Typed `set`, `onChange`, and preset operations.

Systems read cheap values directly each frame. Settings that require resource or
history work subscribe through `onChange`.

`core/input.ts` owns keyboard, pointer lock, mouse buttons, and one-frame
transitions. `CameraRig` owns the third-person spring arm and obstacle response.

`Overlay` builds tuning and performance controls. `SpawnBar` owns biome
navigation plus compact texture and wind controls. `Ctrl+I` dynamically imports
the matching Babylon Inspector version and docks it on the right. The app uses
`node_modules/.vite-exalted` for its prepared dependencies; SSR tests use separate
caches so running tests cannot invalidate lazy Inspector chunks in the dev server.

`core/perf.ts` maintains frame percentiles, CPU subsystem timings, per-frame draw
counts, triangle estimates, and spike tracking. The frame loop performs the
triangle estimate because it knows which optional systems and meshes are visible.

`await EXALTED.captureDraws(120)` temporarily profiles actual engine submissions
by mesh and render pass, prints a console table, and returns the averaged report.
Indexed counts include instance multiplicity; non-indexed vertex submissions are
reported separately. Wrappers are removed after capture or scene disposal, so
normal frames retain the existing draw counter without extra profiling work.
Compare `/?terrain=glb` and the default source at the same location, camera view,
and gameplay state. Inspector Total Vertices counts resident geometry, whereas
Active Indices counts submitted indices across passes and instances.

## Source layout and dependency direction

```text
src/
  main.ts        composition root and frame orchestration
  core/          settings, input, camera, loading, math and performance
  terrain/       base surfaces, biome data, deformation and ground probes
  render/        atmosphere, shadows and camera-depth prepass
  character/     movement modes, procedural avatar, pose and cloth
  world/         spawn data, props, collision and persistent water
  spells/        spell coordinator, spell implementations and shared pools
  vfx/           bounded particles, surf wake, flight and water effects
  post/          temporal and screen-space post-processing
  ui/            controls, diagnostics and Inspector integration
  shaders/       WGSL entry points and shared includes
```

Dependencies generally point from feature systems toward `core`, terrain query
contracts, and shared render contracts. `main.ts` is the only module expected to
know every top-level system. Avoid importing `main.ts` from feature code or using
`globalThis.EXALTED` for runtime communication.

## Extension points

New biome content should integrate through:

- Authored terrain vertex colours and the shared surface classification rules.
- A world-owned loader similar to `DesertProps`.
- Thin-instance batching and deterministic two-level LOD for repeated assets.
- Simple collision extraction only for meaningful solid objects.
- Existing atmosphere, shadow, depth, spell-light, wind, and post contracts.

New deformation materials should use the existing brush/state system and extend
surface classification, shading, and refill behavior together. Sand and snow may
respond differently while sharing the same spatial state infrastructure.

New spells should implement the coordinator lifecycle, reuse pooled strands,
crystals, lights, and spray where suitable, register animated geometry with depth
and shadow systems, and release all handles on reset.

The eastern forest sections live in `src/world/worldForest.ts`, with shared
TypeScript pine asset, placement, grounding and material adapters in `src/forest`.
It uses 32 m independent thin-instance batches per Big 1/Small 1 LOD2 model
at the accessible 15 m edge and around Cube Spawn, plus CPU-expanded sprite
batches for the dense interior (15 m inside the authored contour, outside the 33 m spawn ring),
sharing two spruce
atlas textures and colour/prepass materials. `ImpostorBatchGeometry.ts` handles
height, yaw-relative view selection and camera-facing geometry without temporary
allocations; `ForestImpostorBatch.ts` owns typed buffers, conservative fixed
chunk bounds, distance compaction and depth-registration cleanup. It uses the
registered production prop shaders and matching alpha-tested depth. Frame updates
follow desert props; pine and card colour/depth pipelines draw during loading. An
independent overlapping-cylinder area barrier shares the existing collision grid
and is removed by ownership on disposal. A benchmark toggle changes rendering,
not access. The shaped dense section reserves the spawn clearing and exit corridor; its
versioned automatic benchmark combines a ground-edge pass and aerial sweep using
the same camera lifecycle as the independent grass route. Tree casting/wind and
full-biome integration remain deferred. `OpenForestPlacement.ts` adds the
walkable section toward Forest Outlook with five selected firs and two pine saplings,
8 m spacing, per-model root grounding and individual trunk cylinders. It leaves
the overlook centre and grassland sightline clear, fills the pocket outside the
corrected dense contour and batches each model independently with shared pack materials. The
existing forest toggle and route include this extension; per-variant pipelines
warm during loading. `FirPack.ts` supplies the selected fir manifest to the shared
hierarchy-baking/root-grounding loader. Pine and fir source containers/materials
are owned independently and released together by the production forest.

The future complete forest implementation must follow [FOREST_SPEC.md](FOREST_SPEC.md):
32 m chunks, thin instances, two geometry LOD levels, stable shadows, root-anchored
wind, trunk-only collision, and separation between asset preparation and runtime
rendering.

## Demo boundaries

The old half-world, forest performance, forest-road and mountain viewers were
removed on 2026-10-12, together with their dedicated renderer/helpers, tests,
preparation script and GLBs. Current Grassland, Forestland, Spruceland, heightmap,
waterfall and generator tools remain independent supporting utilities.
Production must not import their lab entry points or authoring code.

## Validation

Routine architectural changes should run:

```bash
npm run typecheck
npm test
```

The tests cover movement modes, prop collision, terrain sampling and biome
classification, water geometry and swimming, and retained forest preparation
algorithms. GPU appearance and performance still require manual checks at fixed
camera positions and resolution. Production builds are reserved for explicit
release validation rather than every reversible edit.


The standalone `spruceland.html` evaluates a prepared cutout spruce and a baked
17-view impostor. Shared `ImpostorViews.ts`/`SpruceImpostor.ts` supply view selection,
validated atlas metadata and two-triangle card placement. `ForestMaterials`
optionally enables object-normal atlas shading in the existing prop WGSL; default
prop shading remains unchanged. Camera-depth alpha is shared with the visible
card, and detailed tree alpha agrees with its shadow passes. Offline WebGPU
baking lives under `generator/spruce` and writes attributed runtime assets under
`public/terrain/forest/blue-spruce`. Production does not import baking code.


Whole-map inspection uses an isolated orthographic camera/render target, leaving
the gameplay camera and temporal chain intact. Ctrl+P renders authoritative
terrain/water; Ctrl+Shift+P also asks forest/desert subsystems for complete
placement snapshots via `MapPropSnapshot`, ignoring gameplay stream/distance
visibility. Forest snapshots use all matrices and overhead impostor views.
Temporary geometry/materials use an exclusive layer and the depth-tested group
0, then dispose after readback. The prop shader's MAP_SCREENSHOT branch retains
alpha cutout and emits readable sRGB map colours without distance fade/fog/wind.


`world/biomeSun.ts` supplies authored-world sun azimuth independently of the base
sun slider. Avatar X/Z classify forest palette/overlook correction and Lake
Island at (272.5,76), with a soft island radius (55-75 m), entry/release hysteresis
(0.65/0.25), 1 s dwell and 7 s smooth shortest-arc motion. Forest target is 225,
island target 105; elevation/intensity remain global settings. Procedural mode
is unchanged. Pause stops transition time; teleports use the same delayed blend.
Automatic routes freeze the current entry angle throughout preparation/recording;
benchmark `sunRegion` snapshots record effective angle and region. `EXALTED.biomeSun`
exposes the controller. The settings azimuth is labelled Base azimuth.

The main frame sets `Sky.azimuthOverride` and synchronizes the sun after avatar/
rig movement and before post uniforms, sky, shadows and world materials. It does
not overwrite S.sunAzimuth or alter render-target ordering/history. Sky update
defers atmosphere/SH solves throughout `BiomeSun.moving`, preserving the previous
baked lighting while sun direction/direct light/cascades change every frame.
The dirty state is retained for one solve when motion ends. Already-started
readbacks do not publish SH during a new transition, and remaining bake steps
are stopped until settled. The existing coalescing and 250 ms guard remain as
safety measures, rather than scheduling periodic lighting solves during motion.


The surf spine texture is now 96x4 RGBA32F: rows 0/1 retain position/distance
and direction/amplitude, row 2 curl/age/grass, row 3 forest coverage. Coverage
is retained at sample birth. Wake colour blends forest olive/moss with matching
geometry/depth/shadow passes; the shared spray pool distinguishes kind 6 green
grass from kind 7 aged forest tufts. Both use identical silhouette/settling, and
neither participates in opaque depth or custom shadow targets.
