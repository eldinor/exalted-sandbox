# Main app benchmark

The main app has a collapsed Benchmark section above Avatar Colors. Both panels
share a scrollable stack; opening either moves the other without overlap.
Recording is manual: enter a description, start a 30-second run, move normally,
then copy the JSON results. Stop ends a run early. Hiding the browser tab ends
the recording so background throttling does not contaminate subsequent samples.
Detailed JSON remains collapsed until opened; clipboard failure selects it for
manual copying.

## Automatic grassland route

Choose **Automatic grassland route** in Camera mode, then Start. Manual mode
remains the default. Automatic mode is available in authored heightmap and GLB
modes, and disabled for procedural terrain.

Use the **Grass models** checkbox in the Benchmark panel to compare grass on
and off without console commands. It controls geometry, leaving the ground
texture visible. The checkbox is locked during preparation and recording so
each run keeps one grass setting; reports capture that setting. It is hidden
in procedural mode, where production grass is unavailable.

The versioned 30-second route starts at Babylon (-30, 210), approaches the grass
through (-75, 155) and (-135, 100), crosses near The Long Green via (-165, 40)
and (-175, -5), and turns to finish at (-140, 35). Coordinates are X/Z metres.
Position uses Catmull-Rom interpolation and viewing yaw eases between fixed
keyframes. Camera height follows actual terrain at +3 m, pitch is 0.12 radians,
and vertical FOV is 1.02 radians. Wall-clock route time is independent of the
simulation dt cap and frame rate.

Preparation holds the start view for at least three seconds and waits for the
grass streaming queue to empty, up to 30 seconds. Recording excludes preparation.
When grass is disabled, its paused queue is ignored and preparation finishes
after the minimum three seconds, allowing grass-on/off route comparisons.
The report includes camera mode, route name/version, focus, elapsed route time,
preparation duration and whether preparation timed out. Streaming along the
route remains part of the measured workload; this is not a fully preloaded tour.

Terrain detail/deformation focus, grass placement/LOD focus, and desert chunk
focus follow the route. Avatar physics, contact, movement effects and manual
camera input are paused; the avatar is hidden. Existing spells, wake and spray
are cleared at the start, and avatar grass bending is disabled. This mode tests
rendering/streaming; use Manual to benchmark walking, surfing and particles.

Stop, Escape, hiding the tab, completion and disposal restore the previous
camera position, rotation and FOV, clear input, restore avatar visibility and
reset temporal post history. Stop/Escape during preparation produce no recording.
Existing terrain deformation and scene animation phases are not reset: keep
world state, settings and resolution comparable between runs. A spawn selected
during a route is deferred until control returns.

## Measurements

- Uncapped browser frame intervals: average FPS, median, p95, p99, worst frame,
  and counts above 33.33, 50 and 100 ms. The first partial interval is excluded.
- Existing synchronous CPU timings for character, spells, terrain, VFX, render
  submission and total work; these are not GPU execution times.
- Actual engine draw entry calls and submitted indexed elements multiplied by
  instance count, including camera depth, shadow, colour and post passes.
  Non-indexed vertices are not counted as indices. These totals are not the
  Inspector's active-index count or a count of unique world geometry.
- Grass update/upload CPU times, queued patches and visible patches; desert
  active chunks and camera meshes. Start/end snapshots include fuller subsystem
  statistics and settings. No new desert upload timer is added.
- Optional existing rolling GPU averages when timestamp queries are supported
  and `?gpuTiming=1` is enabled. These are not independent per-frame timestamps.

Reports also include the description, terrain mode, browser, Babylon version,
render resolution/scaling, avatar/camera positions, global settings, and grass
settings at the start and end. State comparison includes movement and streaming;
it is not a settings edit counter or a complete history of changes during a run.
Use the same resolution, settings, viewpoint and movement route for comparisons.

## Implementation and public release

`src/core/grassBenchmark.ts` holds the shared lab timing calculations; the
generator re-exports it rather than production importing generator code.
`src/core/frameBenchmark.ts` stores app samples in fixed typed buffers allocated
when recording starts. Report sorting/JSON allocation happens after recording.
Index accumulation is enabled only during a run, through the existing draw
counter, and does not wrap meshes or interfere with `EXALTED.captureDraws()`.
Status updates are limited to four per second.

