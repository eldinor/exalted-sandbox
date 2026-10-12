# Selected coniferous forest details

These are extracted from the user-supplied
`../coniferous_forest_assets_pack.glb`. Regenerate with:

```text
node scripts/extract-coniferous-details.mjs
```

| File | Source object | Triangles |
| --- | --- | ---: |
| `fallen-log.glb` | Coniferous Dead Log | 320 |
| `dead-tree-tall.glb` | Coniferous Dead Tree | 1,484 |
| `dead-tree-short.glb` | Coniferous Dead Tree 2 | 580 |
| `boulder-mossy.glb` | BoulderMossyLarge | 768 |
| `boulder-plain.glb` | BoulderPlainLarge | 768 |

**Keep the `textures/` folder alongside these GLBs.** Each file is independently
loadable, but references its colour/normal maps using relative PNG paths. Shared
maps avoid duplication across the three wood props. There are six original PNG
maps; pixels and compression bytes are unchanged.

The five geometry files total approximately 0.23 MB, with approximately 21.42 MB
of shared textures. The original source pack is 36.55 MB. No living trees,
shrubs, saplings or rock outcrops are included in this first detail selection.

Only the selected object's display translation is zeroed. Axis conversion,
rotations, scale, authored ground plane, below-ground vertices, normals, tangents,
UVs, indices and material settings are preserved. In particular, the boulders
retain their 1.875 authored scale and the log retains its rotation. The loader
must bake imported hierarchy transforms once; do not apply chart-to-world
conversion to these model geometries. Root grounding remains a placement concern.

Materials retain `KHR_materials_pbrSpecularGlossiness`, including the required
extension declaration. No LOD, collision or wind data is added. These assets
are saved for later use; the main app and Forestland placement are unchanged.

## Source and attribution

The original file's embedded metadata credits:

- Creator: **Dari**, https://sketchfab.com/dariiiii
- Source: https://sketchfab.com/3d-models/coniferous-forest-assets-pack-240ce9cf0ad3474f809a59f9446e63cd
- Licence: **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/

Extraction, repacking and display-translation removal are the modifications.
`manifest.json` and each GLB's `asset.extras` retain source attribution and the
source SHA-256. The original GLB is unchanged; no external download was used.
