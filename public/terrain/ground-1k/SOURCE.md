# 1K tiled ground comparison

Derived read-only from the standalone meadow, forest floor, beach and road maps
listed in textures.json. See each original folder's SOURCE.md/README and the
project THIRD_PARTY_NOTICES.md for attribution and terms. Original assets remain
unchanged, including their checksums recorded in this package's metadata.

Regenerate with `npm run assets:ground:1k` (Python with Pillow 12+ required).
All outputs are 1024-square RGB8 PNG. Colour is reduced in linear light and
encoded back to sRGB; normal vectors are box-filtered and renormalised; packed
material channels are box-filtered as linear data. No ICC/gamma/EXIF tags are
copied. Physical tiling scales, shader settings and texture colour-space flags
are unchanged.

`index-1k.html` selects these files through its data-ground-textures attribute
and otherwise shares the main app entry point. The original index.html uses the
original files. The main production/Pages builds include both pages for comparison.

Mountain arrays are already 1K. Procedural snow/detail textures, heightmaps,
biome masks, shore/road masks, props and GLB textures are not modified.
Next pass: embedded GLB textures, including DesertGround in exalted_desert.glb,
and tree/flower cutouts. That pass requires independent visual validation.
