# Forest asset and rendering notes

Forest Outlook is now a separate top-panel teleport destination at the existing
clearing, world (-248, 125), chart (496, -250), facing the southeast sightline.
It uses the standard terrain-grounded teleport and movement/effect reset flow.

## Restored forest Cube and portal (2026-10-12)

The interactive crystalline Cube from commit `2486717` is active at Forest
Cube Spawn: chart (767, -104), world (-383.5, 52), with current terrain grounding
and its original 0.5 m clearance. The shared `FOREST_CUBE_SPAWN` navigation
constant anchors placement; avatar movement no longer determines Cube position.
Existing clearing, corridor and tree placements are unchanged.

Within 3 m, E starts the 1.25 s dissolve/portal growth. Portal orientation locks
to the Cube face nearest the avatar. Entry arms after growth and 0.45 s settling;
crossing into the 1.5 m radius displays `Portal entered` and publishes window
event `exalted:portal-entered`. Preserve the legacy detail ID
`default-spawn-portal` and world-space position for existing consumers. Standing
inside does not repeatedly dispatch; leaving and re-entering dispatches again.
The event is a hook, not an automatic teleport destination.

Reflection Cube/probe is not instantiated or updated by the production app.
Cube/portal shader registrations, materials and warm-up remain as before;
automatic benchmarks suppress E activation. Native WebGPU checked E activation,
visible ring/surface, event payload and absence of reflection meshes without
shader errors. Node tests cover grounding, range, settling, orientation, event
edge triggering and UI/resource disposal.

Updated: 2026-10-09.

These findings come from the standalone `/forestland.html` lab and supplied GLB
assets. Forestland remains a standalone lab. A user-authorized eastern-strip
trial now populates the main heightmap app with the replacement Big 1 pine.
Full forest integration remains deferred under [FOREST_SPEC.md](FOREST_SPEC.md);
the legacy forest prototype and its assets were removed on 2026-10-12. See the [lab README](generator/forestland/README.md)
for implementation details and [asset provenance](public/terrain/forest/SOURCE.md)
for source and licence notes.

## Assets evaluated

| Asset | Findings | Current use |
| --- | --- | --- |
| `pine_tree_01.glb` | Two tree shapes merged into one mesh/material; 8,724 triangles total. Separated in memory into 4,522- and 4,202-triangle trees without discarding foliage. Creator/licence not supplied. | Retained reference; no longer the active lab model. |
| `pine_trees_pack_lowpoly_game_ready_lods.glb` | About 46.2 MB; 15 variants across large, big, medium, small and sapling families, with LOD0/1/2 and authored 16-triangle LOD3 cards. Shared bark/foliage materials. LOLIPOP, CC BY 4.0. | Source for the active lab subset. |
| `pine-pack-forestland.glb` | About 22.7 MB; 12 variants (medium, big, small, sapling), LOD1/LOD2, 48 bark/foliage parts, two materials and six embedded texture maps. | Active Forestland asset. |
| `coniferous_forest_assets_pack.glb` | About 36.55 MB; richer forest detail, but no authored LODs or wind. Living trees are roughly 6,500–8,700 triangles, shrub about 5,700, sapling about 1,100. Uses legacy `KHR_materials_pbrSpecularGlossiness`. Dari, CC BY 4.0. | Detail reference and extraction source; not integrated. |

The pine pack is the better starting point for repeated trees because it already
has geometry LODs and consistent shared materials. The coniferous pack is more
useful for occasional fallen logs, dead trees and rocks than for the cheapest
distant forest. Large rock outcrops cost roughly 4,600–7,700 triangles each.

Regenerate the active subset with `node scripts/prepare-pine-pack.mjs`. It removes
display-layout translations while retaining axis/unit transforms, UVs, normals,
tangents and original textures. Foliage changes from alpha blending to alpha
cutout at 0.35 for consistent depth and shadows. LOD0, large pines and authored
LOD3 cards are excluded. Original supplied GLBs remain unchanged.

### Extracted coniferous detail assets

Saved under `public/terrain/forest/coniferous-selected/`:

| File | Triangles |
| --- | ---: |
| `fallen-log.glb` | 320 |
| `dead-tree-tall.glb` | 1,484 |
| `dead-tree-short.glb` | 580 |
| `boulder-mossy.glb` | 768 |
| `boulder-plain.glb` | 768 |

These five GLBs share six external PNG maps in their `textures/` subfolder;
keep the folder together. Geometry is about 0.23 MB total, shared textures about
21.42 MB. Extraction preserves source texture bytes, authored transforms and
material requirements. Regenerate with `node scripts/extract-coniferous-details.mjs`.
The manifest records source identities, hashes and attribution. They have been
loaded successfully in WebGPU but are not placed in the lab or main app.

## Forestland placement and controls

### Temporary main-app forest ground

The main authored world now tiles the user-supplied `forrest_ground_01` colour,
OpenGL normal and packed ARM PNGs from `public/terrain/forest/textures/` onto
forest ground, at a 4 m repeat. Forest classification starts from the current
RGB (124, 170, 129) biome colour. Heightmap mode now uses the generated packed
grass/forest/desert coverage described in [BIOMES_MAPS.md](BIOMES_MAPS.md), with
complementary weights and approximately 4–6 m transitions. Grass placement
shares that coverage. Full authored biome masks remain future work. Existing
snow, water and road coverage takes priority. GLB comparison retains palette
classification from its existing biome PNG;
procedural mode is unchanged. UVs are `(-world.x, world.z) / 4`, continuous
across coarse terrain and local detail. Base colour is decoded from sRGB;
normal/ARM are linear, with ARM channels R=AO, G=roughness, B=metallic.

The terrain shader retains world lighting, shadows, fog and linear output to
post-processing. Snow grain normals/glints are suppressed on textured forest
ground. No additional ground mesh or draw call is introduced. Terrain owns
the textures, waits for them before shader warm-up, and disposes them on teardown.
The authored terrain shader now binds 24 textures in heightmap mode (19 in GLB mode),
including the separate rock mask and PBR set;
main-app device creation explicitly requests that texture limit. Forest maps
share the meadow repeat/filter samplers, retaining the default 16-sampler limit
(important on D3D11 adapters). Adapters must support the requested texture count;
procedural mode retains the default device request.
This does not add forest trees or change terrain grounding, deformation or collision.
Native WebGPU startup and a screenshot at The Thornwood confirmed the ground
texture is visible and bound on both terrain colour materials, without GPU
validation errors. Typecheck and the 127-test suite passed during integration.

The conceptual map also identifies Forest Overlook and Forest Cube Spawn as
clearings: future tree placement should leave their centres mostly free of
large trees and preserve the overlook's sightline toward the grasslands.
Their exact clearing masks/bounds have not yet been authored or implemented.

