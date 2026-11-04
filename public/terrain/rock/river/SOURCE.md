# Current rock biome material

User-supplied `river_small_rocks` texture set. Creator, source URL and licence
were not provided; none is inferred. Original files remain unchanged.

- `river_small_rocks_diff_2k.png`: sRGB colour.
- `river_small_rocks_nor_gl_2k.png`: linear OpenGL tangent-space normal.
- `river_small_rocks_arm_2k.png`: linear R=AO, G=roughness, B=metallic.

This is the active heightmap rock material, replacing the tested `rock/03` set.
Coverage remains `biome-rock-9.png`, including the corrected northern corridor.
The nominal density is one texture repeat per 4 m, but the shader blends three
independently offset/quarter-rotated samples on a 6 m triangular lattice rather
than exposing a regular repeat. Sharpened barycentric weights preserve detail;
normal XY is counter-rotated into a common frame before blending. The same
transforms and explicit gradients are used by colour, normal and ARM. A subtle
world-space value variation breaks long-range uniformity. Camera movement does
not move the pattern, and mipmapping/anisotropic filtering remain active.

The shader uses nine texture reads per rock pixel instead of three, with no
extra bindings, meshes or draws. Both ground and Ctrl+P views were inspected in
native WebGPU without a visible repeating grid or GPU validation errors.
Typecheck and all 135 Node tests passed; no build or Playwright was run.
