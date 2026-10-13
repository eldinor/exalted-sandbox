# Iron Mountains material

The authored heightmap's upper-right rocky region now has its own layered
material, using the supplied `rocky_terrain_2k` and `rocky_terrain_03_2k` maps.
Both use the user's **90 m** physical width. This first pass changes material
appearance without changing the terrain geometry. The subsequent silhouette
pass now adds sparse grounded rock outcrops with separate collision; see below.

## Region and blending

`biome-iron-mountains-9.png` selects the connected existing rock component at
The Ironspine, world (-257.5, -190). It includes the already corrected northern
road corridor and retains the existing 1.5 m soft shoulder. Lake-side rock,
southern outcrops, Forest Outlook, beach/island, snow and other land stay separate.
The mask is packed into B of `ground-detail-coverage-9.png`: R rock, G beach,
B Iron Mountains (a subset of rock, not another additive biome). Roads retain
their final overlay. Grass/forest/desert, rock and beach outputs are unchanged.

Regenerate masks with `node --import tsx scripts/prepare-ground-coverage.mts`.
Metadata records source/output SHA256. CPU rock/deformation classification remains
unchanged; the new mask is for appearance only.

## Appearance

- Exposed Rock: `rocky_terrain`, selected on steeper surfaces; darkened, mostly
  desaturated, with restrained rusty mineral variation.
- Broken Rock: `rocky_terrain_03`, favoured on gentler slopes and ledges.
- Their supplied displacement maps drive height-aware blending: raised exposed
  slabs win against lower material, while broken ground accumulates on ledges.
  A fallback avoids empty/black transitions. Texture height is normalized
  blending data, not physical terrain displacement.
- Three-axis world projection and signed normal bases prevent cliff stretching.
  Neutral normal maps retain the geometric terrain normal. Small continuous UV
  warping, different layer offsets and broad colour variation reduce alignment.
- 90 m source structure, broad geological shading and 11.25 m fine normal/colour
  variation provide three scales. Fine detail fades between 35 and 65 m.
- Low height/AO darkens crevices. Rock roughness stays within 0.90-0.98. Rock remains
  non-metallic; lighting, fog and linear post-processing are preserved. See the
  shadow appearance correction below.

The supplied sets are mossy rocky-ground scans, not bare vertical-cliff scans.
Steep-face shading suppresses their green/brown tint, but their photographed
structure remains visible. More suitable cliff assets can improve this later.

## Resources and benchmark

Layer 0 retains the old river-rock set at 4 m; layers 1/2 hold the new sets.
Three RGBA8 texture arrays replace the three former rock textures, so terrain
still requests **27 sampled-texture bindings**. Displacement shares ARM alpha.
The generated arrays retain full 2K dimensions; numeric 16-bit PNG maps are
quantized to 8-bit GPU channels. Original PNG/EXR/glTF/bin files remain unchanged.
ARM/height and normals remain linear; base colour is stored sRGB-encoded and
decoded in the shader. Current raw-array mip filtering averages stored values.

Generate with `node scripts/prepare-iron-textures.mjs`. Outputs use reversible
horizontal byte prediction followed by gzip. Loading handles both HTTP servers
that supply Content-Encoding:gzip and hosts serving the compressed file directly.
Arrays load/upload/mipmap before shader warm-up and dispose with Terrain.

Compressed runtime payload is approximately **77 MiB**. The three arrays occupy
about **192 MiB GPU storage including mipmaps**, versus about 64 MiB for the old
three 2K rock textures: roughly **128 MiB additional GPU texture memory**.
Babylon may also retain CPU upload buffers for context restoration.

Iron pixels use 6 texture reads per selected projection, plus 2 fine-detail
reads on the cliff layer nearby: 6-24 reads depending on active axes/distance.
Blended borders may also sample the legacy 9-read rock material. Projections
whose sharpened weight is below .02 are skipped. No extra draws/indices are added.

F1 settings → **Iron Mountains → Layered rock material** switches between new
and previous material for comparison. Benchmark snapshots include this setting.
Keep the same view, resolution and vegetation settings between runs.

Native Chrome/WebGPU at The Ironspine loaded all 3-layer arrays, compiled the
material and exercised the toggle without shader/GPU errors. A fixed paused
764x430 view had identical draw capture totals on/off: 1,445 draws and 11,241,555
submitted indices per frame. Two alternating 120-frame samples measured:

| Pass | Previous material mean / p95 | Layered material mean / p95 |
| --- | --- | --- |
| 1 | 13.89 / 16.90 ms | 13.60 / 15.40 ms |
| 2 | 12.65 / 13.80 ms | 12.73 / 14.80 ms |

