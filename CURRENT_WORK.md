# Exalted Current Work

## Smaller 1K deployment inventory, 6 November 2026

`build:1k` now selects the ground/prop derivatives before resolving GLB
external dependencies. Replaced originals and unused external boulder images
are omitted from this package; attribution notes and original `public/` assets
remain. Ordinary multi-page builds retain both profiles. The script creates no
ZIP; the user prepares upload archives after building. Packaging tests check
exclusions and retained runtime assets.

## 1K spruce atlas colour correction, 6 November 2026

The first prop conversion incorrectly treated baked premultiplied colour and
object-space normal atlases as ordinary straight-alpha glTF maps. The impostor
shader already unpremultiplies both, causing bright cyan foliage and incorrect
normals. Atlas preparation now box-filters stored RGBA channels directly,
matching texture sampling; it does not gamma-convert, unpremultiply, adjust
coverage or renormalise these special maps. Ordinary GLB processing is unchanged.
Regression coverage checks reduced stored colour/normal/alpha against source
block averages. Original atlases and shader/material settings stay unchanged.
Typecheck and all three prop-profile tests pass. Visual confirmation remains
with the user; built packages need rebuilding.

## Standalone 1K deployment command, 6 November 2026

`npm run build:1k` builds only the 1K ground/props shell into `dist-1k/`
and renames its compiled HTML to `index.html`. `npm run preview:1k` serves it.
Source pages, normal build and Pages build remain unchanged. The validated
runtime/provenance inventory is retained. See BUILD_PACKAGING.md.

## 1K ground and prop comparison, 6 November 2026

`index-1k-props.html` adds a third main-app shell: the existing 1K ground
profile plus capped-at-1024 prop textures. `index.html` and `index-1k.html`
retain their existing prop assets. Pine and desert embedded textures and the
boulder's external normal map are reduced offline into self-contained GLBs.
Every geometry buffer, node, accessor, material setting and placement is retained.
Fir, grass and flower textures already fit within 1K and are reused unchanged.
Spruce atlases become 1024 x 384 with matching 128-pixel tile metadata; views,
geometry and colour/depth cutoffs remain unchanged. Linear-light premultiplied
colour filtering, normal renormalisation and cutout coverage adjustment are
applied offline. Sources remain read-only and checksum-verified.
Run `npm run assets:props:1k` to regenerate (Python/Pillow 12+). See
`public/terrain/props-1k/SOURCE.md`. Visual foliage quality and performance
comparison remain manual checks. Typecheck and all 196 Node tests pass,
including source hashes and byte-identical geometry checks. No production
build or publishing performed.

## 1K tiled ground comparison, 6 November 2026

`index-1k.html` shares the main app runtime and selects twelve 1024-square tiled
maps for meadow, forest floor, beach and road. The original page and source
assets remain unchanged. These maps fall from 148.82 to 23.94 MiB; mountains
were already 1K. Height/biome masks, terrain, props and all GLBs are preserved.
See BUILD_PACKAGING.md and public/terrain/ground-1k/SOURCE.md for conversion,
asset checksums and deployment details. Next reminder: embedded GLB textures,
including DesertGround in exalted_desert.glb, then trees/flowers with cutouts.
Typecheck and all 194 Node tests pass. Native Chrome WebGPU reaches Ready for
both pages: the comparison loads exactly twelve 1024-square replacements;
the original loads its existing 2K/4K tiled maps and no 1K replacements.
No visual quality approval or production build is claimed for this change.

## Firefox right-button surf, 5 November 2026

Steering follow-up: cancelling pointerdown also suppressed Firefox mousemove
while surfing. The main scene now sets preventDefaultOnPointerDown/Up=false,
and surf's pointer handler leaves the down event uncancelled. Context menus
remain explicitly blocked. Camera steering retains the existing mousemove
path/sensitivity and accepts held right-drag even without pointer lock, so it
does not double-count pointer and mouse movement. A native Firefox input test
reproduced zero steering with the old cancellation and nonzero X/Y movement
after the change. Regression coverage checks drag steering, hover gating and
unchanged locked sensitivity. Full visual gameplay remains a manual check.

