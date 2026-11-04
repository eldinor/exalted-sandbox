# Corrected dense forest outline

User-supplied `карта с лесом.png`, received 2026-10-12, saved unchanged as
`forest-shape-2026-10-12.png` (1280x960). This is the requested placement reference,
not a replacement biome/heightmap or generated texture.

The authored terrain occupies pixels (47,35) to (1232,924). Map conversion:
Babylon X = 468 - (pixelX - 47) / 1185 * 936;
Babylon Z = -351 + (pixelY - 35) / 889 * 702.

`src/forest/DenseForestShape.ts` traces the western dense-canopy edge, including
the inward middle curve. A 4 m root inset accounts for canopy overhang. Palette,
road/water/slope rejection and the spawn clearing remain separate constraints.
The accessible mixed woodland fills the newly opened pocket. No image colours
or texture sampling are used to classify runtime trees from this reference.
