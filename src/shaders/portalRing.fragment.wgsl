// Animated magical portal ring. The torus stays opaque enough for stable depth,
// while HDR bands and edge energy produce the apparent translucent glow.

varying vLocal: vec3f;
varying vWorld: vec3f;
varying vNormal: vec3f;

uniform cameraPos: vec3f;
uniform portalTime: f32;
uniform portalReveal: f32;

@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let p = input.vLocal;
    let N = normalize(input.vNormal);
    let V = normalize(uniforms.cameraPos - input.vWorld);
    let fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.0);
    let angle = atan2(p.z, p.x);
    let bands = 0.5 + 0.5 * sin(angle * 11.0 - uniforms.portalTime * 4.2 + sin(angle * 3.0 + uniforms.portalTime));
    let sparks = pow(0.5 + 0.5 * sin(angle * 29.0 + uniforms.portalTime * 7.0), 12.0);
    let pulse = 0.78 + 0.22 * sin(uniforms.portalTime * 2.5);

    let violet = vec3f(0.48, 0.07, 1.30);
    let cyan = vec3f(0.03, 1.10, 1.55);
    var color = vec3f(0.025, 0.008, 0.10);
    color += mix(violet, cyan, bands) * (0.48 + bands * 0.72) * pulse;
    color += mix(cyan, vec3f(0.85, 0.35, 1.75), bands) * fresnel * 1.55;
    color += vec3f(0.75, 0.55, 1.85) * sparks * 1.8;
    color *= smoothstep(0.0, 0.72, uniforms.portalReveal);

    fragmentOutputs.color = vec4f(color, 1.0);
}
