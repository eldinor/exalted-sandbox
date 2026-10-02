# Exalted Grass System

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
