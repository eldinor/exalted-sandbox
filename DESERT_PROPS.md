# Desert prop chunks

Production keeps the authored `exalted_desert.glb` placements, shared stable
25% density selection, heightmap ground offsets, model scales, materials, wind
and two existing LODs. Collision cylinders are still extracted from full-detail
geometry before visibility selection and remain available when visuals are culled.
This applies to heightmap and GLB comparison modes; procedural mode has no desert
prop subsystem.

## Desert ground material

The active material again borrows the `exalted_desert.glb` Ground material's
colour, normal, roughness, tint and original world-space UV projection. Its
floor mesh remains excluded from rendering. Surf sides and dust share that
colour through `desertAppearance.ts`. The newer grass/forest/desert coverage
map and improved boundary blending remain active.

### Beach sand experiment — tested, reverted on 2026-10-08

The supplied `aerial_beach_01` colour, OpenGL normal and ARM maps from
`public/terrain/sand/beach/` were tested on desert ground at a 4 m repeat.
ARM supplied AO/roughness/metallic; the separate AO map was redundant. Colour
was decoded from sRGB, normal/ARM remained linear, and normals softened over
compressed footprints. Surf sides/dust shared the beach colour. All maps were
ready before shader warm-up and Terrain owned their disposal. The experiment
added no draws, but used one extra texture binding (21 in heightmap mode).

Typecheck and all 131 Node tests passed. A native WebGPU screenshot at Desert
Start confirmed beach colour/normal/ARM loaded and rendered, without GPU
validation errors. No build or Playwright was run. The user requested restoring
the previous desert texture after testing; no reason beyond that preference is
inferred. Runtime beach loading was removed, while supplied assets and
[source notes](public/terrain/sand/beach/SOURCE.md) are retained for future use.

## Streaming and rendering

`propChunks.ts` partitions each geometry/material group's world-space centres
into deterministic 64 m cells. Chunk distance rejection narrows nearby membership;
the existing 3 m focus movement threshold rebuilds the selection. LOD selection
is unchanged: near models within 16 m, or 30 m for large props, with existing
material visibility distances and 6 m selection slack.

Each camera and shadow cascade gets its own merged near/far instance buffers.
This avoids one draw per chunk in a sparse authored world. Full-detail bounding
spheres include transformed scale, a small rounding margin and conservative wind
padding. Each pass independently rejects individual instances outside its frustum.
Camera culling does not remove off-camera props that can cast visible shadows.
Shadow-only meshes have camera layer mask zero and register in their own cascade.

Model GPU vertex/index buffers and materials are shared. Each pass has a separate
geometry binding object: Babylon stores thin-instance attributes on Geometry,
so sharing that object would let passes overwrite one another's matrices. Vertex
wrappers do not own the prototype buffers; index-buffer references are balanced
on disposal. Matrix and placement-ID buffers have fixed
capacity and are reused; camera turns update culling every frame, but matrices
upload only when membership changes. No model loading, new geometry, new shader
variants, or buffer resizing occurs while moving or teleporting. Original material
variants warm behind the loading screen. Disposal removes all depth/shadow
registrations before releasing mesh references and owned materials.

## Diagnostics

`EXALTED.desertProps.chunks.stats` reports chunk size, total/active group chunks,
reusable pass slots and registered depth/shadow mesh counts. The nearby
`visibleInstances` and `triangles` statistics retain their existing meaning;
they include all distance-selected props before pass culling. Use
`EXALTED.captureDraws(60)` for submitted geometry.
Inspector's Total Vertices includes each pass's geometry binding object even
though model GPU buffers are shared; it is not a unique GPU-memory count.

`?propChunks=off` retains original global batching for comparisons. Optional
sizes 32, 64, 96, 128 and 192 are supported through `?propChunks=128`, for example.
Chunk size affects CPU membership rejection, not draw batching. Normal play uses
64 m chunks; there is no new player-facing UI.

## Validation

Node tests cover signed chunk coordinates, boundary membership, old LOD/distance
thresholds, geometry sharing, bounded buffer reuse over teleports, refreshed
bounds, camera turns, off-camera shadows, and registration cleanup. Existing
density, grounding and collision tests cover authored placement contracts.

Native Chromium WebGPU captures compare the original and chunked paths with grass
disabled and simulation paused, at Desert Start. These count submitted geometry,
not GPU frame time; target hardware still needs movement, wind and shadow review.

At the default Desert Start view, 60-frame captures measured:

| Metric | Original batching | Chunk streaming |
|---|---:|---:|
| Desert prop draw calls/frame | 105 | 89 |
| Desert prop indices/frame | 7,638,300 | 5,109,534 |
| Total draw calls/frame | 138 | 122 |
| Total indices/frame | 14,012,412 | 11,483,646 |

Across default, 90-degree and 180-degree camera headings, desert draws were
83–89 versus 105, and desert indices decreased approximately 30–33%. Both modes
retained 488 nearby primitive placements, 86 collision cylinders, and zero transform
audit error. These snapshots are geometry measurements, not an FPS guarantee.
The default-view screenshots were inspected after fixing pass-buffer isolation;
authored vegetation remains visible in the matching locations.

An initial one-mesh-per-chunk approach was rejected: 64–192 m chunks increased
draw calls while saving little geometry at this viewpoint. The final renderer
merges visible placements into shared per-pass batches instead.
