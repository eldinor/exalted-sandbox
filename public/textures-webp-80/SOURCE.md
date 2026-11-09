# Main-app PNG surface textures as WebP

Prepared 9 November 2026 with `npm run assets:textures:webp`.
Requires Python/Pillow with WebP support. All original assets remain read-only.
Original attribution/license terms in THIRD_PARTY_NOTICES.md and source folders
remain applicable to these derivatives; this conversion adds no new license.

The selected 26 standalone PNG textures are converted at quality 80, method 6,
with original dimensions and lossless alpha. Payload: 163.88 to 11.89 MiB.
Seven derivative runtime GLBs convert their 21 embedded PNG images using the
same settings and `EXT_texture_webp`; existing JPEG images remain byte-identical.
GLB geometry, transforms, material settings, UVs, animation and LODs are unchanged.
Combined GLB files fall from 62.44 to 38.12 MiB, excluding external images.
External boulder PNGs use adjacent derivative WebPs through relative GLB URLs.

Heightmaps, biome/road/coverage masks and the five grayscale rock displacement
images remain PNG. JPG surface maps remain unchanged. Unused source textures,
old revisions and the reverted snow_01 set are not converted.

No image resizing or colour/normal rebaking is performed. The special spruce
atlases retain their original premultiplied representation and layout. Their
alpha is unchanged; shader unpremultiplication stays unchanged. Quality 80 is
lossy for RGB, including normal and ARM channels, so fine detail/material values
may differ. No claim of identical appearance or improved FPS is made.

The main HTML opts into this profile; shared standalone labs retain originals.
Production packaging includes the selected WebPs/derivative models instead of
replaced originals. `textures.json` records source/output SHA-256 hashes,
dimensions, alpha checks, conversion settings and embedded image counts.