The Forest Overlook's grey outcrop is now covered by the forest floor texture
as a temporary display-only correction. Its Babylon-space centre is (-248, 125),
with half-extents (74, 83) m and a soft 10% boundary. Only the measured grey rock
palettes RGB (162,153,144) and (169,163,157) receive the extension. Roads, grass,
water, sand, actual snow and rock elsewhere retain their materials. This does
not change the source PNG, gameplay biome channels or tree placement; replace
the bounded correction with authored forest coverage when biome masks arrive.
In heightmap mode the correction is baked into `ground-coverage-9.png` and
softened with adjoining land coverage. GLB mode retains the bounded shader
correction. The new blend removes the pale stepped strip between textured
grass/forest and also includes desert transitions and land beneath roads.

The lab uses `vis_ground_heightmap-11.png` and `vertex_color_4k-9.png`. The forest
palette is dark green, RGB (124, 170, 129). Exact terrain triangles provide
grounding and slope normals; roads, other biomes, painted water and slopes above
0.7 rise/run are rejected. Four additional probes 2 metres around each root
conservatively reject biome edges. Imported GLB transforms are baked once;
terrain coordinates are not converted a second time.

Placement is deterministic, with jittered spacing, upright trunks, random yaw
and ±15% scale variation. Instances are batched into 32 m chunks. Each
chunk/variant/LOD mesh must own independent geometry and instance-buffer
bindings: sharing Babylon Geometry can overwrite another chunk's matrices.
Materials and textures can be shared.

Current defaults are 12 m spacing, 12 m reference height, LOD1 within 40 m,
LOD2 through 140 m, optional placeholders through 350 m, and nearby shadows on.
The current map has 464 placements at 12 m spacing, versus 1,019 at 8 m spacing.
Reference height scales Medium 2 while preserving relative family sizes.

The bottom tree-mix panel redistributes percentages to keep a 100% total;
zero excludes a variant without changing total placement density. Default shares:
Medium 1/2/3 = 25/25/20%, Big 1/2/3 = 5/5/5%, Small 1/2/3 = 3/3/3%, and
Sapling 1/2/3 = 2/2/2%. The default weighted geometry costs are approximately
2,065 triangles at LOD1 and 1,119 at LOD2 per tree.

### Floating roots: cause and correction

Normalizing the model's lowest vertex to Y=0 raised the authored trunk base:
root tips are intentionally below its ground plane. This made trees float.
Both LODs now retain authored Y=0 and negative root vertices. Lower-trunk/root
support points from both bark LODs sample the actual terrain after yaw and scale.
The shared instance height is lowered as needed, with 3 cm of burial. Selection,
X/Z, rotation and scale are preserved. Regression tests cover flat ground, slopes,
rotation, scale and both LODs. Roots were also reviewed in browser screenshots.

## Farthest trees for flight and aerial views

Because the avatar can fly, side-only billboards leave holes when viewed from
above. The current experiment uses six triangles per tree: two crossed vertical
cards (four triangles) and one horizontal canopy card (two triangles). A
procedural 512 × 256 atlas provides side and top silhouettes for each variant.
Cards reuse the grounded tree transforms and retain each model's proportions.

This is a simple placeholder, not a bake of the actual tree or the pack's authored
LOD3. Its material uses alpha cutout at 0.4, fog and unlit colour. Cards cast no
shadows, have no wind and receive no dynamic lighting. Their stylized shapes and
colours still differ from detailed trees. Matching silhouettes/colours with
baked side/top views or evaluating authored LOD3 remains future work.

LOD and visibility use full 3D camera-to-chunk-canopy-centre distance, so gaining
altitude reduces detailed geometry. Detailed trees and placeholders do not
overlap; the outer card cutoff adds 23 m of chunk padding. There is no cross-fade,
so transitions can pop. Tree and placeholder counts are reported separately.

Two Babylon setup requirements found during implementation:

- Import the WebGPU dynamic-texture extension before creating the procedural
  atlas; otherwise startup fails with `engine.createDynamicTexture is not a function`.
- Set `useAlphaFromDiffuseTexture` as well as texture alpha/cutout settings;
  otherwise the card backgrounds can render as opaque rectangles.

### Overview dark patches: shadow correction

At some overview angles, the ground became covered by enormous dark patches.
The nearby shadow map auto-fitted its projection to the caster list, which could
be empty when the elevated camera moved more than 60 m from detailed tree chunks.
The sun's shadow position also followed camera altitude instead of the ground.

The lab now uses fixed 200 m shadow bounds, a 1–400 m depth range and 0.1 edge
falloff. Its position follows the terrain beneath the camera, with a 160 m offset
against the sun direction. Shadow reception is disabled when shadows are off or
there are no nearby casters, avoiding invalid bounds and stale-map sampling;
it resumes when detailed trees return to range. The selected detailed LOD casts
shadows within 60 m; placeholder cards remain excluded.

This correction was checked in native WebGPU screenshots across overview angles,
high altitude, shadow toggling and return to ground view, with no browser errors.
A regression test verifies finite, invertible empty-list projection, ground
anchoring, caster removal/re-entry and the shadow toggle. This is the lab's
standard Babylon shadow map, not the main app's custom cascades.

## Recorded performance

User-supplied 30-second ground-camera captures, both at 1745 × 866:

| Metric | Original two-tree asset | Pine-pack mix |
| --- | ---: | ---: |
| Spacing / reference height | 9 m / 12 m | 8 m / 16 m |
| Detailed range / LOD1 range | 160 m / single geometry | 140 m / 15 m |
| Placed trees | 819 | 1,019 |
| Mean FPS | 144.03 | 141.90 |
| Mean frame time | 6.94 ms | 7.05 ms |
| p95 / p99 frame time | 7.10 / 7.10 ms | 7.90 / 8.70 ms |
| Mean CPU submission | 1.51 ms | 3.82 ms |
| Mean draw calls | 62.71 | 178.53 |
| Mean submitted indices | 5,644,309 | 1,982,140 |
| Frames above 33 ms | 0 | 0 |

The second capture used Medium 1/2/3 = 44/34/7%, no Big trees, Small variants
3% each and Sapling variants 2% each; shadows were enabled in both captures.
The pack reduced submitted indices substantially while increasing draw calls
and CPU submission. More variants and separate bark/foliage batches contribute
to submission cost. These are not controlled comparisons: density, sizes,
camera paths and ranges differ, and FPS near 144 does not establish GPU headroom.
CPU submission is not GPU execution time. No aerial-placeholder performance
comparison has been recorded yet.

## Remaining work and validation

The overall pine-pack appearance was approved for continued experimentation.
Production forest integration, trunk collisions, foliage wind, lighting/depth
integration and startup warm-up remain separate work. Forestland currently has
manual ground and overview cameras and a 30-second benchmark; no automatic route.

