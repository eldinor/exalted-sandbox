# Production grassland

The authored main world now uses the Grassland subsystem. Shared renderer,
placement, loading, appearance and types live in `src/grass`; the generator's
former modules re-export these implementations. The labs keep their lighting,
controls and ground materials. Production never imports generator code.

## Placement and assets

Selected yellow-flower dandelions are prepared separately in
`public/terrain/grassland/dandelions/`, with source attribution, manifest and a
native WebGPU preview. Recommended flowering mix is 001/002/003 at 45/35/20%;
005 is an optional bud accent. Production now streams 001/002/003 colonies;
the bud accent remains prepared but unplaced.
See [asset notes and placement proposal](public/terrain/grassland/dandelions/README.md).

## Meadow flowers

`MeadowFlowers.ts` defines a flower-family asset/mix/seed/height/density/cutoff
contract, allowing daisies to be added later without hard-coding them into grass
placement. Main creates independent `WorldGrass` adapters for dandelions and
daisies. A family uses one shared albedo/alpha atlas; separate atlases
require separate families/materials. The loader bakes the complete glTF hierarchy
and normalizes geometry to unit height with its lowest point at the root.
Source normal/ORM maps remain in the asset; current shading uses albedo and
geometry normals with the existing matte vegetation lighting.

Colony centres are deterministic on a jittered 14 m grid: 80% active cells,
1.8-2.6 m radii and soft edges. This covers roughly 6% of meadow in footprints
(about 4% weighted coverage), usually a handful of plants per colony rather
than a continuous carpet. Density .16 supplies approximately .8 candidates/m2
before colony/biome exclusions. Height is nominally .35 m, varying .23-.47 m.
Flower instances stay upright and use exact triangle height without the grass
15 mm offset; roads, water, non-grass and slopes above .7 rise/run are excluded.
All grass outside colonies retains existing density; inside, candidate density
falls by up to 35%, independently of biome classification. This fixed meadow
layout remains when flowers are toggled off for consistent benchmark comparisons.

Rendering reuses pooled 16 m patches, incremental streaming, camera-frustum
rejection and grass wind/walking/surf deformation. Flowers have no collision,
shadow casting or additional particles. Colour and camera-depth shaders use the
same texture alpha/cutoff and world-anchored dither fade from 35 to 50 m. The
imported texture's gammaSpace determines whether software sRGB conversion is
needed, avoiding double decoding of WebGPU sRGB textures. Production lighting,
received shadows, spell lights, fog and linear output are shared with grass.
Static/dynamic flower colour and depth variants warm behind loading.

Benchmark has a separate **Meadow flowers** toggle and records flower settings,
CPU time and visible instances. Disabling Grass models also suppresses flowers
and their depth registrations. Teleport/automatic routes reset both interactions;
automatic route preparation waits for both enabled streaming queues. Procedural
mode has no flowers; authored heightmap and GLB comparison modes do.

Daisies now use the three individual LOD1 models at 40/30/30%, density .08
(half the dandelion budget), nominal height .42 m and independent seed 9001.
The prepared subset retains the source low alpha cutoff for delicate petals;
see [daisy asset notes](public/terrain/grassland/daisies/README.md). Dandelion
colony centres and model mix remain stable. Grass thinning uses the maximum species coverage,
so overlapping colonies never compound the 35% reduction. Both families share
the Meadow flowers toggle and aggregate flower CPU/instance metrics; snapshots
record each family's settings and statistics separately. Both load/warm/reset
with the ordered startup/frame loop and automatic route preparation.

Flower density was doubled on 14 October 2026: dandelions .08 to .16 and daisies
.04 to .08. This fills the existing colonies more densely, retaining their
footprints, species mixes, grass density, rendering distances and exclusions.
No new assets or shader variants are introduced. Performance cost has not been
remeasured for this density increase.

Validation (2026-10-12): typecheck and 171 Node tests passed. Native Chrome/WebGPU
loaded/warmed flowers without shader errors; screenshots checked the yellow
flower silhouettes. Turning either flowers or grass off removed flower colour
draws and all flower depth registrations. A fixed Long Green spawn view had 41
visible plants / 1,698 triangles and added 34 actual draws (17 colour + 17 depth),
10,188 submitted indices per frame across 20 captured frames. This is one view,
not an automatic-route GPU performance result; shared-atlas patch batching may
be worthwhile if draw submission becomes the limiting cost.