Confirmed cause: Babylon's default scene pointer handler cancels pointerdown,
and Firefox suppresses the compatibility mousedown that surf relied on. A native
Firefox 159.0.1 input harness reproduces no surf with pointerdown cancelled,
then passes after listening to pointerdown/up/cancel in document capture.
Chorded right-button transitions use pointermove's changed button; ordinary
mouse/pointer movement cannot clear a held surf. Mouse handlers remain for
pointer-lock implementations delivering only mouse events. Regression tests
cover pointer-only delivery, chords, cancellation and existing focus cleanup.
This is an event-level browser check, not visual gameplay verification. The
isolated headless Firefox cannot initialise this app's WebGPU device, so full
Firefox gameplay remains a manual check. Earlier troubleshooting follows.

Surf input no longer requires pointer lock when right-pressing the canvas.
The handler focuses the canvas, prevents right-press defaults and suppresses
context menus in document capture while locked or over the world. Held surf
uses explicit press/release events rather than unreliable movement button bits;
pointer unlock and
window blur still clear surf. Unlocked UI right-click remains available.
This addresses a confirmed input dependency on pointer-lock success rather than
claiming Firefox never supports pointer lock. Tests cover the unlocked canvas,
UI focus, document-targeted locked events, button chords and release cleanup.

Follow-up: the first fix incorrectly trusted movement-event `buttons`, which
could immediately clear a held right press in Firefox pointer lock. That check
is removed; regression coverage now includes locked movement with `buttons=0`.
The prior native Firefox test covered unlocked input only and did not establish
that the reported captured-mouse gameplay problem was solved.

## Ordinary mountain texture loading, 5 November 2026

Mountain/rock arrays now assemble from 20 browser-decoded opaque PNGs, loaded
sequentially. The custom rock response stream and native gzip decompression are
absent from this runtime path. Height travels separately to avoid Canvas alpha
premultiplication; reconstructed RGBA bytes match the previous 1024 arrays.
Payload falls from 33.83 to 30.50 MiB, with unchanged GPU resources and mips.
Source textures/arrays and heightmap loading remain unchanged. See
IRON_MOUNTAINS.md and BUILD_PACKAGING.md. No hosted deployment is performed here.
Typecheck, all 192 Node tests and production build pass. Native Chrome WebGPU
startup reaches Ready with 20 rock PNG requests and no binary-array requests;
browser-decoded array hashes match preserved packed sources. No visual review
or affected-user Firefox reproduction is claimed.

## Player controls help, 4 November 2026

A persistent question-mark button at the top right opens a keyboard-accessible
dialog with current movement, flight, interaction, nine spells, screenshot and
settings bindings. Opening releases pointer lock and resets held input; gameplay
shortcuts are blocked while the dialog is open. Escape or the close button
returns focus to the help button. The spawn bar reserves space for the icon.
Implemented in `src/ui/controlsHelp.ts` and its CSS; typecheck passes.

## Terrain-map transfer recovery, 30 October 2026

The same test4 user now reports `ground-coverage-9.png: Failed to fetch`.
Its hosted 303,674 bytes match the local SHA-256, and a range request returns
valid HTTP 206. All six authored terrain PNGs now opt into the existing bounded,
validated range fallback after two failed whole-file transfers. Normal successful
loads and HTTP error handling are unchanged. The affected connection's root cause
remains unconfirmed; see BUILD_PACKAGING.md for limits and diagnostic next steps.

## test4 heightmap transfer recovery

