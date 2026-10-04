# Main-app roads heightmap integration plan

Status: implemented; TypeScript, Node tests and bundle checks pass. Manual WebGPU
visual/performance review is pending.

## Implementation record

- Main default and `?terrain=heightmap` use the new PNGs. `?terrain=glb` preserves
  the previous terrain/material-mask behaviour; `?terrain=procedural` is retained.
- Decode PNG grayscale16 directly with the existing `fflate` dependency. Heights
  retain 16-bit precision instead of passing through Canvas's 8-bit pixel buffer.
  Native values use the approved minimum/maximum range without gamma conversion.
- Rotate the lab grid 180 degrees into the existing authored coordinate frame:
  PNG columns increase toward negative Babylon X; rows increase toward positive Z.
  This preserves chart destinations and desert horizontal placements. The lab's
  topology, dimensions and elevation range remain the starting contract.
- Share a 2049-by-1537 linear weight map (approximately 0.46 m samples) across CPU
  queries, simulation and displaced beauty/depth/shadow passes. Its channels are
  snow, sand, road and water, derived from RGB classification. Disable display
  mask warp in heightmap mode so gameplay and visual boundaries agree.
- Conservatively select detail triangles from covered mask samples, including
  soft areas inside a triangle whose corners are firm. The worst-case all-soft
  grid patches tested remain within the existing 2,048-triangle capacity.
- Sample water on finer triangles at painted edges within the authored lake/river
  region; fully wet interiors retain coarse source planes. Infer the heightmap
  lake level from median painted shoreline crossings, plus the requested five-metre
  runtime offset (currently about 41.67 m).
  The initial Y=0 integration clipped most of the raised basin and was corrected
  after the missing-water report. GLB comparison retains Y=0. For the new river,
  exclude slope >=0.85 with a 2.5 m margin;
  the old slope/margin combination removed the entire river. Keep GLB behaviour.
- Corrected Desert Start height is approximately 60.87 m versus 2.59 m on the GLB.
  Transfer desert prop Y by the old-to-new terrain difference at each prop origin,
  preserving signed ground clearance rather than snapping lowest vertices to Y=0.
  Preserve X/Z, rotation and size; use the shared stable desert density selection. Render and
  collision use the same corrected transform. `?props=authored` skips this transfer.
  This terrain-source correction is limited to heightmap mode and documented here.

Reproduce the CPU audit with `node --import tsx scripts/audit-heightmap.mts`.
It writes [reports/heightmap-integration.json](reports/heightmap-integration.json)
using actual PNGs and Babylon-baked GLB transforms. It is not a GPU capture.
The audit found 2,213 nearby material primitives before density thinning: all were
buried at untouched authored Y. Offset transfer leaves none above 20 cm and 36 buried
more than 50 cm. Individual records retain both clearances; remaining seating
differences need visual review, and no per-prop correction is applied.

Base terrain is 160,801 vertices / 320,000 triangles. Actual sampled elevations
span approximately -1.67 to 248.73 m. The raised lake has 28,305 triangles
at approximately Y=41.67 m; the filtered river has 7,992. Swimming uses the same
level and clipped footprint. A real-asset regression checks deep water at three
lake positions, the dry island and dry desert. Shoreline appearance and remaining
prop seating still require manual inspection.

Validation: `npm run typecheck`, complete Node suite (94 passing tests), CPU audit
and `npm run build`.
The bundle check was performed for the initial integration; the lake correction
was verified with TypeScript, the full Node suite and a refreshed CPU audit.
The build retains the existing large Inspector/GUI Editor chunk warning. No
Playwright or GPU visual verification ran. Manual acceptance checks below remain
open, particularly river joins, shoreline extent, prop seating and performance.

The corrected `vis_ground_heightmap-4.png` replaced version 3 in
both the main app and `hm.html`. It retains the same 4096-square grayscale16
format and decoding contract. The replacement passed TypeScript checks, all
eight heightmap integration tests and a refreshed CPU audit; the full suite and
bundle validation above refer to the initial integration.

