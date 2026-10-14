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

The general rock material uses the `river_small_rocks` set from `../river/`.
Snow Mountains exposed cliffs use Rock Face 03 packed into shared array layer 3
at a trial 8 m triplanar repeat. The tested snow/aer1/snow_01 cliff replacement
was reverted at the user's latest instruction. Other rock regions retain their
existing materials, and the Palecrown snow reserve stays fully snowy.
No displacement map is supplied; Snow Mountains uses ARM AO as an approximate
crevice proxy, not physical height. Source physical width remains unknown.

Regenerate coverage with `node --import tsx scripts/prepare-ground-coverage.mts`
and arrays with `node scripts/prepare-iron-textures.mjs`.
See root SNOW_MOUNTAINS.md and BIOMES_MAPS.md for the current contracts.
