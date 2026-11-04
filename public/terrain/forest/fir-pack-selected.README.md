# Selected realistic firs

User-supplied source: `public/assets/exalted/realistic_fir_trees_pack_lods_gameready.glb`.
Embedded attribution: [LOLIPOP](https://sketchfab.com/lolipop_1707),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
[original model](https://sketchfab.com/3d-models/realistic-fir-trees-pack-lods-gameready-f58e8b6d733e4b0586e5b7db847b89e7).

Reproduce with `node scripts/prepare-fir-pack.mjs`. The original GLB is unchanged.
The derived GLB preserves attribution and records the source SHA256. It contains
Large 2, Medium 1/2 and Small 1/2, each with LOD1/LOD2 (20 bark/foliage meshes),
two shared materials and six original embedded textures. No LOD0 or billboard
textures/geometry are included. Source vertex attributes and triangle counts
are retained; accessors are repacked without simplifying geometry.

Tree/LOD nodes are renamed `Fir_large_2`, `Fir_medium_1`, etc., with `_LOD1/2`
suffixes on the LOD parents. Only their display-layout translations are cleared.
Complete ancestor rotations/scales remain, including the cancelling 0.01/100
unit factors. `PinePack.ts`'s shared loader bakes the full hierarchy, centres the
trunk and gathers root support for actual terrain grounding. `FirPack.ts` supplies
the manifest, source path and Medium 1 reference. Do not apply another manual
coordinate conversion after loading.

`Brunches_Mat` changes BLEND to MASK at 0.35, retaining double-sided foliage and
the original image bytes. Production colour/depth use the same cutoff. Tree
shadow casting remains disabled. Materials receive existing production lighting,
fog and post-processing; foliage is tinted by linear (0.45,0.55,0.55) to blend
with the darker forest, while bark keeps its colour. This tint is runtime-only.

The accessible woodland uses LOD2 everywhere, with 4% Large 2 (20 m nominal),
24/24% Medium 1/2 (Medium 1 reference 14 m), 14/14% Small 1/2 preserving fir
proportions, and 10/10% retained pine saplings at their previous scale. All sizes
vary by +/-15%. Eight-metre spacing, viewpoint/access exclusions and the dense
spruce-impostor border remain unchanged. LOD1 is retained for future evaluation;
source LOD3 cards remain a deferred option, not another production pass.


The 2026-10-12 collider fringe also derives a 592-triangle bush at runtime by
merging two cloned Small 2 LOD2 shoots at low/wide scales and different yaw.
It shares these textures/materials and source attribution, preserving source
geometry. It is a sapling-cluster shrub approximation, not another imported
model. Small 1/2 fringe trees and low bushes use separate height ranges;
see `src/forest/ForestFringe.ts` and FOREST_NOTES.md.


Real Large 2 accents are additionally subject to deterministic 50% big-tree
thinning, without redistribution to other models. Current Large 2 count is 12,
down from 23; other fir/pine models and spruce cards are untouched.
