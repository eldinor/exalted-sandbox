# Exalted Sandbox: technical requirements

Version 1, 9 November 2026. Applies to the main authored Sandbox, including the
current quality-80 WebP texture delivery.

This document separates **requirements enforced by the current app** from
**provisional hardware recommendations**. No minimum GPU model or guaranteed FPS
has yet been established by a representative hardware test matrix.

## 1. Quick guidance for visitors

Use a desktop or laptop with a recent browser, hardware graphics acceleration,
an up-to-date GPU driver, keyboard and mouse. **Current stable Chrome is the
recommended starting point.** Firefox is also an intended browser, but its
performance must be checked separately on the same device.

The app runs in the browser. Visitors do not need Node.js, Python, Babylon.js
installed separately, a game launcher or a browser plugin.

### Minimum and desirable hardware

The numerical values below are **initial testing targets, not certified minimum
specifications or a purchase recommendation**. A device must also pass the
graphics capability requirements in section 2.

| Component | Provisional minimum target | Desirable / recommended target |
|---|---|---|
| Computer | Desktop or laptop with hardware-accelerated WebGPU | Desktop or adequately cooled laptop with a dedicated GPU |
| CPU | Modern 64-bit processor with 4 physical cores | Modern 64-bit processor with 6 or more physical cores and strong single-thread performance |
| System RAM | 8 GB, with memory available for the browser | 16 GB or more; 32 GB is useful when developing alongside other tools |
| GPU | WebGPU-capable GPU meeting the app's limits; use a dedicated GPU with 4 GB VRAM as the initial minimum test candidate | Dedicated GPU with 8 GB or more VRAM, meeting the same limits |
| Integrated graphics | Possible, but not a validated minimum tier; shared-memory capacity alone does not establish performance | Test a recent integrated/Apple silicon device separately rather than assuming equivalence to a dedicated GPU |
| Rendering size | Start testing around 1280 x 720 with Balanced quality | Start testing around 1920 x 1080 with High quality |
| Storage | No separate game installation; allow room for the browser cache | SSD and about 1 GB available for cache/headroom as a practical allowance |
| Input | Keyboard and mouse with a working right button | Keyboard and three-button mouse with a wheel |

VRAM and system RAM are different resources. Integrated GPUs share system
memory, so their advertised memory cannot be compared directly with dedicated
VRAM. GPU model names, clock speeds and CPU core count alone do not establish
whether the app will run well.

High-resolution displays, especially 4K, need substantially more rendering work
than 720p/1080p. The recommended tier does not promise 4K, Ultra quality or a
particular frame rate. Laptop power limits, cooling and the selected GPU matter.

## 2. Requirements enforced by the current app

| Requirement | Minimum condition | Reason / current behaviour |
|---|---|---|
| Graphics API | WebGPU available to the browser, with a usable hardware adapter/device | The app has no WebGL fallback |
| Shader texture limit | `maxSampledTexturesPerShaderStage >= 27` for the default heightmap world | Requested explicitly during device creation in `src/main.ts` |
| Comparison mode | The GLB terrain comparison requests 19 sampled textures per shader stage | This is a diagnostic comparison, not a promised low-spec compatibility mode |
| Secure origin | HTTPS for public hosting; localhost/127.0.0.1 for local development | WebGPU is restricted to secure contexts |
| Browser functionality | JavaScript, WebAssembly, WebP/PNG/JPEG decoding, canvas, keyboard/mouse input and resource downloads | Required by the application and rendering dependencies |
| Input support | Mouse look, right-button hold, keyboard input and pointer-lock support | Used by camera and movement; surfing also supports right-drag without an established pointer lock |

WebGPU availability and device creation depend on the browser, operating system,
GPU driver, adapter limits and browser restrictions. Having `navigator.gpu`, or
having a GPU described as “DirectX 12 compatible,” is not sufficient proof that
this application can initialise. Requests above an adapter's supported limits
can fail. See the [MDN requestDevice documentation](https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter/requestDevice).

The `float32-filterable` capability is desirable but **not currently a hard
startup requirement**. If unavailable, the app logs a warning that height
filtering may step. That warning is not itself a startup error and does not
establish the cause of low FPS. Measure performance separately.

