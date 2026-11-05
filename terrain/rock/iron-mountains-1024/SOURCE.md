# 1024-square rock-array trial

Derived from the five-layer 2048-square package in `../iron-mountains/` using
`node --import tsx scripts/prepare-rock-arrays-1024.mts`. Original PNGs, original
packed arrays and their metadata are preserved. See the original package's
SOURCE.md and THIRD_PARTY_NOTICES.md for source attribution and terms.

Each RGBA channel is reduced with the existing 2x2 box filter used for runtime
mipmaps. The result matches the original arrays' first mip level, preserving
layer order, texture scale, normal channels and ARM-alpha height data. This
reduces resolution and close-range detail; it changes no terrain geometry.

`textures.json` records source/output SHA-256 hashes and dimensions. These arrays
are now preparation sources for `../iron-mountains-png-1024/`; production uses
ordinary PNG image delivery rather than these compressed binary files.
