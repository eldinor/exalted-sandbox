// Stochastic triangular blending: shared, world-anchored transforms for all PBR maps.
struct RockSample { base: vec3f, arm: vec3f, normal: vec3f };

fn rockHash(vertex: vec2f) -> f32 {
    return fract(sin(dot(vertex, vec2f(127.1, 311.7))) * 43758.5453);
}
fn rockRotation(seed: f32) -> mat2x2f {
    switch u32(seed * 4.0) {
        case 1u: { return mat2x2f(vec2f(0.0, 1.0), vec2f(-1.0, 0.0)); }
        case 2u: { return mat2x2f(vec2f(-1.0, 0.0), vec2f(0.0, -1.0)); }
        case 3u: { return mat2x2f(vec2f(0.0, -1.0), vec2f(1.0, 0.0)); }
        default: { return mat2x2f(vec2f(1.0, 0.0), vec2f(0.0, 1.0)); }
    }
}
fn rockPatch(vertex: vec2f, uv: vec2f, dx: vec2f, dy: vec2f) -> RockSample {
    let rotation = rockRotation(rockHash(vertex));
    let offset = vec2f(rockHash(vertex + vec2f(17.0, 43.0)), rockHash(vertex + vec2f(59.0, 11.0)));
    let sampleUV = rotation * uv + offset;
    let sampleDx = rotation * dx; let sampleDy = rotation * dy;
    let base = textureSampleGrad(rockBaseTex, meadowBaseTexSampler, sampleUV, 0, sampleDx, sampleDy).rgb;
    let decoded = select(base / 12.92, pow((base + vec3f(.055)) / 1.055, vec3f(2.4)), base > vec3f(.04045));
    let arm = textureSampleGrad(rockArmTex, meadowOrmTexSampler, sampleUV, 0, sampleDx, sampleDy).rgb;
    let bump = textureSampleGrad(rockNormalTex, meadowNormalTexSampler, sampleUV, 0, sampleDx, sampleDy).xyz * 2.0 - 1.0;
    // Bring tangent normals back to the common UV frame before combining patches.
    let normal = vec3f(transpose(rotation) * bump.xy, max(bump.z, .1));
    return RockSample(mix(base, decoded, uniforms.rockGamma), arm, normal);
}
fn sampleRockGround(uv: vec2f, dx: vec2f, dy: vec2f) -> RockSample {
    // Six-metre equilateral cells at the nominal four-metre texture density.
    let grid = vec2f(uv.x - uv.y * .577350269, uv.y * 1.154700538) / 1.5;
    let cell = floor(grid); let f = fract(grid);
    var a: vec2f; var b: vec2f; var c: vec2f; var weights: vec3f;
    if (f.x + f.y <= 1.0) {
        a = cell; b = cell + vec2f(1.0, 0.0); c = cell + vec2f(0.0, 1.0);
        weights = vec3f(1.0 - f.x - f.y, f.x, f.y);
    } else {
        a = cell + vec2f(1.0); b = cell + vec2f(0.0, 1.0); c = cell + vec2f(1.0, 0.0);
        weights = vec3f(f.x + f.y - 1.0, 1.0 - f.x, 1.0 - f.y);
    }
    // Sharpen the blend to retain stone detail, with zero contribution at cell edges.
    weights = weights * weights * weights;
    weights /= max(dot(weights, vec3f(1.0)), 1e-6);
    let sa = rockPatch(a, uv, dx, dy); let sb = rockPatch(b, uv, dx, dy); let sc = rockPatch(c, uv, dx, dy);
    return RockSample(sa.base * weights.x + sb.base * weights.y + sc.base * weights.z,
        sa.arm * weights.x + sb.arm * weights.y + sc.arm * weights.z,
        normalize(sa.normal * weights.x + sb.normal * weights.y + sc.normal * weights.z));
}