`EXALTED.benchmark` exposes the panel for development inspection. Set
`ENABLE_BENCHMARK_PANEL` to `false` in `src/main.ts` for the public release: no
panel or recorder is created and Avatar Colors keeps its independent layout.
The flag is currently true in both development and builds; automatic hiding
based on build mode is intentionally not enabled yet.

Disposal stops collection, removes the visibility listener and restores Avatar
Colors outside the benchmark stack. The production system order, startup
warm-up, depth/shadow passes and post chain are unchanged.

## Validation

Typecheck and all 118 Node tests passed, including shared lab summaries, uncapped
stutters, bounded recording storage, optional GPU reporting and instanced index
accounting. A native Chromium WebGPU check confirmed the initially collapsed
panel, matching 210 px widths, non-overlapping expanded layout, automatic
30-second completion, populated draw/index results, restart/manual stop, and
disposal restoring Avatar Colors. GPU metrics were omitted with timing disabled.
This checks recorder behaviour, not representative player hardware performance.
No production build or Playwright run was performed for this integration.

Automatic-route validation: typecheck and all 119 Node tests passed, including
fixed route endpoints, continuity at keyframes and frame-rate-independent
sampling. Native Chromium WebGPU completed the full route after 7.3 seconds of
preparation, exported its name/version and endpoint, kept the avatar stationary,
and restored the original camera. Escape cancellation during preparation also
restored the camera. These checks validate behaviour rather than establish a
performance target. No build was run.


## Eastern forest trial

The main heightmap app now has a **Forest trees** checkbox alongside Grass models.
It disables forest colour/depth draws while retaining the closed-area barrier and
ground texture. Start/end state records the inner pine model, border spruce
impostor model/boundary, spacing, height, card count/chunks/triangles,
LOD distances, casting disabled, tree/chunk/mesh counts and collider count.
Metrics also include `forestCpuMs`, `forestVisibleTrees`, `forestActiveChunks` and
`forestActiveMeshes`. Visible counts represent distance-selected instances;
frustum rejection can reduce actual submitted draws. Use Manual mode at The Thornwood or choose the separate Automatic forest route
for enabled/disabled comparisons. The Automatic grassland route remains available.


## Automatic forest route

Select **Automatic forest route** in Camera mode and Start. This option is
available in the heightmap main app; it is disabled in GLB/procedural modes,
where the new forest stand is absent. Toggle **Forest trees** before starting
for identical camera runs with geometry on/off. The closed-area collider remains.
The route also covers the new border impostors. Compare with the earlier all-pine
run using the same version 1 route, resolution and settings; the spatial split
changes geometry, not route keyframes or placement density.

The versioned **Forest edge and aerial canopy** route holds its start view for
three seconds before a 30-second recording. It does not wait for grass streaming.
Its ground section follows the accessible side of the enlarged strip at terrain
+3 m; its second half rises to +110 m and sweeps over the crowns. X/Z keyframes
are (-320,100), (-338,52), (-330,-45), (-315,-65), (-330,45), (-315,125), spaced
six seconds apart. Heights above terrain are 3,3,3,65,110,60 metres. Camera FOV
remains 1.02 radians; pitch and yaw ease with the height. The avatar remains
stationary and hidden while the route drives the production camera, terrain
streaming focus, lighting, depth and post chain in their existing order.

Route metadata includes `kind: forest`, name/version, elapsed seconds, terrain
focus, camera height, pitch, yaw and FOV. Completion, Stop, Escape during
preparation/recording, or tab hiding restores the original camera and figure
visibility. Toggles and mode are locked while a run is active.

Typecheck and 143 tests passed. Native WebGPU completed the full route and
exported forest metrics, checked ground/aerial views, tree-off movement/recording
and Escape restoration. These are behavioral checks rather than a hardware
performance comparison. No production build or Playwright.

## Open woodland extension

The same forest route now includes the six-variant real-tree section toward
Forest Outlook. `forest.openPlaced` reports this addition (464 trees on the
current map); the snapshot records its spacing/extent/mix under `settings.openForest`
and `settings.openMix`. Closed-strip placements remain unchanged. Geometry and
batch counts increase with the new area, so compare enabled/disabled runs at
identical resolution to measure the whole current forest. No route keyframes
were changed.
