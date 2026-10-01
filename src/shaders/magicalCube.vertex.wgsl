// Small authored-world shader test: retain local coordinates for stable
// crystalline patterns and world coordinates for view-dependent edge light.

attribute position: vec3f;
attribute normal: vec3f;

uniform world: mat4x4f;
uniform viewProjection: mat4x4f;

varying vLocal: vec3f;
varying vWorld: vec3f;
varying vNormal: vec3f;

@vertex
fn main(input: VertexInputs) -> FragmentInputs {
    let worldPosition = uniforms.world * vec4f(vertexInputs.position, 1.0);
    vertexOutputs.vLocal = vertexInputs.position;
    vertexOutputs.vWorld = worldPosition.xyz;
    vertexOutputs.vNormal = normalize((uniforms.world * vec4f(vertexInputs.normal, 0.0)).xyz);
    vertexOutputs.position = uniforms.viewProjection * worldPosition;
}