Before choosing a production far-tree representation, compare fixed ground and
aerial views, silhouette/colour matching, transitions and draw/index costs.
Reassess atlas/material sharing if many placeholder variants increase draws.
Keep collisions independent of visual LOD and preserve independent chunk buffers.

Latest validation after the shadow correction: `npm run typecheck` and all
127 tests in `npm test` passed. Native WebGPU screenshots supplemented automated
checks. No Playwright or production build was run.


## Initial closed eastern forest trial ? 2026-10-09

The user requested a dense, inaccessible right side of the main forest, using
one big-tree model before benchmarking. East on the authored chart is **negative
Babylon X**. The initial extent is the outer 58 metres, **X <= -410**, restricted
to the dark-green forest biome on `vertex_color_4k-9.png`.

- Repeat **Pine_big_1** only: **5.5 m spacing**, **20 m target height**, deterministic
  jitter, yaw and ?10% height variation. The current terrain produces **574 trees
  in 36 occupied 32 m chunks**. Roads, other palette colours, submerged terrain
  and slopes above 0.7 are excluded; four 2 m biome probes keep crowns away from
  boundaries. An 18 m clearing around the current forest spawn is also reserved.
  The forest spawn and Forest Overlook remain outside the restricted strip.
- Ground both LODs together using their bark root supports on the actual heightmap
  triangles. Preserve the authored ground plane and buried root tips.
- Use authored **LOD1 within 40 m**, **LOD2 through 600 m**, measured from camera
  position including altitude. No cards, placeholder crowns, or random triangle
  removal. Chunk bounds and independent Geometry/instance bindings are retained.
- The shared pine loader, palette classifier and root grounding live under
  `src/forest/`; lab modules re-export them. Production never imports generator
  code. The retained 22.7 MB prepared pack is loaded; this first trial does not
  yet create a smaller Big-1-only asset.
- Production `desertProp` WGSL supplies linear colour, alpha cutouts, lighting,
  received shadows, fog, spell lights and matching camera depth. **Tree shadow
  casting and wind are off for this initial density trial.** Four small probes
  draw both LODs and their depth variants through the loading-screen frames,
  then unregister and dispose, preventing deferred pipeline creation on approach.
- **701 overlapping area-barrier cylinders** close the forest independently of
  tree placement, slope exclusions, distance culling and the benchmark toggle.
  Their vertical span is terrain minimum minus 100 m through maximum plus
  1,000 m, blocking current flight as well as walking. This is an area boundary,
  rather than individual trunk collision. Disposal removes only forest barriers
  from the shared collision grid and preserves existing desert collisions.
- Benchmark panel includes **Forest trees**; toggling it removes all forest draw
  and camera-depth membership while preserving ground texture and the closed
  area. Reports include settings, placed/selected tree and chunk counts, collider
  count, update CPU time and forest metrics. Selected counts are distance/LOD
  membership, not a claim that all those chunks survive camera frustum culling.
  For comparison use **Manual** mode at The Thornwood, looking east; the existing
  automatic camera route remains a grassland route. GLB comparison and procedural
  modes do not enable this new stand.

Validation: typecheck and all **140 Node tests** passed, including deterministic
placement, biome/water/slope exclusions, root placement, LOD altitude, swept
walking/flight barrier crossings and shared-grid cleanup. Native Chromium WebGPU
checks showed rooted trees and a dense aerial canopy, checked the UI toggle and
its depth-registration cleanup, and blocked test sweeps at ground and flight
heights. All 144 chunk/LOD/part meshes had independent Geometry and correctly
assigned matrix translations; no warm-up probes remained after startup. A short
manual recording exported all four forest metrics. Disposal removed all 701
forest barriers and forest mesh/depth entries while retaining other obstacles. The baseline headless float32-filterable warning remains. No production
build or Playwright run; representative performance benchmarks are still pending.


## Wider LOD2 forest and automatic benchmark ? 2026-10-09

This supersedes the initial 58 m / near-and-far trial above. The user approved
**doubling the width and LOD2 everywhere** before further representation changes.

- Extent: **116 m eastern strip, Babylon X <= -352**. Same 5.5 m spacing,
  20 m target height, deterministic placement and biome/water/slope/root tests.
  Current placement: **1,169 trees in 48 chunks**, with 96 bark/foliage meshes.
- Every tree now uses authored **LOD2 (1,389 triangles)**, including nearby trees.
  LOD1 has 2,626 triangles; its production meshes, instance buffers, materials and
  warm-up probes are no longer created. The source pack still supplies root
  supports from both LODs for stable grounding. The 600 m visibility limit,
  production shading/depth, casting disabled and wind disabled remain intact.
- Wider coverage reaches the current spawn: reserve its **18 m radius clearing**
  plus a **16 m wide exit corridor** along Z=52 toward positive X (the accessible
  western side). Barrier exclusion includes cylinder radius, so volumes do not
  intrude into this clearing or seal its exit. The overlook lies outside the strip.
  Other restricted areas retain **1,401 overlapping barrier cylinders**.
- Benchmark menu adds **Automatic forest route** separately from the existing
  grass route. Version 1, **Forest edge and aerial canopy**, runs 30 seconds after
  a three-second hold. Ground legs stay west of the closed strip at terrain +3 m;
  the aerial sweep reaches +110 m, looking down over the canopy. A fixed 1.02 rad
  vertical FOV, terrain-following height, eased orientation and absolute-time
  interpolation make enabled/disabled runs repeatable.
- Forest preparation ignores the grass queue. The **Forest trees** checkbox can
  disable geometry before recording; the camera still moves and records. Toggles
  are locked during a run. Avatar simulation is held and the figure hidden;
  completion, Stop, Escape and tab hiding restore the saved camera and visibility.
  The report exports route kind/name/version, elapsed time, height, pitch and yaw,
  plus existing per-frame draw/index and forest diagnostics. Forest mode is
  available only where this stand exists (the heightmap main app).

Validation: typecheck and **143 Node tests** passed. New tests cover the clearing
exit, nearby LOD2, continuous repeatable ground/aerial sampling, altitude bounds,
forest readiness independent of the grass queue, route switching and cancellation
restoration. Native Chromium WebGPU completed the 30-second forest run, exported
its forest route and diagnostics with 1,169 selected trees, kept the avatar fixed,
and showed both ground and aerial views. A tree-off run still moved and recorded,
with zero forest colour/depth membership; Escape during preparation restored the
camera. No LOD1 meshes or leftover warm-up probes existed after startup. The
baseline headless float32-filterable warning remains; no new GPU errors occurred.
This validates behavior, not a representative performance target. No production
build or Playwright run. Smaller textures/assets, simpler distant crowns, interior
thinning and coarser barriers remain possible future optimizations.

