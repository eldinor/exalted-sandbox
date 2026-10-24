# Build packages

Current trial: the main app selects separate **1024 x 1024** rock arrays from
`public/terrain/rock/iron-mountains-1024/`. Original 2048 arrays and all original
PNG textures remain unchanged. The current production output is **286.02 MiB**;
the earlier 381.94 MiB measurements below describe the 2048-array package.

`npm run build` creates the production Exalted application in `dist/`.
It builds only `index.html`, omits JavaScript source maps, and copies runtime
assets through `scripts/production-assets.mjs` instead of copying all of `public/`.
`npm run preview` serves this package. Development serving remains unchanged:
the main app, labs and authoring assets remain available on the dev server.

`npm run build:labs` retains the previous multi-page build, full public assets,
source maps and generated-world bake, writing to `dist-labs/` separately.
`npm run preview:labs` serves that output. As before, building the labs requires
`generator/work/generated-world/`; the main build no longer requires a generator
bake. The labs build is intentionally large and is not the release package.

## Asset contract

The production inventory includes both heightmap and GLB comparison modes,
`alpha-map.glb` for prop grounding, authored desert props, prepared forest and
flower packs, grass, spruce impostors, current biome/coverage maps, road/beach/
meadow/forest textures, and all three packed rock arrays. The Inspector remains
available, including its lazy JavaScript chunks.

The packaging script validates each required file before bundling. GLB external
image and buffer URIs are followed automatically; for example, the plain boulder
retains both of its external textures. Paths must stay within `public/`; missing
files fail the build. Licence files, source notes and JSON metadata are retained.
Original texture/mesh packs and authoring inputs stay untouched in the workspace.

When adding a runtime asset fetched by URL, add its root to `PRODUCTION_ASSETS`.
Embedded GLB images need no extra entry. External GLB image/buffer dependencies
are discovered automatically. Do not remove original assets to reduce deployment
size; keep them available for preparation tools and labs.

The main production package publishes the three selected compressed rock arrays
as `terrain/rock/iron-mountains-1024/{base,normal,arm-height}.rgba.bin`. Their gzip
bytes are identical to the selected workspace `.rgba.gz` files. This avoids archive filename
restrictions on some hosts; development and lab builds retain the source URLs.
The loader detects gzip by its signature after the browser's HTTP decoding, so
it also handles transport compression or already-decoded payloads correctly.
Deploy the complete rebuilt `dist/`, including its new HTML/JavaScript and three
binary files, so the loader and asset names stay in sync. A remote 403 still
requires the hosting server to permit public access to the requested files.

The release package excludes old map revisions, original full source packs,
rock PNG/EXR/displacement inputs already baked into the runtime arrays, unused
texture sets, previews/concepts, lab HTML and generated-world data. Source-map
files are disabled only for the production build. Texture quality and runtime
rendering behaviour are unchanged.

Keep any distributable archive outside `dist/` so deployment size measurements
do not include both the unpacked package and its archive.

## Validation and size, 15 October 2026

Before packaging changes, `dist/` was 1,198.57 MiB after removing its nested ZIP.
The production build is now **381.94 MiB**, about **68% smaller**. It contains
67 runtime/provenance assets (368.51 MiB), built JavaScript and one HTML page.
No JavaScript source maps or generated-world lab files remain in that package.

Typecheck and all 181 Node tests pass. Packaging tests cover dependency closure,
path containment, missing assets, preservation of runtime/provenance files,
production versus labs configuration, and unchanged dev-server asset access.
One production build completed successfully. The labs configuration was tested
without generating its separate large bundle. Existing large Inspector chunk
warnings remain; they do not indicate a packaging failure.

The built package was served on a temporary local preview server. Both the
default heightmap app and `?terrain=glb` reached Ready in native Chrome WebGPU,
with no failed network requests or new JavaScript/shader errors. The existing
float32-filterable fallback warning remains. This verifies startup and asset
availability; it is not a full visual or gameplay review. No Playwright ran.

