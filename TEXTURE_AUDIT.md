# Texture audit - 9 November 2026

Historical snapshot before the WebP conversion later on 9 November 2026.
Current main-app surface delivery now uses quality-80 WebP derivatives; original
files in this inventory remain as sources. See public/textures-webp-80/SOURCE.md.

Read-only audit of the current `grass_1` checkout. No texture files were changed or removed.

Scope: all standalone raster/texture files under `public/`. Build folders, deployment worktrees, node_modules and generated-work screenshots are excluded. Branding SVGs are not raster textures. Embedded GLB images are counted separately below.

Main app comes from the production asset inventory including external GLB images and GLB comparison support. Generator/preparation classifications use explicit source/config references and asset notes. A missing filename search alone is not proof that an authoring asset can be deleted.

Current branch does not select the prepared 1K derivatives; those files remain locally. Do not confuse this checkout with the separate earlier 1K implementation.

## Summary

| Usage | Files | MiB |
|---|---:|---:|
| Authored concept/reference image | 2 | 3.09 |
| Retained font atlas; no current application reference found | 1 | 0.18 |
| Main app / comparison mode | 45 | 197.32 |
| Old authored map revision; outside current main app | 9 | 58.60 |
| Generator / lab material | 10 | 53.62 |
| Not referenced by current code; retained alternative/extra map | 23 | 136.79 |
| Saved model dependency (outside main app) | 4 | 16.13 |
| Asset preview | 3 | 0.57 |
| Meadow ORM packing source (SOURCE.md recipe) | 3 | 5.97 |
| Prepared 1K alternative; not selected by current branch | 14 | 24.25 |
| Mountain array preparation source | 18 | 244.11 |
| **Total standalone files** | **132** | **740.62** |

## Main app model textures

These are images embedded in production GLBs, additional to the standalone file count. External PNG dependencies are already included above. Geometry size is not counted as texture bytes.

| Runtime GLB | Embedded images |
|---|---:|
| `assets/exalted/alpha-map.glb` | 0 |
| `assets/exalted/exalted_desert.glb` | 45 |
| `terrain/forest/coniferous-selected/boulder-plain.glb` | 0 |
| `terrain/forest/fir-pack-selected.glb` | 6 |
| `terrain/forest/pine-pack-forestland.glb` | 6 |
| `terrain/grassland/daisies/daisies.glb` | 3 |
| `terrain/grassland/dandelions/dandelions.glb` | 3 |
| `terrain/grassland/grass_medium_01_1k.glb` | 1 |

## Retention guidance

- Keep runtime textures, terrain masks and numeric heightmaps. These are not interchangeable with tiled surface textures.
- Keep mountain preparation sources and the meadow ORM component maps if regeneration should remain possible.
- Keep generator/lab textures while those utilities remain supported.
- Saved coniferous wood/moss maps are dependencies of the corresponding saved GLBs, despite not being used in the main app.
- Old map revisions, tested alternatives, duplicate standalone AO maps and previews are cleanup candidates, subject to authoring/history needs. No deletion is authorised by this audit.
- The standalone `snow/aer1/snow_01_*` set is a tested, reverted reference. Production snow remains procedural, with separate rock/snow cliff layers.

## Full standalone file inventory

Paths below are relative to `public/`.