## Proposed distant-tree geometry simplification

Status: proposed, not implemented. The main app still uses LOD2 everywhere.
At long distances, preserve canopy silhouette, colour and coverage; omit roots,
detailed branches, individual needles and most trunk detail.

| Camera distance | Proposed representation | Geometry budget per tree |
| --- | --- | --- |
| Up to 70 m | Current authored Big 1 LOD2 | 1,389 triangles |
| 70-180 m | Simple 3D pine with a basic trunk and solid layered crown | Approximately 100-200 triangles |
| Beyond 180 m, within the existing visibility limit | Existing Forestland placeholder with a top canopy | Six triangles |

These distances and budgets are starting points for visual checks and benchmarks,
not validated defaults. Include camera altitude in distance selection. The middle
representation retains volume and silhouette from different angles; the far
placeholder preserves cheap forest coverage from both ground and aerial views.
Avoid a single upright billboard because the avatar can fly and see it from above.

Match both simplified representations to Big 1's crown shape, proportions and
colours. Fade between representations to soften transitions; keep colour and
camera-depth behavior consistent. Placement, grounding, clearing/access corridor
and restricted-area collisions must remain independent of visual LOD.

First experiment: replace only trees beyond **180 m** with the existing
six-triangle placeholders, leaving closer trees unchanged. Reuse the same
**Automatic forest route** and settings to compare submitted indices, draw calls,
CPU submission and median/p95/p99 frame times. Check ground and aerial silhouettes,
colour matching and transitions before adding the intermediate 3D model. Lower
triangle counts do not by themselves establish lower GPU cost: placeholder alpha
overdraw, added batches and transition overlap also need measurement.


## Blue spruce: cutout and aerial impostor experiment ? 2026-10-09

The user supplied `blue_spruce.glb` and authorized testing alpha-cutout foliage
with matching depth passes, plus a whole-tree impostor with aerial coverage.
The source is a single blue-green spruce, about 4 m tall and 2.65 m wide, with
11,364 triangles (5,802 bark/branches; 5,562 needles). It is roughly 8.2 times
Big 1 LOD2's geometry, with no authored LODs or animations. Its four embedded
maps are 512x1024 and 1024x1024, and the GLB is about 2.6 MB. It suits occasional
nearby detail; it is not itself a cheaper distant mesh. Embedded metadata credits
RosticOstafi / CC BY 4.0; attribution and source link are retained.

Prepared outputs live in `public/terrain/forest/blue-spruce/`:

- `blue-spruce-cutout.glb`: needles change BLEND to MASK, cutoff 0.35. All geometry,
  hierarchy, bark material and embedded binary texture data are preserved.
- `impostor-colour.png` / `impostor-normal.png`: actual WebGPU renders of the whole
  cutout tree, in matching RGBA8 4096x1536 atlases. Seventeen 512-pixel frames:
  eight horizontal, eight elevated 45-degree views, and one overhead crown view.
  Unlit sRGB albedo and linear object-space normals receive runtime lighting;
  neither sun/shadow nor fog/post-processing is baked into the colour.
- `impostor.json`: view bases, plane size, centre, layout, threshold and hashes.
  A two-triangle billboard chooses the closest ground/aerial/overhead frame.

`/spruceland.html` compares detailed cutout and baked card using the production
prop shaders, sky/lighting, fog, camera depth and post chain. Detailed needles use
one threshold across colour, depth and the first two custom shadow cascades.
The distant impostor casts no shadows. Its colour and prepass use identical UVs
and alpha, with object-space normals preventing view-dependent flat-card lighting.
Alpha-edge colour/normal normalization avoids dark filtering fringes.

The page offers ground/aerial/overhead views, orbit/zoom, 4-20 m height scaling,
full-tree threshold (0.2-0.5), visibility toggles and a depth snapshot. The baked
atlas stays at threshold 0.35 when the detailed threshold changes. See the
[asset README](public/terrain/forest/blue-spruce/README.md) for generation commands,
credit, file contract and limitations. Native Chrome CDP performs the bake;
no Playwright or AI image generation is involved.

Limitations: discrete frame switching, approximate planar depth, fixed roughness,
no depth/parallax bake, no transition blending or coverage-preserving mip chain,
fixed object yaw and no forest streaming/instancing/wind for the spruce. This
prototype is not enabled in the main forest. Test distant appearance and actual
GPU cost before integrating it; geometry falls from 11,364 to 2 triangles per
tree, but atlas alpha overdraw and shading remain relevant.

Validation includes source/binary preservation and attribution, alpha mode,
view bases and selection, metadata rejection, atlas hashes, matching alpha in
all 17 colour/normal frames and transparent tile gutters. Native WebGPU ground,
aerial, overhead and depth captures were inspected: overhead selected frame 16,
only two card triangles were submitted, and changing the detailed cutoff updated
all colour/depth/shadow materials consistently, without GPU errors.


Final checks for this experiment: `npm run typecheck` and all **152 Node tests**
passed. Native WebGPU also booted the main app after the optional prop-shader
extension, with only its existing headless float32-filterable warning. No
production build or Playwright run was performed. The main app still uses its
existing Big 1 forest; spruce assets are available for review in Spruceland.

## Main-app border impostors ? 2026-10-09

The user authorized the baked spruce for the half of the populated closed forest
nearest the map border. Babylon X <= -410 selects the outer 58 m of the existing
116 m strip; the inner half keeps Big 1 LOD2. This supersedes the lab-only status
above. The full 11,364-triangle cutout spruce is not loaded into the main app.

Existing deterministic X/Z, yaw, height variation, 5.5 m spacing, 18 m spawn
clearing, 16 m exit corridor and all 1,401 barrier colliders are preserved.
Spruce origins sample the real terrain triangles with 3 cm embedding, rather
than inheriting pine-specific root-support offsets. Metadata now records the
source height (4.001679927 m) for reproducible target-height scaling.

At The Thornwood: **575 pines + 594 cards = 1,169 trees**. All selected geometry
falls from **1,623,741 to 799,863 triangles (50.7% fewer)**. Cards contribute only
1,188 triangles. There are 48 occupied parent chunks: 24 contain pine geometry,
36 contain cards, including mixed boundary chunks; 84 active colour meshes
replace 96 pine-part meshes. These are distance-selected counts, not guaranteed
frustum-visible draws or measured GPU savings.

`ForestImpostorBatch.ts` batches cards in 32 m chunks with independent typed
vertex buffers, shared colour/normal textures and colour/prepass materials.
`ImpostorBatchGeometry.ts` selects the closest of 17 views in each tree's yaw
space, rotates atlas normals consistently and scales the measured source. Cards
face the camera, update after 0.25 m movement, and compact visibility within the
existing 600 m range including altitude. Fixed bounds enclose quad corners in
all orientations. Depth registration is removed on cull, toggle and disposal;
chunk updates reuse buffers and do not allocate per tree.

