# Exalted Grass System

`GrassSystem.ts` is independent of the benchmark DOM. Its constructor accepts
height, biome-weight, and exclusion samplers, so the same class can later be
connected to the generated-world runtime.

The current lab implements the first benchmark slice:

- deterministic 16 m patches around the generated `Grass 1` location;
- authoritative height and biome sampling;
- road and water rejection;
- four-section near blades and triangle mid blades;
- thin-instance buffers grouped by patch;
- distance LOD, procedural wind, and up to eight simultaneous interaction zones;
- live CPU, patch, instance, triangle, draw-call, median, and p95 counters.
- procedural, imported-GLB, and hybrid geometry comparison modes;
- 11 selected regular variants at normalized LOD1 and LOD2 from `grass_medium_01_1k.glb`
  (Tall A–C, Tiny A–F, and Small A–B); Mid and Large variants are excluded;
- imported variant and per-prototype triangle reporting.

The lab starts at `6×` density, roughly three times its previous blade count.
The density control reaches `10×` for heavier GPU and visibility stress tests.

The interaction benchmark keeps one camera/player proxy and three optional
moving impacts in reusable typed uniform storage. Radius and strength are live
controls. The shader bends blade tips away from each impact while keeping roots
fixed; this is the portable path for future avatar feet, creatures, vehicles,
landings, and spell effects.

The imported mode deliberately ignores the duplicated `geonodes` meshes and
the source GLB's 1x1 texture. It keeps regular LOD1/LOD2 silhouettes while
using Exalted's common placement, wind, lighting, fog, and color shader. Hybrid
mode uses an imported near prototype and the two-triangle procedural mid blade.
`Imported near LOD` defaults to LOD1 and can switch to LOD2 for comparison.
Imported GLB mode uses LOD2 beyond `Near distance`; Hybrid keeps its procedural
mid blades. Both levels share placement, color, wind and interaction settings.
Normalized geometry retains a separate authored height. Placement restores the
selected variant's height relative to Tall A using canonical LOD1 heights for
both LODs, so selecting LOD2 does not change the intended plant height. The
`Reference height` slider sets Tall A's nominal height; Tiny and Small keep their
GLB proportions. At 0.85 m, Tiny D is approximately 0.127 m before random scale.
Hybrid's procedural far blades use the same variant height ratio. Procedural
mode continues to use the slider as its direct nominal blade height.
The per-prototype and visible-triangle counters use the active near/mid geometry,
and `Copy settings` includes the selected near LOD. LOD0 remains unloaded.
The GLB's regular grass material has a white base-color factor and a pure-white
1x1 albedo image, so the former GLB tint slider had no visible effect and has
been replaced with direct root and tip color pickers. These preserve the gradient
and apply to all geometry sources and both LODs, using linear RGB uniforms.
Root `#426f35` and tip `#179306` are the defaults; `Reset colors` restores them.
LOD and biome diagnostic views override these colors deliberately.
`Copy settings` exports the current lab settings as JSON, including exact linear
RGB endpoint arrays and sRGB hex colors. It also shows a read-only text area for
inspection or manual copying if clipboard access is unavailable. Color edits do
not rebuild geometry or read textures.
The far material uses an area-weighted diffuse brightness correction calculated
from the active near/far geometry at rebuild time, averaging the shader's sun
response over instance yaw. This replaces the fixed Hybrid-only multiplier and
also matches imported LOD1/LOD2 brightness. Fog keeps the selected grass palette
instead of adding blue-grey that desaturated far grass. Geometry coverage and
silhouette still differ across LODs; this correction does not remove LOD popping.

Open `/generator/grass-performance.html` through the Vite development server.
The ground camera uses WASD and mouse look; the overview camera uses orbit
controls.

Production builds copy `generator/work/generated-world` into `dist` because the
Grass Lab and generated-world preview fetch that offline bake at runtime. Deploy
the complete `dist` directory; copying only HTML and JavaScript leaves the field
metadata and binary maps unavailable.

The next visual pass should add terrain-normal alignment, multiple blade
profiles, coherent gust bands, dry-tip variation, shadow casting for near
patches, and a dithered near/mid transition. The next performance pass should
pool unloaded patches and move generation to a bounded streaming queue before
expanding coverage beyond this fixed test area.