These are browser frame intervals at one view, not isolated GPU timings or a
general performance improvement. Higher resolution and cliff-heavy views still
need comparison on the user's hardware. Node checks cover mask isolation,
height blending, packed-mask consistency, texture hashes/height channels and
byte-preservation of the river layer. No Playwright or production build was run.

## Cliff and boulder silhouette pass - 2026-10-13

Production heightmap mode adds **12 ridge outcrops and 32 smaller boulders**.
They reuse the prepared CC BY 4.0 Dari `BoulderPlainLarge` geometry from
`terrain/forest/coniferous-selected/boulder-plain.glb` (768 triangles each).
Imported hierarchy transforms are baked once, the geometry is normalized to
its bounds, normals are rebuilt, and each placement receives its own dimensions
and yaw. Outcrops are 7-13 m wide, 8-16 m high and 4-7 m deep; boulders are
2-5 m wide and 1.8-3.8 m high. Dark cool tint and roughness adapt the source
plain-rock textures without changing other props or their materials.

This is a sparse first silhouette pass using scaled boulder geometry, rather
than a bespoke cliff-wall/overhang asset. It does not replace the terrain's
layered shader or apply terrain triplanar mapping to the prop shader.
Dedicated authored cliff shapes can replace this prototype later.

`IronRockPlacement.ts` deterministically ranks 21 m grid candidates by local
ridge prominence/elevation for outcrops and road proximity for boulders. The
entire enclosing footprint plus 3 m road margin must remain inside Iron
Mountains and outside roads/water; steep/uneven foundations are rejected.
The Ironspine teleport retains an 18 m clearing plus the rock radius. Foundations
use actual rendered triangle heights and bury 22% of model height below the
lowest sampled support. Existing authored props remain untouched.

`ironRocks.ts` groups static thin instances in 64 m cells, sharing colour and
camera-depth materials. Normal Babylon frustum bounds cull each cell; all
placements remain resident (only 44 sites). Rock accents neither cast nor receive shadows. They use the existing production
prop WGSL for matching colour/depth geometry, sunlight, surface shading, fog,
spell lights and linear output. Textures/instanced
variants warm behind the loading screen, with a temporary submission probe.
Disposal removes owned depth registrations and collision cylinders.
Collision uses approximate static cylinders independently of render visibility;
this pass does not make rock tops walkable terrain.

**F1 > Iron Mountains > Cliff and boulder accents** toggles rendering for
comparison; colliders remain. `EXALTED.ironRocks.stats` and benchmark snapshots
record the subsystem; Ctrl+Shift+P includes every rock in the map screenshot.
GLB comparison and procedural terrain remain unchanged.

Resident geometry contribution is **33,792 triangles** before pass multiplicity;
Actual draw/indices cost depends on cell visibility and colour/depth passes. No GPU
performance or visual result is claimed from Node checks. Validation covers
repeatable placement, mask/road/water/slope/clearing exclusion and triangle
grounding on the real authored maps. No Playwright or production build was run.


### Shadow appearance correction

Iron Mountains terrain now bypasses cast-shadow darkening within the dedicated
region mask, feathering into normal shadow reception at its boundary. This is
independent of the layered material toggle. Sun direction, normal/roughness,
ambient lighting, texture AO and crevice shading remain active. Terrain still
casts shadows into surrounding biomes. The new cliff/boulder accents neither
cast nor receive shadows; they remain in the camera depth pass.


### Matte rock correction

The layered Iron Mountains material now clamps roughness to 0.90-0.98 and
retains only 18% of its former direct-sun and ambient-sky specular contribution.
The soft region boundary feathers this reduction; roads and other biomes retain
their existing response. Cliff/boulder accents use the same 0.90 roughness floor
and 18% direct specular scale through an opt-in PROP_MATTE_ROCK variant. Texture
colour, normal detail, diffuse sunlight, ambient diffuse and shadow exclusions
remain unchanged. This targets broad pale highlights; screenshot appearance
still requires an in-app comparison, since typecheck does not validate WGSL.


### Readable mountain ambient lighting

Iron Mountains terrain now clamps the combined ambient-occlusion factor to at
least 0.78 inside its mask, feathering at the border and excluding the final
road overlay. Layered-material crevice colour darkening is halved (32% to 16%
maximum). Terrain and its matte rock accents receive a neutral diffuse ambient
floor at 55% of the upward sky irradiance luminance. The floor follows the
existing ambient-intensity control and only lifts darker faces; direct lighting,
normal detail, matte specular and shadow exclusions stay active. Other biomes
and prop materials keep their existing lighting. Typecheck passed; no build or
visual verification was performed for this adjustment.
