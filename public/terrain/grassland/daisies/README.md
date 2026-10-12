# Selected meadow daisies

Source: `public/assets/exalted/daisy_models_pack_realistic_optimized.glb`.
Author: [LOLIPOP](https://sketchfab.com/lolipop_1707).
License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Original: [Daisy models pack (realistic, optimized)](https://sketchfab.com/3d-models/daisy-models-pack-realistic-optimized-0748471f99f2416a8b66b522c293720f).
Retain attribution when distributing the derived asset.

`daisies.glb` is 402,964 bytes, containing Daisy_1/2/3 LOD1 at 139/190/196
triangles. All share Daisy_main_mat and the original albedo/alpha, ORM and
normal images. Original geometry, UVs and normals are retained. Complete
ancestor rotations/scales are preserved; group and LOD display translations
are cleared. The source alpha-cutout threshold 0.085972244 is retained to keep
thin white petals. The higher LOD0 meshes, billboard LOD2 textures/materials
and large multi-plant patches are excluded. Real LOD1 geometry retains flowers
when viewed from above and avoids additional billboard atlases.

Reproduce with `node scripts/prepare-daisies.mjs`. The manifest records source
SHA256, provenance, geometry counts and natural heights (0.53-0.59 m).
The runtime loader bakes the full hierarchy and normalizes the root and height.

Production uses 40/30/30% mix, nominal height .42 m (random range .27-.57 m),
density .04, and seed 9001 independent of dandelions. This adds roughly half
the dandelion placement budget rather than another full-density layer.
All flower families use the Meadow flowers benchmark toggle. Daisies share
pooled 16 m streaming, 35-50 m fade, root-anchored wind/walk/surf bending,
matching colour/depth alpha cutout, ground/water/road/slope exclusions and no
shadow casting or collisions. Where species overlap, local grass thinning
uses the maximum colony weight, keeping its reduction capped at 35%.

Native WebGPU checks loaded/warmed the production layer, found 25 visible daisy
plants at The Long Green, and confirmed that the shared flower toggle removed
all daisy instances and depth registrations. An isolated native preview checked
the white petals and varied stem silhouettes. No GPU performance claim is made.
