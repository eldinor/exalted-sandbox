# Exalted history and technical documentation

[Back to README](README.md)

The README covers the main application and the authored Grassland lab. This file
retains implementation details, supporting pages and previous documentation.
Historical notes describe earlier states and are not the current world contract.

## Contents

- [Current technical references](#current-technical-references)
- [Supporting pages](#supporting-pages)
- [Grassland lab technical notes](#grassland-lab-technical-notes)
- [Archived README](#archived-readme)

## Current technical references

- [HANDOFF.md](HANDOFF.md): setup, asset contracts and development handoff.
- [CURRENT_WORK.md](CURRENT_WORK.md): current scope, priorities and deferred work.
- [ARCHITECTURE.md](ARCHITECTURE.md): ownership, startup, rendering and frame order.
- [TS_Migration.md](TS_Migration.md): TypeScript migration history and boundaries.
- [FOREST_SPEC.md](FOREST_SPEC.md): replacement-model requirements and forest lessons.
- [WATERFALL.md](WATERFALL.md): authored waterfall contract and deferred integration.
- [generator/PLAN.md](generator/PLAN.md): generated-world research roadmap.
- [generator/GRASS_PERFORMANCE_PLAN.md](generator/GRASS_PERFORMANCE_PLAN.md): grass research plan.
- [reports/README.md](reports/README.md): retained captures and measurements.

The current authored world is approximately 936 x 702 metres, using the 0.5 asset
scale while avatar movement and effects remain metre-sized. The production entry
points are index.html and src/main.ts. Grassland is a separate lab, not a change
to the production renderer.

For development validation, use `npm run typecheck` and relevant Node tests;
`npm test` runs the full automated suite. Use `npm run test:generator` for the
lab/generator tests. Browser automation requires an explicit user request; do
not run Playwright as routine validation. Reserve `npm run build` for bundle or
release validation rather than each edit, and `npm run preview` for built output.
The current build also requires the offline generated-world package under
`generator/work/generated-world`; see the lab notes below.

## Supporting pages

These utilities are references and experiments; they do not define the main
Exalted world's layout, assets or runtime behavior.

| Page | Purpose |
| --- | --- |
| [/halved.html](halved.html) | Half-scale authored-world reference. |
| [/hm.html](hm.html) | Heightmap inspection utility using `vis_ground_heightmap-roads.png` and `vertex_color_4k-roads.png` from `public/assets/textures/`. |
| [/forest.html](forest.html) | Legacy forest performance lab with chunks, LOD, wind and recordings. |
| [/forest_road.html](forest_road.html) | Forest-road experiment. |
| [/snow_mountain.html](snow_mountain.html) | Mountain viewer using world sky, shadows, fog and post-processing. |
| [/waterfall.html](waterfall.html) | Standalone waterfall experiment. |
| [/generator/generated-world.html](generator/generated-world.html) | Offline generated-world preview. |
| [/generator/grass-performance.html](generator/grass-performance.html) | Generated-world grass benchmark with procedural, imported and hybrid modes. |
| [Procedural reference mode](index.html?terrain=procedural) | Original procedural snow terrain in the main entry page. |

In the mountain viewer, click to look, use WASD to move, Space/Ctrl to change
altitude, and Shift to fly faster. Forest integration waits for replacement
models; the old demo remains a reference. See [src/forest/README.md](src/forest/README.md)
for its implementation notes. Avatar export/editor utilities are described in
[avatar-export/README.md](avatar-export/README.md). Asset-specific provenance is
retained beside runtime assets under public/.

## Grassland lab technical notes

The following implementation notes were moved from generator/grass/README.md.
Paths mentioned in these notes are relative to that subsystem unless they start
with public/, src/ or generator/.


Two isolated pages share camera controls, grass tuning, colors, settings export,
interaction proxies and metrics through `GrassLab.ts`:

- `/generator/grass-performance.html` keeps the generated-world benchmark via
  `GeneratedGrassWorld.ts`.
- `/generator/grassland.html` uses `AuthoredGrassWorld.ts`: the production
  `ExaltedWorld` loader bakes `alpha-map.glb` once at `AUTHORED_WORLD_SCALE = 0.5`
  (936 x 702 m), with meadow PBR ground on grassland and the existing 4K authored
  biome map on other ground.
  The camera starts at The Long Green / C3, converted from chart coordinates.
  This page never imports generated-map loaders or fetches their baked fields.

The authored page has no demo spheres or moving test impacts. Ground-camera
interaction remains available; overview does not simulate an impact at its target.
The generated performance benchmark retains its demo proxies.

The authored page limits wind to 60 m by default, fading amplitude smoothly over
40-60 m using root distance from the actual active camera, including overview.
The Wind stop distance slider controls the endpoint; Limit wind distance off
restores animated grass everywhere. This is independent of geometry LOD and
outer-band density. `windDistance` is exported in settings/benchmarks (0 means
unlimited); `staticDraws` counts distance-enabled batches using the static shader.

Patches whose nearest possible root is past the fade endpoint use a separate
`GRASS_STATIC` WGSL variant that removes wind trigonometry and the interaction
loop at compile time. Patches crossing the fade still animate with per-root
weight. Any active impact overlapping a distant patch retains the reactive
shader. Static/animated material pairs share gradient, diagnostics, geometry and
per-model LOD color correction. Switching shaders does not rebuild placements.
First use of a shader variant can require GPU compilation; allow the view to
settle before comparing benchmarks with the wind limit on/off. GPU shader
appearance and timing require manual browser verification.

The authored page has a bottom Grass model mix panel for Tall A-C, Small A-B and
Tiny A-F. It defaults to Tall A 40%, Small A 35%, Tiny D 25%. Sliders and numeric
fields keep the total at 100 by redistributing other shares; 0 excludes a model.
Disable mixing to use the existing single-model selector. Settings and benchmark
exports include `grassMixEnabled` and the `grassMix` percentage list.

Each accepted candidate selects one model deterministically, preserving the
total placement count, authored height ratios, common TRS, grounding and matching
LOD1/LOD2 choices. One shared placement job partitions matrices into per-model
batches; it does not resample terrain for every model. At most one model's mesh
pair uploads per frame, with pooled meshes/buffers and progressive regeneration
when shares change. Far density thins each model's random subset. Mixed LOD2
materials retain per-model lighting corrections and shared color/wind/interaction.
Visible-patch counts refer to tiles; draw counts include the model batches, and
prototype triangle counts are percentage-weighted averages. Activating more
models adds draw calls and extends initial fill; benchmark a mixture after the
queue settles. This first mix UI is restricted to the authored imported-only page.

The authored page defaults to an extra imported LOD2 band from the main grass
distance (70 m) to 120 m. Its checkbox disables the extension and its outer
distance slider controls the cutoff. The selected single LOD still applies
inside the main range when distance LOD is off; the outer band explicitly uses
LOD2. With distance LOD on, near detail transitions at Near distance and LOD2
continues through the outer cutoff. Streaming requests include the outer range;
placements/transforms remain shared. Distance decisions are per patch centre.
`distantLodDistance` is included in settings and benchmark exports; 0 disables it.
Far grass density defaults to 25% at the outer edge, with a smooth decrease from
100% at the main cutoff. It draws a deterministic prefix of each patch's random
matrices, retaining spatial coverage and matching LOD transforms without uploads
or generation. This reduces GPU instance/triangle work; CPU placement storage
still retains full-density matrices. Use 100% to compare full-density coverage.

Streaming patches use tighter bounds covering imported radius, nonuniform size,
10-degree lean and the live shader's maximum wind plus summed active-impact
displacement. Wind/impact edits update padding without matrix-bound scans. Static
patch world matrices are frozen. The diagnosis checkbox Tight grass bounds can
restore broad padding for comparison; both choices are exported as
`tightGrassBounds` alongside `distantGrassDensity` in settings and benchmarks.
Material freezing is still deferred for a separate comparison of the animated
shader; this pass targets outer geometry and conservative culling.

For a benchmark comparison, reset the camera and use the same route, resolution,
variant, main density and distances after the placement queue settles. Record
100% far density with Tight grass bounds off, then 100% with it on, then 25% with
it on. Copy all three reports and label each test description.

The authored page permits imported GLB grass only. Near detail remains selectable
as LOD1/LOD2 and far geometry is always imported LOD2; procedural templates and
Hybrid are unavailable. It retains Tiny, Small and Tall variants, authored size
ratios and the same gradient controls. `AuthoredGrassSamplers.ts` classifies the
measured grassland `COLOR_0` palette, excludes roads and other biomes, rejects
steep slopes, and grounds instances on exact imported triangles. The visual 4K
map is not used as gameplay/placement classification.

Placement scatters independent seeded candidates across each complete 16 m
patch instead of restricting each blade to a jittered grid cell. This removes
regular row spacing and cell-edge gaps, introduces natural small clusters, and
keeps the same candidate count for each density setting. Height/yaw variation,
terrain rejection and stable regeneration remain deterministic. Both lab pages
use the same distribution; streaming still resumes without per-blade objects.
Each instance varies from 65% to 135% of nominal size, with independent X/Z
spread from 80% to 120%, yaw from -180 to +180 degrees, and pitch/roll within
10 degrees. Roots stay at sampled ground height plus 1.5 cm. The selected GLB
variant's relative size and a matching transform across LODs are preserved.

Authored grass streams a circular area around visibility with a 32 m preparation
margin, bounded by the 256 m window. Camera movement only replans requests.
Candidate generation resumes in batches of 32 under a 2 ms frame budget (with a
2048-candidate cap); at most one completed patch uploads per frame. The time
budget covers sampling, not GPU uploads or driver work. Grass appears gradually
on startup/teleport and nearest patches are prepared first.

Departing patch meshes and typed placement buffers are pooled. Imported near/far
matrices share CPU storage, and direct yaw matrices avoid per-blade Babylon
objects. Conservative bounds replace repeated full thin-instance bound scans.
A 4 m CPU triangle index preserves exact grounding, and cached biome-cell flags
skip patches that cannot contain grass. Changing geometry/density schedules a
fresh progressive fill. Browser GPU performance still needs manual verification.
Recycling a patch retains its geometry vertex/index buffers when the prototype
is unchanged; only instance matrices are uploaded.
The new instance count is set before updating a pooled matrix buffer, because
Babylon limits the upload to that count. This prevents missing grass strips
when a recycled patch gains blades after movement or a density change.
The lab skips automatic
pointer picking because its mouse controls do not select world objects.

The Performance diagnosis controls can pause authored patch streaming while
retaining existing grass, or hide the authored terrain while retaining CPU
grounding. Together with the existing grass enable switch, these isolate
streaming, grass rendering and terrain rendering. Counters include recent worst
frame interval and synchronous render CPU time, current grounding CPU time,
peak upload CPU time, pending patches and the previous render's grass meshes in
the camera frustum. CPU upload/render timings do not measure GPU execution or
asynchronous driver stalls. Large frame gaps with low CPU timings require a
browser performance capture to distinguish input/event work from GPU waits.
Both pages place live counters and diagnosis controls in a right sidebar. Its
30-second benchmark records browser frame intervals, synchronous render/grass/
ground/upload CPU timings, pending patches and grass meshes in the frustum into
fixed typed storage. Start recording after initial grass fill, follow a repeatable
camera route, and use Copy benchmark results to share the JSON report. Stop can
end a run early; hiding the tab ends it with a `tab-hidden` reason. Reports include
mean/median/p95/p99/max timings, average FPS and slow-frame counts, settings and
camera start/end snapshots, control edit counts, render resolution and browser
details. The optional test description identifies the route or comparison.
These results do not measure GPU execution time. Finalizing sorts recorded
samples once; that work is outside the recorded frame timings.
`MeadowGround.ts` assigns grassland triangles to a PBR material using the supplied
Raw Catalog meadow BaseColor, Normal and packed ORM maps. ORM channels are
R=occlusion, G=roughness, B=metallic; normal/ORM are linear and base color is sRGB.
All maps repeat together every 4 m through a second UV set with mipmaps and
anisotropic filtering. The original UV set and StandardMaterial remain on other
biomes. Material ranges reorder only the visual indices, preserving authored
triangle winding and CPU grounding. Classification uses mean grassland vertex
weight per triangle, with a 0.5 threshold; source biome seams use split vertices.
Source provenance and the ORM derivation are recorded in the meadow SOURCE.md.
Normal-map orientation needs manual visual verification.
Ground rendering uses the lab's materials and lighting over authored
geometry, rather than the production temporal post chain. Gameplay, props, water
surfaces and deformation are outside this first authored grass page. Production
`index.html`, `halved.html` and the ordered main-app renderer remain independent.

`GrassSystem.ts` is independent of the benchmark DOM. Its constructor accepts
height, biome-weight, and exclusion samplers, so the same class can later be
connected to the generated-world runtime.

The current lab implements the first benchmark slice:

- deterministic 16 m patches around the generated `Grass 1` location;
- authoritative height and biome sampling;
- road and water rejection;
- four-section near blades and triangle mid blades;
- thin-instance buffers grouped by patch;
- distance LOD, procedural wind, and up to eight simultaneous interaction zones;
- live CPU, patch, instance, triangle, draw-call, median, and p95 counters.
- procedural, imported-GLB, and hybrid geometry comparison modes;
- 11 selected regular variants at normalized LOD1 and LOD2 from `grass_medium_01_1k.glb`
  (Tall A–C, Tiny A–F, and Small A–B); Mid and Large variants are excluded;
- imported variant and per-prototype triangle reporting.

The lab starts at `6×` density, roughly three times its previous blade count.
The density control reaches `10×` for heavier GPU and visibility stress tests.

The interaction benchmark keeps one camera/player proxy and three optional
moving impacts in reusable typed uniform storage. Radius and strength are live
controls. The shader bends blade tips away from each impact while keeping roots
fixed; this is the portable path for future avatar feet, creatures, vehicles,
landings, and spell effects.

The imported mode deliberately ignores the duplicated `geonodes` meshes and
the source GLB's 1x1 texture. It keeps regular LOD1/LOD2 silhouettes while
using Exalted's common placement, wind, lighting, fog, and color shader. Hybrid
mode uses an imported near prototype and the two-triangle procedural mid blade.
`Imported near LOD` defaults to LOD1 and can switch to LOD2 for comparison.
`Use distance LOD` defaults off, with `LOD1 only` selected. Enable it to restore
near/far switching. Toggling it does not regenerate placements when the active
near mesh stays the same. Disable it to render `LOD1 only` or `LOD2 only` throughout the
visible range. This uses the selected imported mesh even in Hybrid mode, disables
near-distance switching, and includes `lodEnabled`/`singleLod` in copied settings.
Visibility culling and camera-driven patch streaming remain active. Procedural
benchmark mode uses its near blade mesh throughout the visible range when LOD is
off; the LOD1/LOD2 selector is reserved for imported geometry.
Imported GLB mode uses LOD2 beyond `Near distance`; Hybrid keeps its procedural
mid blades. Both levels share placement, color, wind and interaction settings.
Normalized geometry retains a separate authored height. Placement restores the
selected variant's height relative to Tall A using canonical LOD1 heights for
both LODs, so selecting LOD2 does not change the intended plant height. The
`Reference height` slider sets Tall A's nominal height; Tiny and Small keep their
GLB proportions. At 0.85 m, Tiny D is approximately 0.127 m before random scale.
Hybrid's procedural far blades use the same variant height ratio. Procedural
mode continues to use the slider as its direct nominal blade height.
The per-prototype and visible-triangle counters use the active near/mid geometry,
and `Copy settings` includes the selected near LOD. LOD0 remains unloaded.
The GLB's regular grass material has a white base-color factor and a pure-white
1x1 albedo image, so the former GLB tint slider had no visible effect and has
been replaced with direct root and tip color pickers. These preserve the gradient
and apply to all geometry sources and both LODs, using linear RGB uniforms.
Root `#426f35` and tip `#179306` are the defaults; `Reset colors` restores them.
LOD and biome diagnostic views override these colors deliberately.
`Copy settings` exports the current lab settings as JSON, including exact linear
RGB endpoint arrays and sRGB hex colors. It also shows a read-only text area for
inspection or manual copying if clipboard access is unavailable. Color edits do
not rebuild geometry or read textures.
The far material uses an area-weighted diffuse brightness correction calculated
from the active near/far geometry at rebuild time, averaging the shader's sun
response over instance yaw. This replaces the fixed Hybrid-only multiplier and
also matches imported LOD1/LOD2 brightness. Fog keeps the selected grass palette
instead of adding blue-grey that desaturated far grass. Geometry coverage and
silhouette still differ across LODs; this correction does not remove LOD popping.

Open `/generator/grass-performance.html` through the Vite development server.
The ground camera uses WASD and mouse look; the overview camera uses orbit
controls.

Production builds copy `generator/work/generated-world` into `dist` because the
Grass Lab and generated-world preview fetch that offline bake at runtime. Deploy
the complete `dist` directory; copying only HTML and JavaScript leaves the field
metadata and binary maps unavailable.

The next visual pass should add terrain-normal alignment, multiple blade
profiles, coherent gust bands, dry-tip variation, shadow casting for near
patches, and a dithered near/mid transition. The next performance pass should
pool unloaded patches and move generation to a bounded streaming queue before
expanding coverage beyond this fixed test area.


## Archived README

The following is the previous root README, retained for reference. It combines
multiple development stages: earlier authored-world integration, standalone
page notes and the original procedural snow demo. In particular, its scale-1
world dimensions, claim of no third-party assets, browser-version list and
performance figures are historical; do not apply them to the current main app
or Grassland lab. Current contracts are in the technical references above.
Browser automation commands in this archive still require explicit user approval
before execution.

The mountain viewer is at **[/snow_mountain.html](/snow_mountain.html)** and uses the world sky, shadows, fog and post-processing. Click to look; WASD moves, Space/Ctrl changes altitude and Shift speeds up flight.

TypeScript preparation: `npm run typecheck`; automated tests: `npm test`. Legacy JavaScript and the demo pages are not strictly checked. See [TS_Migration.md](TS_Migration.md).

Forest work is deferred until replacement models arrive; requirements and lessons are retained in [FOREST_SPEC.md](FOREST_SPEC.md). The old demo remains available as a reference.

### EXALTED

World website: [exaltedgaming.gg](https://exaltedgaming.gg/).

The separate forest performance demo is at **[/forest.html](/forest.html)**.
It exposes 32 m thin-instance chunks, LOD, vegetation density, shadows, wind and
ten-second performance recordings. See [forest integration notes](src/forest/README.md).

The default scene now uses Exalted's **`alpha-map.glb`** from the
9 September 2026 world handoff, bundled at `public/assets/exalted/alpha-map.glb`.
Its imported geometry and biome vertex colours define the world; Exalted's
procedural avatar, lighting and snow material remain the visual reference.
Open `/?terrain=procedural` to compare against the original procedural demo
described below.

Use the top bar to switch between **Desert Start** (the default), **The Palecrown**
(snow), **The Long Green** (grassland), **The Thornwood** (forest), **The Ironspine**
(mountains), **Lakeside Overlook** (lake viewpoint), and **Stone Gate** (pass).
Press **Esc** to release the mouse and choose a place; click the scene to resume
looking and moving. Destinations use the Rev B register coordinates with elevation
sampled from the terrain. Switching resets movement, cloth, effects and the camera.
The compact top bar is flush with the top edge. Its left sidebar switches between
**Use desert textures** and **Use procedural textures**; one checkbox is selected
at a time. This changes appearance while retaining terrain deformation.

The Exalted map stays at scale 1 (one unit per metre), with bounds
1,872 × 1,404 m. Spawn is chart `(65, -616)`, or Babylon `(-65, height, 616)`,
facing north. The loader's complete coordinate transform is baked once into the
mesh, including normals and triangle winding. The procedural sky mountains are
disabled for this scene so they do not change Exalted's skyline.

Grounding samples the imported triangles through a spatial index, as requested
because the separate collision mesh and analytic height function are unavailable.
This follows the visible mesh, not the finer original world surface. The known
road wall near Stone Gate remains part of the supplied terrain. This is terrain
grounding, not a general obstacle or slope-limit physics system.

Snow and loose desert sand now deform around the avatar. Nearby soft source
triangles are replaced with subdivisions at approximately 17 cm spacing;
the rest of `alpha-map.glb` retains its original geometry. Beauty, shadow and
depth passes use the same displacement. The detail fades between 12 and 16 m
from the avatar, joining the original triangle planes without a second ground
layer. Tracks remain temporary in the existing moving GPU simulation window.

Painted terrain colours identify snow and sand; roads, trails, grass, forest
and rock stay firm. Sand uses 55% of snow's brush depth, smaller raised rims,
three-times-faster refill, and warm dust/wake shading. Desert Start is on
loose sand, 12 m south of the authored road fork, so walking immediately leaves footprints.
Choose The Palecrown to compare snow tracks. Footsteps, sliding and deformation
brushes from spells share this surface system; reflective spell ice still needs
its Exalted reflection-mask integration.

Desert sand now uses the embedded `DesertGround` material from
`exalted_desert.glb`: the 2K red laterite soil/stones colour and normal textures,
authored normal strength and roughness 0.95. Its planar UV projection is fitted
and checked against all regional ground vertices, then reused in world space
with the GLB texture transforms on both terrain detail levels. Texture sampling
uses mip gradients, and compression/rims still modify the textured surface.
This changes the sand to the supplied reddish soil appearance. The regional
ground mesh remains excluded; snow and firm road materials are unchanged.
Deformation shading follows the selected material: textured soil retains its
colour and stones in impressions, uses modest relative darkening/brightening,
and stays rough when compressed. Procedural sand has a separate pale-sand
response. Snow's blue trench tint is restricted to snow. Dust and sliding wakes
sample the desert ground texture in textured mode and use warm sand colours in
procedural mode. Switching modes preserves impression depths and displaced mass.

Feet and camera add a small GPU displacement readback to the original triangle
height. A 128-square probe covers 16 m and updates at most ten times per second;
grounding therefore follows recent deformation with asynchronous latency.
This is suitable for these shallow tracks, not a synchronous collision solver.
The desert's plants and rocks now load from `exalted_desert.glb`, preserving
authored placement. Its separate ground is excluded. Twenty-three shared
geometry/material groups use GPU thin instances, each with original and simplified
distant geometry. Small stones fade at 28–35 m, shrubs at 48–60 m, and larger
props at longer size-based ranges up to 180 m. Instance selections update after
3 m of movement; original detail is retained within 16 m (30 m for larger props).
The materials use authored base-colour, normal and roughness textures with
Exalted lighting, spell lights and aerial perspective. Vegetation uses alpha
cutouts consistently in beauty, shadows and depth, including source materials
exported as alpha blending. Boulders, larger rocks, tree trunks and large cacti
now block the avatar and camera. Bushes, leaves and small stones remain passable.
The grounded avatar sweeps a 32 cm body radius with a 1.8 m vertical overlap span
against simple static cylinders, sliding along their sides. Trunk widths come
from lower mesh vertices rather than the canopy. A 16 m spatial grid queries the
whole movement path, including fast sliding; collision is independent of render
distance and LOD. The camera retracts immediately with 25 cm clearance and eases
back out. These are approximate obstacles, not mesh-exact physics: climbing onto
rocks, step-up, movable props and branch-level collision are not implemented.

Desert didelta, leipoldtia and iceplant shrubs sway in the shared wind direction,
with anchored bases, varied gusts and tip flutter. Both geometry levels, shadows
and depth use the same animation, fading out between 25 and 55 metres.
In F1 settings under Atmosphere, **Bush sway** controls amplitude and **Bush wind
speed** controls animation speed. Global wind strength also affects bushes;
Freeze time pauses their movement. Woody shrubs, trees and cacti remain rigid.

At Desert Start, the final selection contains 365 primitive instances and
365,594 prop triangles. See `reports/desert-placement.json` for placement checks
and `reports/terrain-with-desert-props.json` for all seven spawn measurements.
Run `node scripts/inspect-desert.mjs` against the dev server to repeat the audit
and save a spawn screenshot. Original source transforms remain unchanged:
the audit flags 15 nearby rocks with deeply buried bases for review.

Validation: `npm test` checks surface queries; `npm run test:browser` checks the
WebGPU scene, movement, imported bounds, and grounding against independent Babylon
ray intersections, soft-surface depth/rims, and spawn switching. Install Chromium with `npx playwright install chromium`, or set
`PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome browser.

With the dev server running, `node scripts/benchmark.mjs report-name` records
all seven destinations in `reports/report-name.json`. These are headless Chrome
presentation timings at 1280 × 800, not GPU timestamps or a hardware-independent
frame-rate guarantee. Before/after deformation captures are included in `reports/`.

---

The following documentation describes the original procedural demo.

A real-time snow rendering tech demo. WebGPU, Babylon.js, hand-written WGSL.
Everything you see is generated on the GPU at load time — there are no textures,
no meshes, no HDRIs and no animation data in this repository.

**▶ [exaltedgaming.gg](https://exaltedgaming.gg/)**

> Requires a WebGPU-capable desktop browser (Chrome/Edge 113+, Firefox 141+,
> Safari 26+) and a discrete or recent integrated GPU. There is no WebGL
> fallback by design — if `navigator.gpu` is missing the page says so and stops.

---

#### Controls

| | |
|---|---|
| Click | capture the pointer |
| `Space` | cast Fly; hold to rise, release to hover |
| `Ctrl` | descend while flying |
| `Ctrl+I` | toggle Babylon Inspector on the right (loaded on first use; version 9.18.0, matching Babylon) |
| `W` `A` `S` `D` | move, relative to the camera |
| Mouse | look · **Wheel** zoom |
| `Shift` | sprint |
| **Right mouse (hold)** | snow-surf — carve across the field and throw a wake |
| `1` – `9` | the nine spells (`2` and `7` are held casts) |
| `F1` or `` ` `` | settings and performance overlay |

The overlay exposes every art parameter as a live slider — sun angle, wind
bearing, subsurface radius, deformation depth, tonemap curve, exposure — plus a
frame-time graph with median / 95th / 1% low, draw calls, triangles and a
per-system CPU breakdown. Every system can be toggled off individually, and
there are debug views for normals, depth, cascade coverage, the deformation
buffer and the raw shadow map.

---

#### What it does

##### Map water

The Exalted lake and Snow river are separate water meshes extracted from blue
terrain vertex colours, constrained by the Rev B lake polygon and river route.
The lake uses water level Y = 0 from the older sandbox reference, with shoreline
triangles clipped against the actual bed height. Islands and banks above water
remain exposed. The river follows the supplied terrain with a small normal offset;
steep sections receive faster downhill ripples and more foam. The surface uses
procedural ripples, sky-LUT reflections, depth-based lake colour and aerial fog.
Both meshes participate in the camera depth pass; animation respects Freeze time.
There is no additional reflection render target or imported water texture.

Geometry audit: `reports/world-water-geometry.json`. Deep lake water automatically
switches the avatar to surface swimming: WASD steers at 2.4 m/s, Shift increases
speed to 3.8 m/s, and Space launches Fly when ready. Shallows return to walking.
The exact lake triangles define swim coverage, preserving islands and banks.
Flight lands at water level before transitioning to swimming. Swimming animates
paddling arms and kicking feet, with stroke ripples and entry splashes; terrain
footprints and surfing are suppressed in water. Camera clearance includes the lake.

Steep blue river triangles supply clustered waterfall spray sites. At most twelve
sites within 75 m emit droplets and drifting mist into the existing particle pool,
including downstream impact mist. No extra particle draw calls are added.
Underwater rendering, scene refraction and a separate free-falling waterfall sheet
remain future work. The river follows authored slopes, including any uphill
irregularities, rather than a simulated watercourse.

Fly provides fifteen seconds of controlled flight at up to roughly eight metres
above terrain, followed by a gentle automatic descent. WASD steers; Ctrl can
land early. Landing starts a five-second cooldown, shown in the bottom-right
indicator. Wind ribbons, a lifted robe and a takeoff burst accompany the spell.
Feet leave no tracks in flight. Existing solid prop cylinders block airborne
movement and support landings on their flat tops; these are approximate bounds,
not detailed rock or tree geometry. Freeze time pauses flight and cooldown.

##### Terrain

A nested-ring geometry clipmap: 8 rings, 8.5 cm inner spacing, ~870 m radius,
333k triangles — **one static mesh, one draw call**. Vertices carry only
`(gridIndex, ringLevel)`; world placement, CDLOD morphing and displacement all
happen in the vertex shader, so there is no CPU rebuild and no per-frame upload.

The heightfield underneath it is layered gradient noise with analytic
derivatives, anisotropic about a single prevailing wind: broad transverse dune
ridges, a long low swell, medium drifts sheared along the wind for lee-face
asymmetry, and sparse rock outcrops. It bakes once into a 4096² RG32F texture
and is mirrored back to the CPU, so character grounding samples exactly the
surface that is drawn rather than a re-implementation of it.

##### Snow shading

Multi-scale normals — baked macro slope, analytic sastrugi and ripples, three
tiled detail scales, triplanar on steep faces — over wrapped diffuse, a
back-scatter subsurface term with depth-dependent blue tint, GGX specular, SH
ambient with a solved snow bounce, and procedural view-dependent glints gated on
grazing angle. Compression, wetness and ice are surface state channels the
material reads rather than separate materials.

Shadows are three hand-rolled cascades with world-space PCSS — blocker search,
penumbra estimate, rotated Poisson filter — texel-snapped in world space and
stabilised against a rotation-invariant bounding sphere. Babylon's own cascade
generator can't be used here: the terrain has no CPU geometry matching what is
drawn, so every caster registers the vertex program it is actually rendered
with.

##### Deformation

A persistent, additive terrain state buffer: two 2048² RGBA16F targets covering
80 m (3.9 cm texels), ping-ponged by a single full-screen pass per frame that
scrolls, relaxes and splats in one dispatch. Addressing is toroidal — a texel's
UV is `fract(worldXZ / size)` — so the window follows the player without ever
copying the buffer, and newly exposed texels are detected and zeroed by the same
pass.

Channels are depression depth, displaced mass, compression and ice. That second
channel is what separates a trail with raised berms from a flat footprint decal.
Refill is anisotropic diffusion (loose berms slump three times faster than a
packed trench floor) plus berm-into-depression slump, wind-driven infill from
upwind, and slow exponential decay: **~71% of trail depth survives a minute**,
visibly spreading and softening as it goes.

The displacement is real geometry in the beauty pass *and* in all three shadow
cascades through one shared include, so trails self-shadow and berms break the
silhouette. Feet, the surf wake and all nine spells write through one `brush()`
call into the same buffer.

##### The character

Fully procedural — no rig file, no animation clips, no authored mesh. An 18-bone
skeleton whose bind pose is a table of numbers, geometry lofted from that table
at load (cowl, torso, arms, trousers, boots, belt), and locomotion solved from
the motion state rather than played back.

Feet plant. A distance-driven stance/swing machine writes a foot's world
position exactly once, on touchdown, and holds it absolutely fixed while
two-bone IK reaches for it — a planted foot cannot slide because nothing in the
code is able to move it. Gait phase advances with ground travelled, so stride
length and ground speed are the same number by construction.

The garments are Verlet cloth on four panels with distance, bending and
shape-memory constraints, nine body collision capsules, and a hem that rides the
snow surface. Folds live in the rest shape rather than in a normal map. The
36×12 solve renders as a 72×32 surface through Catmull-Rom reconstruction in the
vertex shader, so tessellation and simulation cost are fully decoupled. Shell
fur at the hood rim and cuffs is a partial torus emitted 22 times and
alpha-tested against a hashed strand field.

One small texture carries everything to the GPU: rows 0–3 are bone matrices,
rows 4+ are simulated cloth nodes. One upload per frame, no allocation.

##### Snow-surf

The wake is a **swept mesh, not a particle effect**. Its spine is the path the
board has taken, resampled every 30 cm into a 96×3 data texture; the mesh itself
is a static lattice of `(column, row, side)` and every vertex is placed in the
vertex shader, so a 19-metre wake and a 2-metre one cost the same buffer and the
same 4.6 KB upload.

The cross-section is a breaking wave integrated from a turning tangent — the
tangent sweeps from just below horizontal at the base to 284° at the tip, so one
`curl` parameter runs continuously from a low heaped bank to a lip that hangs
back across its own face. Amplitude and curl resolve per side from the carve, so
the outside of a turn takes nearly all the snow. Peak wall is 2.4 m at a
full-speed carve and collapses 0.88 s after it is laid, which makes wake length
`life × speed` with no second constant. Normals are differenced out of the same
`wakePoint` the geometry uses, so they cannot disagree with it.

Two spray populations come off the same spine — a dense slow curtain hugging the
crest and ballistic grains flung clear — emitted at *fractional* positions along
it, plus screen-space speed streaks and camera shake on a loaded edge.

##### The nine spells

One water material, one mesh, one draw, eight strands. Six of the nine move a
coherent body of water and are structurally the same object: a swept surface
along a spine with a radius, a parallel-transported frame and a foam channel —
the same construction as the surf wake. A strand that is not in use is switched
off by zeroing its rows, so the draw count does not depend on how many spells
are up.

1. **Sweep** — a crescent of slush rises out of the ground and runs outward,
   ploughing a channel and throwing berms.
2. **Ribbon** — a held stream tracking the hand and camera aim, drawing
   precessing figure-eights and scoring thin curved lines into any snow it
   skims. Released, the head steers onto the aim and accelerates, so the water
   arcs onto the target with the bend it had at release still travelling out
   along the tail.
3. **Bloom** — a targeted eruption: a crater with a raised rim, a waisted column
   that rises and withdraws down its own axis, and four seconds of fallout
   curtain lit from below.
4. **Crystallise** — hexagonal prisms grown along a golden-angle spiral,
   alpha-blended *and* depth-writing, so you see the snow through the ice but
   never one prism through another. Facet normals come from screen-space
   derivatives, so every facet is exactly flat and every edge exactly hard.
5. **Vortex** — three helices of lifted snow winding around the player, with the
   airborne mass emitted along those same helices at their own tangential
   velocity. The only system here that writes a *negative* depression.
6. **Rift** — a branching fissure races away along the aim direction, cutting a
   narrow glazed trench into the real terrain, piling broken lips on either side
   and throwing snow from a cold light travelling inside the crack.
7. **Aegis** — a held cast growing a bowed wall of interlocking ice teeth from
   its centre outward. Release leaves the built section standing; press `7`
   again to shatter it into ice and snow spray.
8. **Avalanche** — a broad slab fractures ahead of the caster and accelerates
   across the sampled terrain, dragging a breaking snow face, dense powder and
   ballistic clods over a wide compressed track with displaced edge berms.
9. **Thaw** — a targeted warm pulse expands through persistent terrain state,
   filling trenches, collapsing berms, loosening packed snow and melting glaze.
   Nearby crystal formations sublimate while a short, snow-covered slush seam
   finds a downhill path through the mist.

Refraction needs no scene copy and no second opaque pass: the sky LUT already
stores the solved snow bounce below the horizon, so one lookup along the
refracted ray is a physically-derived estimate of what is behind the water in
any direction. Three lookups at three indices of refraction give the chromatic
dispersion, and absorption over the path length gives the tint.

Four pooled dynamic lights are declared per frame, and every one of them runs
the identical `snowSubsurface` the sun runs — so a spell lights the snow
*through* a berm crest rather than putting a bright patch on the near face of
it. The snow, the robe, the wake, the airborne spray, the water and the ice all
read the same pool out of one include.

##### Sky and atmosphere

A Nishita single-scattering integration with a multiple-scattering
approximation and an iteratively-solved snow bounce, baked into an
equirectangular LUT plus SH irradiance and mip-based specular. Analytic rather
than a captured HDRI because the whole look hangs on a sun 10–15° up: with a
model, the elevation slider correctly drags the horizon warmth, the zenith
gradient, the ambient tint and the direct sun colour along with it.

The far range is a heightfield raymarched on the skybox — no geometry, behind
everything by construction, with analytic normals, ridges occluding ridges, and
a second short march toward the sun for its own cast shadows. It is lit by the
snow field's own material logic and hazed by the same single atmosphere, so the
two meet at one colour instead of two.

##### Post-processing

A camera-space depth prepass (linear view depth carried as a varying, plus a
specular mask) feeds the whole chain:

- **TAA** — Halton(2,3) jitter written straight into the projection and frozen
  for the frame, so the prepass and the beauty pass agree to the subpixel.
  Depth-based reprojection, variance clipping, and a five-tap Catmull-Rom
  history fetch.
- **Bloom** — three levels, thresholded in *exposed* units so only the sun disc,
  the glints and lit spray reach it. Karis-averaged on the prefilter.
- **Volumetric light shafts** — integrating sky visibility out of the prepass
  along the ray to the sun. They fade themselves out entirely at a high sun.
- **Depth of field** — deliberately slight, focal plane tracking the spring
  arm's own length, weighted by each tap's own circle of confusion.
- **Screen-space reflections** — on ice only, gated on the prepass mask, so the
  pass is a fetch and a branch on any frame where nobody has cast Crystallise.
- **AgX / ACES tonemapping**, contrast-adaptive sharpen, grain, vignette.

---

#### Performance

Measured with WebGPU timestamp queries at 2560×1440 on Chrome / Windows 11 /
RTX 5070 Ti, with every system running:

| | |
|---|---|
| GPU frame | **3.22 ms** |
| — base scene (clipmap, snow, 3 cascades, sky, character, deformation, prepass) | 1.64 ms |
| — post chain | ~1.1 ms |
| — far range | ~1.2 ms |
| — character (skeleton, cloth, fur, spray) | < 0.02 ms |
| Draw calls | 15–19 |
| Triangles | ~353,000 |
| Headroom against a 90 FPS budget | **7.9 ms** |

Nothing allocates in the render loop. Every buffer is sized at construction,
every per-frame write goes into a pre-allocated typed array, and every material,
procedural texture and render pipeline is explicitly `isReady()`-gated and
exercised with real geometry behind the loading screen — so the first cast of a
spell does not compile a pipeline mid-frame.

VRAM is roughly 350 MB: a 4096² height texture, two 2048² deformation targets,
three 2048² shadow cascades, and the sky and detail LUTs.

---

#### Running locally

```bash
npm install
npm run dev      # vite dev server on :5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

#### Layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for system ownership, startup and frame
ordering, data flow, rendering passes, and extension points.

```
src/
  main.ts            entry point and frame orchestration
  core/              settings, input, camera rig, perf, loading, GPU helpers
  terrain/           heightfield, clipmap mesh, deformation state buffer
  render/            sky + IBL, shadow cascades, depth prepass
  character/         skeleton, procedural geometry, cloth solver, snow contact
  vfx/               pooled particles, the snow-surf wake
  spells/            the nine spells, the shared water body, the light pool
  post/              the post-processing chain
  ui/                settings and performance overlay
  shaders/           all WGSL — lib/ holds the shared includes
```

#### Assets and licences

There are no third-party assets. Every texture, environment map and piece of
geometry in the running demo is generated at load time on the GPU: the sky is an
atmosphere integral, the snow grain and terrain are noise, the character is
lofted from a table of numbers, and the fabric weave and fur strands are
evaluated in the fragment shader.

Runtime dependencies are `@babylonjs/core` and `@babylonjs/materials`
(Apache-2.0). The only build dependency is Vite (MIT), which does not ship in
the output.

This project is released under the [MIT licence](LICENSE).
