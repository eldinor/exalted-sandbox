# Exalted biome maps

## Status and purpose

This document records the current map classification and the proposed authoring
contract for more exact biome coverage and smoother material transitions.
The complete authored separate-mask workflow remains future work. Snow, roads,
water and deformation derive coverage from `vertex_color_4k-9.png`, with the
rock-mask correction to sand softness described below.
Heightmap-mode textured land now uses a generated packed coverage map, described
below. Supplying the complete authored masks will still require integration.

Until those masks are ready, the main app's forest ground uses the supplied
`forrest_ground_01` colour/normal/ARM textures, tiled at 4 m and blended from
the current dark-green RGB (124, 170, 129) palette. Snow, water and road coverage
takes priority. This changes ground appearance only; forest tree placement and
the conceptual overlook/spawn clearings remain separate work. See
[FOREST_NOTES.md](FOREST_NOTES.md) for the temporary material contract.

The production world uses `vis_ground_heightmap-11.png` for geometry and
`vertex_color_4k-9.png` for biome colours. The heightmap stays separate from
biome coverage. See [HEIGHTMAP_INTEGRATION.md](HEIGHTMAP_INTEGRATION.md) and
[GRASS.md](GRASS.md) for the existing terrain and grass contracts.

## Current generated textured-land coverage

`public/assets/textures/ground-coverage-9.png` is a linear RGB8 2049 × 1537
coverage map generated from the unchanged `vertex_color_4k-9.png`. R is grass,
G forest and B desert. Separate grayscale8 `biome-rock-9.png` and
`biome-beach-9.png` supply rock and beach. Runtime packs these into
`ground-detail-coverage-9.png` (R rock, G beach, B reserved), sharing one binding.
Remaining ground coverage is `1 - sum(RGB) - rock - beach`; no alpha
channel or transparency is used. The rectangular output retains the source's
orientation and endpoint mapping over the 936 × 702 m world.

Regenerate with `node --import tsx scripts/prepare-ground-coverage.mts`.
The adjacent JSON records source/output SHA-256, dimensions and channel names.
The generator chooses the nearest measured land palette, includes the requested
Forest Overlook grey-outcrop correction, extends adjoining land beneath road
overlays, and blurs weights with a 1.5 m Gaussian sigma. Axis-specific pixel
scales keep the transition approximately 4–6 m wide on both image axes.

Grass/forest/desert weights are complementary through their transitions,
including between desert and forest. Remaining weight supports transitions to
snow, water and island ground. Rock has its own saved mask. Existing snow, road and water coverage has
priority at rendering/placement time. This is not a replacement road/water map.

Heightmap-mode grass placement reads R from this same map, after snow/road/water
exclusions, so grass thins with its ground coverage. Terrain geometry and
authored props remain unchanged; rock coverage now corrects sand softness.
The shader normalizes each sequential material
stage so albedo, roughness, AO and normal blending retain the intended final
weights, rather than leaving a pale fallback seam. Sampling uses linear filtering
and matching texel-centre conventions. The map is ready before shader warm-up
and owned/disposed by Terrain. It adds one texture binding and no new draws;
heightmap device creation requests 24 sampled textures, retaining 16 samplers.

GLB comparison and procedural modes retain their existing coverage sources.
The authored full-resolution masks proposed below can supersede this generated
map later; this partial map is not their required delivery format.

Validation: typecheck and all 135 Node tests passed, including road feathering,
saved grayscale mask loading/orientation, and rock coverage/softness correction.
Native WebGPU screenshots checked forest/grass, desert/grass and desert/forest
boundaries without validation errors. Tests cover complementary weights,
determinism, source/output hashes, world orientation, road underlay, the overlook
correction, shared vegetation coverage and unchanged deformation channels.
No Playwright or production build was run.

## Rock coverage and northern corridor correction

`public/assets/textures/biome-rock-9.png` is a saved grayscale8 2049 × 1537
rock mask, with white=rock, black=other biomes and grey=blend. It is generated
together with `ground-coverage-9.png` so grass, forest, desert and rock have
complementary weights. Both share the source image orientation, world extent
and 1.5 m Gaussian sigma. The ground-coverage JSON records both output hashes.

Measured grey rock regions receive rock coverage, except the requested forest
overlook correction. Sandy-painted pixels in the northern road corridor,
Babylon X [-85,35] m and Z < -70 m, are reclassified as rock. This bounded
correction keeps the southern desert intact. Snow, water, roads and island
coverage retain their existing classifications. The original coloured PNG
is preserved; regenerate both numeric masks with
`node --import tsx scripts/prepare-ground-coverage.mts`.