The biome map previously switched to `vertex_color_4k-4.png` in the main app and `hm.html`.
Its RGB8 format and measured biome palettes remain compatible. TypeScript checks,
all eight heightmap integration tests and the refreshed CPU audit pass; lake level
and dry-island coverage remain consistent.

## Goal and scope

Draw-count investigation: the CPU audit now records `terrainComparison` for
both sources at Desert Start. GLB has 173,156 base vertices and 1,205,685 drawn
terrain indices per pass; version 5 has 160,801 and 1,196,808 respectively.
Both allocate 186,368 detail vertices and use two terrain draws per pass.
User-supplied 120-frame engine captures now show 186 draws / 34,803,057 submitted
indices for GLB and 188 / 34,843,536 for heightmap. Every desert prop submission
matches: 155 draws and 28,477,470 indices across beauty, depth and three shadow
cascades. The two additional draws are the restored river's beauty and depth
passes. Terrain indices fall by 44,385 per frame; lake/river indices increase by
84,864, giving a net increase of 40,479 (about 0.12%). The historical 104-draw
measurement is not reproduced by the current GLB capture; its cause remains
unconfirmed. No rendering feature has been disabled to reduce the counters.
Use `await EXALTED.captureDraws(120)` for further matched-view investigations.

The corrected `vis_ground_heightmap-5.png` previously replaced version 4 in the main
app and `hm.html`, retaining `vertex_color_4k-4.png`. The supplied replacement is
4096-square grayscale16 and uses the existing decoder unchanged. TypeScript,
all eight heightmap integration tests, and the refreshed CPU audit pass. Lake
level and dry-island coverage remain consistent; GPU appearance is unverified.

Make the playable Exalted app use these bundled assets by default:

- `public/assets/textures/vis_ground_heightmap-11.png` for terrain geometry;
- `public/assets/textures/vertex_color_4k-9.png` for biome appearance,
  road coverage and soft-ground classification.

Version 9 previously supplied both main-app assets and the `hm.html` defaults, including
uploaded-map replacement and opacity previews. Height and biome formats remain
grayscale16 and RGB8 respectively, both 4096-square; decoder, coordinate contract
and biome palette remain compatible. TypeScript, all eight real-asset heightmap
integration tests and the refreshed CPU audit pass. Lake level remains 37.34 m
with dry island/desert coverage preserved. No version 9 GPU visual check ran.

The main app and `hm.html` now use `vis_ground_heightmap-11.png`, retaining the
version 9 biome map. Version 11 preserves the grayscale16 format and decoding
contract. TypeScript, all eight heightmap integration tests and the refreshed
CPU audit pass; lake level is now approximately 36.67 m with dry island/desert
coverage preserved. No version 11 GPU visual check ran.

The user subsequently requested a five-metre lake rise. Heightmap mode now adds
`HEIGHTMAP_LAKE_LEVEL_OFFSET = 5` after inferring the shoreline level; it is not
halved with authored coordinates. Water geometry, swimming depth and the CPU
audit all use the raised level. Existing painted-mask/polygon limits still apply,
and the river join clips against the higher lake surface. TypeScript and 17
relevant heightmap/water/swimming tests pass, including exact five-metre depth
and level increases at three real lake positions and dry island/desert checks.

Use the terrain approved in `hm.html` as the geometric reference, while retaining
the main application's custom materials, atmosphere, avatar, movement, spells,
deformation, shadows, camera depth and temporal post-processing.

This changes the authored terrain source. It does not integrate the procedural
generator, replace desert props, or resume forest/waterfall work. Preserve
`?terrain=procedural`. Retain an explicit GLB comparison mode during integration.
Keep supporting pages on their current sources unless separately requested.

## Existing dependencies

- `ExaltedWorld.loadInto()` currently imports `alpha-map.glb`, retains its vertex
  data and creates `MeshSurface` for grounding and spatial queries.
- `Terrain` and `LocalTerrain` depend on that geometry and its colour data.
  Local detail replaces selected coarse triangles rather than overlapping them.