Colour/depth have identical atlas UVs and alpha cutoff. Both pipelines compile
and submit behind the loading screen, alongside existing instanced-pine warm-up.
Casting and wind remain disabled. Forest diagnostics and the existing forest
benchmark toggle/route include cards; route version and camera keyframes remain
unchanged for comparisons.

Limitations remain: discrete view changes, planar depth, fixed roughness, no
view blending or coverage-preserving mipmaps. Alpha overdraw and CPU vertex
uploads require user-hardware benchmarking; lower geometry is not proof of
lower GPU cost. Spruce and pine silhouettes/colour differ naturally.

Validation: typecheck, all 155 Node tests, native WebGPU ground/aerial inspection,
completed 30-second automatic forest route, disabled-forest recording, and Escape
camera restoration. Card regression tests cover yaw/view/height mapping, slot
isolation, conservative bounds, independent chunk geometry, repeated updates,
visibility compaction and depth cleanup. Native GPU reported no new errors,
only the existing headless float32-filterable warning. No build or Playwright.

## Big pine colour matching - 2026-10-09

The user requested darker Big 1 trees to blend with the spruce impostors.
The main app multiplies `Clusters_Mat` foliage albedo by linear RGB
`(0.18, 0.30, 0.32)`, reducing brightness and the original yellow cast.
Bark, the original GLB, Forestland lab and spruce atlases keep their colours.
This material adjustment does not change alpha cutout, placement or draw cost.
Typecheck passed; final colour matching still needs user review in the app.

## Impostor expansion and Small 1 - 2026-10-09

The user requested more spruce impostors, leaving only the first 10-15 m as
real trees and retaining real trees around Cube Spawn. The chosen edge is the
accessible side of the closed eastern forest (15 m, X > -367), not a new row
at the inaccessible outer map boundary. Real trees also occupy a 33 m radius
around Cube Spawn (-383.5, 52), preserving the existing clear 18 m interior
and exit corridor. All other eligible sites use spruce cards.

Real sites select Big 1 / Small 1 at deterministic 75% / 25% shares. This
replaces existing sites without increasing density. Small 1 uses the same
scale factor as Big 1 so the original pack's relative height remains intact;
it is grounded using its own trunk-root support and yaw. Both models share
the same darker foliage material, applied once to avoid multiplying the tint
twice. Bark and alpha cutout retain their source settings.

On the current map: **1,005 cards, 117 Big 1 and 47 Small 1**, still 1,169 trees
and 1,401 collider cylinders. Selected geometry at The Thornwood is **204,332
triangles**, down 74.5% from the previous half-impostor 799,863 and 87.4% from
the original all-Big-1 1,623,741. Small 1 LOD2 is 847 triangles. There are 47
card meshes and 56 real-tree bark/foliage meshes (103 total distance-selected
colour meshes). More models can increase batches despite lower geometry;
use the unchanged automatic forest route to measure the net cost.

Each chunk owns separate matrix bindings per real model and its card batch.
Model materials are shared; warm-up includes both real models plus cards.
Camera depth membership follows both models and cleans up on toggle/disposal.
No new casting, wind, collider or placement rules were introduced.

Validation: typecheck and all 156 Node tests passed. Tests cover edge/ring
selection, deterministic Small 1 selection, the unchanged placement/barrier
contract and card lifecycle. Native WebGPU boot and Cube Spawn ground view
were checked; real trees retain the clearing. The existing headless adapter
warning remains. The full automatic forest route completed; aerial canopy was
inspected, disabling trees cleared visible/depth membership while retaining all
colliders, and Escape restored the camera. No production build or Playwright.

## Accessible woodland through Forest Outlook - 2026-10-09

The user authorized populating the next area left of the existing stand, through
Forest Outlook and around it, with two medium, two small and two sapling models.
`OpenForestPlacement.ts` fills Babylon X > -350 to -166, west of the closed
strip, wherever the forest palette is present. The bounded grey-rock forest-floor
correction around (-248,125) is also eligible; roads, other biomes, water and
slopes above 0.7 remain excluded. Four 2 m biome/clearing probes guard each site.
The existing closed stand, Cube Spawn clearing/corridor and 1,401 area-barrier
cylinders remain unchanged.

Defaults: 8 m jittered spacing, deterministic model/yaw/size, 14 m reference
height for Medium 2, with original relative sizes for small/sapling variants.
The target mix is Medium 1/2 = 25/25%, Small 1/2 = 15/15%, Sapling 1/2 = 10/10%.
The current map places **464 new trees**: Medium 1 117, Medium 2 99, Small 1 88,
Small 2 63, Sapling 1 52, Sapling 2 45. Sampling exclusions mean observed shares
need not match percentages exactly. No new imported model assets are needed.

Forest Outlook retains a clear 18 m radius at (-248,125), plus an 8 m half-width
sightline toward (-166,35) and the grasslands. New woodland has individual trunk
cylinders (464), not a closed-area barrier; avatar flight can pass above trunks.
Colliders retain ownership-based disposal and stay present when forest rendering
is disabled. Roots use the actual terrain triangles and each model's own support.

Models use authored LOD2, 32 m batches with independent matrix buffers per model,
shared pack materials and the existing dark foliage tint applied once. All seven
real pine variants (including the retained Big 1) warm matching colour/depth
pipelines behind loading; there are no remaining warm-up probes. Casting and
wind remain off. Total selected forest at the overlook: 1,633 trees (1,005 cards,
628 real trees), 616,323 triangles, 1,865 colliders and 97 occupied parent chunks.
There are 521 distance-selected colour meshes; six variants substantially add
batches. These are not actual frustum-visible draws. Benchmark the unchanged
forest route to assess the new area's cost, rather than expecting the previous
small-strip draw totals.

Validation: typecheck and all 158 Node tests passed, including deterministic
six-model placement, regional/road/water/slope exclusions, root translation,
overlook sightline and walking-versus-flight trunk collision. Native WebGPU
boot/Forest Outlook ground capture inspected, zero startup probes and no new
GPU errors. Rendering off removed all forest depth membership and preserved
colliders. The lab remains unchanged; no build or Playwright was run.

## Whole-map prop inspection screenshot - 2026-10-09

Ctrl+Shift+P captures the entire authored map from a true straight-down
orthographic camera into a 4096x3072 north-up PNG in Screenshots. This includes
all placed forest models and desert props irrespective of live enable toggles,
distance bands and streamed visibility. Forest geometry uses retained complete
instance matrices. Spruce cards use the overhead crown tile and horizontal
camera-facing geometry, keeping yaw and scale. Desert props use all retained
authored placements. Dense grass blades, avatar and transient effects are omitted.
Ctrl+P keeps the existing 2048x1536 terrain/water map; P captures the gameplay view.