Heightmap rendering now uses `river_small_rocks` colour/OpenGL normal/ARM maps
from `public/terrain/rock/river/`, replacing the tested `rock_face_03` set.
The nominal density is 4 m, with three offset/quarter-rotated texture samples
blended on a 6 m triangular lattice to remove the regular repeat. Colour is decoded from sRGB; normal/ARM
are linear. They share the existing ground samplers and receive world lighting,
shadows and fog; Ctrl+P includes the corrected rock material. All resources
load before shader warm-up and are disposed by Terrain. No new draws are added.
GLB comparison/procedural material coverage is unchanged.

The PBR maps share each sample's transform; normal XY is counter-rotated before
blending. Explicit rotated gradients preserve filtering at oblique angles, and
the world-anchored hash keeps the pattern stable while moving. Cubed normalized
barycentric weights retain stone detail without hard patch seams; subtle broad
value variation reduces long-range uniformity. Rock shading uses nine texture
reads rather than three, without extra bindings/draws. Native ground and Ctrl+P
views were inspected without the prior repeating grid. See
[source notes](public/terrain/rock/river/SOURCE.md).

CPU rock coverage uses the same saved mask. Sand softness is multiplied by
`1 - rock`, removing sand deformation and sand effects from the corrected
corridor. Snow, road firmness and water channels are unchanged. Grass reads
the regenerated ground mask and retains road/water exclusions. Authored props,
terrain geometry and water levels remain unchanged. This supersedes earlier
notes that all deformation channels were unchanged by ground-only blending.
Native WebGPU checks confirmed rock colour/normal/ARM rendering in the northern
corridor with rock coverage 1 and snow/sand softness [0,0]. A Ctrl+P overview
showed the corrected corridor joined to the surrounding rocky regions, with
roads and the southern desert retained. No GPU validation errors, Playwright
or production build were reported/run for this integration.

## Road display feather

Road colour/normal/ARM now use the supplied `asphalt_snow` set under
`public/terrain/road/asp1/`, with the existing 6 m repeat and 0.72 normal strength.
ARM channels are R=AO, G=roughness, B=metallic; colour is decoded from sRGB and
normal/ARM are linear. All three maps are ready before shader warm-up. This
replaces the grass-path material without changing coverage or firmness. See
[source notes](public/terrain/road/asp1/SOURCE.md).

Heightmap roads now load the saved grayscale8 display mask
`public/assets/textures/mask-roads-9.png` (2049 × 1537). White is road, black
is adjoining land, and grey is partial road coverage. The companion JSON
records source/output hashes, orientation and generation settings. Regenerate
with `node --import tsx scripts/prepare-road-mask.mts`; this overwrites the saved
mask, so preserve authored edits before regenerating. The current mask matches
the previous in-memory feather, with a 1.1 m Gaussian sigma (about a 3 m transition).
Filtering uses world metres on both axes to smooth stepped painted edges.
The GPU surface texture's B channel receives this softened road mask; R/G
snow/sand deformation and A water remain unchanged. CPU `AuthoredSurfaceMap.data`
retains all original channels for gameplay; `roadDisplayData` is separate.
No new texture binding, draw or runtime-frame filtering is added.

Use this file for road coverage and edge painting. Export linear grayscale8,
retain the current world extent/orientation, and avoid gamma conversion. Other
resolutions up to 4096 × 4096 are resampled with the same endpoint alignment.
It controls appearance and vegetation exclusions; original road firmness is
still separate. Record authored changes in the provenance JSON.

Different road textures need a separate material-selection map or packed blend
weights over this shared coverage mask. That map will choose asphalt, dirt,
stone or other road materials independently of the road's overall footprint.
Regions/material IDs have not been defined yet; all roads currently use `asp1`.
The initial saved mask was verified byte-for-byte against the previous generated
runtime coverage, preserving the current appearance and road feather.

The road material is applied once as the final overlay over complete textured
land, avoiding double attenuation at shoulders. Road centres remain opaque on
ordinary-width roads; very narrow paths have softer coverage. Grass thins through
the visual shoulder and remains excluded from the original firm road footprint.
The authored road layout, terrain heights and firmness are unchanged. GLB
comparison keeps its existing road feather. Regression tests check a monotonic
transition, an opaque centre, determinism and unchanged original channels.
Native WebGPU startup and a road-junction screenshot confirmed the softened
road-to-desert/grass edges without GPU validation errors. No build was run.

## Regions visible in the current vertex map

Positions below refer to the map image, rather than Babylon world axes.
The user confirmed this visual classification.

| Region | Map colour | Placement in the image |
| --- | --- | --- |
| Snow | White | Upper-left |
| Grassland | Light green | Across the centre |
| Forest | Darker green | Right side |
| Desert / sand | Yellow-beige | Along the bottom |
| Rocky terrain | Grey | Large regions and scattered outcrops |
| Beach / shore | Light blue, RGB (129, 173, 206) | Broad lake shore band and adjoining river banks |
| Water | Darker blue | Lake and river interiors |
| Island | Muted grey-green; beach material at runtime | Inside the lake |
| Roads | Pale cream | Paths connecting the regions |

