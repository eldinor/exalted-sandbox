# Stone Gate left-side rock-snow texture

User supplied snow_03_diff_2k.png, snow_03_nor_gl_2k.png, snow_03_arm_2k.png and
snow_03_disp_2k.png and selected them for the left cliff and left Stone Gate
approach. Creator/source/licence/physical width were not supplied. Licensing
confirmation remains deferred; no licence is inferred from the filenames.

Colour (sRGB encoded), OpenGL normal and ARM (linear AO/roughness/metallic)
occupy shared rock-array layer 4. The displacement is grayscale-alpha 16-bit;
its grayscale channel is normalized into ARM alpha for material accumulation.
It is not physical terrain displacement. Source PNGs are unchanged. Runtime
packing uses RGBA8, horizontal byte prediction and gzip, with hashes in
../iron-mountains/textures.json. Reproduce with:
`node scripts/prepare-iron-textures.mjs`.

Triplanar projection uses a trial 8 m repeat. The editable soft left-pass region
leaves other cliff textures/biomes and the final road overlay intact. Current
snow gameplay remains unchanged. See root SNOW_MOUNTAINS.md for the concurrent
triangle-diagonal correction, resource cost and validation limits.
