# Build packages

## GitHub Pages package

`npm run build:pages` prepares `dist-pages/` for the current repository URL,
`https://eldinor.github.io/exalted-sandbox/`, using Vite base `/exalted-sandbox/`.
It includes the same production runtime inventory and adds `.nojekyll` for a
static branch deployment. The regular `dist/` package is left intact. Publish
the contents of `dist-pages/` at the root of a deployment branch such as
`gh-pages`, and select that branch's root under repository Settings -> Pages.
The script only builds locally; it does not commit, push, or enable Pages.

Do not upload a ZIP archive as site content. The source repository deliberately
ignores PNG/JPG assets, so a source-only checkout cannot currently rebuild the
complete app in GitHub Actions without a separate runtime asset provisioning
step. Publishing the locally prepared static package avoids that requirement.
If the destination repository name or domain changes, update the Pages base in
`scripts/build-pages.mjs` before rebuilding.

Current delivery (5 November 2026): mountain/rock data is packaged as 20 ordinary
1024-square PNGs under `terrain/rock/iron-mountains-png-1024/` (30.50 MiB).
The three compressed `.rgba.bin` runtime files are no longer packaged or loaded.
The original arrays stay in the workspace for preparation and checksum checks.
Run `npm run assets:rocks:png` to regenerate the PNGs; deploy the complete next
build so the JavaScript and image inventory match. Historical binary trial and
transfer recovery details below describe the preceding implementation.

Previous binary trial: the main app selected separate **1024 x 1024** rock arrays from
`public/terrain/rock/iron-mountains-1024/`. Original 2048 arrays and all original
PNG textures remain unchanged. That production output was **286.02 MiB**;
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
meadow/forest textures, and all 20 PNG images used to assemble rock arrays. The Inspector remains
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

## Heightmap byte-range recovery, 25 October 2026

The next user report identified `assets/textures/vis_ground_heightmap-11.png`
as the failing resource, on the replacement host `https://test4.babylonpress.org/`.
The heightmap returned HTTP 200 with 9,649,840 bytes and matched the preserved
local SHA-256. The server also returned valid HTTP 206 byte ranges with a strong
ETag. This does not reproduce that user's interrupted connection or establish
that the uploaded PNG is damaged.

Only the heightmap now opts into a second recovery path. After both whole-file
attempts fail with transfer errors, `assetRanges.ts` fetches it sequentially in
1 MiB ranges, with one retry per interrupted chunk. Other resources retain the
existing behaviour. Normal successful startup makes no extra requests.

Range recovery requires HTTP 206 and validates each Content-Range, total size,
exact chunk length, and the file's ETag/Last-Modified. Subsequent requests use
If-Range. Changed assets, missing validators, compressed range responses,
unsupported ranges, inconsistent offsets and totals over 64 MiB fail closed.
The complete byte-identical PNG is assembled before the existing decoder runs.
The original heightmap, terrain geometry and all other authored files are unchanged.

A real ranged download from test4 reconstructed the heightmap with the original
SHA-256 `28f852d2bca23e80d0fc7cbf49141a50c06634b463c7683d3eb2a9466b301ade`.
Typecheck and all 188 Node tests pass, including chunk retries, changed-file
rejection, exact reconstruction, bounds and validator handling. The main build
has been rebuilt for deployment. No Playwright or remote publishing was done.
In a local native WebGPU test, both whole-heightmap requests were deliberately
failed with closed connections. Ten subsequent range requests reconstructed
the PNG and startup reached Ready. No new shader or JavaScript errors occurred.

## All authored terrain-map recovery, 30 October 2026

The same user next reported `ground-coverage-9.png: Failed to fetch` on test4.
The hosted file returns HTTP 200 with 303,674 bytes and SHA-256
`85528329decc099d5e791a450b7ee1818a9abeee8cd33e0cd2e743473f386bda`,
matching the local file. HTTP 206 range delivery also works here. No corruption
or interruption was reproduced on this connection.

All six authored terrain PNGs now use the existing optional range recovery,
including biome, ground, road, rock and beach maps as well as the heightmap.
The bounds, validators, two whole-file attempts and per-chunk retry limits stay
unchanged. A small map such as ground coverage fits in one range request;
this provides another validated request path, not a reduction in its transfer
size. Successful downloads make no additional requests. Originals are unchanged.

Tests simulate both initial coverage fetches failing, then decode the recovered
real PNG and compare it with the original. Successful loads and HTTP 403 remain
single-attempt paths. Typecheck and the complete 190-test suite pass; the main
production package is refreshed for deployment. No browser visual check was run.

This remains a mitigation rather than a confirmed fix for the affected user.
If requests are blocked entirely, range recovery cannot help. Ask that user to
compare a private browser window and another connection (for example a phone
hotspot). If it persists, collect the browser Network panel failure details or
a HAR privately, checking for sensitive headers before sharing. This can help
distinguish a browser/profile problem from a connection/proxy delivery problem.
