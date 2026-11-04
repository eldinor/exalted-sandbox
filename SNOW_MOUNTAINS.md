# Snow Mountains material trial

The 2026-10-14 first pass is visual-only in production authored heightmap mode.
F1 > Snow Mountains > Snow and exposed cliff rock toggles the complete trial;
benchmark settings already record this flag. GLB comparison and procedural
terrain keep their existing materials. No new vertices, triangles, collision, particles, biome images or sampled-texture
bindings are added. Array layer 3 holds Rock Face 03; layer 4 holds snow_03 for
the Stone Gate left side. Selected cliff-cell diagonals are corrected on load.

## Coverage and appearance

The existing authored snow channel bounds the effect. Mountain coverage fades
in from 65 to 100 metres of terrain elevation, excludes roads, and follows the
existing soft biome boundary. Gentle faces retain snow; cliff exposure starts
near 53-degree slopes and reaches full exposure near 76 degrees, perturbed by
subtle wind-aligned broad noise. Coverage uses the original terrain normal,
not normal-map detail or camera position. Flat snow and low snow areas retain
their existing detail/deformation appearance.

Exposed faces now use `terrain/rock/03/rock_face_03` (colour, OpenGL normal and
ARM), packed into shared array layer 3. Triplanar projection uses a trial 8 m
repeat with correctly oriented normals; source physical width is unknown.
The set has no supplied displacement, so its AO channel serves as an approximate
crevice proxy for snow accumulation rather than a physical height map. The
coverage blend favours snow more strongly than the original trial and retains
safe pure-snow/pure-rock endpoints. A cool/desaturated palette keeps the warm source rock restrained. Iron Mountains keep their existing array layers.

The Palecrown uses its shared authored spawn at world (109, -125.5). A 70 m
radius retains full snow regardless of slope; the allowance for exposed rock
fades in between 70 and 105 m. This protection only acts inside the existing
snow biome and does not repaint other biomes.

Cliff rock is matte (roughness 0.90-0.98, reduced sun/sky specular). Remaining
snow retains existing nearby ripples, grain, glitter and subsurface shading;
broad wind colour variation is only about 0-3%. Rock exposure reduces snow
transmission/glitter/blue cave tint according to coverage. Refrozen ice keeps
its existing appearance instead of receiving the cliff overlay.

Snow mountain shadows remain enabled. A neutral diffuse ambient floor (35% of
upward sky luminance, following ambient intensity) keeps dark slopes readable.
The existing combined AO factor softly approaches a 0.78 floor at 65% strength
within the mountain region, preserving subtle snow-hollow shading.

## Integration and cost

`terrain/SnowMountains.ts` exports coverage/height-blend helpers plus the
explicitly registered `snowMountains` WGSL include. Terrain binds the comparison
uniform on both coarse and local materials, including warm-up. Existing depth
and shadow geometry, startup order and post chain are unchanged.

A cliff pixel samples one triplanar rock layer: 3-9 extra texture reads depending
on active axes. Snowy ledges skip those reads; fine rock resampling is disabled.
Each additional 2K layer adds approximately 64 MiB GPU texture storage including mips
(320 MiB total for the three arrays, including the Stone Gate fifth layer); current compressed array payload sizes are recorded in textures.json.
No extra draws/indices are introduced, but material GPU cost needs a fixed-view
comparison on target hardware. No performance improvement is claimed.

CPU gameplay snow classification, deformation, terrain grounding, walking,
spells and surfing remain unchanged. Visually exposed cliff rock is still part
of the authored snow biome for gameplay; an authored gameplay mask would be a
separate future decision. No production shader imports generator/lab code.

## Validation

Typecheck and Node tests cover altitude/biome/road gates, retained ledges,
height-blend endpoints/crevice accumulation and actual authored terrain samples.
A 12 m sample grid contains both snowy ledges and cliff candidates. These checks
do not compile WGSL or verify visual appearance. No Playwright or production
build is run for this trial; in-app appearance and material cost remain to review.


## Stone Gate face investigation

The inspected northern snow-face region (world X -100..240, Z -240..-70)
contains 28,227 source triangles with valid Babylon clockwise winding. There
are 180 triangles with more than 20 m vertical rise; the maximum rise is about
36.91 m. These are steep heightmap faces, not reversed/degenerate triangles.
The geometry and grounding remain unchanged pending material review.