The new report names vis_ground_heightmap-11.png on test4.babylonpress.org.
Its hosted bytes match the original, and the server supports validated ranges.
After two interrupted whole-file reads, this heightmap can now recover in
1 MiB chunks with bounded retries and strict version/range checks. The PNG and
terrain remain unchanged. Typecheck/188 tests pass; production build refreshed.
See BUILD_PACKAGING.md.

## 1024 rock-array loading trial

The app now uses a separate five-layer 1024-square rock package. Original PNGs
and 2048 arrays remain unchanged and are verified by hashes. Rock download size
falls from 129.75 to 33.83 MiB, GPU array storage from about 320 to 80 MiB, and
the production build to 286.02 MiB. Regenerate with `npm run assets:rocks:1024`.
Build/typecheck/185 tests pass; local WebGPU resource sizes/startup checked.
Hosted error reproduction awaits deployment. See BUILD_PACKAGING.md.

## Hosted startup transfer resilience

The reported Content-Length/body mismatch was not reproduced during a cold
startup of test3.babylonpress.org. Hosted rock binaries match local checksums,
but some texture transfers take tens of seconds. Terrain-map and rock downloads
now retry one interrupted transfer with cache reload and preserve the failing
URL on final error. Startup errors no longer show unrelated WebGPU advice.
Production package rebuilt; typecheck and 184 tests pass. See BUILD_PACKAGING.md.

## Production asset packaging

Hosted rock-array URLs now use `.rgba.bin` in the production package to avoid
archive-extension restrictions. Compressed bytes and workspace sources are
unchanged; decoding inspects the payload signature rather than HTTP headers.
Startup failure text now uses a plain separator. See BUILD_PACKAGING.md.

The default build now produces only the main app and its runtime asset inventory,
with source maps disabled. Lab builds use `npm run build:labs` and `dist-labs/`.
Original authoring assets remain in place. Production output fell from 1,198.57
to 381.94 MiB, with texture quality and runtime modes preserved. See BUILD_PACKAGING.md.

## Stone Gate end wall

Added a grounded, collidable wall of 13 varied stone boulders across the northern
road end, connecting the two existing endpoint rocks. Reuses three shared rock
texture layers and the existing boulder geometry. See IRON_MOUNTAINS.md.

## Product Direction

The playable **Exalted application** remains the main product under development.
It contains the authored world, avatar, movement, spells, terrain interaction,
water, atmosphere, props, collisions, UI, and other player-facing systems.

Work should be evaluated by how it supports the quality, performance, and
maintainability of this main application.

## Rock-array mipmap correction

Explicit per-layer mip uploads fix black rock textures at distance/oblique
angles. Native WebGPU albedo diagnosis and coarsest-mip readback confirmed the
missing mips and the fix; the supplied cliff pose now shows the intended texture.
GPU memory/bindings are unchanged; startup CPU filtering/mip buffers add about
80 MiB. See SNOW_MOUNTAINS.md.

## Stone Gate left cliff material and triangle correction

The supplied rock/snow/snow_03 colour/normal/ARM/displacement set now covers the
whole Stone Gate pass terrain (60 m full / 90 m feathered radius), with its
original road restored as the final material overlay,
and the left cliff through an isolated soft region. Other
cliffs retain Rock Face 03. The fifth shared-array layer adds about 64 MiB GPU
storage without extra bindings/draws. A diagonal correction improves 77 steep
cells with no added vertices/triangles, shared by rendering and grounding;
steep-face shadow bias uses geometric normals. See SNOW_MOUNTAINS.md.

## Snow Mountains material trial

Authored heightmap snow mountains now retain snowy ledges and expose cool matte
rock on steep faces, with texture-height transitions and subtle wind variation.
Rock Face 03 occupies the fourth shared-array layer (restored after the
snow_01 cliff trial); exposed rock is limited
to steeper faces and a 70 m Palecrown snow reserve feathers to 105 m. The trial
adds no geometry or bindings (+64 MiB GPU array storage) and leaves
snow gameplay/deformation intact. Shadows remain enabled with readable ambient
fill. F1 offers a comparison toggle; see SNOW_MOUNTAINS.md for thresholds, cost,
source-texture limitations and required visual review.

