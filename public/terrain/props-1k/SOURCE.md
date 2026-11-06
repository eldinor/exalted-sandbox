# 1K prop texture comparison derivatives

Prepared 6 November 2026 using `npm run assets:props:1k` (Python/Pillow 12+).
These are derivatives of existing repository runtime assets, not new assets or
new licenses. Original provenance and terms remain applicable: see
THIRD_PARTY_NOTICES.md and source notes beside the original packs.

- `desert.glb`: `assets/exalted/exalted_desert.glb`, including DesertGround.
- `pines.glb`: `terrain/forest/pine-pack-forestland.glb`.
- `boulder.glb`: `terrain/forest/coniferous-selected/boulder-plain.glb`, with
  its external `textures/plain-rock-color.png` and `plain-rock-normal.png`.
- Impostor maps/metadata: `terrain/forest/blue-spruce/` baked spruce atlas.

Cap images at 1024 on the longest axis, retaining aspect ratio. Smaller images
remain unchanged; fir, grass and flower packs already fit and are reused as-is.
Colour filters in linear light with premultiplied alpha, then returns to sRGB.
Normals filter linearly and renormalise. Packed data filters linearly. Masked
foliage alpha coverage is adjusted at its material cutoff, without changing
runtime cutoffs. Fine foliage quality remains subject to manual comparison. The baked spruce
atlases are an exception: their encoded RGB is already premultiplied by alpha.
All four stored channels filter directly, without gamma conversion, normal
renormalisation or alpha coverage adjustment; the shader unpremultiplies after
sampling. Treating these as straight-alpha maps caused a bright cyan shift.

GLB hierarchy, material settings, accessors and all non-image buffer-view bytes
are preserved. Superseded images are removed when repacking; sources are never
written. The boulder derivative embeds its external maps. Spruce layout remains
8 x 3, now 128 pixels per tile (1024 x 384 atlas), with matching UV inset metadata.
Source/output SHA-256 hashes and dimensions are in `textures.json`.

Selected assets total 34.71 MiB versus 55.21 MiB for the original GLBs/atlas PNGs
(the originals additionally load external boulder maps). This is download size,
not a measured frame-rate or GPU-memory improvement. The page also uses the
existing twelve standalone 1K ground maps. Main and ground-only pages retain
original props. Packaging all three profiles increases total deployment size.