- Default terrain: `vis_ground_heightmap-11.png` and `vertex_color_4k-9.png`.
- Grass is the light-green RGB (179, 206, 149) palette, independently classified
  into an 8-bit mask alongside the existing four-channel surface map. Heightmap
  mode now reads the generated `ground-coverage-9.png` R channel for both shading
  and placement, including gradual thinning at forest/desert boundaries; see
  [BIOMES_MAPS.md](BIOMES_MAPS.md). The palette remains the generation input.
  It is not snow/sand softness or the complement of another biome.
- Sample actual terrain triangle heights and normals. Preserve chart conversion
  and reject gaps, non-grass, roads, wet areas beneath the raised lake level,
  and slopes over 1.0 rise/run (45 degrees). Production uses this wider slope
  limit to cover authored grass hills; the labs retain 0.4 (about 22 degrees).
  Conservative patch rejection checks mask interiors.
- GLB comparison mode retains the original linear grass vertex palette.
  Procedural terrain does not instantiate production grass.
- Reuse `public/terrain/grassland/grass_medium_01_1k.glb`, already supplied for
  the Grassland lab. No new model assets or authored prop placements are added.
- Mix: Tiny D 10%, Small A 45%, Small B 45%. Tall grass is removed. Deterministic selection
  partitions the existing placement budget, and restores each model's size.

## Grass biome ground

Production reuses Grassland's user-supplied Raw Catalog Material-326-A base
colour, tangent-space normal and packed occlusion/roughness/metallic maps from
`public/terrain/grassland/meadow/`. The lab and main app share the texture loader
and 4 m repeat. UVs are `(-world.x, world.z) / 4`, so tiling remains continuous
between coarse terrain and the moving detail patch. Texture sampling uses
mipmaps, anisotropic filtering and world-position derivatives.

The existing terrain shader blends this PBR set only onto the grass biome,
using the same coverage as CPU placement. Heightmap mode uses the generated
packed land coverage; GLB mode uses its authored vertex colours. Roads, desert,
snow and water retain their existing ground materials. Forest now has a separate
tiled ground set documented in [FOREST_NOTES.md](FOREST_NOTES.md). The shader keeps
linear output, the existing world lighting/fog and render passes, and adds no
meshes or draw calls. Generated snow grain normals and glints are suppressed on textured
grass. Base colour is decoded from sRGB; normal and ORM remain linear.

The grass ground texture remains visible when grass blades are disabled and
is independent of the desert-texture toggle. The original source/license notes
are retained in the meadow directory; no new texture was downloaded. All three
textures are loaded before terrain shader warm-up and disposed by Terrain.

## Rendering and interaction

Production density is 3: approximately 17 candidates per square metre
before exclusions. Stream 16 m patches around the avatar, with a 2 ms/2,048
candidate budget and one model-pair upload per frame. Recycle geometry and buffers.
Production now uses LOD2 geometry at every distance for the benchmark comparison;
distance LOD switching is disabled (`singleLod: 2`). The previous comparison used
LOD1 through 22 m and LOD2 beyond. Full density now extends through 22 m,
then thins smoothly to 25% at the 90 m outer edge using the existing smoothstep
curve and deterministic instance prefixes. `farDistance: 22` controls the end
of full density; `distantLodDistance: 90` controls the outer visibility distance,
reduced from 120 m for the next benchmark comparison.
Both distance bands use LOD2 geometry. Selection uses
16 m patch-centre distance from the avatar. Density remains 3. Wind fades
from 40 to 60 m and uses the world's wind direction/strength and simulation clock.

Production additionally gates colour/depth visibility using the actual camera's
six frustum planes and each patch's padded bending bounds. A 2 m guard avoids
screen-edge jitter; camera orientation is evaluated every frame, including flight
and automatic routes. Completed off-screen patches remain cached until normal
distance eviction, so turning back immediately reuses geometry. New streaming
jobs prioritize view-intersecting tiles and defer off-screen requests. An already
started job finishes within the existing budget, avoiding restart churn.
Unknown tiles use the terrain's full height range for conservative hill/aerial
rejection. `streamingStats.deferred` records the off-screen queue separately;
`queued` counts work eligible for preparation so benchmark warm-up does not wait
on deferred tiles. Shared labs keep their existing visibility unless supplying
these optional view gates. No terrain occlusion test is performed.

