# Iron Mountains texture arrays

User supplied `../rocky_terrain_2k/` and `../rocky_terrain_03_2k/`, each specified
as 90 m wide. Their glTF files identify a Blender export, but no creator,
source URL or license grant is embedded/provided. Licensing confirmation remains
deferred in THIRD_PARTY_NOTICES.md; no license is inferred from asset filenames.

`textures.json` records all source hashes and packed output hashes. Base, OpenGL
normal and ARM are packed with existing `../river/` as layer 0 and the two new
sets as layers 1/2. ARM alpha contains normalized displacement for the new sets;
river alpha is 255. Source PNG16 textures become RGBA8 without resizing. Original
source files are unchanged. Packed streams use horizontal pixel-byte differences
followed by gzip, decoded during loading into mipmapped 2D texture arrays.

Reproduce: `node scripts/prepare-iron-textures.mjs`.
See root IRON_MOUNTAINS.md for appearance, limits, memory and benchmark notes.
