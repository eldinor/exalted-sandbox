varying vWorld: vec3f;
varying vNormal: vec3f;
varying vUV: vec2f;
var baseTex: texture_2d<f32>;
var baseTexSampler: sampler;
uniform baseColor: vec4f;
uniform alphaCutoff: f32;
uniform gammaDecode: f32;
uniform normalBake: f32;
uniform cameraPos: vec3f;
@fragment
fn main(input: FragmentInputs) -> FragmentOutputs {
    let texel = textureSample(baseTex, baseTexSampler, input.vUV);
    if (texel.a * uniforms.baseColor.a < uniforms.alphaCutoff) { discard; }
    let linear = pow(max(texel.rgb, vec3f(0.0)), vec3f(mix(1.0, 2.2, uniforms.gammaDecode))) * uniforms.baseColor.rgb;
    let albedo = pow(max(linear, vec3f(0.0)), vec3f(1.0 / 2.2));
    var normal = normalize(input.vNormal);
    if (dot(normal, uniforms.cameraPos - input.vWorld) < 0.0) { normal = -normal; }
    fragmentOutputs.color = vec4f(mix(albedo, normal * .5 + .5, uniforms.normalBake), 1.0);
}