The subsequent hosted-403 compatibility change was rebuilt and checked locally:
all three `.rgba.bin` outputs match the compressed source SHA-256 values;
WebGPU startup reached Ready with no failed requests. Typecheck and all 182
Node tests pass, including raw/gzip decoding and split signature chunks.
The hosted deployment has not been inspected directly.

## Interrupted response diagnosis, 24 October 2026

A reported startup failure says that a response body is shorter than its
Content-Length. The screenshot does not identify which resource failed or
establish a server-side cause. The exact hosted URL is needed to inspect
response headers and delivery; do not assume another asset extension change
will fix this.

Terrain-map and rock-array reads now preserve their requested URL and underlying
error when fetch or body consumption fails. General startup failures use a
reload/contact hint rather than displaying WebGPU compatibility advice;
actual WebGPU capability failures retain that advice. No malformed response
is accepted or padded, and no automatic full-scene restart is introduced.
Tests reproduce an interrupted body stream and check that its URL/cause survive.

Inspection of `https://test3.babylonpress.org/` on 24 October found all three
rock-array binaries returned HTTP 200, their advertised lengths matched complete
downloads, and their SHA-256 hashes matched the local sources. An uncached
Chrome WebGPU startup eventually reached Ready without failed requests. Browser
rock-array transfers took about 28-44 seconds; the slowest other ground texture
took about 53 seconds. This did not reproduce the user's interruption and does
not establish a permanent server misconfiguration.

Terrain-map and rock-array reads now retry an interrupted fetch/body once with
`cache: reload`. An HTTP error such as 403/404 is not retried. A repeated transfer
failure retains its URL and original cause. No incomplete bytes are uploaded
to the rock textures. Tests cover recovery, the two-attempt limit and non-retry
of HTTP errors. The production package was rebuilt; typecheck and all 184 Node
tests pass. This resilience change requires deploying the new HTML/JavaScript.
In a local native WebGPU test, the first base-array request was deliberately
failed with a closed connection. Exactly one retry occurred and startup reached
Ready. This validates recovery without claiming the remote failure is reproduced.

## Separate 1024-array trial, 24 October 2026

`npm run assets:rocks:1024` generates the smaller package from the preserved
2048 arrays, followed by `npm run build` to package it. The generator verifies
the original compressed SHA-256 hashes, decodes their row deltas, and applies
the existing 2x2 RGBA box filter independently to all five layers. Resulting
pixels match the originals' first mip level. Colour, normal, ARM and height
channels retain their order and encoding; close-range detail is reduced.

The generated folder has its own metadata, source/output hashes and source
notes. Neither original PNGs nor the original array files/metadata are written.
`src/terrain/RockArrayProfile.ts` defines the active root, dimensions and layer
count; the production inventory selects this root and excludes original 2048
array binaries. To restore the original package later, change both the runtime
profile and the production inventory back to the original root/dimensions.

| Rock payload | 2048 source | 1024 trial |
|---|---:|---:|
| Base colour | 41.95 MiB | 10.92 MiB |
| Normal | 53.23 MiB | 13.54 MiB |
| ARM/height | 34.57 MiB | 9.37 MiB |
| Total | 129.75 MiB | 33.83 MiB |

GPU array storage including mipmaps falls from approximately 320 to 80 MiB.
Startup buffer/mip processing also scales to the smaller dimensions. The
terrain geometry, material blending, texture repeat scales, lighting, rendering
order and one-retry transfer handling stay unchanged. Other ground textures
remain at their current resolution.

Build, typecheck and all 185 Node tests pass. Tests validate unchanged original
checksums and per-layer/channel reduction. Local native WebGPU startup reached
Ready and confirmed 1024-square GPU resources with five layers and 11 mip levels.
The new build must be uploaded in full to test the affected user's hosted
transfer failure; it has not been deployed by this agent.