Authoritative app checks are in [src/main.ts](src/main.ts), particularly device
creation, and [src/core/settings.ts](src/core/settings.ts) for quality settings.

## 3. Browser and operating-system guidance

| Platform / software | Minimum usable condition | Recommended position |
|---|---|---|
| Windows desktop/laptop | OS, driver and browser combination that exposes the required WebGPU device and limits | Current supported Windows release, preferably Windows 11, with current stable Chrome |
| macOS | Browser/OS/GPU combination that provides the required WebGPU device and limits | Current supported macOS and Chrome; Apple silicon is a candidate for separate validation |
| Firefox | Current stable Firefox with functioning hardware WebGPU on that platform | Include in input and performance checks; do not assume Chrome-equivalent FPS |
| Edge | Current stable version with functioning WebGPU | Candidate Chromium alternative; validate the complete app before listing as tested |
| Safari | WebGPU support on the actual OS/device plus the app's required limits | Not yet validated for the complete Exalted experience |
| Linux / ChromeOS | A functioning compatible WebGPU browser/driver stack | Conditional support only until representative devices are tested |
| Phones / tablets | Not a supported visitor configuration for this release | Browser WebGPU support does not provide the keyboard/mouse controls or establish acceptable app performance |

Use current stable browser versions rather than publishing Chrome 113 as the
app's minimum: that number describes the initial API rollout, not an Exalted
compatibility certification. Browser/OS availability differs by platform; see
the [browser availability overview](https://web.dev/blog/webgpu-supported-major-browsers).

Hardware acceleration should be enabled. On a laptop with two GPUs, verify that
the browser uses the intended GPU. The app requests a high-performance adapter,
but this is a preference rather than a guarantee. Do not make experimental
browser flags or unsafe WebGPU overrides part of normal visitor instructions.

Chrome's [WebGPU troubleshooting guide](https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips)
explains adapter, driver, acceleration and secure-origin checks. Chrome and
Firefox input paths have received project testing, but there is no published
cross-platform hardware certification matrix yet.

## 4. Network, download size and memory

A stable connection is necessary to fetch the app and its assets. There is no
hard bandwidth cutoff in the code. As practical guidance, **10 Mbps** is a
reasonable lower connection to test; **25-50 Mbps or faster** is desirable for
a shorter first visit. These figures are recommendations, not measured loading
time guarantees. Reliability matters as well as speed.

The most recent GitHub Pages package was approximately **106.42 MiB**. This is
the whole deployed folder, including optional/deferred files and notices, not
an exact measurement of the first page load. HTTP compression, caching, lazy
modules and server throughput change actual transfer size and startup time.

Quality-80 WebP reduced the selected standalone PNG textures from 163.88 to
11.89 MiB, and the selected model files from 62.44 to 38.12 MiB. Numeric terrain
heightmaps, biome/coverage masks and rock displacement remain unchanged PNGs.
JPEG textures are unchanged. See [BUILD_PACKAGING.md](BUILD_PACKAGING.md).

**Smaller downloads do not imply the same reduction in GPU memory.** Images
still decode to textures at their original dimensions, with GPU allocations,
mipmaps and render targets on top. The current WebP conversion is a delivery
optimisation, not a GPU texture-compression or texture-resolution change.

Persistent offline play and a cloud save service are not currently promised.

## 5. Quality settings and weaker devices

The current application starts with the **Ultra** preset at resolution scale
1.0. It does not automatically select settings based on the provisional hardware
tiers in this document.

For a weaker device, open settings with F1 and begin with **Balanced**. Its
current profile lowers deformation resolution and resolution scale and disables
selected expensive effects. Rendering scale can be reduced further within the
provided settings. High is a reasonable next comparison on a stronger device.

Use a smaller browser viewport when testing rendering cost. Changing settings
or lowering resolution cannot fix an unsupported WebGPU device or insufficient
shader texture limits. Nor should visual optimisations change the authored
world, movement rules, Cube or portal behaviour.

## 6. Developer workstation and software

These requirements are for modifying or building the project, not for visitors.

| Item | Required baseline | Desirable |
|---|---|---|
| GPU/browser | Same functioning WebGPU device as the main app | A dedicated GPU plus access to a weaker test device and both Chrome and Firefox |
| CPU / RAM | Practical starting point: 4 cores and 16 GB RAM | 6-8 or more cores and 32 GB RAM for browser, editor and asset tooling together |
| Disk | About 5 GB free as a working allowance | 10 GB or more on SSD for dependencies, sources, builds and temporary asset outputs |
| Node.js | Project baseline: Node 22.12 or later in the 22.x line, or a newer compatible release | Use a consistent tested version across developer machines |
| Package manager | npm compatible with that Node release and the committed package-lock.json | Reproducible installs with `npm ci` |
| Engine packages | Babylon.js packages pinned to 9.18.0 | Keep package parity; upgrade only through an explicit project decision |
| Build tooling | Repository versions of Vite, TypeScript and other dependencies | Install from the lockfile rather than selecting independent global versions |
| Asset conversion | Python 3 and Pillow with WebP support when regenerating texture derivatives | A maintained Python/Pillow version with the WebP codec available |
| Version control | Git for source changes; GitHub access when publishing | Separate source and gh-pages deployment worktrees |
| Editor | Any TypeScript-capable editor | VS Code or equivalent with TypeScript support |

The installed Vite 8.1.5 declares Node `^20.19.0 || >=22.12.0`. Although that
allows particular Node 20 versions, Node 22.12+ is the project's chosen baseline
here. Earlier “Node 22” wording must not be read as accepting Node 22.0.
The precise installed constraint is in `node_modules/vite/package.json`.

Measured local sizes on 9 November 2026 were approximately 1.11 GiB for public
assets, 0.48 GiB for node_modules and 0.10 GiB for the Pages build. The working
allowances above include room for additional builds and conversion outputs;
they are not exact package installation sizes.

The source repository deliberately ignores some runtime binary/image assets.
A source-only clone therefore may not contain everything needed to build.
Provide the required public assets and derivatives as well as the source and
lockfile. Python is unnecessary for an ordinary build if all prepared assets
already exist.

Typical commands:

```text
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run build:pages
```

Run `npm run assets:textures:webp` only when regenerating the WebP derivatives.
Do not overwrite original PNGs or GLBs. Do not build after every edit; use the
project's validation guidance and build for bundle checks or deployment.

## 7. Hosting requirements

The build is a static website. The hosting server does not render the world and
does not need a GPU or a Node.js process to serve the compiled files. GitHub
Pages is an existing deployment target.

- Serve publicly over HTTPS.
- Deploy the complete selected build, including its matching HTML, JavaScript,
  numeric maps, WebPs and derivative GLBs.
- Use the correct Vite base path. The repository Pages build uses
  `/exalted-sandbox/`; ordinary domain-root hosting uses its corresponding build.
- Serve WebP as `image/webp` and GLB as `model/gltf-binary` where configurable.
  Text modules/styles also need suitable content types.
- Avoid truncated responses and incorrect Content-Length or Content-Encoding
  headers. Numeric-map recovery does not excuse broken normal responses.
- If deploying assets on a different origin, configure appropriate CORS access.
  Same-origin asset hosting is the current straightforward arrangement.
- Do not upload source texture packs or a ZIP as website content. ZIPs may be
  used privately to transport a build before extraction.

## 8. How to establish certified requirements

Before publishing a definitive minimum GPU list or FPS promise, test at least:

1. A proposed minimum dedicated GPU and an 8 GB RAM computer.
2. A recommended dedicated GPU and a 16 GB RAM computer.
3. A recent integrated GPU or Apple silicon device.
4. Chrome and Firefox separately on applicable systems.

Record CPU/GPU model, driver, RAM, dedicated/shared graphics memory, OS, browser
version, viewport/render resolution, preset and app revision. Confirm the
27-texture adapter limit and successful startup before timing gameplay.

Exercise grass and forest routes, high aerial views, the lake, both mountain
areas, surfing and spell-heavy scenes. Separate cold loading, shader warm-up,
steady gameplay and browser-tab suspension. Report frame-time distributions,
stalls and memory observations; CPU submission timings are not GPU timings.

Choose acceptable performance thresholds with the product owner after these
measurements. The suggested hardware tiers in section 1 must remain labelled
provisional until that work establishes a defensible support statement.

No new hardware benchmark, platform certification or gameplay validation was
performed while writing this document.