`MapPropSnapshot` owns temporary independent geometry and shared cloned map
materials, with the production prop WGSL alpha cutout and explicit MAP_SCREENSHOT
variant. Props use readable albedo/relief with no aerial fog, camera-distance
fade or wind, matching the terrain inspection rendering. All copies share the
same depth-tested rendering group as terrain/water. Nothing registers in camera
depth or shadow passes, moves the rig, changes streaming/collisions or replaces
temporal history. Finally cleanup disposes copies/materials while keeping source
textures and live meshes. Image framing fits the entire authoritative terrain.

Validation: actual Ctrl+Shift+P dispatch in native WebGPU saved the full PNG;
top-down forest/desert placement and clearings were visually inspected. Before
and after counts matched (702 meshes, 133 materials, 545 depth entries), camera
position was identical, zero map copies remained and no GPU errors occurred.
Typecheck and all 159 Node tests passed; snapshot regression covers complete
instance counts, independent buffers, shared clone ownership, unchanged source
defines and cleanup. No production build or Playwright.

## Corrected dense forest concept - 2026-10-12

The user supplied a corrected top-down concept and requested the dense big-tree
shape to match it. The original reference is preserved unchanged as
`public/terrain/forest/concept/forest-shape-2026-10-12.png`, with coordinate
registration/source notes beside it. `DenseForestShape.ts` traces the western
canopy boundary from that image: approximately X=-362 in the upper stand,
curving inward to X=-413 around Z=45, then widening toward X=-363 at Z=225.
Smooth interpolation avoids hard rectangular steps. Root centres use a 4 m
inset, balancing crown overhang and the existing 2 m placement probes.

Dense trees and the independent closed-area collider grid use the same contour,
while road/water/slope/biome exclusions still apply. The real-tree band follows
the contour at 15 m width instead of the old fixed X=-367 line. The spawn ring
still prevents impostors where real sites exist; the 18 m spawn clearing and
16 m exit corridor stay open. No new closed area appears in the released pocket.

The medium/small/sapling section now extends to the curved edge and fills the
released pocket, using its existing deterministic 8 m grid, model mix, relative
sizes and individual trunk collisions. Existing open sites west of the old edge
retain positions and deterministic model choice; density is not raised. This
replaces the former fixed dense rectangle, rather than changing ground biome
textures, roads, other props or the authored heightmap. Snapshot/benchmark
metadata includes the contour points; `eastBoundary`/`impostorBoundary` are now
maximum X limits, not a description of the curved boundary at every Z.

Typecheck and all 160 Node tests passed. Contour tests cover the indentation,
continuous interpolation, dense tree/collider agreement, real-edge selection,
and mixed-woodland coverage of the released pocket. No build or Playwright.

Native Ctrl+Shift+P capture was inspected against the supplied concept: the
middle indentation and wider lower stand are visible, with mixed woodland in
the pocket. The dense section now has 900 trees (741 cards, 110 Big 1, 49 Small
1), and the accessible woodland has 593 trees. There are 1,092 dense-area
cylinders plus 593 individual trunk colliders. The capture completed without
GPU errors, changed no live camera/pass membership counts, and left no map
copies. This is a visual/lifecycle check, not a performance benchmark; the
larger real-tree pocket adds batches despite fewer dense cards.

## Realistic fir pack inspection - 2026-10-12

Source: `public/assets/exalted/realistic_fir_trees_pack_lods_gameready.glb`.
17,246,848 bytes (17.25 MB), 9 variants (Large/Medium/Small 1-3), 111 nodes,
63 meshes, 11 materials, 41 embedded PNG textures; no animation/skin/morphs.
Embedded metadata credits LOLIPOP, CC BY 4.0, Sketchfab source
https://sketchfab.com/3d-models/realistic-fir-trees-pack-lods-gameready-f58e8b6d733e4b0586e5b7db847b89e7.
No extraction or production integration has been performed.

| Variant | LOD0 triangles | LOD1 | LOD2 | LOD3 |
| --- | ---: | ---: | ---: | ---: |
| Large 1 | 12,969 | 6,633 | 3,268 | 20 |
| Large 2 | 9,872 | 5,228 | 2,506 | 20 |
| Large 3 | 11,786 | 6,019 | 3,014 | 20 |
| Medium 1 | 7,844 | 3,856 | 1,961 | 20 |
| Medium 2 | 6,813 | 3,598 | 2,278 | 20 |
| Medium 3 | 11,581 | 5,266 | 2,476 | 20 |
| Small 1 | 599 | 437 | 318 | 20 |
| Small 2 | 583 | 418 | 296 | 20 |
| Small 3 | 501 | 390 | 296 | 20 |

LOD0/1/2 have separate bark and foliage meshes but share Bark_Mat and the
source's misspelled Brunches_Mat. LOD3 uses one variant-specific billboard
material: four side images plus an overhead crown, 20 triangles total including
four horizontal triangles at mid-height. This supplies aerial coverage, although
it is planar approximation rather than actual canopy volume; inspect oblique
views and transitions before adoption. Normal/roughness maps accompany cards.
Large/medium billboard tilesheets are 512x512; small are 256x256. Shared bark
maps are 512x1024, foliage maps 1024x1024. Images total about 10.9 MB, so subset
extraction can avoid most unused per-variant billboard texture payloads.

Foliage and all billboard materials are BLEND. Production should test MASK
with a shared colour/depth/shadow threshold (0.35 is a starting point), rather
than sorted blend rendering. Geometry has normals, tangents and UV0 throughout.
The complete hierarchy cancels root 0.01 scaling with each tree group's 100x
scale, so LOD0 world heights are Large 1/2/3 = 9.293/9.229/8.026 m, Medium
1/2/3 = 4.419/4.158/6.592 m, Small 1/2/3 = 1.531/1.338/1.524 m. LOD nodes
have 0/10/20/30 display translations plus coordinate rotations. Remove display
offsets and bake the complete hierarchy before normalizing target size and
grounding; do not infer orientation from raw accessor bounds or ground the
minimum leaf tip as the trunk root. Atlas UV direction
must be preserved; raw PNG views alone do not establish rendered orientation.

Initial selection candidates: Large 2 for occasional large accents (cheapest
large LOD2), Medium 1 plus Medium 2 for accessible woodland, Small 1 plus Small 2
for regeneration/understory. Medium 3 is an alternate taller medium form.
Small fir LOD2 (296-318 triangles) is substantially cheaper than our Small 1
pine (847). Large fir LOD2 (2,506-3,268) is heavier than Big 1 pine (1,389), so
retain existing two-triangle spruce impostors for the dense border until a
fixed-camera comparison supports replacement. LOD3 is 10x the current card's
geometry and has variant-specific textures/materials, but avoids a new bake.

