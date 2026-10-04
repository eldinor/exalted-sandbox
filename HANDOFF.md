# Exalted development handoff

## Purpose

This repository's primary product is the playable **Exalted** world served by
`index.html`. It is a WebGPU-only Babylon.js application focused on an authored
936 x 702 metre world, a procedural animated avatar, biome-specific ground
interaction, spells, water, atmosphere, props, and high-quality rendering.

The procedural generator, editor plans, avatar tools, and performance labs are
supporting utilities. They do not define production world behaviour unless a
feature is explicitly integrated into the main app.

Start with [CURRENT_WORK.md](CURRENT_WORK.md), [ARCHITECTURE.md](ARCHITECTURE.md),
and [TODO.md](TODO.md). This file records the minimum context needed when the
project is copied into a new repository.

## Setup and validation

Requirements:

- Node.js 22 or a compatible current Node release;
- a WebGPU-capable desktop browser and GPU;
- dependencies from `package-lock.json` and `package.json`.

Commands:

```text
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Vite uses port 5173 with `strictPort: true`. If startup reports that the port is
occupied, stop the previous Vite process or use a deliberate alternative
configuration. Do not start multiple forgotten servers.

`npm run typecheck` checks the production TypeScript app and generator.
`npm test` runs the Node test suite. Do not use Playwright unless the user asks
for it. Do not build after every edit; type-check and run relevant tests during
development, then build when a production bundle check is warranted.

## Production entry point

- Page: `index.html`
- Composition root: `src/main.ts`
- Runtime diagnostics: `globalThis.EXALTED`
- Default mode: authored Exalted world
- GLB comparison mode: `/?terrain=glb`
- Reference mode: `/?terrain=procedural`
- Optional GPU timing: `/?gpuTiming=1`
- Babylon version: 9.18.0 across Babylon packages

The main app is strictly typed TypeScript. Its custom renderer uses hand-written
WGSL for terrain, sky, shadows, avatar, spells, particles, water, and a fixed
post-processing chain. Preserve frame ordering and warm-up sequencing in
`src/main.ts`; these are functional dependencies, not formatting choices.

## Authored world and coordinates

The default production terrain is generated from the native 16-bit roads
heightmap, with the roads RGB biome map:

```text
public/assets/textures/vis_ground_heightmap-11.png
public/assets/textures/vertex_color_4k-9.png
```

The 400-by-400 grid has 320,000 base triangles. Grounding samples those rendered
triangle planes; CPU and GPU softness use the same world-space weight map.
See [HEIGHTMAP_INTEGRATION.md](HEIGHTMAP_INTEGRATION.md) for the asset contract
and remaining manual WebGPU checks.

The GLB comparison terrain is:

```text
public/assets/exalted/alpha-map.glb
```

It is the visual terrain from the September 9, 2026 handoff. The unavailable
collision GLB and analytic height function were explicitly waived; grounding is
authorised to sample the visible imported triangles.

Runtime scale remains one unit per metre for the avatar, props, movement, and
effects. The original authored terrain and map coordinates are uniformly scaled
to 50%, producing an approximately 936 x 702 metre production world. Chart
coordinates use east/north, apply the authored-world scale, and convert to
Babylon as `(-x, height, -y)`. GLB loader transforms are baked into imported
geometry; never apply this conversion twice.

The terrain currently uses one optimized geometry level. Routine terrain LOD
meshes are not planned. Props and vegetation use LOD; distant skyline proxies or
terrain chunking may be added only for a measured need.

The default avatar start is desert sand south of the road, allowing immediate
footprints. The top navigation also includes snow, grassland, forest, mountains,
lake, Lake Island, Waterfall inspection, and pass destinations. Press Escape to
release pointer lock before selecting a destination.

## External source references

The original source material remains outside this repository:

```text
C:\Users\Fiolent23\newrepos\Exalted\Exalted_World_Handoff_2026-09-09\2026-09-09\
C:\Users\Fiolent23\newrepos\Exalted\Exalted_Map_Reference_RevB_2026-09-10\2026-09-10_map-reference\
```

Important source files include `glb/alpha-map.glb`, `glb/exalted_desert.glb`,
the handoff README and proof images, `Exalted_Map_Reference.html`, and
`places_register.json` / `places_register.md`.

Runtime assets required by the app must be copied into `public/` with their
provenance recorded. Do not make runtime code depend on the external absolute
paths.

## Current system state

### Terrain and deformation

- Snow and loose desert ground deform geometrically.
- Other ground types are structured to support biome-specific deformation later.
- A local subdivided surface overlays no duplicate coarse triangles.
- Beauty, shadow, and depth passes use the same displacement.
- GPU readback provides asynchronous avatar and camera grounding over recent
  deformation.
- Desert can use embedded material textures recovered from
  `exalted_desert.glb` or the procedural appearance through the left sidebar.

### Avatar and movement

- The procedural Exalted humanoid, skeleton, IK, garment panels, Verlet cloth,
  and fur are production systems.
- Walking, sprinting, surfing, swimming, collision-aware flight, and timed Fly
  cooldown are implemented.
- Space casts Fly; Ctrl descends at 7 m/s, Ctrl+Shift descends at 26 m/s, and
  expired high-altitude flight accelerates into a capped 24 m/s fall. Airborne
  movement is faster and the avatar leans into forward flight.
- Avatar export, inspection, replacement, Mixamo, and editor plans are documented
  separately.

### Props and collision

- `exalted_desert.glb` supplies authored desert prop placement. In heightmap mode,
  prop Y transfers the original ground-relative offset to the new ground;
  horizontal placement, rotation and physical size are retained. Shared stable
  density thinning keeps roughly 25% of authored desert placements at half world
  scale; the same selection removes their collision cylinders.
  `?props=authored` retains the original Y for diagnostics.
- Shared geometry and thin instances provide near/far detail levels.
- Large rocks, quiver trunks, cacti and woody Searsia stems use approximate
  static cylinder collision derived from their placed full-detail geometry.
- Leaves, soft plants and small stones remain passable.
- Forest integration is deferred until replacement tree models arrive.

### Water

- Lake and river geometry derive from the new map's blue water mask (GLB colours
  in comparison mode) plus the Rev B
  lake polygon and river route.
- Swimming, entry splashes, stroke ripples, and water-aware flight landing work.
- Heightmap-mode lake level is five metres above painted shoreline heights
  (currently about 41.67 m); GLB comparison keeps Y=0. Swimming shares the rendered lake level and
  footprint, excluding islands and clipped banks.
- River rendering currently uses the lake shader mode.
- The temporary runtime GPU waterfall has been disconnected from the main app.
- `waterfall.html` remains an isolated GPU waterfall lab.
- Final waterfall work is deferred until an authored waterfall mesh, lip, and
  impact locator are supplied. See [WATERFALL.md](WATERFALL.md).

### Rendering and UI

- Exalted owns custom analytic sky, cascaded shadows, camera depth, SSR, TAA,
  shafts, bloom, depth of field, tone mapping, and sharpening.
- Do not insert Babylon `FluidRenderer` ahead of this post chain; it takes the
  first camera postprocess slot and disrupts temporal/history assumptions.
- Ctrl+I dynamically loads the matching Babylon Inspector.
- P captures the final scene canvas into a session-only 12-slot screenshot
  gallery with preview, navigation, deletion, individual download, and ZIP
  download.

## Side utilities and demos

These are intentionally separate from the production app:

- `generator/generated-world.html`: procedural 2 x 2 km world research;
- `generator/grass-performance.html`: grass blade and performance lab;
- `generator/grassland.html`: imported grass on the half-scale authored Exalted terrain;
- `forest.html`: retained forest performance prototype;
- `forest_road.html`: imported forest-road viewer;
- `snow_mountain.html`: imported mountain viewer;
- `waterfall.html`: GPU waterfall and spray lab;
- avatar export/import scripts and planned editor utilities.

Standalone forest and mountain page code may remain JavaScript. Successful lab
techniques move into the main app only after visual, performance, and integration
review.

## Key decisions and cautions

- Exalted is the world name; SnowFlow is only the historical visual reference.
- The app deliberately has no WebGL fallback.
- Preserve Babylon package version parity.
- Preserve the custom post-process order and temporal history ownership.
- Keep particles out of R32F shadow targets and the opaque camera depth prepass.
- Blue terrain colours mark broad water regions, not a reliable authored
  waterfall silhouette.
- Image masks are preferred for smooth biome material blending as terrain mesh
  density decreases.
- Terrain, biome props, placement, collision, anchors, and material masks require
  an explicit Blender/C4D-to-Babylon contract.
- Do not revive removed display/video GLBs unless explicitly requested.
- Do not infer generated-world design choices as requirements for the authored
  Exalted map.

## Documentation map

- [README.md](README.md): main application and authored Grassland lab overview.
- [HISTORY_DOCS.md](HISTORY_DOCS.md): technical lab notes, supporting pages and archived README.

- [ARCHITECTURE.md](ARCHITECTURE.md): production runtime architecture and order.
- [CURRENT_WORK.md](CURRENT_WORK.md): product boundaries and current direction.
- [TODO.md](TODO.md): implementation findings, completed work, and backlog.
- [BRIEF_REVIEW.md](BRIEF_REVIEW.md): review of the artist technical brief.
- [WATERFALL.md](WATERFALL.md): waterfall experiments and future asset contract.
- [FOREST_SPEC.md](FOREST_SPEC.md): deferred forest requirements.
- [IMPROVE_WORLD.md](IMPROVE_WORLD.md): authored and generated terrain quality notes.
- [EDITOR.md](EDITOR.md), [Initial_Editor.md](Initial_Editor.md): browser editor plans.
- [AVATAR.md](AVATAR.md), [Avatar_Guide.md](Avatar_Guide.md),
  [Avatar_Exchange.md](Avatar_Exchange.md): avatar structure and round trip.
- [MIXAMO.md](MIXAMO.md): Mixamo and garment considerations.
- [TS_Migration.md](TS_Migration.md): completed migration history and boundaries.
- [generator/PLAN.md](generator/PLAN.md): generated-world roadmap.
- [generator/GRASS_PERFORMANCE_PLAN.md](generator/GRASS_PERFORMANCE_PLAN.md): grass lab plan.

## Recommended next work

1. Revise and approve the Blender/C4D-to-Babylon technical brief.
2. Receive and validate one complete authored biome package, with desert as the
   current recommended example.
3. Continue terrain material quality work using embedded PBR textures and masks.
4. Resume waterfall integration only after the authored waterfall package exists.
5. Integrate replacement forest models using the retained forest specification.
6. Profile the main app on target hardware before changing geometry, shadow, or
   visibility budgets.

When creating a new repository, copy source, public assets, tests, scripts,
documentation, package manifests, TypeScript/Vite configuration, and lockfiles.
Exclude `node_modules`, `dist`, caches, temporary screenshots, and generated
local reports that are not intentionally versioned. Run type checking and tests
before the first commit in the new repository.