## Iron Mountains layered material

The supplied Rocky Terrain / Rocky Terrain 03 sets now cover the dedicated
Iron Mountains region at 90 m scale, with triplanar normals, slope/height blends,
fine detail, subtle rust and darker crevices. Other rock regions retain the river
set. Three texture arrays preserve the 27-binding budget; F1 includes a material
comparison toggle. The silhouette pass adds 12 ridge outcrops and 32 smaller boulders using the
prepared plain boulder, with thin-instance cell batching, matched camera-depth
passes, road/teleport clearances and independent rock collision. F1 toggles
material and accents separately; Ctrl+Shift+P includes the accents. Costs and
asset limitations are recorded in IRON_MOUNTAINS.md. Iron Mountains terrain
no longer receives cast shadows; its rock accents neither cast nor receive them.

## Removed legacy viewers

On 2026-10-12, halved.html, forest.html, forest_road.html and snow_mountain.html
were removed with their dedicated JavaScript/WGSL, preparation script and tests.
Deleted assets: forest_previz.glb, forest-opt.glb, both snowy_mountain terrain
GLBs, and generated forest-demo prototypes/placements/manifest. Vite entries,
package scripts and current asset/license records were updated. Production
forest code and replacement pine/fir/spruce assets remain intact. Historical
experiment notes are retained as history. Source cleanup removed 28 files,
approximately 38.4 MiB.

## License ownership and third-party audit

The main MIT copyright holder is Andrei Stepanov. THIRD_PARTY_NOTICES.md
preserves the earlier repository copyright, asset attribution/derivations and
exact dependency license/notice texts. Its public copy and LICENSE.txt ship via
Vite's public assets. Refresh dependency notices with `npm run licenses:update`.
Asset permissions still missing from source records are explicitly listed;
Raw Catalog purchase/tier and standalone redistribution permission are not
verified. The project's MIT license does not relicense these assets.

## Dandelion colonies and sun elevation

Selected Daisy_1/2/3 LOD1 flowers now join dandelions in separate sparse colonies,
with half the dandelion density and a 40/30/30 mix. Both species use the Meadow
flowers toggle; overlapping colonies keep grass thinning capped at 35%.
See GRASS.md and the prepared daisy asset notes.

The main authored meadow now streams selected dandelions in sparse colonies,
with independent flower density/mix, matching colour/depth alpha cutout and
shared grass interactions. Benchmark includes a Meadow flowers toggle and
flower diagnostics. The family contract leaves room for later daisies; see
GRASS.md. Default sun elevation is now 30 degrees, as requested.

## Forest surf appearance

Forest surf sides now use dark olive/moss colours, without snow transmission,
blue cave tint or snow glints. Forest emits aged-grass blade tufts with a warm
brown palette, retaining grass particles' size/lifetime/launch/settling. Each
spine sample stores forest coverage at birth so boundary crossings retain colour.
No extra meshes/draws/textures are added; the existing spine texture gains one row.
See FOREST_NOTES.md and GRASS.md.

## Reduced real big-tree density

Real Big 1 pines and Large 2 fir accents now retain exactly half their sites,
rounded up per model, using deterministic coordinate ranking. Spruce impostors,
medium/small trees, saplings and fringe shrubs are untouched. Existing closed-area
barriers remain; removed open Large 2 trunks lose their individual colliders.
Benchmark settings record `bigTreeDensity: 0.5`. See FOREST_NOTES.md.

## Regional sun bearings

