# Road asphalt material

User-supplied `asphalt_snow` set. Creator, source URL and licence were not
provided; none is inferred. Original files remain unchanged.

- `asphalt_snow_diff_2k.jpg`: sRGB colour.
- `asphalt_snow_nor_gl_2k.jpg`: linear OpenGL tangent-space normal.
- `asphalt_snow_arm_2k.jpg`: linear R=AO, G=roughness, B=metallic.

The main road material uses these maps with the existing 6 m world-space
repeat and 0.72 normal strength, replacing the grass-path texture set. Linear
output, road coverage/feathering, terrain geometry and firmness remain unchanged.
Terrain owns all three textures and waits for readiness before material warm-up.
The previous grass-path files remain available as references.
