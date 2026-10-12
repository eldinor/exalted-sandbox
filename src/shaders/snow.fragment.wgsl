// -----------------------------------------------------------------------------
// The snow material.
//
// Normals arrive from four independent sources and have to be combined in the
// right order or the surface stops holding together:
//
//   macro     baked landform gradient        tens of metres → ~1 m
//   fine      analytic sastrugi and ripples  ~2 m → ~10 cm
//   detail    tiled generated grain map      ~10 cm → ~5 mm
//   deform    the terrain state buffer       whatever the player carved
//
// Macro and fine and deform are all *heightfield gradients* in world space, so
// they add as slopes before ever becoming a normal. Only the detail map is a
// tangent-space normal, and it is folded in last with reoriented normal mapping.
// Adding normals instead of slopes is the classic way to lose the landform under
// the detail.
// -----------------------------------------------------------------------------

#include<snowNoise>
#include<snowTerrain>
#include<snowDeform>
#include<snowShading>
#include<snowSpellLights>
#include<snowAtmosphere>

varying vWorld: vec3f;
varying vHeightUV: vec2f;
varying vViewDist: f32;
varying vSpacing: f32;
#ifdef EXALTED_TERRAIN
#include<grassBiome>
#include<forestGroundCoverage>
#include<surfaceTypes>
#include<surfaceMap>
uniform patchCenter: vec2f;
uniform desertU: vec3f;
uniform desertV: vec3f;
uniform desertBaseMatrix: mat4x4f;
uniform desertNormalMatrix: mat4x4f;
uniform desertColor: vec3f;
uniform desertRoughness: f32;
uniform desertNormalScale: vec2f;
uniform desertGamma: f32;
uniform useDesertTextures: f32;
uniform roadTextureScale: f32;
uniform roadNormalStrength: f32;
uniform roadGamma: f32;
uniform meadowTextureScale: f32;
uniform meadowGamma: f32;
var meadowBaseTex: texture_2d<f32>;
var meadowBaseTexSampler: sampler;
var meadowNormalTex: texture_2d<f32>;
var meadowNormalTexSampler: sampler;
var meadowOrmTex: texture_2d<f32>;
var meadowOrmTexSampler: sampler;
uniform forestTextureScale: f32;
uniform forestGamma: f32;
var forestBaseTex: texture_2d<f32>;
var forestNormalTex: texture_2d<f32>;
var forestArmTex: texture_2d<f32>;
// Forest maps use the identical meadow repeat/filter samplers to stay within
// the default 16-sampler limit (including on D3D11 WebGPU adapters).
uniform useRoadSurfaceMap: f32;
var desertBaseTex: texture_2d<f32>;
var desertBaseTexSampler: sampler;
var desertNormalTex: texture_2d<f32>;
var desertNormalTexSampler: sampler;
var roadBaseTex: texture_2d<f32>;
var roadBaseTexSampler: sampler;
var roadNormalTex: texture_2d<f32>;
var roadNormalTexSampler: sampler;
var roadArmTex: texture_2d<f32>;
var roadArmTexSampler: sampler;
var biomeMapTex: texture_2d<f32>;
#ifdef HEIGHTMAP_TERRAIN
var groundCoverageTex: texture_2d<f32>;
var detailCoverageTex: texture_2d<f32>;
var rockBaseTex: texture_2d<f32>;
var rockNormalTex: texture_2d<f32>;
var rockArmTex: texture_2d<f32>;
var beachBaseTex: texture_2d<f32>;
var beachNormalTex: texture_2d<f32>;
var beachArmTex: texture_2d<f32>;
uniform beachTextureScale: f32;
uniform beachGamma: f32;
uniform rockTextureScale: f32;
uniform rockGamma: f32;
#include<rockSampling>
#include<beachSampling>
// Reuse the linear, clamped biome sampler; no additional sampler binding.
#endif
var biomeMapTexSampler: sampler;
varying vTerrainNormal: vec3f;
varying vBiomeColor: vec3f;
#endif

// ------------------------------------------------------------------ textures
// Authored terrain uses its triangle normal, freeing one sampled-texture slot.
#ifndef EXALTED_TERRAIN
var auxTex: texture_2d<f32>;
var auxTexSampler: sampler;
#endif
var detailTex: texture_2d<f32>;
var detailTexSampler: sampler;
var skyLUT: texture_2d<f32>;
var skyLUTSampler: sampler;
var cascade0: texture_2d<f32>;
var cascade0Sampler: sampler;
var cascade1: texture_2d<f32>;
var cascade1Sampler: sampler;
var cascade2: texture_2d<f32>;
var cascade2Sampler: sampler;
var deformTex: texture_2d<f32>;
var deformTexSampler: sampler;

// ------------------------------------------------------------------ uniforms
uniform cameraPos: vec3f;
uniform sunDir: vec3f;
/// Direct solar irradiance at the ground, already atmospherically extinguished
/// and in the same units the sky LUT stores radiance in.
uniform sunRadiance: vec3f;

uniform shR: array<vec4f, 9>;

uniform cascadeMatrices: array<mat4x4f, 3>;
uniform cascadeSplits: vec4f;
/// Per cascade: (depth range in metres, ortho width in metres, unused, unused).
uniform cascadeParams: array<vec4f, 3>;
uniform shadowTexel: f32;
uniform shadowSoftness: f32;
uniform shadowBias: f32;

uniform windAngle: f32;
uniform sastrugiAmp: f32;
uniform detailStrength: f32;
uniform glintIntensity: f32;
uniform glintGrazing: f32;
uniform sssStrength: f32;
uniform sssRadius: f32;

uniform fogDensity: f32;
uniform fogHeightFalloff: f32;
uniform fogStart: f32;
uniform aerialStrength: f32;

uniform worldOrigin: vec2f;
uniform worldSize: f32;

uniform deformCenter: vec2f;
uniform deformSize: f32;
uniform deformTexel: f32;
uniform deformDepthScale: f32;

uniform ambientIntensity: f32;
uniform debugMode: f32;
uniform screenSize: vec2f;

// Spell lights. See `lib/spellLights.wgsl`; zero-count on almost every frame.
uniform spellLightPos: array<vec4f, 4>;
uniform spellLightCol: array<vec4f, 4>;
uniform spellLightCount: f32;