Authored-world gameplay now blends the sun to 225 degrees in forest and 105
on Lake Island, after 1 s dwell and over a 7 s shortest-arc smooth transition.
Boundary hysteresis avoids rapid reversals; leaving restores the editable base
bearing (default 185). Island classification uses the registered island centre
and a soft 55-75 m boundary. Automatic routes freeze the entry bearing and
record effective bearing/region in snapshots. Sky/ambient lighting stays at its previous baked state throughout motion,
then recalculates once at the settled bearing. Direct light/shadows track each
frame; asynchronous solves remain coalesced.
See FOREST_NOTES.md and ARCHITECTURE.md.

## Forest collider-edge fringe

A denser fringe follows the dense forest contour: 165 additional small firs
(2.8-4.3 m) and 258 low evergreen shrub clusters (1.2-1.9 m). The 3.5 m grid
covers 3 m inside / 14 m outside the contour, retains existing placements and
clearings, and excludes roads/water/steep slopes. Bushes reuse two Small 2 LOD2
shoots (592 triangles), shared fir materials and no extra asset download. Bushes
have no collision; added small trees have trunk-only cylinders. See FOREST_NOTES.md.

## Selected firs in production

The accessible woodland now uses the prepared realistic-fir subset: Large 2
(4% accents), Medium 1/2 (24/24%) and Small 1/2 (14/14%), plus retained Pine
Sapling 1/2 (10/10%). Existing 593 open sites retain X/Z/yaw, 8 m spacing and
clearings; 466 sites now use firs after large-tree thinning. LOD2 stays active everywhere, with matching
0.35 alpha-cutout colour/depth and all variants warmed behind loading. Dense
border pines/spruce cards stay unchanged. See [FOREST_NOTES.md](FOREST_NOTES.md)
and [fir asset notes](public/terrain/forest/fir-pack-selected.README.md).

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
Forest Outlook: 593 real trees at 8 m spacing, using the fir/pine mix above. The overlook retains an
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
55 Big 1 and 49 Small 1 trees in the dense section, batched in 32 m chunks.
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

The interactive 1.5 m crystalline Cube is restored at Forest Cube Spawn
(chart 767, -104; Babylon -383.5, 52), grounded on current terrain with its
original 0.5 m clearance. Within 3 m, E dissolves the Cube over 1.25 s and grows
the persistent HDR portal ring and blended vortex. Its orientation snaps to the
nearest vertical Cube face toward the avatar and remains fixed. After growth
and a 0.45 s settling delay, entering the 1.5 m radius displays the world label
and dispatches window event `exalted:portal-entered`, once per crossing.
The legacy detail `id: 'default-spawn-portal'` and world-space position payload
remain unchanged for existing listeners. This event does not automatically
teleport the avatar. Automatic benchmarks suppress E activation. Reflection
Cube/probe construction, update, diagnostics and triangle accounting are removed
from the production entry point; its unused prototype remains in source.

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


## Snow Mountain cliff cover

Added a separate snow_03 rock-snow facing over the jagged northern Stone Gate cliff.
It follows terrain contours and reuses the rock array; 1,152 triangles and one
colour/depth batch. Grounding remains on the terrain. See SNOW_MOUNTAINS.md.


## Cheaper distant grass trial

Small grass retains existing LOD2 nearby and uses 36-triangle geometric tufts
beyond the 22 m patch cutoff. Range/density stay unchanged. Benchmark has a
Cheaper distant grass comparison toggle. Fixed-view grass submitted indices
fell about 66%; FPS gains await route comparison. See GRASS.md.


## Grass square-patch correction

Cheaper grass now exchanges individual tufts across 22?34 m and thins by root
distance, with matching colour/depth choices. Nearby grass is retained. The
smoother transition adds overlapping submissions: fixed-view grass indices
are about 24% below original geometry, superseding the prior 66% trial figure.
See GRASS.md.


## Narrower grass transition trial

Changed the per-root blend to 22-30 m and tightened batch gates to exact square
root extents. Fixed-view indices fall another 14%, grass draws another 7% against
the prior smooth trial. Typecheck and 178 tests pass; native WebGPU view checked.
Automatic route timing for this new trial remains to be measured. See GRASS.md.
