// Portal interior: layered polar currents create depth without another render
// target. HDR filaments feed bloom while the radial alpha feathers into the ring.

varying vLocal: vec3f;
varying vWorld: vec3f;
varying vNormal: vec3f;

uniform cameraPos: vec3f;
uniform portalTime: f32;
uniform portalReveal: f32;

fn hash21(p: vec2f) -> f32 {
    let q = fract(p * vec2f(123.34, 456.21));
    return fract((q.x + q.y) * (q.x * q.y + 45.32));
}

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let p = input.vLocal.xy / 1.18;
    let radius = length(p);
    if (radius > 1.0) { discard; }

    let angle = atan2(p.y, p.x);
    let t = uniforms.portalTime;
    let spiralA = 0.5 + 0.5 * sin(angle * 7.0 - radius * 18.0 - t * 2.8);
    let spiralB = 0.5 + 0.5 * sin(angle * -11.0 - radius * 27.0 + t * 4.1);
    let filaments = pow(clamp(spiralA * 0.66 + spiralB * 0.50 - 0.34, 0.0, 1.0), 3.4);

    let cell = floor(vec2f(angle * 10.0, radius * 24.0 + t * 2.0));
    let sparkGate = step(0.93, hash21(cell));
    let sparks = sparkGate * pow(0.5 + 0.5 * sin(angle * 31.0 - radius * 43.0 + t * 7.5), 18.0);

    let depth = 1.0 - radius;
    let innerPulse = 0.72 + 0.28 * sin(t * 2.0 - radius * 9.0);
    let coreWave = 0.5 + 0.5 * sin(t * 4.4 + radius * 17.0 - angle * 2.0);
    let core = pow(depth, 2.15);
    let violet = vec3f(0.34, 0.025, 1.15);
    let blue = vec3f(0.015, 0.52, 1.35);
    let cyan = vec3f(0.025, 1.12, 1.50);

    var color = mix(vec3f(0.004, 0.002, 0.025), violet * 0.24, depth);
    color += mix(violet, blue, spiralB) * filaments * (0.48 + 0.52 * depth);
    color += cyan * sparks * 1.8;
    color += mix(violet, cyan, spiralA) * core * innerPulse * 0.78;
    color += mix(cyan, vec3f(0.72, 0.30, 1.65), spiralB) * core * coreWave * 0.72;
    color += vec3f(0.10, 0.42, 0.92) * pow(depth, 4.5) * (0.75 + 0.25 * sin(t * 6.2)) * 1.15;

    let boundary = 1.0 - smoothstep(0.82, 1.0, radius);
    let reveal = smoothstep(0.0, 0.78, uniforms.portalReveal);
    let alpha = boundary * reveal * (0.76 + filaments * 0.20);
    fragmentOutputs.color = vec4f(color * reveal, alpha);
}
