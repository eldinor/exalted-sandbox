# Biome roads blending preview

- Output: `biome-roads-blended-preview-v1.png`.
- Source: `public/assets/textures/vertex_color_4k-9.png`, authored project biome map.
- Method: built-in image generation tool, editing the existing map.
- Intended change: softer pale-cream road edges into the neighbouring biome colours.
- Source resolution: 4096 × 4096. Generated preview: 1254 × 1254.
- Status: authoring preview only; not connected to the main app or hm.html.

The generated version visibly softens road edges and retains the overall map
layout, but introduces gradients into biome interiors. Pixel-exact boundaries
and palette preservation are not guaranteed. Do not substitute this directly
for the runtime biome map: CPU and GPU classifiers depend on the authored
colour palette and coordinate alignment. A production version needs full-size,
aligned numeric masks as described in `BIOMES_MAPS.md`, or deterministic
road-only processing of the original map that preserves non-road pixel data.

## Final generation prompt

Use case: precise-object-edit. Asset type: Exalted top-down biome/road colour map, flat technical raster data, square full-bleed. Edit the supplied existing map: improve ONLY the pale cream roads' edge blending into the immediately adjacent biome. Preserve the exact road network, centre lines, junctions, endpoints and nominal widths, original orientation and framing, and all non-road region silhouettes including lake, island, river, snow, forest, grass, rocky areas and desert. Retain flat original solid palette colours throughout region interiors, and the pale cream road core RGB 246,232,208. Along road edges create narrow, smooth gradual colour transitions from the cream road into each adjacent local biome colour, approximately 2 metres of feathering on a 936x702 metre world. Make transition edges slightly organic rather than uniformly blurred; keep a legible continuous road core and smooth junctions. This is a biome blend control image, NOT an illustrated landscape: no realistic surface texture, noise, shadows, highlights, contours, labels, buildings, props, or extra roads. Do not soften water boundaries or change other biome borders. Preserve source dimensions 4096x4096 if supported. Opaque RGB PNG style.
