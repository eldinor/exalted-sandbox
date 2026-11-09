# Authored roads maps

These existing user-supplied PNGs were selected for `hm.html` and approved there,
then integrated into the main app on 2026-10-03. The corrected heightmap replaces the previous roads heightmap; both runtime files are used unchanged.
The repository does not contain an independent authoring/export provenance or
license declaration for them; no third-party source is inferred.

| Asset | Format | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| `vis_ground_heightmap-11.png` | Grayscale, 16-bit, non-interlaced | 4096 × 4096 | `28F852D2BCA23E80D0FC7CBF49141A50C06634B463C7683D3EB2A9466B301ADE` |
| `vertex_color_4k-9.png` | RGB, 8-bit, non-interlaced | 4096 × 4096 | `CBD6E7EB6ADDAF5DCF5960D84A82A4C92F4B9CA9F826F0A7FBA3B6F6F336FA39` |

Production footprint: 936 × 702 m, centred at the origin. PNG left-to-right maps
to decreasing Babylon X; PNG top-to-bottom maps to increasing Babylon Z.
Heights decode directly to -3.910183906555176 to 249.41160583496094 m; no display
gamma is applied to height data. The 400-by-400 runtime grid samples this source,
and grounding follows its triangle planes. See the root
[HEIGHTMAP_INTEGRATION.md](../../../HEIGHTMAP_INTEGRATION.md) for mask semantics,
prop-height transfer and validation limits.
