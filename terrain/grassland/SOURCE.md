# Leafy Grass

- Source: https://polyhaven.com/a/leafy_grass
- Author: Charlotte Baglioni
- License: CC0 1.0 Universal
- Physical scan width: 2 m
- Downloaded maps: 2K JPG diffuse, OpenGL normal, and ARM

The generated-world shader samples this material from shared desert/grassland
atlases so adding the biome does not increase its texture-binding count.

The earlier Sparse Grass candidate is retained in this directory for comparison,
but it read primarily as brown soil at world scale and is not active.

## Imported grass models

`grass_medium_01_1k.glb` is the existing repository-supplied Grassland model
package, with eleven regular variants at LOD1/LOD2. Production now reuses
Tall A, Tiny D, Small A and Small B from that same package. No new external
asset was downloaded or substituted; the Leafy Grass attribution above refers
to the ground texture maps, independently of this model package.
