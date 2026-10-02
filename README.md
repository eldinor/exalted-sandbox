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

| Control | Action |
| --- | --- |
| Click the scene / mouse | Capture the pointer and look around. |
| WASD | Move relative to the camera. |
| Shift | Move faster. |
| Escape | Release the pointer to use the navigation and UI. |
| 1-9 | Cast spells. |
| F1 or backtick | Open settings and performance controls. |

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

## Further documentation

Technical details, supporting pages and previous implementation notes are in
[HISTORY_DOCS.md](HISTORY_DOCS.md).

Project code is released under the [MIT license](LICENSE). Runtime assets have
separate provenance and license notes alongside their files.
