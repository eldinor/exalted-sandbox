# Meadow ground material

User-supplied Raw Catalog Material-326-A texture set. Original purchase/license
information is retained in README.txt; these files are not covered by the CC0
Leafy Grass notes in the parent directory.

The authored Grassland lab and production grass biome use these 4096 x 4096 files:

- Material-326-A_BaseColor.jpg: sRGB base color.
- Material-326-A_Normal.jpg: linear tangent-space normal, supplied orientation.
- Material-326-A_ORM.png: linear packed occlusion/roughness/metallic.

ORM was derived without resizing from the supplied grayscale maps, using
AmbientOcclusion.jpg in red, Roughness.jpg in green, and Metallic.jpg in blue.
Packing uses Pillow's Image.merge('RGB', [ao.convert('L'), roughness.convert('L'),
metallic.convert('L')]) followed by a lossless PNG save. The source maps remain
alongside the derived map.

All three maps use the same repeating world-space X/Z UVs, currently one repeat
per 4 metres, mipmaps and anisotropic filtering. Production uses the same
`(-world.x, world.z) / 4` mapping in its existing terrain shader, including
normal and ORM channels, without adding ground meshes or draw calls. The repeat
size originated as a lab choice;
the source set does not state a physical scan size. Normal Y is not inverted;
its supplied convention still requires visual confirmation in the lab.