| File | Dimensions | Depth | MiB | Usage |
|---|---|---|---:|---|
| `assets/ChatGPT Image Sep 8, 2026, 10_52_53 AM.png` | 1448 x 1086 | 8-bit/channel | 2.58 | Authored concept/reference image |
| `assets/fonts/roboto-regular.png` | 512 x 512 | 8-bit/channel | 0.18 | Retained font atlas; no current application reference found |
| `assets/textures/biome-beach-9.png` | 2049 x 1537 | 8-bit/channel | 0.06 | Main app / comparison mode |
| `assets/textures/biome-iron-mountains-9.png` | 2049 x 1537 | 8-bit/channel | 0.04 | Main app / comparison mode |
| `assets/textures/biome-rock-9.png` | 2049 x 1537 | 8-bit/channel | 0.11 | Main app / comparison mode |
| `assets/textures/grasspath/grass_path_2_diff_2k.jpg` | 2048 x 2048 | 8-bit/channel | 2.66 | Not referenced by current code; retained alternative/extra map |
| `assets/textures/grasspath/grass_path_2_nor_gl_2k.jpg` | 2048 x 2048 | 8-bit/channel | 2.39 | Not referenced by current code; retained alternative/extra map |
| `assets/textures/grasspath/grass_path_2_rough_2k.jpg` | 2048 x 2048 | 8-bit/channel | 1.27 | Not referenced by current code; retained alternative/extra map |
| `assets/textures/ground-coverage-9.png` | 2049 x 1537 | 8-bit/channel | 0.29 | Main app / comparison mode |
| `assets/textures/ground-detail-coverage-9.png` | 2049 x 1537 | 8-bit/channel | 0.26 | Main app / comparison mode |
| `assets/textures/mask-roads-9.png` | 2049 x 1537 | 8-bit/channel | 0.08 | Main app / comparison mode |
| `assets/textures/vertex_color_4k copy.png` | 4096 x 4096 | 8-bit/channel | 0.14 | Main app / comparison mode |
| `assets/textures/vertex_color_4k-4.png` | 4096 x 4096 | 8-bit/channel | 0.20 | Old authored map revision; outside current main app |
| `assets/textures/vertex_color_4k-9.png` | 4096 x 4096 | 8-bit/channel | 0.24 | Main app / comparison mode |
| `assets/textures/vertex_color_4k-roads.png` | 4096 x 4096 | 8-bit/channel | 0.20 | Old authored map revision; outside current main app |
| `assets/textures/vertex_color_4k.png` | 4096 x 4096 | 8-bit/channel | 0.24 | Old authored map revision; outside current main app |
| `assets/textures/vis_ground_heightmap-11.png` | 4096 x 4096 | 16-bit/channel | 9.20 | Main app / comparison mode |
| `assets/textures/vis_ground_heightmap-3.png` | 4096 x 4096 | 16-bit/channel | 8.66 | Old authored map revision; outside current main app |
| `assets/textures/vis_ground_heightmap-4.png` | 4096 x 4096 | 16-bit/channel | 8.87 | Old authored map revision; outside current main app |
| `assets/textures/vis_ground_heightmap-5.png` | 4096 x 4096 | 16-bit/channel | 9.15 | Old authored map revision; outside current main app |
| `assets/textures/vis_ground_heightmap-9.png` | 4096 x 4096 | 16-bit/channel | 9.17 | Old authored map revision; outside current main app |
| `assets/textures/vis_ground_heightmap-roads.png` | 4096 x 4096 | 16-bit/channel | 9.21 | Old authored map revision; outside current main app |
| `assets/textures/vis_ground_heightmap.png` | 4096 x 4096 | 16-bit/channel | 12.89 | Old authored map revision; outside current main app |
| `terrain/atlas/terrain_arm_atlas_2k.jpg` | 4096 x 2048 | 8-bit/channel | 5.13 | Generator / lab material |
| `terrain/atlas/terrain_diff_atlas_2k.jpg` | 4096 x 2048 | 8-bit/channel | 6.16 | Generator / lab material |
| `terrain/atlas/terrain_nor_gl_atlas_2k.jpg` | 4096 x 2048 | 8-bit/channel | 9.02 | Generator / lab material |
| `terrain/desert-sand/gravelly_sand_arm_2k.jpg` | 2048 x 2048 | 8-bit/channel | 3.26 | Generator / lab material |
| `terrain/desert-sand/gravelly_sand_diff_2k.jpg` | 2048 x 2048 | 8-bit/channel | 4.20 | Generator / lab material |
| `terrain/desert-sand/gravelly_sand_nor_gl_2k.jpg` | 2048 x 2048 | 8-bit/channel | 5.68 | Generator / lab material |
| `terrain/desert-sand/sand_03_arm_2k.png` | 2048 x 2048 | 16-bit/channel | 15.90 | Not referenced by current code; retained alternative/extra map |
| `terrain/desert-sand/sand_03_diff_2k.png` | 2048 x 2048 | 16-bit/channel | 21.80 | Not referenced by current code; retained alternative/extra map |
| `terrain/desert-sand/sand_03_disp_2k.png` | 2048 x 2048 | 16-bit/channel | 5.94 | Generator / lab material |
| `terrain/desert-sand/sand_03_nor_gl_2k.png` | 2048 x 2048 | 16-bit/channel | 21.24 | Not referenced by current code; retained alternative/extra map |
| `terrain/forest/blue-spruce/impostor-colour.png` | 4096 x 1536 | 8-bit/channel | 1.69 | Main app / comparison mode |
| `terrain/forest/blue-spruce/impostor-normal.png` | 4096 x 1536 | 8-bit/channel | 1.59 | Main app / comparison mode |
| `terrain/forest/concept/forest-shape-2026-10-12.png` | 1280 x 960 | 8-bit/channel | 0.51 | Authored concept/reference image |
| `terrain/forest/coniferous-selected/textures/bark-color.png` | 2048 x 2048 | 8-bit/channel | 9.03 | Saved model dependency (outside main app) |
| `terrain/forest/coniferous-selected/textures/bark-normal.png` | 1024 x 1024 | 8-bit/channel | 2.23 | Saved model dependency (outside main app) |
| `terrain/forest/coniferous-selected/textures/mossy-rock-color.png` | 512 x 512 | 8-bit/channel | 0.21 | Saved model dependency (outside main app) |
| `terrain/forest/coniferous-selected/textures/mossy-rock-normal.png` | 2048 x 2048 | 8-bit/channel | 4.65 | Saved model dependency (outside main app) |
| `terrain/forest/coniferous-selected/textures/plain-rock-color.png` | 1024 x 1024 | 8-bit/channel | 0.15 | Main app / comparison mode |
| `terrain/forest/coniferous-selected/textures/plain-rock-normal.png` | 2048 x 2048 | 8-bit/channel | 4.15 | Main app / comparison mode |
| `terrain/forest/textures/forrest_ground_01_ao_2k.png` | 2048 x 2048 | 16-bit/channel | 9.36 | Not referenced by current code; retained alternative/extra map |
| `terrain/forest/textures/forrest_ground_01_arm_2k.png` | 2048 x 2048 | 16-bit/channel | 17.39 | Main app / comparison mode |
| `terrain/forest/textures/forrest_ground_01_diff_2k.png` | 2048 x 2048 | 16-bit/channel | 25.04 | Main app / comparison mode |
| `terrain/forest/textures/forrest_ground_01_nor_gl_2k.png` | 2048 x 2048 | 16-bit/channel | 25.78 | Main app / comparison mode |
| `terrain/grassland/daisies/preview.png` | 1440 x 900 | 8-bit/channel | 0.06 | Asset preview |
| `terrain/grassland/dandelions/preview.png` | 764 x 429 | 8-bit/channel | 0.03 | Asset preview |
| `terrain/grassland/leafy_grass_arm_2k.jpg` | 2048 x 2048 | 8-bit/channel | 3.93 | Generator / lab material |
| `terrain/grassland/leafy_grass_diff_2k.jpg` | 2048 x 2048 | 8-bit/channel | 4.55 | Generator / lab material |
| `terrain/grassland/leafy_grass_nor_gl_2k.jpg` | 2048 x 2048 | 8-bit/channel | 5.77 | Generator / lab material |
| `terrain/grassland/meadow/Material-326-A_AmbientOcclusion.jpg` | 4096 x 4096 | 8-bit/channel | 2.48 | Meadow ORM packing source (SOURCE.md recipe) |
| `terrain/grassland/meadow/Material-326-A_BaseColor.jpg` | 4096 x 4096 | 8-bit/channel | 4.41 | Main app / comparison mode |
| `terrain/grassland/meadow/Material-326-A_Diffuse.jpg` | 4096 x 4096 | 8-bit/channel | 3.77 | Not referenced by current code; retained alternative/extra map |
| `terrain/grassland/meadow/Material-326-A_Glossiness.jpg` | 4096 x 4096 | 8-bit/channel | 3.30 | Not referenced by current code; retained alternative/extra map |
| `terrain/grassland/meadow/Material-326-A_Height.jpg` | 4096 x 4096 | 8-bit/channel | 0.67 | Not referenced by current code; retained alternative/extra map |
| `terrain/grassland/meadow/Material-326-A_Metallic.jpg` | 4096 x 4096 | 8-bit/channel | 0.19 | Meadow ORM packing source (SOURCE.md recipe) |
| `terrain/grassland/meadow/Material-326-A_Normal.jpg` | 4096 x 4096 | 8-bit/channel | 3.65 | Main app / comparison mode |
| `terrain/grassland/meadow/Material-326-A_ORM.png` | 4096 x 4096 | 8-bit/channel | 24.11 | Main app / comparison mode |
| `terrain/grassland/meadow/Material-326-A_Roughness.jpg` | 4096 x 4096 | 8-bit/channel | 3.30 | Meadow ORM packing source (SOURCE.md recipe) |
| `terrain/grassland/meadow/Material-326-A_Specular.jpg` | 4096 x 4096 | 8-bit/channel | 0.25 | Not referenced by current code; retained alternative/extra map |
| `terrain/grassland/meadow/Material-326-A_SpecularLevel.jpg` | 4096 x 4096 | 8-bit/channel | 0.19 | Not referenced by current code; retained alternative/extra map |
| `terrain/grassland/meadow/Preview.png` | 512 x 512 | 8-bit/channel | 0.48 | Asset preview |
| `terrain/grassland/sparse_grass_arm_2k.jpg` | 2048 x 2048 | 8-bit/channel | 3.66 | Not referenced by current code; retained alternative/extra map |
| `terrain/grassland/sparse_grass_diff_2k.jpg` | 2048 x 2048 | 8-bit/channel | 3.56 | Not referenced by current code; retained alternative/extra map |
| `terrain/grassland/sparse_grass_nor_gl_2k.jpg` | 2048 x 2048 | 8-bit/channel | 5.62 | Not referenced by current code; retained alternative/extra map |
| `terrain/ground-1k/beach-arm.png` | 1024 x 1024 | 8-bit/channel | 1.48 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/beach-base.png` | 1024 x 1024 | 8-bit/channel | 1.19 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/beach-normal.png` | 1024 x 1024 | 8-bit/channel | 1.76 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/forest-arm.png` | 1024 x 1024 | 8-bit/channel | 1.72 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/forest-base.png` | 1024 x 1024 | 8-bit/channel | 2.23 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/forest-normal.png` | 1024 x 1024 | 8-bit/channel | 2.58 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/meadow-arm.png` | 1024 x 1024 | 8-bit/channel | 1.82 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/meadow-base.png` | 1024 x 1024 | 8-bit/channel | 2.40 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/meadow-normal.png` | 1024 x 1024 | 8-bit/channel | 2.49 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/road-arm.png` | 1024 x 1024 | 8-bit/channel | 1.47 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/road-base.png` | 1024 x 1024 | 8-bit/channel | 2.46 | Prepared 1K alternative; not selected by current branch |
| `terrain/ground-1k/road-normal.png` | 1024 x 1024 | 8-bit/channel | 2.34 | Prepared 1K alternative; not selected by current branch |
| `terrain/props-1k/impostor-colour.png` | 1024 x 384 | 8-bit/channel | 0.14 | Prepared 1K alternative; not selected by current branch |
| `terrain/props-1k/impostor-normal.png` | 1024 x 384 | 8-bit/channel | 0.17 | Prepared 1K alternative; not selected by current branch |
| `terrain/road/asp1/asphalt_snow_arm_2k.jpg` | 2048 x 2048 | 8-bit/channel | 3.12 | Main app / comparison mode |
| `terrain/road/asp1/asphalt_snow_diff_2k.jpg` | 2048 x 2048 | 8-bit/channel | 5.10 | Main app / comparison mode |
| `terrain/road/asp1/asphalt_snow_nor_gl_2k.jpg` | 2048 x 2048 | 8-bit/channel | 5.53 | Main app / comparison mode |
| `terrain/rock/03/rock_face_03_arm_2k.png` | 2048 x 2048 | 16-bit/channel | 16.69 | Mountain array preparation source |
| `terrain/rock/03/rock_face_03_diff_2k.png` | 2048 x 2048 | 16-bit/channel | 21.75 | Mountain array preparation source |
| `terrain/rock/03/rock_face_03_nor_gl_2k.png` | 2048 x 2048 | 16-bit/channel | 22.09 | Mountain array preparation source |
| `terrain/rock/iron-mountains-png-1024/arm-0.png` | 1024 x 1024 | 8-bit/channel | 1.71 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/arm-1.png` | 1024 x 1024 | 8-bit/channel | 1.27 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/arm-2.png` | 1024 x 1024 | 8-bit/channel | 1.43 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/arm-3.png` | 1024 x 1024 | 8-bit/channel | 1.58 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/arm-4.png` | 1024 x 1024 | 8-bit/channel | 1.65 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/base-0.png` | 1024 x 1024 | 8-bit/channel | 2.18 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/base-1.png` | 1024 x 1024 | 8-bit/channel | 1.94 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/base-2.png` | 1024 x 1024 | 8-bit/channel | 2.01 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/base-3.png` | 1024 x 1024 | 8-bit/channel | 1.99 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/base-4.png` | 1024 x 1024 | 8-bit/channel | 1.84 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/height-0.png` | 1024 x 1024 | 8-bit/channel | 0.00 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/height-1.png` | 1024 x 1024 | 8-bit/channel | 0.33 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/height-2.png` | 1024 x 1024 | 8-bit/channel | 0.37 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/height-3.png` | 1024 x 1024 | 8-bit/channel | 0.00 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/height-4.png` | 1024 x 1024 | 8-bit/channel | 0.50 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/normal-0.png` | 1024 x 1024 | 8-bit/channel | 2.48 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/normal-1.png` | 1024 x 1024 | 8-bit/channel | 2.13 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/normal-2.png` | 1024 x 1024 | 8-bit/channel | 2.35 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/normal-3.png` | 1024 x 1024 | 8-bit/channel | 2.25 | Main app / comparison mode |
| `terrain/rock/iron-mountains-png-1024/normal-4.png` | 1024 x 1024 | 8-bit/channel | 2.48 | Main app / comparison mode |
| `terrain/rock/river/river_small_rocks_arm_2k.png` | 2048 x 2048 | 8-bit/channel | 6.06 | Mountain array preparation source |
| `terrain/rock/river/river_small_rocks_diff_2k.png` | 2048 x 2048 | 8-bit/channel | 7.87 | Mountain array preparation source |
| `terrain/rock/river/river_small_rocks_nor_gl_2k.png` | 2048 x 2048 | 8-bit/channel | 9.23 | Mountain array preparation source |
| `terrain/rock/rocky_terrain_03_2k/textures/rocky_terrain_03_ao_2k.png` | 2048 x 2048 | 16-bit/channel | 4.93 | Not referenced by current code; retained alternative/extra map |
| `terrain/rock/rocky_terrain_03_2k/textures/rocky_terrain_03_arm_2k.png` | 2048 x 2048 | 16-bit/channel | 13.35 | Mountain array preparation source |
| `terrain/rock/rocky_terrain_03_2k/textures/rocky_terrain_03_diff_2k.png` | 2048 x 2048 | 16-bit/channel | 21.49 | Mountain array preparation source |
| `terrain/rock/rocky_terrain_03_2k/textures/rocky_terrain_03_disp_2k.png` | 2048 x 2048 | 16-bit/channel | 5.93 | Mountain array preparation source |
| `terrain/rock/rocky_terrain_03_2k/textures/rocky_terrain_03_mask_2k.png` | 2048 x 2048 | 16-bit/channel | 5.17 | Not referenced by current code; retained alternative/extra map |
| `terrain/rock/rocky_terrain_03_2k/textures/rocky_terrain_03_nor_gl_2k.png` | 2048 x 2048 | 16-bit/channel | 22.33 | Mountain array preparation source |
| `terrain/rock/rocky_terrain_2k/textures/rocky_terrain_ao_2k.png` | 2048 x 2048 | 16-bit/channel | 4.32 | Not referenced by current code; retained alternative/extra map |
| `terrain/rock/rocky_terrain_2k/textures/rocky_terrain_arm_2k.png` | 2048 x 2048 | 16-bit/channel | 12.93 | Mountain array preparation source |
| `terrain/rock/rocky_terrain_2k/textures/rocky_terrain_diff_2k.png` | 2048 x 2048 | 16-bit/channel | 24.24 | Mountain array preparation source |
| `terrain/rock/rocky_terrain_2k/textures/rocky_terrain_disp_2k.png` | 2048 x 2048 | 16-bit/channel | 5.86 | Mountain array preparation source |
| `terrain/rock/rocky_terrain_2k/textures/rocky_terrain_nor_gl_2k.png` | 2048 x 2048 | 16-bit/channel | 24.90 | Mountain array preparation source |
| `terrain/rock/snow/snow_03_arm_2k.png` | 2048 x 2048 | 8-bit/channel | 5.82 | Mountain array preparation source |
| `terrain/rock/snow/snow_03_diff_2k.png` | 2048 x 2048 | 8-bit/channel | 6.70 | Mountain array preparation source |
| `terrain/rock/snow/snow_03_disp_2k.png` | 2048 x 2048 | 16-bit/channel | 7.41 | Mountain array preparation source |
| `terrain/rock/snow/snow_03_nor_gl_2k.png` | 2048 x 2048 | 8-bit/channel | 9.44 | Mountain array preparation source |
| `terrain/sand/beach/aerial_beach_01_ao_2k.png` | 2048 x 2048 | 8-bit/channel | 4.33 | Not referenced by current code; retained alternative/extra map |
| `terrain/sand/beach/aerial_beach_01_arm_2k.png` | 2048 x 2048 | 8-bit/channel | 5.83 | Main app / comparison mode |
| `terrain/sand/beach/aerial_beach_01_diff_2k.png` | 2048 x 2048 | 16-bit/channel | 22.42 | Main app / comparison mode |
| `terrain/sand/beach/aerial_beach_01_nor_gl_2k.png` | 2048 x 2048 | 8-bit/channel | 6.43 | Main app / comparison mode |
| `terrain/snow/aer1/snow_01_ao_2k.png` | 2048 x 2048 | 8-bit/channel | 3.06 | Not referenced by current code; retained alternative/extra map |
| `terrain/snow/aer1/snow_01_arm_2k.png` | 2048 x 2048 | 8-bit/channel | 4.88 | Not referenced by current code; retained alternative/extra map |
| `terrain/snow/aer1/snow_01_diff_2k.png` | 2048 x 2048 | 8-bit/channel | 5.37 | Not referenced by current code; retained alternative/extra map |
| `terrain/snow/aer1/snow_01_nor_gl_2k.png` | 2048 x 2048 | 8-bit/channel | 9.10 | Not referenced by current code; retained alternative/extra map |

## Exact duplicate files

Byte-identical images (SHA-256); no perceptual similarity is inferred.

- `terrain/rock/iron-mountains-png-1024/height-0.png`; `terrain/rock/iron-mountains-png-1024/height-3.png`