Island and rocky terrain are visually distinct colours; their precise biome
names are not explicitly defined in the current runtime classifier. Treat
these names as the accepted authoring categories, not a claim that every
category already has a dedicated runtime subsystem or material.

## Files to provide

Provide one grayscale coverage mask for each land category:

- `biome_snow.png`
- `biome_grass.png`
- `biome_forest.png`
- `biome_desert.png`
- `biome_rock.png`
- `biome_beach.png`
- `biome_island.png`

Also provide independent `mask_roads.png` and `mask_water.png` files.
These filenames are proposed conventions, not existing loader requirements.
Keep the coloured vertex map as an authoring preview.

For every mask:

- White means full coverage: 1.0.
- Black means no coverage: 0.0.
- Grey means partial coverage for blending.
- Use lossless 8-bit grayscale PNG at **4096 × 4096**.
- Match the current vertex map's orientation, extent, and pixel alignment.
  Do not independently rotate, flip, crop, or rescale individual masks.
- Export numeric mask data without colour correction, baked lighting, labels,
  or JPEG compression. Runtime sampling must not apply sRGB/gamma decoding.
- Runtime assets belong under `public/`, with source/provenance notes.

The square image covers the existing rectangular 936 × 702 metre world; do not
change that mapping to make the world square. Preserve chart `(x, y)` to Babylon
`(-x, height, -y)` conversion and the existing image-row orientation.

## Coverage and blending

The six land masks describe material proportions. Their weights should sum to
approximately 1.0 on land, allowing normal 8-bit rounding error. For example,
a transition pixel can contain 70% grass and 30% desert, with the other land
masks at zero. Do not leave accidental unclassified holes.

Paint transitions where materials should mix. A **2–5 metre** transition is a
starting point for tuning, not a fixed width for every boundary. Keep roads
and shorelines more precise, with narrower soft edges where appropriate.
Express widths in world metres because the image's horizontal and vertical
pixel scales differ.

Road and water masks remain independent of the normalized land weights. Land
coverage can continue beneath them; the overlays determine road appearance,
water eligibility, and placement exclusions. A water mask does not specify
water elevation, depth, or swimming state.

Use the same coverage source for ground shading and vegetation placement so
grass can thin gradually across a transition rather than ending at a mismatched
colour threshold. Keep terrain deformation channels separate from vegetation
coverage. Actual placement must still respect roads, submerged terrain, slopes,
and terrain grounding.

## Proposed runtime packing

Individual grayscale files are sufficient for delivery. They can be packed into
two RGBA textures during integration to reduce runtime texture bindings:

| Texture | R | G | B | A |
| --- | --- | --- | --- | --- |
| Land coverage | Snow | Grass | Forest | Desert |
| Remaining coverage and overlays | Rock | Island | Water | Roads |

All channels are independent linear data; alpha is a coverage channel, not
transparency. Packing must preserve its values without alpha premultiplication.
This layout is proposed and has not been implemented.

CPU and GPU consumers must agree on channel meaning, normalization, coordinate
conversion, filtering, and texel-centre conventions. Do not switch only the
visible terrain texture while leaving gameplay or placement on the old palette.

## Shoreline: a separate mask is optional

A shore mask can be derived from the **water mask, actual terrain height, and
water level**. No additional authored shore map is required for the basic
shoreline effect.

Derive the actual wet boundary using the water system's supported extents and
levels, then use distance from that boundary to make configurable bands:

- A narrow wet edge near the water.
- A wider shoreline material transition on adjacent land.

Terrain height and water level determine which areas are submerged; distance
controls the bands' horizontal widths. Height difference alone would produce
inconsistent widths on steep and shallow banks. Keep derived shore coverage
consistent with the rendered water, including islands, river joins, and raised
lake levels. The painted water mask alone is not the final wet boundary.

Provide an optional authored shore mask only when specific beaches, muddy
banks, or rocky shores need to differ from the derived result. Such a mask
controls the artistic shoreline treatment; it does not replace terrain
grounding, water geometry, or swimming calculations. Separate shore-type masks
may be appropriate if several distinct treatments need independent blending.

## Integration checks

Before enabling the new masks, check matching dimensions and orientation,
land-weight sums, roads through biome transitions, dry islands, lake and river
boundaries, and agreement between CPU placement and GPU ground shading.
Preserve the existing terrain geometry, coordinate contract, authored props,
and water-level behaviour unless a separate correction is requested.


## Beach biome and authored texture scale