Production materials receive sun, sky irradiance, cascaded shadows, spell lights
and aerial perspective, then output linear colour into the existing post chain.
The shared vertex shader supplies identical wind and interaction to beauty,
camera depth passes. Grass shadow casting is disabled. Grass is opaque geometric vegetation;
particles are not added to any pass. Static distant material variants and all
production pass variants compile behind the loading screen. Temporary thin-instance
meshes remain enabled through the three real startup frames, exercising every
colour variant and both static/dynamic camera-depth variants so WebGPU render
pipelines are created before gameplay. `finishWarmUp()` removes the probes and
their depth registrations afterwards. Patch placement and buffer uploads still
stream incrementally during gameplay.

Walking uses a 2.4 m radial influence with strength 0.55, eased on contact and
scaled by model height. Surfing exports at most eight segments from the existing
surf ring into reusable typed arrays. Left/right bending follows the path and
speed strength, decaying over its existing 0.88 s lifetime, independently of the
wave's visibility or sand/snow softness. The strongest nearby segment avoids
additive knots at turns. Roots remain anchored; displaced bounds include bends.
Flight, rocket jumping, swimming and elevated support disable avatar impacts;
teleport clears the trail and pause preserves animation time.

Grass receives world shadows but casts none: no grass meshes are registered
in any cascade, and no grass shadow materials are created or warmed. Streaming,
visibility and static changes update camera-depth registrations; disposal removes
entries without disposing materials shared by other patches.

## Grass surf appearance

Surf samples store authored grass coverage in the existing spine texture
(row 2 alpha), retaining the source biome as the trail crosses boundaries.
Both surf sides blend to green grass shading, suppressing snow transmission,
blue cave tint and snow glints. Coverage uses the same road/water exclusions as
placement, and remains available when grass rendering is disabled.

The existing pooled spray uses kind 6 for small tumbling tufts of three tapered
grass blades, drawn as shader silhouettes rather than additional GLB instances.
Forest now uses kind 7 for the same tufts with a brown aged-grass palette.
Forest coverage is stored separately in row 3 of the wake spine texture; grass
keeps row 2 alpha and its green palette. Both keep grounded emission, no powder
drift, shared vertical drag and the same size/lifetime.

Their billboard radius is 0.14–0.26 m, doubled for visibility while surfing.
Grass emits at 22% of the snow lip rate, with no lingering powder drift. These
particles use the existing gravity, wind, lighting, fog, fade and teleport reset.
Grass vertical drag and launch speed match the snow surf curtain, while its
horizontal motion retains the outward fragment throw. Desert particles already
share snow's gravity and drag for each corresponding powder/clod emission.
They add no meshes, textures, draw calls or shadow/depth registrations. Airborne
and swimming samples do not emit grass fragments. Snow, desert and water keep
their existing particle kinds.

## Diagnostics and validation

`EXALTED.grass` exposes `settings`, `stats`, `streamingStats`, `renderer` and
`reset()`. Set `EXALTED.grass.settings.enabled = false` for draw comparisons.
`EXALTED.captureDraws(120)` counts actual submitted geometry across passes;
grass statistics count distance/view-selected batches with a conservative guard;
they are not GPU draw-capture totals.

Type checks, production/lab streaming tests, biome/grounding tests, interaction
snapshot tests and caster lifecycle tests cover integration contracts. Browser
checks use native Chromium WebGPU; Playwright is not required.

Startup pipeline instrumentation confirmed all four static/dynamic colour/depth
pipelines were created behind loading. Entering The Long Green with 34 visible
patches created no further grass pipelines; temporary probes were fully removed.
This verifies pipeline coverage, rather than frame-time performance on player hardware.

Before the reduction to density 3 and disabling grass shadow casting, a
development browser capture at The Long Green of 60 frames during patch fill
measured about 554 draws and 1.091 billion indices per frame with grass, versus
31 draws and 5.10 million indices without it. This was not a fully populated
steady-state or hardware timing benchmark, and does not describe the current
density-3 configuration without shadow casting. LOD distances are unchanged;
Tall grass has since been removed from the mix. Current performance and visual feel need review on the target
hardware.
