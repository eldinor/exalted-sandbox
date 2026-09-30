// Opaque magical crystal: slow internal aurora, branching luminous veins and
// a strong Fresnel rim. HDR peaks intentionally feed Exalted's bloom pass.

varying vLocal: vec3f;
varying vWorld: vec3f;
varying vNormal: vec3f;

uniform cameraPos: vec3f;
uniform magicTime: f32;
uniform magicDissolve: f32;

fn hash31(p: vec3f) -> f32 {
    var q = fract(p * vec3f(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + vec3f(33.33));
    return fract((q.x + q.y) * q.z);
}

fn valueNoise(p: vec3f) -> f32 {
    let cell = floor(p);
    let f0 = fract(p);
    let f = f0 * f0 * (3.0 - 2.0 * f0);
    let x00 = mix(hash31(cell), hash31(cell + vec3f(1.0, 0.0, 0.0)), f.x);
    let x10 = mix(hash31(cell + vec3f(0.0, 1.0, 0.0)), hash31(cell + vec3f(1.0, 1.0, 0.0)), f.x);
    let x01 = mix(hash31(cell + vec3f(0.0, 0.0, 1.0)), hash31(cell + vec3f(1.0, 0.0, 1.0)), f.x);
    let x11 = mix(hash31(cell + vec3f(0.0, 1.0, 1.0)), hash31(cell + vec3f(1.0, 1.0, 1.0)), f.x);
    return mix(mix(x00, x10, f.y), mix(x01, x11, f.y), f.z);
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let p = input.vLocal;
    let V = normalize(uniforms.cameraPos - input.vWorld);
    let N = normalize(input.vNormal);
    let fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.4);

    let drift = vec3f(uniforms.magicTime * 0.10, -uniforms.magicTime * 0.16, uniforms.magicTime * 0.07);
    let n0 = valueNoise(p * 2.2 + drift);
    let n1 = valueNoise(p.yzx * 5.1 - drift * 1.7);
    let dissolveField = valueNoise(p * 3.8 + drift * 0.45) * 0.78 + n1 * 0.22;
    if (uniforms.magicDissolve > dissolveField + 0.055) { discard; }
    let dissolveEdge = (1.0 - smoothstep(0.015, 0.105, abs(dissolveField - uniforms.magicDissolve)))
        * smoothstep(0.001, 0.08, uniforms.magicDissolve);
    let aurora = smoothstep(0.28, 0.82, n0 * 0.68 + n1 * 0.32);

    let wave = sin(p.x * 8.0 + p.y * 5.0 - p.z * 6.0 + uniforms.magicTime * 1.8);
    let warped = wave + (n1 - 0.5) * 1.7;
    let veins = pow(1.0 - clamp(abs(warped), 0.0, 1.0), 8.0);
    let pulse = 0.82 + 0.18 * sin(uniforms.magicTime * 2.1 + n0 * 6.28318);

    let deep = vec3f(0.025, 0.012, 0.095);
    let violet = vec3f(0.40, 0.08, 1.05);
    let cyan = vec3f(0.04, 1.05, 1.35);
    var color = deep + mix(violet, cyan, n0) * aurora * 0.62;
    color += mix(violet * 1.4, cyan * 1.7, n1) * veins * pulse;
    color += mix(vec3f(0.25, 0.12, 1.2), vec3f(0.12, 1.15, 1.45), n0) * fresnel * 1.25;

    // Thin luminous seams at the cube edges reinforce its solid silhouette.
    let ap = abs(p);
    let edgeCoordinate = max(min(ap.x, ap.y), max(min(ap.y, ap.z), min(ap.z, ap.x))) / 0.75;
    let edge = smoothstep(0.82, 0.99, edgeCoordinate);
    color += vec3f(0.22, 0.75, 1.35) * edge * (0.65 + 0.35 * pulse);
    color += vec3f(0.72, 0.18, 1.75) * dissolveEdge * 2.4;

    fragmentOutputs.color = vec4f(color, 1.0);
}