- The main shader samples `vertex_color_4k copy.png`, but CPU softness, local
  triangle selection and several displacement paths still use GLB colours.
- `WorldWater` derives lake/river geometry from terrain colours and Rev B references.
- Desert prop placement, collision and spawn coordinates use the authored 0.5
  world scale. Existing prop geometry and movement remain metre-sized.

Changing only the visible biome texture would leave gameplay and geometry masks
out of agreement. Integration must update all these consumers together.

## 1. Establish the asset and coordinate contract

Inspect the two actual PNGs before implementing a decoder or classifier. Record
dimensions, bit depth, channels, alpha, orientation and source/provenance notes.
Measure the new map's snow, sand, road, grass, forest, rock and water colours;
do not assume the old GLB or PNG palettes apply unchanged.

Start with the approved `hm.html` geometry settings:

| Parameter | Initial value |
| --- | --- |
| World width / depth | 936 / 702 m |
| Grid subdivisions | 400 per axis |
| Base vertices / triangles | 160,801 / 320,000 |
| Minimum elevation | `-7.820367813110352 * 0.5` m |
| Maximum elevation | `498.8232116699219 * 0.5` m |

Verify these height bounds against the heightmap export contract when available.
Match Babylon's current heightmap sampling and triangle layout so the new source
reproduces `hm.html`. Check whether browser decoding reduces source precision;
document any quantization instead of claiming 16-bit precision from an 8-bit path.

Define one world-to-image transform for each map, including row direction,
endpoint/texel-centre conventions and clamping. `hm.html` flips the biome map's
V direction relative to its ground UVs. Validate this against asymmetric
landmarks, map corners, the desert road fork, lake and snow plateau.
Apply the half-scale height conversion exactly once.

Deliverable: recorded asset contract and pure sampling/geometry helpers.

## 2. Add the heightmap terrain source

Separate authored-world source selection from the existing procedural-mode flag.
Keep `ExaltedWorld` as the authored-world facade, with a source option such as
`heightmap` or `glb`, so existing consumers and `instanceof ExaltedWorld` checks
continue to work without broad changes to the composition root.

Load/decode the heightmap once behind the loading screen. Generate typed-array
positions, normals and indices and apply them to the existing terrain mesh.
Provide colour data where consumers still require it, with its colour-space
contract explicit. Retain `MeshSurface` over these exact rendered triangles.

Keep `heightAt`, `normalAt`, bounds, extent, scale and disposal contracts intact.
Grounding must query the rendered triangle planes, rather than independently
sampling the 4K image with bilinear interpolation between grid vertices.
Validate winding, upward normals, shadow visibility and camera-depth rendering.

Initially expose the new source with `?terrain=heightmap`; retain the current
default until the dependent systems below are ready. Provide `?terrain=glb`
for comparison. Keep source metadata available through existing diagnostics.

Deliverable: opt-in generated ground using the production render pipeline.

## 3. Make the roads map authoritative for biome behaviour

Introduce a shared, allocation-conscious authored biome sampler with reusable
outputs. Keep raw display RGB, material weights, softness and water coverage
distinct. This PNG is a colour map, not the future RGBA splat-weight map described
in `BIOME_SPLAT_MAP.md`.

Calibrate classification against actual pixels, including blended road shoulders.
Use the same transform, colour space and weight rules on CPU and GPU. Ensure
road interiors suppress sand/snow deformation; define and test edge blending.
Preserve untouched biome appearance where no dedicated material exists.

Bind the new texture to the existing custom terrain material. Replace old
GLB-derived softness/road masks for the heightmap source with map-derived masks,
at a resolution that retains narrow roads and transitions. Do not apply the old
coarse road-feathering procedure blindly to the new painted shoulders.

Audit CPU `weightsAt`, contact/VFX classification, simulation masks, local-detail
selection, ground probes, and beauty/depth/shadow displacement. In particular,
`exaltedOffset()` currently calls `surfaceWeights(color)` with GLB thresholds;
it must use the new source's agreed softness data in every pass.
Retain source-specific GLB behaviour for comparison mode.

