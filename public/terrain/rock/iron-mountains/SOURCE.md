# Iron Mountains texture arrays

User supplied `../rocky_terrain_2k/` and `../rocky_terrain_03_2k/`, each specified
as 90 m wide. Their glTF files identify a Blender export, but no creator,
source URL or license grant is embedded/provided. Licensing confirmation remains
deferred in THIRD_PARTY_NOTICES.md; no license is inferred from asset filenames.

`textures.json` records all source hashes and packed output hashes. Base, OpenGL
normal and ARM are packed with existing `../river/` as layer 0 and the two new
sets as layers 1/2; `../03/rock_face_03` is layer 3 for Snow Mountains. ARM alpha contains normalized displacement for the new sets;
river and Snow Mountains alpha are 255. Rock Face 03 has no displacement map;
its AO is used as an approximate snow/rock crevice proxy in the material. Source PNG16 textures become RGBA8 without resizing. Original
source files are unchanged. Packed streams use horizontal pixel-byte differences
followed by gzip, decoded during loading into mipmapped 2D texture arrays.

Reproduce: `node scripts/prepare-iron-textures.mjs`.
See root IRON_MOUNTAINS.md for appearance, limits, memory and benchmark notes.


Layer 4 now holds ../snow/snow_03 colour, normal and ARM maps for the Stone Gate
left cliff/approach. Its supplied displacement PNG is grayscale-alpha 16-bit;
the grayscale data is normalized into ARM alpha for material blending, with
source alpha ignored. Creator/source/licence remain unverified. Source hashes
are recorded in textures.json; source files are unchanged. Five array layers
share the existing three texture bindings.
