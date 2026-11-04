# Desert beach-sand ground

User-supplied `aerial_beach_01` maps. Original creator, source URL and licence
were not provided; no licence or external source is inferred. Files are unchanged.

- `aerial_beach_01_diff_2k.png`: sRGB base colour.
- `aerial_beach_01_nor_gl_2k.png`: linear OpenGL tangent-space normal.
- `aerial_beach_01_arm_2k.png`: linear R=ambient occlusion, G=roughness, B=metallic.
- `aerial_beach_01_ao_2k.png`: separate AO reference, redundant with ARM R.

The experiment used colour, normal and ARM on the authored desert biome at a 4 m
repeat, with UVs `(-world.x, world.z) / 4`. Normal detail is blended over the
terrain/deformation normal, with reduced strength on compressed footprints.
Terrain owned the textures, loaded them before shader warm-up and disposed them.
Shared desert appearance bindings gave surf sides and dust this colour source.

Tested on 2026-10-08: typecheck and all 131 Node tests passed; a native WebGPU
screenshot at Desert Start confirmed all three maps rendered without GPU
validation errors. No build or Playwright was run. The user then requested a
revert to the previous `exalted_desert.glb` floor texture set. These supplied
files remain available; the desert revert remains in effect. Improved biome
blending was retained. See [DESERT_PROPS.md](../../../../DESERT_PROPS.md).


## Active beach biome use

The user subsequently designated the light-blue lake/river shore as Beach. The
main heightmap app now uses the diffuse, OpenGL normal and ARM maps here for that
separate biome. The AO-only map remains redundant with ARM R. The original desert
floor set stays active on desert ground.

Authored texture width is **30 m**, per the user, with UV `(-world.x,world.z)/30`.
Three world-anchored offset/quarter-rotated samples blend over 45 m triangular
cells to suppress tiling. Normal XY and gradients follow the same transforms as
colour/ARM. These files are **2048 by 2048**, giving about **0.68 px/cm** at 30 m;
the stated original 2.7 px/cm would require approximately 8K maps. Existing images
are preserved, with no upscaling. See [BIOMES_MAPS.md](../../../../BIOMES_MAPS.md)
for coverage, water eligibility, warm-up and validation details.