Deliverable: visible road/biome boundaries agree with terrain interactions.

## 4. Preserve deformation and grounding

Reuse `LocalTerrain`'s coarse/detail partition and the existing deformation field.
Classify a candidate triangle conservatively from its covered biome-map area;
vertex-only sampling can miss a narrow soft region or road through its interior.
Evaluate local capacity against the regular 400-by-400 grid, including worst-case
snow/sand patches. Adjust capacity or subdivision only from measured coverage
and geometry budgets, with no silent dropped triangles.

Preserve the moving patch, edge fade, asynchronous grounding probe and teleport
resets. Detailed geometry must reconstruct the new source triangle planes.
Beauty, camera depth and all shadow cascades must share displacement and masks.
Keep footprint, surfing and spell response parameters unchanged initially.

Deliverable: snow and sand deform correctly; firm roads remain firm; avatar and
camera stay grounded without duplicate surfaces or patch holes.

## 5. Reconcile water, props and navigation

Derive water-region classification from the new map, with thresholds measured
separately from old GLB water colours. Adapt `WorldWater`/`waterGeometry` to the
generated terrain data using its painted shoreline level, retaining Y=0 in GLB
comparison mode, and using the Rev B lake
and river references as constraints. Check islands, banks, river continuity,
swimming coverage and water/terrain intersections. Detect narrow water regions
that grid vertex sampling could miss. Keep the temporary waterfall disabled.

Audit terrain height changes at every spawn and across desert prop bases.
Preserve authored prop X/Z, rotation, scale and existing deterministic boulder
selection. Report floating/buried props before applying any placement correction;
do not silently re-ground the entire desert. If corrections are needed, document
the affected placements and update collision consistently with visual placement.

Keep chart coordinates, named destinations and teleport resets unchanged.
Sample each destination's elevation from the selected terrain source.

Deliverable: usable navigation, aligned water/swimming and a prop seating report.

## 6. Validate and make the source default

Automated validation:

- Sampling fixtures: asymmetric orientation, bounds, corners, row direction,
  height decoding and colour-space handling.
- Geometry queries: exact triangle grounding, normals, seams and edge clamping.
- Classification fixtures: new-map road/sand/snow interiors, painted shoulders,
  water and firm biomes. Include narrow features crossing triangle interiors.
- Deformation: exact coarse/detail partition, capacity coverage and road rejection.
- Water: lake/island coverage, bank clipping and swimming against new terrain.
- Run `npm run typecheck`, relevant Node tests, then `npm test` once integrated.
  Run a production build once at final bundle validation, ensuring the offline
  generator package required by the existing Vite configuration is present.

Manual WebGPU validation, without Playwright unless explicitly requested:

- Compare recognizable landmarks with the approved `hm.html` orientation/shape.
- Inspect all destinations at fixed camera positions, resolution and lighting.
- Check road textures, soft shoulders, footprints, surfing, spells, flight,
  camera collision, shadows, depth occlusion, TAA stability and lake swimming.
- Compare startup time, frame median/p95, draw calls, triangle counts and local
  patch update cost with GLB mode on the same hardware and route.
- Inspect desert prop seating and any quantified heightmap stepping.

Once the checks pass, select heightmap terrain and the roads biome map by default.
Keep `?terrain=glb` for comparison and `?terrain=procedural` for the original
reference. Update `HANDOFF.md`, `CURRENT_WORK.md`, `ARCHITECTURE.md`, `README.md`
and relevant asset notes; correct historical descriptions where they could be
mistaken for current behaviour. Record visual checks separately from Node tests.

## Completion criteria

- The default main app visibly uses both new roads PNGs.
- Grounding, deformation, road firmness and water agree with the new source.
- Existing gameplay and ordered render/post-processing remain functional.
- Prop placement issues and precision/performance limitations are documented.
- Automated checks pass and manual GPU results are recorded.
- GLB/procedural comparison paths and supporting utilities remain usable.
