# Exalted

Exalted is a playable authored world with a procedural avatar, deformable snow
and sand, spells, water and biome props. The Grassland lab is a separate page for
tuning imported grass before integration into the main application.

Project website: [exaltedgaming.gg](https://exaltedgaming.gg/).

## Run locally

Use Node.js 22 or a compatible newer release and a desktop browser with WebGPU.
There is no WebGL fallback.

```sh
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/). Runtime assets must be
available under public/. The Grassland lab uses the bundled authored world and
meadow textures; it does not require a generated map.

## Main application

Open [/](http://localhost:5173/) to explore the authored Exalted world. The top
navigation switches between named destinations across its biomes. Walking,
flight, swimming, spells and soft-ground tracks are available in the main app.

The main ground now uses `vis_ground_heightmap-11.png` and
`vertex_color_4k-9.png`. Open `/?terrain=glb` to compare the previous terrain,
or `/?terrain=procedural` for the original snow reference. Desert prop heights
follow the new ground while retaining their original ground offsets; use
`/?props=authored` to inspect unchanged authored heights. Integration details and
remaining visual checks are in [HEIGHTMAP_INTEGRATION.md](HEIGHTMAP_INTEGRATION.md).

| Control | Action |
| --- | --- |
| Click the scene / mouse | Capture the pointer and look around. |
| WASD | Move relative to the camera. |
| Shift | Move faster. |
| Escape | Release the pointer to use the navigation and UI. |
| 1-9 | Cast spells. |
| F1 or backtick | Open settings and performance controls. |
| P | Capture the current view in Screenshots. |
| Ctrl+P | Capture the whole authored map from above in Screenshots. |
| Ctrl+Shift+P | Capture the whole map with all forest and desert props, at 4096 × 3072. |

Ctrl+P map screenshots are north-up, orthographic 2048 × 1536 PNGs with a small
margin. They show the complete terrain, current biome/road textures and actual
lake/river surfaces. A separate offscreen camera leaves the gameplay view in
place. Map lighting emphasizes ground colour and terrain relief; water is shown
in a flat blue. Camera fog, temporal effects, UI, avatar, streamed vegetation
and props are omitted for a clear ground overview. Preview or download the image
through the existing Screenshots gallery, including Download all ZIP export.
Ctrl+Shift+P uses the same orthographic framing at 4096 × 3072 and adds every
placed forest and desert prop, including overhead spruce crowns, even outside
gameplay's distance and streaming limits. Use this view to review placement.

## Grassland lab

Open [/generator/grassland.html](http://localhost:5173/generator/grassland.html).
It uses the same half-scale authored terrain as the main world, with imported
GLB grass and a meadow ground material using base color, normal and ORM textures.
Its grass rendering remains separate from the main application.

- **Left panel:** density, size, colors, LOD, distance, wind and interaction.
- **Bottom panel:** mix Tall, Small and Tiny models by percentage. Shares total
  100%; set a model to 0 to exclude it. The starting mix is Tall A 40%, Small A
  35%, Tiny D 25%.
- **Right panel:** live performance counters, diagnosis controls and a 30-second
  benchmark. Add a description, record, then use Copy benchmark results to share
  the report. Copy settings exports the current grass configuration.

Use WASD and mouse look in Ground mode, with Shift for faster movement. The
Camera button switches to an orbiting Overview mode; Reset camera restores the
starting views.

Grass defaults to LOD1 inside 70 m and LOD2 from 70-120 m. Far density decreases
to 25% at the outer edge. Wind fades from 40-60 m, with static distant grass.
These settings, the model mix and diagnostic options are adjustable in the UI.

For comparable benchmarks, keep the same settings and camera route, wait for
the grass queue to settle, then change one option between runs.

## Forestland lab

Open [/forestland.html](forestland.html) to inspect the authored forest biome
populated with 12 variants from the pine pack at LOD1/LOD2. A bottom panel mixes
tree models in percentages that always total 100%. The standalone WebGPU page
uses the current production heightmap and biome map, with grounded deterministic
placement, 32 m batches and nearby shadows. Ground/Overview
cameras, spacing, height, mix and distance controls, and a 30-second copyable
benchmark are included. See [generator/forestland/README.md](generator/forestland/README.md).
This lab does not enable forest trees in the main app.

## Further documentation

Technical details, supporting pages and previous implementation notes are in
[HISTORY_DOCS.md](HISTORY_DOCS.md).

Project code is released under the [MIT license](LICENSE). Runtime assets have
separate provenance and license notes alongside their files.