The user designated the light-blue **RGB (129,173,206)** region as the beach biome.
The main heightmap app now covers it with `aerial_beach_01_diff_2k.png`,
`aerial_beach_01_nor_gl_2k.png` and `aerial_beach_01_arm_2k.png`, from
`public/terrain/sand/beach/`. ARM channels are AO/roughness/metallic; separate AO
is redundant. Colour is sRGB; normal and ARM are linear. The original desert
material remains in use for desert ground.

Coverage is generated alongside the existing land masks, using nearest-palette
classification and the same 1.5 m Gaussian sigma. `biome-beach-9.png` is a saved
linear grayscale8 2049 by 1537 mask with source-image orientation. It is also
exposed as CPU `beachAt(x,z)` after coordinate conversion. `ground-detail-coverage-9.png`
packs rock/beach into R/G, with B reserved. Their combined coverage and the
existing grass/forest/desert weights never exceed one. Roads retain their final
material overlay. Source/output hashes are recorded in `ground-coverage-9.json`.
Regenerate all masks with `node --import tsx scripts/prepare-ground-coverage.mts`.

The existing two-blue water-eligibility mask is retained: shoreline material does
not determine whether the terrain is underwater. Actual height, supported water
extents and the raised lake level still control rendered water and swimming.
No terrain geometry, collision, deformation or vegetation placement changes are
introduced for beach. Land display masks already exclude deep-water interiors,
so beach/adjacent land blending does not multiply by water eligibility and leave
a light-blue fallback seam. Snow coverage remains a separate material control.

The user specified **30 metres per texture width**, replacing the initial 4 m
mapping. Beach uses UV `(-world.x,world.z)/30`. Three deterministic offset and
quarter-rotated PBR samples blend on a 45 m triangular lattice, suppressing the
regular repeating grid. All maps share transforms and explicit rotated gradients;
tangent normal XY is counter-rotated before blending. Beach reuses the rock
sampling implementation through an explicitly registered `beachSampling` include.
The shader performs nine beach texture reads rather than three, with no extra
terrain draws. Existing repeat/filter samplers are shared; heightmap terrain now
requests **27 sampled-texture slots**, retaining the default sampler limit.

The supplied PNGs are **2048 by 2048**, despite the stated original asset density
of 2.7 px/cm. At 30 m they deliver approximately **0.68 px/cm**; 2.7 px/cm at this
physical width requires approximately 8K source maps. The current images are not
upscaled. Texture scale and spatial detail resolution are distinct.

All beach textures and coverage are ready before shader warm-up and are disposed
by Terrain. Both coarse/local terrain and Ctrl+P share the same world mapping.
The beach material is limited to the main heightmap app; GLB comparison and
procedural modes retain their existing materials. Beach is added to the biome
name type without adding an unauthored navigation spawn.

Validation: typecheck and all **145 Node tests** passed, covering light-blue selection versus
dark-blue water, beach/land weight conservation, packed channels, hashes, world
orientation and unchanged physical/grass channels. Native WebGPU ground and
whole-map captures verify the new shore material; the baseline headless
float32-filterable warning remains. No production build or Playwright.


The subsequent shoreline correction retains this beach material and water mask.
Heightmap water now selects the connected wet basin beyond the old reference
outline, with a 50 m candidate margin, and clips its rim against the actual drawn
plane. This closes omitted underwater shore areas while retaining the existing
lake level, dry island and shared rendering/swimming coverage. See
[HEIGHTMAP_INTEGRATION.md](HEIGHTMAP_INTEGRATION.md).


## Sandy island and island waterline

The user requested the island use the beach sand set too. The generated beach
mask now includes the muted grey-green island palette **RGB (137,147,128)**,
with the same 30 m stochastic colour/normal/ARM mapping as the mainland beach.
Ground/detail masks and their provenance hashes were regenerated; the authored
heightmap and coloured biome image are unchanged.

The old painted island boundary also cut water off before submerged island banks.
Heightmap water extraction now carries a separate **lake-only eligibility** weight:
maximum of original painted water and beach coverage. It clips this coverage to
the rendered plane and selects the connected lake basin. This reaches submerged
island sand while leaving the higher island dry. Original water weights still
infer lake level and generate river geometry; original CPU snow/sand/road/water
and grass classification are preserved. Edge tessellation retains its previous
painted-water rules, avoiding a lake-level shift from changed sample density.
The physical lake level remains **41.669526 m**. Rendering, depth, map capture and
swimming continue sharing the resulting lake mesh.

Validation: typecheck and all **148 Node tests** passed, including submerged
island shore samples, dry island centre, exact retained lake level, unchanged
river classification and island beach coverage. Native WebGPU checked the sandy
island and Ctrl+P view; 768 submerged island-bank sample points had zero gaps,
and the centre remained dry. No new GPU errors beyond the baseline headless
float32-filterable warning. No production build or Playwright.