A snow normal-perturbation bug was corrected: the added heightfield gradient
must be scaled by the original normal's Y component before normalization.
Previously small snow ripples could rotate near-vertical normals excessively,
contributing to alternating cliff bands. The correction is gated to authored
heightmap snow and the Snow Mountains trial; other surfaces/comparison modes
retain their response. Typecheck passes; screenshot improvement is unverified.

The user confirmed `terrain/snow/aer1/snow_01` as the intended rock-snow cliff
material. Its colour, OpenGL normal and packed ARM maps replace the tested Rock
Face 03 layer. The companion standalone AO map is redundant with ARM R. Source
pixels are preserved in the RGBA8 arrays (numeric 16-bit channels quantized).
Triplanar mapping, 8 m trial scale, snow-biome/slope gates and the Palecrown
snow reserve remain. The supplied baked pattern is retained as requested.


### Final texture selection

The latest user selection restores Rock Face 03 on exposed cliffs, keeps the
current procedural snow appearance/coverage and the Palecrown reserve, and
retains the steep-face normal correction. The snow/aer1/snow_01 cliff trial was
reverted; that set remains an unused source/reference asset. No snow texture
was applied to the snow surface. Array layer 3 again holds Rock Face 03.


## Stone Gate left cliff and approach ? 2026-10-14

The latest selected set is `terrain/rock/snow/snow_03`, with colour, OpenGL
normal, ARM and the provided `snow_03_disp_2k.png`. It occupies array layer 4,
while Rock Face 03 remains in layer 3 for other Snow Mountains cliffs and Iron
Mountains retain their own layers. The displacement is grayscale-alpha 16-bit;
the grayscale channel is normalized into ARM alpha. Its alpha channel is not
used. Source images are unchanged. Height drives material accumulation, not
physical displacement of the terrain.

An editable world-space region in `stoneGateLeftWeight` covers X -25..340,
Z -285..-70 with soft edge shoulders. It affects existing rocky ground and steep
snow faces left of the pass; roads keep their final overlay and other biomes
keep their ground material. Triplanar sampling is 8 m per repeat (trial scale,
source physical width unknown), with the source colour retained. Flat snow and
the Palecrown's walkable snow remain procedural. Within the Palecrown reserve,
steep left faces may receive already-snow-covered snow_03, while bare Rock Face
03 remains excluded. Refrozen ice keeps its existing appearance.

`StoneGateTriangles.ts` changes diagonals in 77 steep cells whose alternative
triangles have better normal alignment. It preserves every authored vertex,
all cell boundary edges and the total 320,000 base triangles. Source roads and
small-height-span cells are excluded. Normals are recomputed after the change;
rendering, camera/shadow depth, terrain sampling and grounding share the result.
No wholesale grid refinement or arbitrary heightmap smoothing is performed.
Steep-face shadow bias in this region uses the rendered geometric triangle
normal instead of interpolated snow normals, to target diagonal shadow acne.

The fifth layer adds approximately 64 MiB GPU storage including mipmaps;
three arrays now total about 320 MiB, and their compressed payload is about
130 MiB. No new texture/sampler bindings or draws are introduced. Soft material
boundaries may sample both cliff layers; their full interiors skip the old layer.

Node validation covers preserved vertices/triangle count, valid winding,
region isolation, grounding outside the correction and exact source/height
channel packing. Typecheck and automated tests do not verify shader compilation
or screenshot appearance; the Stone Gate view still needs an in-app review.


### Left cliff shadow reception disabled

At the user's request, snow and rocky terrain in the soft Stone Gate left-side
region no longer receive cast-shadow darkening. The region boundary feathers
normally and the road overlay retains its original shadow response. This is
independent of the material comparison toggle; sunlight, diffuse ambient fill,
texture AO, normal detail and the current textures remain active. Terrain still
casts into other surfaces; the rest of Snow Mountains keeps normal reception.


## Distance/angle black-texture fix

