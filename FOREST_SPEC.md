# Forest: retained specification for replacement models

Status: the complete forest remains deferred, with user-authorized production
sections: the heightmap world's closed eastern strip now repeats the replacement
`Pine_big_1` and `Pine_small_1` models alongside spruce impostors. See [FOREST_NOTES.md](FOREST_NOTES.md) for its extent, density,
barrier and benchmark contract. The legacy `forest.html`, JavaScript forest
modules, preparation script, tests and original assets remain prototype references;
do not integrate those old models into the main world.

The separate `/forestland.html` lab now explores 12 user-supplied pine-pack
variants with authored LOD1/LOD2 on the current heightmap's forest biome. Its placement,
UI and benchmark are documented in [generator/forestland/README.md](generator/forestland/README.md).
The lab remains standalone. Its shared TypeScript pine loader and root grounding
now also serve the limited eastern-strip trial; the full forest contract below
remains the target for later integration.

## Scope and integration

The authorized main-app dense section follows the corrected 2026-10-12 concept
via `DenseForestShape.ts`, including the inward middle curve. Spruce impostors
fill the interior except the accessible 15 m band along that curve and a 33 m
radius around Cube Spawn (-383.5, 52). These real-tree areas mix Big 1 and
Small 1 LOD2 (deterministic 25% Small 1 selection). Small trees retain the
pack's size ratio and use their own root-support grounding. This preserves
deterministic X/Z, yaw and placement density,
the spawn clearing, exit corridor and independent barrier. Spruce cards use
17 baked ground/aerial/overhead views, shared materials, 32 m typed-buffer
batches, matching alpha-tested camera depth and no casting or wind. This is
the current border section; complete biome population remains deferred.

The user also authorized the accessible section westward through Forest Outlook.
It spans westward from the curved dense edge to X=-166 within the forest palette and the bounded
forest-floor correction around (-248,125). It uses Medium 1/2, Small 1/2 and
Sapling 1/2, deterministic 25/25/15/15/10/10% target shares, 8 m spacing and a
14 m Medium 2 reference height. An 18 m overlook clearing and southeast sightline
stay open. Per-model trunk-root grounding and size ratios are retained. Each
32 m chunk has separate thin-instance bindings per model, shared materials,
matching depth and startup warm-up. Trunk-only cylinders replace an area barrier
for this section. Shadow casting and wind stay disabled.

- Keep asset preparation, placement, chunking, LOD and collisions independent of
  the demo page so the renderer can be used by the main world.
- Use the Rev B map references for biome placement and naming, including The
  Thornwood. Preserve authored X/Z, rotation and scale; bake the complete GLB
  hierarchy and coordinate conversion before comparing with alpha-map.
- Batch repeated geometry/materials using thin instances in **32 m chunks**.
  Keep visibility bounds local to chunks, not the entire forest.
- Target two geometry LOD levels for the replacement vegetation. The old demo's
  additional distant cards are an optional experiment, not a required third LOD.
  Prefer authored replacement LODs with intact crowns and silhouettes.
- Give grass and bushes shorter visibility distances than trees. Make density
  selection deterministic, and avoid changing collision placement with LOD.
- Trunks use simple cylinders; bushes and grass normally have no collision.
- Root-anchored GPU wind should affect foliage, agree across shadow/depth passes,
  and expose strength, speed, direction and freeze controls.
- Integrate with the world's existing lighting, atmosphere, depth and post
  pipeline; avoid permanently maintaining another lighting implementation.

## Lessons from the prototype

- The old asset contains 20,984 plants in 411 occupied chunks: 3,457 trees,
  2,549 bushes and 14,978 grass placements. These counts are historical only.
- Shared Babylon geometry must not overwrite per-chunk instance matrix bindings.
  Preserve the independent-binding regression test, including a one-instance
  final chunk. Review buffer ownership before sharing GPU vertex buffers.
- Grounding found 3,174 bases differing by more than 20 cm; median delta was
  -0.13 m. Compare authored bases to the actual terrain, retain an authored-height
  diagnostic, and avoid treating every low branch as the trunk base.
- White/grayscale source foliage needed tinting. Current linear RGB reference:
  spruce (0.055, 0.16, 0.085), bushes (0.10, 0.23, 0.065), grass
  (0.11, 0.25, 0.072). Grass should be only slightly lighter than bushes.
  Inspect replacement materials before applying any tint.
- Thinning arbitrary triangles exposed trunk tops and damaged crowns. Preserve
  whole foliage cards and inspect silhouettes at every transition.
- Check card texture Y orientation. Keep shadow projections stable in world
  space by snapping to shadow texels; verify render-target sampling orientation.
  Camera movement must not drag shadows or make shadow silhouettes turn.
- Coincident terrain vertices with different biome colors produced pale seams
  and triangles. The prototype smooths display colors at coincident positions,
  preserving authored biome data used by gameplay.
- Measure draw calls per frame, never the lifetime cumulative engine counter.
  A reported 6.9 ms median / approximately 145 FPS is a historical sample, not
  an acceptance target without the same hardware, camera and resolution.

## Controls and validation when work resumes

Retain tree/bush/grass toggles, density, LOD distances, visibility distances,
nearby shadows and shadow range, render scale, wind controls, trunk collisions,
grounding toggle, free flight and reset view. Offer a ten-second measurement
export recording settings, camera, median/p95 frame time, per-frame draw calls,
visible batches/instances/triangles, shadow batches and update CPU time.

Inspect new GLBs for model identity, materials, UVs, alpha cutouts, transforms,
trunk bases and authored LODs. Replace the old preparation script's assumptions
about four model names with a manifest for the actual assets. Keep its source
provenance and reproducible preparation record.

Acceptance: no floating bases, exposed trunk tops, upside-down cards, camera-
dependent shadows or chunk matrix errors. Compare fixed views at fixed resolution
before and after optimizations. Preserve meaningful CPU regression tests and
perform a manual GPU visual/performance check. Do not use Playwright unless asked.

Implementation reference: [src/forest/README.md](src/forest/README.md).