// The cascade projection and PCSS selection live in a shared include, because
// the character material has to run the byte-identical lookup — the Y-flip
// convention and the receiver-plane gradient are exactly the sort of thing that
// two copies would quietly disagree about.
#include<snowShadowLookup>

// -----------------------------------------------------------------------------

/// Diagnostic: how far the depth map and the receiver disagree, in metres.
///
/// Projects exactly as `sampleCascadeTex` does — same normal offset, same
/// cascade selection — but takes the single centre tap and returns
/// (stored - receiver) scaled to world metres. Near zero means the two passes
/// are describing the same surface and any remaining artefact is a bias or
/// filter question. Hundreds of metres means they are not, and no amount of
/// bias tuning is going to help.
fn shadowMapDelta(world: vec3f, geoN: vec3f, viewDist: f32) -> f32 {
    let sp = uniforms.cascadeSplits;
    var m = uniforms.cascadeMatrices[2];
    var params = uniforms.cascadeParams[2];
    var idx = 2;
    if (viewDist < sp.x) { m = uniforms.cascadeMatrices[0]; params = uniforms.cascadeParams[0]; idx = 0; }
    else if (viewDist < sp.y) { m = uniforms.cascadeMatrices[1]; params = uniforms.cascadeParams[1]; idx = 1; }

    let lf = -uniforms.sunDir;
    let lr = normalize(cross(vec3f(0.0, 1.0, 0.0), lf));
    let nl3 = vec3f(dot(geoN, lr), dot(geoN, cross(lf, lr)), dot(geoN, lf));
    let sinL = sqrt(clamp(1.0 - nl3.z * nl3.z, 0.0, 1.0));
    let biased = world + geoN * (params.y * uniforms.shadowTexel * 1.5 * max(sinL, 0.2));

    let clip = m * vec4f(biased, 1.0);
    let ndc = clip.xyz / clip.w;
    // 1e9 flags "this point is not inside the cascade at all".
    if (any(abs(ndc.xy) > vec2f(1.0)) || ndc.z < 0.0 || ndc.z > 1.0) { return 1e9; }

    let uv = vec2f(ndc.x * 0.5 + 0.5, 0.5 + ndc.y * 0.5);
    var d = 0.0;
    if (idx == 0) { d = textureSampleLevel(cascade0, cascade0Sampler, uv, 0.0).r; }
    else if (idx == 1) { d = textureSampleLevel(cascade1, cascade1Sampler, uv, 0.0).r; }
    else { d = textureSampleLevel(cascade2, cascade2Sampler, uv, 0.0).r; }

    return (d - ndc.z) * params.x;
}

/// Unpack a two-channel tangent-space normal.
fn unpackN(rg: vec2f) -> vec3f {
    let xy = rg * 2.0 - 1.0;
    return vec3f(xy, sqrt(max(0.0, 1.0 - dot(xy, xy))));
}