Native WebGPU reproduction at the supplied cliff pose showed the dark bands
in albedo-only rendering, confirming they occurred before lighting. Coverage
was present; sampling the snow_03 layer directly still returned black at filtered
footprints. Babylon 9.18's Raw2DArray automatic mip generation populates only
layer 0. Higher-resolution base data in layers 1-4 existed, but their lower mip
levels were zero. Distance/angle-selected texture LOD therefore made them black.

`RockArrayMipmaps.ts` now box-filters each RGBA layer independently, including
normal/ARM/height channels, and `RockGround.ts` explicitly uploads all 11 lower
mips with the public updateMipLevel API before the final base upload. Existing
trilinear/anisotropic filtering, encoded-colour averaging, source textures,
material lighting, bindings, shadows and triangle correction are preserved.
The warm-up promise includes every mip upload; context restoration retains
those buffers through Babylon's public per-mip support. GPU memory is unchanged;
CPU startup filtering and retained mip buffers add about 80 MiB across the three
five-layer arrays. No per-frame work is added.

Native GPU readback of the 1x1 mip confirmed populated colour/normal/ARM data in
all five layers. Before/after screenshots at the supplied close cliff pose
showed the black band replaced by the intended rock-snow texture. No new GPU
validation errors occurred (the existing float32-filterable fallback warning
remains). Node tests cover complete layer separation, RGBA averaging and tiny
mip dimensions. Temporary diagnostic shader branches were removed afterward.


## Whole Stone Gate texture area

The current selection extends snow_03 to the whole pass terrain while retaining
the original road as the final overlay.
`STONE_GATE_TEXTURE_AREA` is anchored to the shared Stone Gate spawn at world
(-32.5, -162.5): full coverage within 60 m, feathering out to 90 m. This joins the
existing left-cliff region. Both sides use the same triplanar colour/normal/ARM material beneath the
original road overlay.
Water is excluded. Current gameplay road/snow/water masks, grounding, authored
props and Palecrown's flat snow remain unchanged. No texture resources/bindings
are added; the existing mip fix supplies the fifth layer at every resolution.
The whole-pass material keeps matte highlights, ambient fill and excluded
cast-shadow darkening. The Snow Mountains toggle remains the comparison control.


### Stone Gate road restored

The latest correction retains snow_03 across the pass terrain and restores its
original asphalt road. The whole-pass material is now applied before the road
stage; road colour/normal/ARM overlay it exactly once with the existing coverage
mask and soft edges. Full road pixels exclude the pass texture normal and retain their original
shadow/specular response. Gameplay coverage remains unchanged; this adds no resources or draws.


## Stone Gate cliff facing (14 October 2026)

A separate fractured rock facing now conceals the northern left-cliff triangle
streaks seen from the end of Stone Gate. `src/world/StoneGateCliff.ts` builds
1,152 triangles across world Z -302 to -238. Each height row follows a terrain
contour; the face projects roughly 3?7 metres outward, with its ends and top
buried in the existing mountain. Its base is also buried to avoid a floating seam.

The facing now uses the existing snow_03 rock-snow array layer (rock/snow), including
colour, normal and roughness. Face UVs use world Z/height at an 8-metre scale,
preventing the former vertical texture stretching. The original snow terrain,
road, end wall, and terrain collision/grounding remain in place; this is a visual
cover, not a terrain rewrite or a separate climbable collider.

IronRocks owns the facing batch, camera-depth registration, map screenshot
snapshot, rendering toggle and disposal. Its snow_03 colour and depth materials
are warmed behind the loading screen. It neither receives nor casts cascade shadows, matching the
local cliff lighting decision. Cost: one colour draw and one camera-depth draw
when visible, no additional texture allocations or downloads.

Native Chrome WebGPU screenshot review confirmed the cover with its original Rock Face 03 material.
Typecheck and Node checks cover deterministic geometry, outward normals,
coverage, fixed texture scale and exclusion of meaningful road coverage. The
derived road-display mask has minor gray-classification noise on cliff rock;
road-clearance assertions exclude weights >= 0.15. No build or Playwright.

The subsequent requested switch to snow_03 changes only the facing's colour,
normal and roughness texture layer, retaining its geometry and 8-metre scale.
The end-wall boulders retain their mixed stone textures. Typecheck validates this
texture selection change; no new visual verification or build was performed.