Inspection used GLB metadata, accessor/index counts, hierarchy matrices,
embedded PNG headers, horizontal-card triangles and actual extracted billboard
textures. No 3D WebGPU visual verification, tests, build or Playwright was run.

## Selected fir production integration - 2026-10-12

The user approved proceeding with the suggested five fir variants. The original
17.25 MB pack remains unchanged. `scripts/prepare-fir-pack.mjs` reproducibly writes
`public/terrain/forest/fir-pack-selected.glb` (7,101,576 bytes): Large 2, Medium
1/2, Small 1/2, LOD1/LOD2, 20 bark/foliage meshes, two shared materials and six
unchanged source textures. It clears tree/LOD display translations, retains the
complete cancelling-scale/rotation hierarchy, records SHA256/provenance and
converts Brunches_Mat to MASK 0.35. Attribution and contract are in the asset
README. LOD0/LOD3 are not included; original LOD3 remains available for later
comparison, while dense-border spruce cards are retained.

`PinePack.ts` now accepts an optional pack manifest, retaining its lab default.
`FirPack.ts` supplies the prepared path, five identities and Medium 1 reference.
The loader bakes imported transforms exactly once, removes trunk X/Z offsets,
and derives root support from both LODs. Models render upright at normalized
sizes, without importing generator preparation code into production.

Existing open-grid X/Z, yaw, size randomness, 8 m spacing, biome/slope/water
exclusions, clearing/corridor and trunk-collider count stay unchanged. Model mix:
Fir Large 2 4%, Medium 1/2 24/24%, Small 1/2 14/14%, Pine Sapling 1/2 10/10%.
Large 2 is nominally 20 m with +/-15% variation; Medium 1 is the 14 m reference.
Medium 2 and small firs retain their proportions (roughly 13.2 m and 4.8/4.2 m
before variation). Pine saplings use the old pine Medium 2 reference scale,
avoiding a size jump from the fir reference. Fir foliage receives linear tint
(0.45,0.55,0.55); pine tint and bark colours are preserved.

The 593 open sites now contain 23 Large 2, 141 Medium 1, 122 Medium 2, 89 Small
1, 102 Small 2, 51 Pine Sapling 1 and 65 Pine Sapling 2. Thus 477 firs replace
pines rather than increasing density. The dense contour still has 741 spruce
cards, 110 Big 1 and 49 Small 1 pines. Total 1,493 trees and 1,685 colliders stay
unchanged. Selected triangles rise from 722,752 to 898,294 (about 24%); selected
colour meshes rise from 633 to 677 because of the rare seventh open variant.
These figures are not measured GPU cost; use the unchanged forest benchmark.

All active real variants use LOD2 and independent per-model chunk matrices.
Materials are shared within each pack; cutoff matches colour/camera depth.
Casting and wind remain off. Warm-up includes all nine active real variants
plus spruce cards, and removes its probes before gameplay. Source containers,
geometry, materials, registrations and colliders have ownership-based cleanup.
The forest toggle and Ctrl+Shift+P snapshot include firs; the lab remains unchanged.

Validation: typecheck and all 161 Node tests passed. Asset tests cover provenance,
source texture bytes/remapping, LOD counts, display-offset removal, retained unit
scales and MASK cutoff. Placement tests cover the new mix, bounded large accents,
relative sizes and viewpoint/collision rules. Native WebGPU ground/orthographic
captures inspected upright trees and intact clearing. All fir materials report
0.35 cutoff; startup probes are zero, tree-off depth membership is zero, all
colliders are retained, snapshot before/after counts match and no GPU errors
occurred. No production build or Playwright was run.

## Small-tree and bush fringe along the collider boundary - 2026-10-12

The user requested additional small trees and bushes across the closed forest's
collider boundary. `ForestFringe.ts` adds a deterministic 3.5 m jittered grid
from 3 m inside to 14 m outside `denseForestBoundaryAt(z)`. It only accepts
forest palette terrain, probes boundaries at 1 m, excludes road/water/slopes
above 0.7, keeps viewpoint/spawn/corridor exclusions, and rejects roots within
1.5 m of retained tree placements. Existing sites/models are not moved.

The target is 40% Small 1/2 firs, 60% low evergreen shrubs. The current map adds
165 small trees (79 Small 1, 86 Small 2) and 258 bushes, 423 sites total.
Small-tree heights are 2.8-4.3 m; bushes 1.2-1.9 m. Small trunks have simple
cylinders; bushes have no collision. The existing dense-area barrier stays in
place. Grounding uses real triangles and root support; roots inside the dense
side do not become impostors, even when representation rules change later.

No dedicated lightweight bush model exists in the supplied active set. The
ConiferousShrub source has 5,722 triangles and no LODs. Instead a bush prototype
merges two low/wide Small 2 LOD2 shoots, with different yaw, offsets and heights:
592 triangles total, original bark/foliage UVs and shared fir materials. This is
an evergreen sapling-cluster shrub approximation, not extraction of the detailed
ConiferousShrub. Source fir geometry is cloned before transformation/merge and
remains unchanged; no additional model texture download is required. Attribution
is the same as the selected fir source. New bush batches join existing 32 m
model/chunk bindings, warm-up, colour/depth alpha cutout, forest toggle and map
snapshot. No new wind, casting, particles or closed-area colliders are added.

Diagnostics: `EXALTED.forest.fringeStats` reports placed/trees/bushes; all normal
forest counters include the fringe. Current total is 1,916 vegetation sites,
1,850 colliders and 1,101,608 distance-selected triangles (versus 898,294 before).
Selected colour meshes are 741; native frame frustum rejection can reduce actual
draws. The extra cover adds rendering cost; benchmark the forest route if needed.

Validation: typecheck and all 163 Node tests passed. Regression covers contour
band, deterministic counts, model selection, water and existing-root rejection,
clearings, collision-free bushes and source geometry preservation during merge.
Native WebGPU startup/ground fringe view inspected, no warm-up probes remained,
forest off removed all forest depth entries and kept colliders. Only the existing
headless float32-filterable warning appeared. No build or Playwright was run.

## Forest and Lake Island sun transitions - 2026-10-12

The user authorized 225-degree forest lighting and requested 105 degrees on
Lake Island to reduce mountain-shadow darkness. Base bearing remains editable
(default 185), with elevation/intensity unchanged. BiomeSun waits 1 s in a new
region, then blends over 7 s with smoothstep and shortest-arc angle interpolation.
Forest palette and the Forest Outlook floor correction determine forest weight;
entry/release thresholds 0.65/0.25 give hysteresis at interpolated biome edges.
Lake Island uses its authored Babylon centre (272.5,76) and a soft 55-75 m radius.
This also treats the immediate island shore as an island transition zone; the
main lake shore retains base lighting. Flight follows avatar X/Z, not camera X/Z.
Leaving a region blends back to the base bearing; teleport does not snap the sun.
Pause freezes transition timers. Automatic benchmark routes freeze their entry
bearing and record actual azimuth/region separately from base settings.