/// Triplanar detail-normal fetch. Snow on a steep rock face has no sensible
/// planar projection, and stretching the grain up a 60-degree slope is instantly
/// legible as a smear.
///
/// Gradients are passed in rather than taken here: every call site sits behind a
/// footprint test, and WGSL forbids implicit-derivative sampling under
/// non-uniform control flow. Explicit gradients keep full mip filtering — which
/// this absolutely needs, since the whole point of the fade-in is anti-aliasing.
fn detailNormal(
    world: vec3f, N: vec3f, scale: f32, blendSteep: f32,
    ddxW: vec3f, ddyW: vec3f
) -> vec3f {
    var n = unpackN(textureSampleGrad(
        detailTex, detailTexSampler, world.xz * scale,
        ddxW.xz * scale, ddyW.xz * scale
    ).xy);

    if (blendSteep > 0.01) {
        let a = unpackN(textureSampleGrad(
            detailTex, detailTexSampler, world.xy * scale,
            ddxW.xy * scale, ddyW.xy * scale
        ).xy);
        let b = unpackN(textureSampleGrad(
            detailTex, detailTexSampler, world.zy * scale,
            ddxW.zy * scale, ddyW.zy * scale
        ).xy);
        let w = abs(N);
        let sum = w.x + w.y + w.z;
        n = normalize(mix(n, (a * w.z + b * w.x + n * w.y) / sum, blendSteep));
    }
    return n;
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let world = input.vWorld;
    let viewDist = input.vViewDist;
    let V = normalize(uniforms.cameraPos - world);
    let L = uniforms.sunDir;

    // World-space size of this pixel — drives every filtering decision below.
    // Taken once here, in uniform control flow, and threaded down to the texture
    // fetches that sit behind footprint tests.
    let ddxW = dpdx(world);
    let ddyW = dpdy(world);
    let footprint = max(length(vec2f(length(ddxW.xz), length(ddyW.xz))), 1e-4);

    // The *narrow* axis of that footprint, which is a very different number.
    //
    // At grazing incidence a pixel's world footprint is a long thin sliver: one
    // axis blows up while the other stays small. `footprint` above averages the
    // two, so simply tilting the camera down towards the horizon inflates it by
    // an order of magnitude — and anything keyed off it fades out, even though
    // the surface is no further away and is still perfectly resolvable across the
    // sliver's short axis. For the natural detail layers that trade is fine and
    // deliberate. For carved snow it is not: it means the trail changes shape
    // when you move the camera and not the player, which reads as a bug because
    // it is one. This is the same reasoning anisotropic texture filtering runs on.
    let footprintMin = max(min(length(ddxW.xz), length(ddyW.xz)), 1e-4);

    // ---------------------------------------------------------------- slopes
#ifdef EXALTED_TERRAIN
    // The 4K authored map supersedes sparse COLOR_0 interpolation. Its U axis
    // is mirrored relative to Babylon X; V follows Babylon Z from north to south.
    // A sub-metre, low-frequency world-space warp removes the mechanically
    // smooth edge without changing the authored biome layout or road width.
    let biomeWarp = vec2f(
        noise2(world.xz * 0.16),
        noise2(world.xz * 0.16 + vec2f(31.7, 9.2))
    ) * 0.75;
#ifdef HEIGHTMAP_TERRAIN
    // Match CPU endpoint sampling; no visual warp across gameplay road boundaries.
    var biomeUV = clamp((world.xz - uniforms.surfaceOrigin) / uniforms.surfaceExtent, vec2f(0.0), vec2f(1.0));
#else
    var biomeUV = clamp((world.xz + biomeWarp - uniforms.surfaceOrigin) / uniforms.surfaceExtent, vec2f(0.0), vec2f(1.0));
#endif
    biomeUV.x = 1.0 - biomeUV.x;
#ifdef HEIGHTMAP_TERRAIN
    let biomeDims = vec2f(textureDimensions(biomeMapTex));
    biomeUV = (biomeUV * (biomeDims - 1.0) + 0.5) / biomeDims;
#endif
    let biomeColor = textureSampleLevel(biomeMapTex, biomeMapTexSampler, biomeUV, 0.0).rgb;
    // A normalized three-way blend keeps detailed snow, desert and road
    // materials complementary through the softened authored boundaries.
#ifdef HEIGHTMAP_TERRAIN
    let materialData = mappedSurfaceData(world.xz);
    let materialWeights = materialData.rgb;
#else
    let materialWeights = biomeMapMaterialWeights(biomeColor);
#endif
    let snowCover = materialWeights.x;
    let roadCover = materialWeights.z;
#ifdef HEIGHTMAP_TERRAIN
    let groundDims = vec2f(textureDimensions(groundCoverageTex));
    var groundMaskUV = clamp((world.xz - uniforms.surfaceOrigin) / uniforms.surfaceExtent, vec2f(0.0), vec2f(1.0));
    groundMaskUV.x = 1.0 - groundMaskUV.x;
    groundMaskUV = (groundMaskUV * (groundDims - 1.0) + .5) / groundDims;
    let groundWeights = textureSampleLevel(groundCoverageTex, biomeMapTexSampler, groundMaskUV, 0.0).rgb;
    let grassWeight = groundWeights.r;
    let forestWeight = groundWeights.g;
    // Road is applied once as the final overlay. Keep complete land underneath
    // its feathered shoulder instead of fading the land a second time.
    // Land masks already exclude deep water. Beach is authored land treatment
    // even where the independent water-eligibility channel is one.
    let otherCover = clamp(snowCover, 0.0, 1.0);
    let sandCover = groundWeights.b * (1.0 - otherCover);
    // Packed detail mask: R=rock, G=beach, B reserved; shares biome sampler.
    let detailWeights = textureSampleLevel(detailCoverageTex, biomeMapTexSampler, groundMaskUV, 0.0).rg;
    let rockCover = detailWeights.r * (1.0 - otherCover);
    let beachCover = detailWeights.g * (1.0 - otherCover);
#else
    let rockCover = 0.0;
    let beachCover = 0.0;
    let sandCover = materialWeights.y;
    let grassWeight = authoredGrassWeight(input.vBiomeColor);
    let forestPaletteWeight = 1.0 - smoothstep(0.025, 0.1, distance(biomeColor, vec3f(124.0, 170.0, 129.0) / 255.0));
    let forestWeight = max(forestPaletteWeight, forestOverlookGroundWeight(world.xz, biomeColor));
    let otherCover = clamp(snowCover + sandCover + roadCover, 0.0, 1.0);
#endif
    let grassCover = grassWeight * (1.0 - otherCover);
    let forestCover = forestWeight * (1.0 - otherCover);
    let desertTextureCover = sandCover * uniforms.useDesertTextures;
    let groundUV = vec2f(dot(vec3f(world.xz,1.0),uniforms.desertU),dot(vec3f(world.xz,1.0),uniforms.desertV));
    let groundDx = vec2f(dot(ddxW.xz,uniforms.desertU.xy),dot(ddxW.xz,uniforms.desertV.xy));
    let groundDy = vec2f(dot(ddyW.xz,uniforms.desertU.xy),dot(ddyW.xz,uniforms.desertV.xy));
    let importedNormal = normalize(input.vTerrainNormal);
    let aux = vec4f(-importedNormal.xz / max(abs(importedNormal.y), 0.02), 0.0, 0.5);
#else
    let snowCover = 1.0;
    let sandCover = 0.0;
    let desertTextureCover = 0.0;
    let roadCover = 0.0;
    let grassCover = 0.0;
    let forestCover = 0.0;
    let rockCover = 0.0;
    let beachCover = 0.0;
    let aux = textureSampleLevel(auxTex, auxTexSampler, input.vHeightUV, 0.0);
#endif
    let vegetationCover = clamp(grassCover + forestCover, 0.0, 1.0);
    let texturedCover = clamp(vegetationCover + desertTextureCover + roadCover + rockCover + beachCover, 0.0, 1.0);
    var grad = aux.xy;
    let rockMask = aux.z;
    let exposure = aux.w;

    let fine = terrainFineFiltered(
        world.xz, uniforms.windAngle, exposure, uniforms.sastrugiAmp * (snowCover + sandCover * (1.0 - roadCover) * 0.18), footprint
    );
    grad += fine.yz;

    // ------------------------------------------------------------ deformation
    // Depression, displaced berm mass and compression, written by feet, the
    // surf wake and every spell. Read here so lighting responds to carved snow
    // exactly as it does to natural relief.
    var compression = 0.0;
    var iceAmount = 0.0;
    var deformDepth = 0.0;
    var deformBerm = 0.0;

#ifdef EXALTED_TERRAIN
    let dWeight = deformFalloff(world.xz, uniforms.deformCenter, uniforms.deformSize)
        * localFade(world.xz, uniforms.patchCenter) * (snowCover + sandCover);
#else
    let dWeight = deformFalloff(world.xz, uniforms.deformCenter, uniforms.deformSize);
#endif
    if (dWeight > 0.001) {
        let dUV = deformUV(world.xz, uniforms.deformSize);
        let c = textureSampleLevel(deformTex, deformTexSampler, dUV, 0.0);

        // Gradient of (berm - depression), by central difference.
        //
        // The step *widens with the pixel* rather than being fixed at two texels
        // behind a distance fade. Two texels differenced at 30 m is a normal
        // sampled far below the pixel's own footprint, so it aliases. Fading it
        // out fixes the aliasing but stops the trail existing about fifteen
        // metres out, and a run should be visible from across the field.
        //
        // Widening the baseline is the better answer: it is the low-pass filter
        // the fade was standing in for. The difference stays bounded while the
        // divisor grows, so the gradient rolls off smoothly with distance instead
        // of being switched off, and the trail survives as a tonal line long
        // after it has stopped being a shape.
        //
        // Keyed to the narrow footprint axis, so the width tracks how far away the
        // snow is and not how obliquely it is being looked at.
        let step = max(uniforms.deformTexel * 2.0, footprintMin * 1.4);
        let eUV = step / uniforms.deformSize;

        let dxA = textureSampleLevel(deformTex, deformTexSampler, dUV + vec2f(eUV, 0.0), 0.0);
        let dxB = textureSampleLevel(deformTex, deformTexSampler, dUV - vec2f(eUV, 0.0), 0.0);
        let dzA = textureSampleLevel(deformTex, deformTexSampler, dUV + vec2f(0.0, eUV), 0.0);
        let dzB = textureSampleLevel(deformTex, deformTexSampler, dUV - vec2f(0.0, eUV), 0.0);
        let sx = (dxA.g - dxA.r) - (dxB.g - dxB.r);
        let sz = (dzA.g - dzA.r) - (dzB.g - dzB.r);

        // The four neighbours are already fetched, so blending them into the
        // state channels once the pixel is wider than a texel costs nothing and
        // stops a distant trail breaking into a dotted line.
        let wide = clamp(footprintMin / (uniforms.deformTexel * 4.0), 0.0, 1.0) * 0.8;
        let df = mix(c, (c + dxA + dxB + dzA + dzB) * 0.2, wide);

        deformDepth = df.r * dWeight;
        deformBerm = df.g * dWeight;
        compression = clamp(df.b, 0.0, 1.0) * dWeight;
        iceAmount = clamp(df.a, 0.0, 1.0) * dWeight;

        grad += vec2f(sx, sz) / (2.0 * step) * uniforms.deformDepthScale * dWeight;
    }

    var N = normalFromGradient(grad);
#ifdef EXALTED_TERRAIN
    N = normalize(importedNormal - vec3f(grad.x - aux.x, 0.0, grad.y - aux.y));
#endif

    // The surface the *depth pass* rendered: macro landform, the analytic fine
    // layer and carved snow, but nothing finer. The shading normal below picks up
    // three tiled grain scales on top of this, and biasing the shadow lookup
    // against that would describe a surface orders of magnitude higher in
    // frequency than the one in the depth map — the offset would point off in a
    // different direction on every pixel and reintroduce the noise it exists to
    // remove.
#ifdef EXALTED_TERRAIN
    let geoN = N;
#else
    let geoN = N;
#endif

    // ---------------------------------------------------------- detail normals
    // Three tiling scales, each faded by footprint so the finest only exists
    // when it is actually resolvable, and cross-faded so no scale ever pops in.
    let steep = smoothstep(0.55, 0.9, 1.0 - N.y);
    if (uniforms.detailStrength > 0.001 && texturedCover < 0.999) {
        var acc = vec3f(0.0, 0.0, 1.0);

        let f0 = 1.0 - smoothstep(0.004, 0.02, footprint);
        if (f0 > 0.001) {
            let d = detailNormal(world, N, 7.5, steep, ddxW, ddyW);
            acc = blendNormalRNM(acc, mix(vec3f(0.0, 0.0, 1.0), d, f0));
        }
        let f1 = 1.0 - smoothstep(0.02, 0.12, footprint);
        if (f1 > 0.001) {
            let d = detailNormal(world, N, 1.7, steep, ddxW, ddyW);
            acc = blendNormalRNM(acc, mix(vec3f(0.0, 0.0, 1.0), d, f1 * 0.85));
        }
        let f2 = 1.0 - smoothstep(0.1, 0.7, footprint);
        if (f2 > 0.001) {
            let d = detailNormal(world, N, 0.31, steep, ddxW, ddyW);
            acc = blendNormalRNM(acc, mix(vec3f(0.0, 0.0, 1.0), d, f2 * 0.6));
        }

        // Lift the tangent-space result onto the geometric normal.
        let up = select(vec3f(0.0, 1.0, 0.0), vec3f(1.0, 0.0, 0.0), abs(N.y) > 0.99);
        let T = normalize(cross(up, N));
        let B = cross(N, T);
        let s = uniforms.detailStrength * mix(1.0, 0.45, compression) * mix(1.0,0.48,sandCover) * (1.0-texturedCover);
        N = normalize(N + (T * acc.x + B * acc.y) * s);
    }

    let cavity = textureSampleGrad(
        detailTex, detailTexSampler, world.xz * 1.7,
        ddxW.xz * 1.7, ddyW.xz * 1.7
    ).z;

    // ------------------------------------------------------------- material
    // Snow albedo sits in a narrow, high, slightly blue band. It is never 1.0:
    // pushing albedo to white is what produces the blown-out clipped highlights
    // that read as "untextured white blob" rather than as snow.
    var albedo = vec3f(0.855, 0.885, 0.945);
    var roughness = 0.62;
    var f0 = vec3f(0.028);
    var groundAO = 1.0;
    var thickness = 1.0; // 1 = deep drift, 0 = thin crust
#ifdef EXALTED_TERRAIN
    // Biomes without dedicated PBR sets use the softened 4K authored color.
    albedo = mix(biomeColor, albedo, snowCover);
    roughness = mix(0.88, roughness, snowCover);
    thickness *= snowCover;
    if (desertTextureCover > 0.001) {
        let desertBlend = clamp(sandCover / max(1.0 - vegetationCover - rockCover - beachCover, 1e-5), 0.0, 1.0);
        // Reuse the imported floor's world-space UV scale, offset and orientation so
        // the coarse mesh, moving detail patch and footprints never change tiling.
        let uv=(uniforms.desertBaseMatrix*vec4f(groundUV,1.0,0.0)).xy;
        let dx=(uniforms.desertBaseMatrix*vec4f(groundDx,0.0,0.0)).xy;
        let dy=(uniforms.desertBaseMatrix*vec4f(groundDy,0.0,0.0)).xy;
        let base=textureSampleGrad(desertBaseTex,desertBaseTexSampler,uv,dx,dy).rgb;
        let decoded=select(base/12.92,pow((base+vec3f(0.055))/1.055,vec3f(2.4)),base>vec3f(0.04045));
        albedo=mix(albedo,mix(base,decoded,uniforms.desertGamma)*uniforms.desertColor,desertBlend);
        roughness=mix(roughness,uniforms.desertRoughness,desertBlend);
        let nuv=(uniforms.desertNormalMatrix*vec4f(groundUV,1.0,0.0)).xy;
        let ndx=(uniforms.desertNormalMatrix*vec4f(groundDx,0.0,0.0)).xy;
        let ndy=(uniforms.desertNormalMatrix*vec4f(groundDy,0.0,0.0)).xy;
        let bump=textureSampleGrad(desertNormalTex,desertNormalTexSampler,nuv,ndx,ndy).xyz*2.0-1.0;
        let T=cross(ddyW,N)*ndx.x+cross(N,ddxW)*ndy.x;
        let B=cross(ddyW,N)*ndx.y+cross(N,ddxW)*ndy.y;
        let scale=inverseSqrt(max(max(dot(T,T),dot(B,B)),1e-12));
        let mapped=normalize(N*max(bump.z,.1)+(T*bump.x*uniforms.desertNormalScale.x+B*bump.y*uniforms.desertNormalScale.y)*scale);
        N=normalize(mix(N,mapped,desertBlend*mix(1.0,.65,compression)));
    }
    if (grassCover > 0.001) {
        // Forest is blended afterwards; normalize this stage so final weights
        // are grass/forest/remaining ground, without a pale fallback seam.
        let grassBlend = clamp(grassCover / max(1.0 - forestCover - rockCover - beachCover, 1e-5), 0.0, 1.0);
        // Match Grassland UV2 exactly: one repeat per 4 m, mirrored world X.
        let meadowUV = vec2f(-world.x, world.z) * uniforms.meadowTextureScale;
        let meadowDx = vec2f(-ddxW.x, ddxW.z) * uniforms.meadowTextureScale;
        let meadowDy = vec2f(-ddyW.x, ddyW.z) * uniforms.meadowTextureScale;
        let base = textureSampleGrad(meadowBaseTex, meadowBaseTexSampler, meadowUV, meadowDx, meadowDy).rgb;
        let decoded = select(base / 12.92, pow((base + vec3f(.055)) / 1.055, vec3f(2.4)), base > vec3f(.04045));
        let orm = textureSampleGrad(meadowOrmTex, meadowOrmTexSampler, meadowUV, meadowDx, meadowDy).rgb;
        let meadowAlbedo = mix(base, decoded, uniforms.meadowGamma);
        albedo = mix(albedo, meadowAlbedo, grassBlend);
        roughness = mix(roughness, clamp(orm.g, .045, 1.0), grassBlend);
        f0 = mix(f0, mix(vec3f(.04), meadowAlbedo, orm.b), grassBlend);
        groundAO = mix(groundAO, orm.r, grassBlend);
        let bump = textureSampleGrad(meadowNormalTex, meadowNormalTexSampler, meadowUV, meadowDx, meadowDy).xyz * 2.0 - 1.0;
        let T = cross(ddyW, N) * meadowDx.x + cross(N, ddxW) * meadowDy.x;
        let B = cross(ddyW, N) * meadowDx.y + cross(N, ddxW) * meadowDy.y;
        let scale = inverseSqrt(max(max(dot(T,T), dot(B,B)), 1e-12));
        let mapped = normalize(N * max(bump.z, .1) + (T * bump.x + B * bump.y) * scale);
        N = normalize(mix(N, mapped, grassBlend));
    }
    if (forestCover > 0.001) {
        let forestBlend = clamp(forestCover / max(1.0 - rockCover - beachCover, 1e-5), 0.0, 1.0);
        // Continuous world-space mapping on both coarse terrain and local detail.
        let forestUV = vec2f(-world.x, world.z) * uniforms.forestTextureScale;
        let forestDx = vec2f(-ddxW.x, ddxW.z) * uniforms.forestTextureScale;
        let forestDy = vec2f(-ddyW.x, ddyW.z) * uniforms.forestTextureScale;
        let base = textureSampleGrad(forestBaseTex, meadowBaseTexSampler, forestUV, forestDx, forestDy).rgb;
        let decoded = select(base / 12.92, pow((base + vec3f(.055)) / 1.055, vec3f(2.4)), base > vec3f(.04045));
        let arm = textureSampleGrad(forestArmTex, meadowOrmTexSampler, forestUV, forestDx, forestDy).rgb;
        let forestAlbedo = mix(base, decoded, uniforms.forestGamma);
        albedo = mix(albedo, forestAlbedo, forestBlend);
        roughness = mix(roughness, clamp(arm.g, .045, 1.0), forestBlend);
        f0 = mix(f0, mix(vec3f(.04), forestAlbedo, arm.b), forestBlend);
        groundAO = mix(groundAO, arm.r, forestBlend);
        let bump = textureSampleGrad(forestNormalTex, meadowNormalTexSampler, forestUV, forestDx, forestDy).xyz * 2.0 - 1.0;
        let T = cross(ddyW, N) * forestDx.x + cross(N, ddxW) * forestDy.x;
        let B = cross(ddyW, N) * forestDx.y + cross(N, ddxW) * forestDy.y;
        let scale = inverseSqrt(max(max(dot(T,T), dot(B,B)), 1e-12));
        let mapped = normalize(N * max(bump.z, .1) + (T * bump.x + B * bump.y) * scale);
        N = normalize(mix(N, mapped, forestBlend));
    }
#ifdef HEIGHTMAP_TERRAIN
    if (rockCover > 0.001) {
        let rockBlend = clamp(rockCover / max(1.0 - beachCover, 1e-5), 0.0, 1.0);
        let uv = vec2f(-world.x, world.z) * uniforms.rockTextureScale;
        let dx = vec2f(-ddxW.x, ddxW.z) * uniforms.rockTextureScale;
        let dy = vec2f(-ddyW.x, ddyW.z) * uniforms.rockTextureScale;
        let sampled = sampleRockGround(uv, dx, dy);
        let rockAlbedo = sampled.base * (.97 + .03 * noise2(world.xz * .025));
        let arm = sampled.arm;
        albedo = mix(albedo, rockAlbedo, rockBlend);
        roughness = mix(roughness, clamp(arm.g, .045, 1.0), rockBlend);
        f0 = mix(f0, mix(vec3f(.04), rockAlbedo, arm.b), rockBlend);
        groundAO = mix(groundAO, arm.r, rockBlend);
        let bump = sampled.normal;
        let T = cross(ddyW, N) * dx.x + cross(N, ddxW) * dy.x;
        let B = cross(ddyW, N) * dx.y + cross(N, ddxW) * dy.y;
        let scale = inverseSqrt(max(max(dot(T,T), dot(B,B)), 1e-12));
        let mapped = normalize(N * max(bump.z, .1) + (T * bump.x + B * bump.y) * scale);
        N = normalize(mix(N, mapped, rockBlend));
    }
    if (beachCover > 0.001) {
        let uv = vec2f(-world.x, world.z) * uniforms.beachTextureScale;
        let dx = vec2f(-ddxW.x, ddxW.z) * uniforms.beachTextureScale;
        let dy = vec2f(-ddyW.x, ddyW.z) * uniforms.beachTextureScale;
        let sampled = sampleBeachGround(uv, dx, dy);
        let beachAlbedo = sampled.base;
        let arm = sampled.arm;
        albedo = mix(albedo, beachAlbedo, beachCover);
        roughness = mix(roughness, clamp(arm.g, .045, 1.0), beachCover);
        f0 = mix(f0, mix(vec3f(.04), beachAlbedo, arm.b), beachCover);
        groundAO = mix(groundAO, arm.r, beachCover);
        let bump = sampled.normal;
        let T = cross(ddyW, N) * dx.x + cross(N, ddxW) * dy.x;
        let B = cross(ddyW, N) * dx.y + cross(N, ddxW) * dy.y;
        let scale = inverseSqrt(max(max(dot(T,T), dot(B,B)), 1e-12));
        let mapped = normalize(N * max(bump.z, .1) + (T * bump.x + B * bump.y) * scale);
        N = normalize(mix(N, mapped, beachCover));
    }
#endif
    if (roadCover > 0.001) {
        // The road is authored as one connected COLOR_0 region. World mapping
        // keeps its texel density stable across the coarse terrain and the
        // moving local-detail patch without requiring another road mesh.
        let roadUV=world.xz*uniforms.roadTextureScale;
        let roadDx=ddxW.xz*uniforms.roadTextureScale;
        let roadDy=ddyW.xz*uniforms.roadTextureScale;
        var roadBase=textureSampleGrad(roadBaseTex,roadBaseTexSampler,roadUV,roadDx,roadDy).rgb;
        let decoded=select(roadBase/12.92,pow((roadBase+vec3f(.055))/1.055,vec3f(2.4)),roadBase>vec3f(.04045));
        roadBase=mix(roadBase,decoded,uniforms.roadGamma);
        // Very-low-frequency value variation breaks the kilometre-scale repeat
        // while leaving stones and embedded grass in the authored texture.
        roadBase*=.92+.12*(noise2(world.xz*.025)*.5+.5);
        let roadArm=textureSampleGrad(roadArmTex,roadArmTexSampler,roadUV,roadDx,roadDy).rgb;
        albedo=mix(albedo,roadBase,roadCover);
        roughness=mix(roughness,clamp(roadArm.g,.045,1.0),roadCover);
        f0=mix(f0,mix(vec3f(.04),roadBase,roadArm.b),roadCover);
        groundAO=mix(groundAO,roadArm.r,roadCover);
        let bump=textureSampleGrad(roadNormalTex,roadNormalTexSampler,roadUV,roadDx,roadDy).xyz*2.0-1.0;
        let T=cross(ddyW,N)*roadDx.x+cross(N,ddxW)*roadDy.x;
        let B=cross(ddyW,N)*roadDx.y+cross(N,ddxW)*roadDy.y;
        let scale=inverseSqrt(max(max(dot(T,T),dot(B,B)),1e-12));
        let mapped=normalize(N*max(bump.z,.1)+(T*bump.x+B*bump.y)*scale*uniforms.roadNormalStrength);
        N=normalize(mix(N,mapped,roadCover));
    }
#endif

    // Compressed snow: denser, darker, tighter specular, scatters less.
    let soilBaseColor = albedo;
    let packedColor = mix(vec3f(0.62, 0.665, 0.755), soilBaseColor * mix(0.82,0.92,desertTextureCover), sandCover);
    albedo = mix(albedo, packedColor, compression * 0.85);
    // Soil compacts without becoming the smooth, reflective material used for snow.
    let packedRoughness = mix(0.34,mix(0.76,0.84,desertTextureCover),sandCover);
    roughness = mix(roughness, packedRoughness, compression);
    thickness = mix(thickness, 0.35, compression);

    // Refrozen ice: smooth and genuinely reflective.
    albedo = mix(albedo, vec3f(0.42, 0.56, 0.70), iceAmount * 0.8);
    roughness = mix(roughness, 0.07, iceAmount);
    f0 = mix(f0, vec3f(0.045), iceAmount);
    thickness = mix(thickness, 0.15, iceAmount);

    // Exposed rock. Snow keeps its grip on the flatter faces, so the mask is
    // gated by slope rather than applied flat.
#ifdef EXALTED_TERRAIN
    let rockExposed = 1.0 - snowCover;
#else
    let rockExposed = rockMask * smoothstep(0.32, 0.66, 1.0 - N.y);
    if (rockExposed > 0.001) {
        let rn = noise2(world.xz * 2.3) * 0.5 + 0.5;
        let rockCol = mix(vec3f(0.055, 0.058, 0.068), vec3f(0.115, 0.112, 0.118), rn);
        albedo = mix(albedo, rockCol, rockExposed);
        roughness = mix(roughness, 0.85, rockExposed);
        thickness = mix(thickness, 0.0, rockExposed);
    }
#endif

    // --- carved-snow surface state -----------------------------------------
    // Freshly displaced mass is the opposite of trodden snow: it has just been
    // broken up and thrown, so it is loose, bright and rough. Without this the
    // berms shade identically to the trench and the whole trail flattens into
    // one grey smear.
    //
    // Both numbers here must not make carved snow *less blue*, which is the one
    // axis this material cannot afford to lose. Drain the cool cast out of a
    // heavily worked patch and it reads as bare ground even while its luminance
    // goes up — a warm-grey patch surrounded by blue-white snow is not snow.
    //
    //  1. The loose colour was a *whiter* white — B/R 1.078 against snow's 1.105
    //     — so brightening toward it desaturated. It is now brighter than snow in
    //     every channel and very slightly bluer, which is also the truer answer:
    //     freshly broken snow has more surface per unit volume and scatters more,
    //     and snow's scattering is what its blue comes from.
    //  2. Roughness at 0.78 cut the ambient sky specular, through both the
    //     roughness-dependent Fresnel and a blurrier mip. That term is one of the
    //     bluest things in the frame, and a berm loses it exactly where the eye
    //     is comparing it against snow that still has it. Loose snow is still
    //     rougher than packed — it should be — just not by enough to strip the
    //     sky out of it.
    if (deformBerm > 0.002) {
        let loose = clamp(deformBerm * 5.0, 0.0, 1.0);
        let soilRim = soilBaseColor * mix(1.12,1.10,desertTextureCover);
        albedo = mix(albedo, mix(vec3f(0.895, 0.920, 0.965), soilRim, sandCover), loose * 0.55);
        roughness = mix(roughness, mix(0.78,mix(0.92,0.98,desertTextureCover),sandCover), loose * 0.7);
        thickness = mix(thickness, 1.0, loose * 0.6);
        // Broken snow has crystal faces pointing everywhere, which is where the
        // chunky granular read at a trail edge actually comes from.
        let chunk = noise2(world.xz * 34.0) * 0.5 + 0.5;
        albedo *= 1.0 - loose * 0.10 * chunk;
    }

    // Micro-occlusion in the grain crevices, and stronger in carved edges. See
    // the note where this is applied, at the bottom: it scales the whole
    // radiance, not the ambient, and it carries a blue shift with it.
    //
    // Analytic only, deliberately. A snow field is the worst possible content
    // for a screen-space occlusion pass: an open, smooth, high-albedo surface
    // viewed at grazing angles, so the estimator has almost no real occluders to
    // find and what it returns is dominated by its own view-dependent bias — a
    // broad, soft darkening keyed to distance from the camera, which slides
    // across the ground when the camera moves and nothing else does.
    thickness *= snowCover;
    var ao = mix(1.0, cavity, 0.35 * (1.0-desertTextureCover) * (1.0-roadCover) * (1.0 - smoothstep(0.02, 0.25, footprint)))
           * (1.0 - clamp(deformDepth * 1.9, 0.0, 1.0) * mix(0.38,mix(0.25,0.18,desertTextureCover),sandCover));

    ao *= groundAO;

    // ------------------------------------------------------------- lighting
    let NdotL = dot(N, L);
    let NdotV = clamp(dot(N, V), 1e-4, 1.0);

    // Stable per-pixel rotation for the shadow filter. IGN over pixel coords is
    // exactly the noise TAA is built to resolve.
    let pix = input.position.xy;
    let noiseRot = ign(pix) * 6.28318530718;

    var shadow = 1.0;
    if (NdotL > -0.35) {
        shadow = sunShadow(world, geoN, viewDist, noiseRot);
    }

    let sunRadiance = uniforms.sunRadiance;
    const INV_PI: f32 = 0.31830988618;

    // --- direct diffuse, wrapped -------------------------------------------
    // Snow's mean free path is millimetres, so light wraps well past the
    // geometric terminator. This is why snow shadow edges are soft even where
    // the shadow map is pin sharp.
    let wrapAmount = mix(0.62, 0.15, max(compression, rockExposed));
    let diff = wrapDiffuse(NdotL, wrapAmount);
    var direct = albedo * INV_PI * sunRadiance * diff * shadow;

    // --- subsurface --------------------------------------------------------
    let sss = snowSubsurface(
        N, L, V, sunRadiance, thickness,
        uniforms.sssStrength * (1.0 - rockExposed), uniforms.sssRadius
    );
    // Only partly shadowed: scattered light arrives through the snow, so a
    // shadowed drift lip still glows. Killing this with the shadow term is what
    // makes shadowed snow go flat and grey.
    direct += sss * albedo * mix(0.42, 1.0, shadow);

    // --- direct specular ---------------------------------------------------
    if (NdotL > 0.0) {
        let H = normalize(V + L);
        let NdotH = clamp(dot(N, H), 0.0, 1.0);
        let VdotH = clamp(dot(V, H), 0.0, 1.0);
        let D = distributionGGX(NdotH, roughness);
        let Vis = visSmithGGXCorrelated(NdotV, NdotL, roughness);
        let F = fresnelSchlick(VdotH, f0);
        direct += sunRadiance * D * Vis * F * NdotL * shadow;
    }

    // --- ambient -----------------------------------------------------------
    // Sky irradiance from SH. Strongly blue by construction, which is the other
    // half of the warm-light / cool-shadow split that sells snow.
    var irradiance = shIrradiance(N, uniforms.shR) * uniforms.ambientIntensity;

    // Snow bounces onto itself: a huge, bright, near-white surround. Without a
    // bounce term the troughs go far too dark for a material with 0.85 albedo.
    let bounceUp = clamp(-N.y * 0.5 + 0.5, 0.0, 1.0);
    irradiance += shIrradiance(vec3f(0.0, 1.0, 0.0), uniforms.shR)
                * uniforms.ambientIntensity * 0.28 * bounceUp * albedo;

    var ambient = albedo * INV_PI * irradiance;

    // Ambient specular from the sky, at a roughness-selected mip.
    let R = reflect(-V, N);
    let mip = sqrt(roughness) * 6.0;
    let skyRefl = textureSampleLevel(skyLUT, skyLUTSampler, dirToLatLong(R), mip).rgb;
    let Fr = fresnelSchlickRough(NdotV, f0, roughness);
    ambient += skyRefl * Fr * uniforms.ambientIntensity * mix(1.0, 2.6, iceAmount);

    var color = direct + ambient;

    // --- spell light -------------------------------------------------------
    // Same wrapped diffuse and the same transmission lobe the sun drives, so a
    // ribbon of lit water lying across a berm glows *through* the crest instead
    // of merely putting a bright patch on the near face. That through-scatter is
    // the whole reason the term is here rather than being a stock point light.
    //
    // The occlusion below scales this along with everything else: a spell casting
    // into an open field and a spell casting into the bottom of its own crater
    // are lighting very different amounts of visible snow.
    if (uniforms.spellLightCount > 0.5) {
        color += spellLighting(
            world, N, V, albedo, thickness,
            uniforms.sssStrength * (1.0 - rockExposed), uniforms.sssRadius,
            uniforms.spellLightPos, uniforms.spellLightCol, uniforms.spellLightCount
        );
    }

    // --- glints ------------------------------------------------------------
    // Last, and added as radiance rather than modulated into the BRDF, because
    // a glint is a specular highlight from a crystal facet that the shading
    // normal does not represent.
    if (uniforms.glintIntensity > 0.001 && rockExposed < 0.5 && vegetationCover < .999) {
        let g = snowGlints(
            world.xz, N, V, L, footprint,
            uniforms.glintIntensity, uniforms.glintGrazing
        );
        color += sunRadiance * g * shadow * (1.0 - iceAmount * 0.6) * 0.55 * (1.0 - vegetationCover);
    }

    // ---- occlusion, applied last and to everything -------------------------
    //
    // Two rules, the same two the surf wake's fragment shader carries. Both are
    // about hue rather than brightness.
    //
    //  1. It scales the *finished radiance*, not the ambient. The textbook says
    //     occlusion darkens ambient and leaves direct light alone, and in this
    //     scene that is actively wrong: the ambient is where all the blue lives —
    //     the sky is strongly blue-shifted by construction — and the sun is a
    //     13-degree beam at roughly 17:13:6. Attenuating one and not the other
    //     does not darken a surface, it re-weights a cool source against a warm
    //     one. A trench floor at 40% ambient and 100% sun is not a dark trench,
    //     it is a *brown* trench, and it lands there because AgX stops rolling
    //     saturation off half a stop below its shoulder.
    //
    //  2. Wherever it does darken, it goes blue in proportion. Light reaching
    //     into a hollow in snow has scattered through snow to get there, and snow
    //     absorbs red over any appreciable path — which is why a real snow cave
    //     is blue and not grey. The tint is the same `deepTint` the subsurface
    //     term uses, and tying it to the darkening rather than to `deformDepth`
    //     means the two can never drift apart.
    let caveTint = mix(vec3f(1.0), vec3f(0.55, 0.72, 1.0), (1.0 - ao) * 0.95 * snowCover);
    color *= ao * caveTint;

    // ------------------------------------------------------- aerial perspective
    color = applyAerial(
        color, uniforms.cameraPos, world, -V, L,
        skyLUT, skyLUTSampler, sunRadiance,
        uniforms.fogDensity, uniforms.fogHeightFalloff, uniforms.fogStart,
        uniforms.aerialStrength
    );

    // ------------------------------------------------------------------ debug
    if (uniforms.debugMode > 0.5) {
        if (uniforms.debugMode < 1.5) {
            // Depression and berm are metres and berms are the shallower of the
            // two, so both are scaled to fill the range rather than shown raw —
            // otherwise the channel that matters most reads as black.
            color = vec3f(deformDepth * 2.5, deformBerm * 5.0, compression * 0.6);
        } else if (uniforms.debugMode < 2.5) {
            color = N * 0.5 + 0.5;
        } else if (uniforms.debugMode < 3.5) {
            color = vec3f(viewDist / 400.0);
        } else if (uniforms.debugMode > 4.5 && uniforms.debugMode < 5.5) {
            // Pixel footprint, log-scaled: green ~1 cm, yellow ~10 cm, red ~1 m.
            // Every detail fade in this shader is keyed off this value, so being
            // able to see it directly turns "why is there no detail here" from a
            // guess into a reading.
            let lf = log2(footprint);
            color = vec3f(
                clamp((lf + 3.3) / 3.3, 0.0, 1.0),
                clamp(1.0 - abs(lf + 4.6) / 2.0, 0.0, 1.0),
                clamp(-(lf + 5.0) / 2.0, 0.0, 1.0)
            );
        } else if (uniforms.debugMode > 5.5 && uniforms.debugMode < 6.5) {
            // Fine + detail normal only, with the macro landform removed, so
            // the high-frequency content can be judged on its own.
            let fineN = normalFromGradient(fine.yz);
            color = fineN * 0.5 + 0.5;
        } else if (uniforms.debugMode > 6.5 && uniforms.debugMode < 7.5) {
            // The sun visibility term on its own — cast shadow only, with no
            // N.L, no albedo, no ambient and no fog. This is the one view that
            // separates "this surface faces away from the sun" from "something
            // is occluding it", which are the two completely different causes of
            // a dark frame and are otherwise indistinguishable by eye.
            //
            // Red where the surface is back-lit (NdotL < 0), because there the
            // shadow term is not what is making it dark and reading the grey
            // value would be misleading.
            color = select(vec3f(shadow), vec3f(0.35, 0.06, 0.06), NdotL <= 0.0);
        } else if (uniforms.debugMode > 7.5 && uniforms.debugMode < 8.5) {
            // Lambert term alone, same framing as the shadow view above: this is
            // the *other* half of why a pixel is dark.
            color = vec3f(max(NdotL, 0.0));
        } else if (uniforms.debugMode > 9.5) {
            // Albedo alone, before a single lighting term touches it. The one
            // view that separates "this surface is lit badly" from "this surface
            // is the wrong colour", which are otherwise indistinguishable — and
            // on carved snow specifically, where four independent channels
            // (compression, ice, displaced mass, rock) all write here, it is the
            // only way to see which of them is talking.
            color = albedo;
        } else if (uniforms.debugMode > 8.5) {
            // Depth-map agreement, in metres.
            //   blue    = point falls outside every cascade box
            //   grey    = map and receiver agree within 0.5 m
            //   red     = map claims an occluder in front, brighter with distance
            //   green   = map sits behind the receiver (should be impossible on
            //             a closed heightfield, so it means the projection is off)
            let dz = shadowMapDelta(world, geoN, viewDist);
            if (dz > 1e8) {
                color = vec3f(0.0, 0.15, 0.6);
            } else {
                let mag = clamp(abs(dz) / 12.0, 0.0, 1.0);
                let agree = 1.0 - smoothstep(0.0, 0.5, abs(dz));
                color = vec3f(agree * 0.45)
                      + select(vec3f(0.0, mag, 0.0), vec3f(mag, 0.0, 0.0), dz < 0.0);
            }
        } else {
            let c = vec3f(f32(viewDist < uniforms.cascadeSplits.x),
                          f32(viewDist < uniforms.cascadeSplits.y),
                          f32(viewDist < uniforms.cascadeSplits.z));
            color = color * 0.6 + c * 0.25;
        }
    }

#ifdef MAP_SCREENSHOT
    // A readable map view uses the same blended albedo and terrain relief,
    // independent of the gameplay camera's fog, SSR, temporal history or cascades.
    let mapLight = .65 + .35 * max(dot(geoN, uniforms.sunDir), 0.0);
    color = pow(clamp(albedo * mapLight, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
#endif
    fragmentOutputs.color = vec4f(color, 1.0);
}
