# Exalted Grassland lab

Open /generator/grassland.html through the Vite development server. This page
uses the authored Exalted terrain, imported grass models, meadow ground textures,
a percentage-based model mix and copyable benchmark results.

See the root [README](../../README.md#grassland-lab) for controls and current
settings. Implementation details, limitations and the generated-world comparison
page have moved to [HISTORY_DOCS.md](../../HISTORY_DOCS.md#grassland-lab-technical-notes).

The renderer, placement and model-loading modules are shared with production
under `src/grass`. Production behaviour and costs are described in
[GRASS.md](../../GRASS.md); lab lighting and controls remain independent.
