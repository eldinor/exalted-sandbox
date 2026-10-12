# Exalted Forestland lab

Collected asset findings, benchmark comparisons, grounding fixes and aerial-view
limitations are recorded in [FOREST_NOTES.md](../../FOREST_NOTES.md).

Open `/forestland.html` through the normal Vite server. This is a standalone
authored-world lab similar to `/generator/grassland.html`; it does not populate
the production main app or replace the legacy `/forest.html` prototype.

The page loads the current production heightmap (`vis_ground_heightmap-11.png`)
and biome map (`vertex_color_4k-9.png`). Dark-green RGB (124, 170, 129) selects
forest. Terrain coordinates are already baked by `ExaltedWorld`; chart
coordinates are not applied again. Exact terrain triangles supply grounding
and slope normals. Roads, other biomes, painted water and slopes over 0.7 rise/run
are excluded. Four extra probes 2 metres around each root reject edge placements.
Lake geometry/swimming, trunk collisions and grass are not part of this lab.

## Supplied pine models

### Current pack and tree mix

Forestland now uses `pine-pack-forestland.glb`, prepared from the user-supplied
`pine_trees_pack_lowpoly_game_ready_lods.glb`. Regenerate it with
`node scripts/prepare-pine-pack.mjs`. The 22.7 MB subset includes 12 variants:
three each of medium, big, small and sapling pines, at LOD1 and LOD2. There are
48 bark/foliage mesh parts, two shared materials and six original texture maps.
Display-layout offsets and reference objects are excluded; the loader bakes
axis/unit transforms. Both LODs keep the authored Y=0 ground plane: negative
root tips remain below soil rather than being raised to zero. Lower-trunk and
root support points from both LODs sample the actual terrain after scale/yaw,
lowering the shared instance height as needed on slopes, with 3 cm of burial.
This changes only vertical grounding, not tree selection, X/Z or rotation.

The bottom panel uses Grassland's layout and percentage redistribution. Default
shares are Medium 1/2/3 = 25/25/20%; Big 1/2/3 = 5/5/5%; Small 1/2/3 = 3/3/3%;
Sapling 1/2/3 = 2/2/2%. Shares total 100%; zero excludes a variant. Model choice
is deterministic and does not change root positions or total density. Slider
edits update shares immediately and rebuild on release; number edits rebuild
on change. Controls are locked during recording and shares are captured in JSON.

LOD1 is used within 40 m, LOD2 through the default 140 m detailed distance.
The LOD1 distance is adjustable. Chunk centres select LOD; transitions do not
cross-fade. Both bark and foliage have independent per-chunk/variant/LOD matrix
bindings. Shadows use the selected LOD. The default weighted costs are about
2,065 triangles at LOD1 and 1,119 at LOD2. Relative family sizes are preserved;
the height slider controls nominal Medium 2 height. Placement still has ±15%
scale variation and 12 m default spacing, giving 464 trees on the current map.

Foliage uses alpha cutout (0.35) for consistent opaque depth/shadows. Authored LOD3
billboards, large pines and wind are deferred. LOLIPOP / CC BY 4.0 attribution
is displayed; see `public/terrain/forest/SOURCE.md` for provenance and changes.

### Farthest-tree placeholder experiment

Beyond 140 m, optional six-triangle placeholders extend visibility to 350 m.
Two crossed vertical cards share a side silhouette and one horizontal canopy
card provides overhead coverage. A 512 × 256 procedural atlas is generated per
variant once at startup, with a stylized crown/trunk and top canopy. It is an
approximation, not a render bake or the pack's authored 16-triangle LOD3.
Cards keep the same grounded instance matrices, model proportions and rotations
as LOD1/LOD2. Their alpha-cutout material has fog but no wind, individual shadows
or dynamic lighting. The placeholder geometry/material/texture are reused;
materials and textures are disposed with the scene.

LOD/visibility distance now uses the full 3D camera-to-chunk-canopy-centre
distance so increasing altitude reduces detailed geometry. Detailed-to-card
selection uses the configured distance with no overlapping representations;
the outer visibility cutoff adds 23 m of conservative chunk padding. Controls
toggle the cards and adjust their outer range (never inside the detailed range).
The UI counts placeholder trees separately, and reports capture these settings
and counts. Use Overview to inspect the top cards from the air. Cross-fades are
not implemented in this initial experiment; popping and simplified silhouettes
need manual assessment.

### Original two-pine reference (retained, no longer the active lab asset)

`public/terrain/forest/pine_tree_01.glb` is a user-supplied asset with two trees
merged into one geometry/material. The loader bakes its complete imported
hierarchy, welds position connectivity to find the two tall rooted trunk
components, and assigns complete disconnected foliage components to the nearest
trunk (components above the shorter trunk's top remain on the taller pine).
This preserves complete cards and all 8,724 source triangles and original
normals/texture coordinates. It is a spatial separation of a merged source,
not an authored tree-node split; overlapping foliage assignments should be
reviewed if revised source assets become available.

Each variant is recentered on its own trunk base; one shared scale preserves
relative tree sizes. Tall Pine A has 4,522 triangles and shorter Pine B 4,202
under the Babylon loader's baked transforms. Both use the embedded original
PBR textures and alpha-cutout material. There are no authored LOD variants or
wind animation in this first lab.

The original placement used 12 m jittered grid spacing, a 50/50 deterministic mix,
and 12 m nominal tall-tree height with ±15% scale variation. The current map
produces 464 trees. Placement spans the forest biome, while 32 m chunk batches
are enabled near the inspection camera (160 m default, plus conservative
23 m chunk-centre padding). Each batch has independent geometry/instance buffer
bindings; materials/textures are shared. Changes to spacing, scale or mix rebuild
placement on slider release. Trees retain upright trunks on sloping terrain.

## UI, lighting and benchmark

Ground mode supports WASD, mouse look and Shift acceleration. Overview provides
orbit/zoom; Reset restores both views at The Thornwood. Controls expose tree
visibility, spacing, reference height, LOD1 distance, model percentages, view distance,
ground visibility and nearby shadows. The lab uses hemisphere/sun lighting,
fog and a 1024 px alpha-cutout shadow map for chunks within 60 m of the camera.
The shadow volume has fixed 200 m bounds anchored to the terrain below the
camera, independent of camera altitude, with a soft boundary. Shadows are
disabled when no nearby detailed trees cast them, avoiding invalid auto-fit
bounds or stale shadow-map sampling in Overview. They resume on returning near
the trees; distant placeholder cards remain unlit and cast no shadows.
It does not use the main application's temporal post chain or custom cascades.

The right sidebar records 30 seconds of uncapped frame intervals, CPU costs,
draw calls and instance-multiplied submitted indices across scene/shadow passes.
Settings are locked during recording; manual camera movement remains available.
Reports include descriptions, start/end settings and cameras, resolution, tree
counts and frame-time percentiles. Hiding the tab ends the recording. Copy
reports via the button or its selection fallback. No GPU timing is claimed.
The trees-in-range counter includes eligible chunks, not just frustum-visible
geometry. Automatic camera routes are not implemented in this lab.

Use `npm run typecheck` for production and lab TypeScript validation. Geometry
and real-map classification tests are in `generator/tests/forestland.test.ts`.
The legacy forest specification remains the contract for later production work.
