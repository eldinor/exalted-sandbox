# Rock biome ground

User-supplied `rock_face_03` texture set. Creator, source URL and licence were
not provided; none is inferred. Files remain unchanged.

- `rock_face_03_diff_2k.png`: sRGB colour.
- `rock_face_03_nor_gl_2k.png`: linear OpenGL tangent-space normal.
- `rock_face_03_arm_2k.png`: linear R=AO, G=roughness, B=metallic.

These maps were tested in the main heightmap world at a 4 m repeat with continuous
world-space UVs `(-world.x, world.z) / 4`, under saved rock coverage
`public/assets/textures/biome-rock-9.png`. Snow/water remain protected and roads
overlay the land. The forest overlook retains its forest floor. Terrain owns
the textures, waits for readiness before shader warm-up and disposes them.
GLB comparison and procedural modes retain their previous materials.

The active rock material now uses the `river_small_rocks` set from `../river/`
with stochastic sampling to remove the visible regular repeat. The `rock/03`
files remain as source/reference assets and are not loaded at runtime. See
[current material notes](../river/SOURCE.md).

Regenerate land and rock coverage together with
`node --import tsx scripts/prepare-ground-coverage.mts`. This also corrects the
sandy-painted northern road corridor to rock and removes sand softness there.
See [BIOMES_MAPS.md](../../../../BIOMES_MAPS.md) for the mask contract and provenance.