The effective bearing feeds the existing Sky sun vector before post/sky/shadow
updates, so world/forest/water lighting and cascades share one direction. No new
light, exposure/ambient boost or camera post effect is added. Smooth bearing
changes throttle atmosphere/SH recalculation to 4 Hz and prevent overlapping
asynchronous solves; direct sunlight and shadows move each frame.

Typecheck and all 164 Node tests passed, including dwell delay, blend completion,
boundary hysteresis, shortest-angle wrap, pause/benchmark hold, base release and
island falloff. No production build or Playwright.

Native WebGPU verified the effective Sky direction reaches 225 degrees at
Forest Cube Spawn and 105 degrees at the island centre while the base slider
remains 185. Ground captures were inspected: the forest clearing receives direct
sunlight in the checked view. An automatic forest route started at 105 kept that
bearing after the avatar was moved to forest, confirming route hold independently
of avatar position. No GPU errors appeared; only the existing headless adapter
warning was replayed by the follow-up connection. Visual coverage elsewhere and
lighting-transition performance remain subject to normal in-app review.

## Hold sky lighting during sun movement - 2026-10-12

The user reported black blinking during regional sun motion and requested no
recalculation until the sun stops. `BiomeSun.moving` now gates
`Sky.deferAtmosphereUpdates`: live direct-sun direction and cascades continue
moving, while sky LUTs, SH ambient lighting and ground bounce retain the prior
baked state. Dirty lighting is kept pending through the seven-second transition.
At the endpoint one normal solve updates the lighting for the settled direction.
Pause/automatic benchmark freezes during an unfinished transition also retain
that baked state until normal motion resumes and completes.

The update gate runs before scheduling any solve. If another transition starts
while a prior asynchronous solve is pending, readiness/readback continuations
check the gate, withhold SH publication and stop remaining bake/bounce stages.
Coalescing and the previous minimum interval remain, but no periodic solves run
while regional motion is active. This does not disable moving shadow cascades
or introduce another light/post effect. It implements the requested isolation
step; it does not establish that every possible cause of black blinking is fixed.

Validation: typecheck and all 165 Node tests passed. Native WebGPU instrumented
the forest transition: zero solves/bakes while moving, then one solve with the
normal four internal bake iterations after reaching 225 degrees. No GPU errors
were reported. This verifies deferred recalculation; no claim of full-frame
flicker elimination was made. No build or Playwright.

## Half real big-tree density - 2026-10-12

The user requested keeping spruce impostors unchanged while halving big trees.
`BigTreeDensity.ts` deterministically ranks retained real sites by X/Z, then
keeps ceil(count/2) independently for Pine_big_1 and Fir_large_2. It runs after
placement/fringe selection and before chunk construction, so smaller vegetation
is not regenerated into removed sites. Every spruce card, medium/small tree,
sapling and bush keeps its placement, scale and yaw. On the current placements
this reduces real Big 1 from 110 to 55 and Large 2 from 23 to 12; the 741 cards
stay intact. Existing closed-area collider cylinders remain, while individual
trunk colliders for removed open Large 2 sites are removed. Shrub/tree fringe
colliders and viewpoint/corridor exclusions stay unchanged.

Forest snapshots use the retained source matrices, so Ctrl+Shift+P and normal
rendering show the same thinning. Stats/benchmark expose the final counts and
`settings.bigTreeDensity=0.5`. The selection is independent of input order and
makes no hot-loop, material, shadow, sun, asset or loading pipeline changes.
Validation: typecheck, relevant placement tests and all 166 Node tests passed,
including exact per-model halving, unchanged card/non-big memberships and
selection stability under reordered input. No build, Playwright or new GPU
visual verification for this placement-only change.

## Forest surfing and aged-grass particles - 2026-10-12

The user requested forest-coloured surf sides and particles like the grass tufts,
but browner/aged. SurfWake captures forest palette coverage plus the bounded
Forest Outlook floor correction at each sample's birth, independently of forest
rendering enablement. A fourth row in the existing 96-column RGBA32F spine texture
stores forest coverage; grass remains row 2 alpha. The ring keeps forest coverage
through turns and crossings, and teleport reset retains existing trail lifecycle.
No deformation/ground biome channel is repurposed.

Wake beauty blends dark olive/moss albedo (linear base .075/.10/.04, lip
.19/.23/.09), roughness .9. Forest coverage suppresses snow subsurface scattering,
blue cave tint and glints just as grass does. Geometry/depth/shadow shaping is
unchanged. Forest emits particle kind 7: the same tapered three-blade tuft shape,
rotation, .14-.26 m radius, .5-1 s life, outward throw and upward speed as grass
kind 6, but warm brown albedo varies from .16/.10/.035 to .36/.25/.085. Kind 7
shares grass/snow-curtain vertical drag; it never becomes desert dust by landing
in another biome. Grounded-only emission and no lingering powder drift apply to
both vegetation kinds. Grass/desert/snow/water keep their previous appearance.

The shared pool, shaders, existing lighting/fog and startup warm-up handle the
new kind; no extra particle mesh, material, texture or rendering pass is added.
Particles remain excluded from opaque camera depth and custom shadow cascades.
The fourth spine row adds only 1,536 bytes to the existing data texture/upload.

Validation: typecheck and all 166 Node tests passed. Grass/forest parameterized
trail tests cover birth coverage, boundary preservation, appropriate particle
kind, visible size/lifetime, reset, airborne and swimming gating. Trajectory
regression covers kind 7 sharing grass/snow vertical motion and preserving kind
outside forest. A controlled native WebGPU surf capture at Forest Outlook was
inspected: olive sides and brown blade tufts appeared; all retained forest samples
had coverage 1 and only kind 7 particles were emitted. Warm-up/new WGSL compiled
without GPU errors. No production build or Playwright was run.

## Main-app WebP delivery, 9 November 2026

The main app selects quality-80 WebP forest floor and spruce atlas derivatives,
and derivative pine/fir GLBs whose PNG images use EXT_texture_webp. Dimensions,
alpha cutouts, material settings and geometry are unchanged. The original spruce
premultiplied RGBA representation and atlas tile metadata are retained; conversion
does not unpremultiply colour or renormalise stored object-space atlas normals.
RGB is lossy and needs manual visual comparison. Labs keep original files.
Source assets and preparation notes remain; see public/textures-webp-80/SOURCE.md.
