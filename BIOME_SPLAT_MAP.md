# RGBA Biome Splat Map

## Purpose

The splat map supplies explicit material weights for the authored terrain. It
replaces RGB colour recognition and keeps smooth biome borders independent of
terrain polygon density.

## Minimum delivery

Deliver one 4096 x 4096 lossless RGBA PNG covering exactly the same world-space
rectangle and orientation as the current `vertex_color_4k copy.png` map.

Use linear, non-colour data with these channels:

- **R:** desert or sand
- **G:** grass and forest ground
- **B:** rock or snow
- **A:** road or path

Each pixel contains blend weights from 0 to 255. Paint soft grayscale borders;
do not use antialiased biome display colours. The engine will normalize the
channels when their sum differs from one.

For a road crossing desert, fade the road alpha from 255 in its centre to 0 at
its edge while the red desert channel rises from 0 to 255. Use a transition
roughly 1-3 metres wide at world scale. Keep the road centre fully opaque so its
material remains clear.

## Cinema 4D authoring workflow

### 1. Prepare the terrain projection

1. Work on a copy of the production terrain at its original scale and position.
   Do not optimize, subdivide, rotate or rescale this copy while creating the
   mask.
2. Confirm that the terrain footprint and north direction agree with
   `alpha-map.glb` and `vertex_color_4k copy.png`.
3. Create or verify a top-down planar UV projection covering the complete
   terrain rectangle exactly once. The islands must not be packed or rearranged:
   the bottom-left and top-right UV corners must continue to represent the same
   world corners used by the current 4K map.
4. Generate a UVW tag with **Set UVW from Projection** if the projection is not
   already fixed. Keep this UVW tag unchanged for every channel.
5. Load `vertex_color_4k copy.png` temporarily as a reference texture and check
   recognizable features such as the desert, roads, lake and mountains. Correct
   mirroring or rotation before painting any masks.

Cinema 4D's baker requires a UVW tag when baking to an image. Its Bake Material
tag can preserve existing UVs, which is required here; automatic UV packing
must remain disabled for this world-space control map.

### 2. Create editable source masks

Keep four independent grayscale source masks:

- `mask_desert` for the red channel;
- `mask_grass_forest` for the green channel;
- `mask_rock_snow` for the blue channel;
- `mask_road` for the alpha channel.

White means that material is fully present, black means absent, and gray is a
blend. Never paint the final visible terrain colors into these masks.

Use either of the following Cinema 4D methods.

#### Method A: BodyPaint texture painting

This is the most direct method for artistic correction.

1. Switch to the **BodyPaint 3D Paint** layout.
2. Create a 4096 x 4096 texture for each grayscale mask. Use 16-bit while
   authoring if available, then export the packed runtime PNG at 8 bits per
   channel.
3. Paint in the 3D view when following terrain features and use Texture/UV view
   for large fills and precise road widths. BodyPaint paints only the active
   channel or texture, indicated by its pencil icon.
4. Keep major regions on named layers. Suggested layers are `Base`, `Border`,
   `Road`, `Corrections` and `Breakup`. BodyPaint layers allow each part to be
   adjusted without repainting the complete map.
5. Fill the central part of each biome with white. Paint neighboring biome masks
   so their gray ramps overlap across the border.
6. Paint roads in `mask_road`: white through the usable road centre, then fade to
   black across each shoulder. At the same location, raise the underlying biome
   mask toward white as the road mask fades.
7. Save the layered BodyPaint or PSD source in addition to the final PNG.

#### Method B: Vertex Maps and Fields, then bake

This is useful when the artist wants procedural, spline-driven regions before
manual cleanup. The vertex maps are authoring controls only; the final 4K image
provides the runtime resolution.

1. Add one Vertex Map tag for every source mask.
2. Use Fields to construct each map. For example, use a Spline Field around a
   road, Linear or Box Fields for large biome regions, and Noise Fields only for
   restrained edge breakup.
3. Set the field remapping or spline falloff to create a smooth transition. Do
   not rely on dense terrain polygons for the final quality.
4. Display each Vertex Map through a material channel so it can be checked on
   the terrain.
5. Select the terrain and use **Objects > Bake Material**. In the Bake Material
   tag, use the existing UVs, set the image to 4096 x 4096 and bake the relevant
   grayscale channel. Do not enable automatic UV packing.
6. Repeat for all four masks, then perform final border and road corrections in
   BodyPaint or an image editor.

Cinema 4D's Bake Material workflow can merge material channels and alpha into
images, but it does not support Node Materials directly. If the source setup is
a Node Material, route the required mask through a bake-compatible standard
material or export the individual masks directly.

### 3. Paint useful transitions

At 4096 pixels over the approximately 1.8 x 1.4 km world, one pixel represents
roughly 0.44 m horizontally and 0.34 m vertically. A 1-3 metre transition is
therefore approximately 3-9 pixels. Use this as a starting point and judge the
result from avatar height.

- Keep biome interiors close to full weight.
- Use smooth, overlapping ramps instead of leaving black gaps.
- Avoid a perfectly constant-width blurred outline. Add gentle variations,
  small intrusions and isolated patches appropriate to the terrain.
- Keep breakup larger than a few pixels. Single-pixel noise will shimmer at a
  distance and will not create a natural border.
- Preserve the road's designed width. Texture softness should affect its
  shoulder, not erase its central walking surface.
- Use terrain features as causes: sand can collect in depressions, grass can
  reach farther on moist flat ground, and rock can enter steep exposed slopes.

### 4. Normalize and pack RGBA

Before packing, inspect the four grayscale masks at the same pixel coordinates.
For ordinary biome transitions, the relevant material weights should add to
approximately 100%. The engine will normalize imperfect sums, but well-balanced
source masks are easier to predict and revise.

Pack the masks as follows:

1. Copy `mask_desert` into **R**.
2. Copy `mask_grass_forest` into **G**.
3. Copy `mask_rock_snow` into **B**.
4. Copy `mask_road` into **A**.
5. Export a 4096 x 4096 RGBA PNG, 8 bits per channel, with no premultiplied
   alpha and no JPEG compression.
6. Treat the image as linear, non-color data. Do not apply an sRGB display look,
   exposure, contrast grade or gamma correction to the channel values.

If Cinema 4D cannot reliably pack the independent grayscale textures into RGBA,
pack them in Photoshop, Affinity Photo, Krita or another channel-aware image
editor. Do not flatten them as visible colored layers; copy each grayscale
image into the corresponding image channel.

### 5. Deliver the files

Deliver:

```text
biome_splat_rgba.png
biome_splat_source.c4d
biome_splat_source.psd   (or layered BodyPaint source)
README.md
```

The README must state the terrain version, world bounds, map orientation,
channel meanings, source and exported bit depths, and any deliberately unused
areas. If the project later needs separate grass and forest materials, or
separate rock and snow control, add a second splat map instead of overloading a
channel with ambiguous display colors.

The tiled albedo, normal, roughness and AO textures remain embedded in their
biome GLBs. The splat map controls where the unified Babylon terrain shader
blends those material sets; it is not itself a visible colour texture.

## Validation

- Confirm orientation against the desert, roads, lake and mountain landmarks.
- Inspect borders at avatar height and from the overview camera.
- Ensure roads retain their intended width after the soft edge is applied.
- Check that no channel seams, black gaps, or gamma-shifted values appear.
- Preserve the layered source masks so individual channels can be revised.
