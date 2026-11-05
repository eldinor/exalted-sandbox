import{n as e,t}from"./shaderStore-C5hmi3ce.js";import{r as n,t as r}from"./clipPlaneVertex-bmIC51oI.js";import{r as i,t as a}from"./clipPlaneVertexDeclaration-Dk60ogIX.js";import{n as o,t as s}from"./logDepthDeclaration-BFam-Z5U.js";import{n as c,t as l}from"./fogVertexDeclaration-CBO3sfBM.js";import{n as u,t as d}from"./fogVertex-BCBmbvkY.js";import{n as f,t as p}from"./logDepthVertex-DBkTjZb6.js";e(),s(),i(),c(),n(),p(),u();var m=`skyVertexShader`,h=`attribute position: vec3f;
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
uniform world: mat4x4f;uniform view: mat4x4f;uniform viewProjection: mat4x4f;
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef VERTEXCOLOR
varying vColor: vec4f;
#endif
#include<logDepthDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.position=uniforms.viewProjection*uniforms.world* vec4f(vertexInputs.position,1.0);var worldPos: vec4f=uniforms.world* vec4f(vertexInputs.position,1.0);vertexOutputs.vPositionW= worldPos.xyz;
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#ifdef VERTEXCOLOR
vertexOutputs.vColor=vertexInputs.color;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;t.ShadersStoreWGSL[m]||(t.ShadersStoreWGSL[m]=h);var g=[o,a,l,r,f,d];for(let e of g)t.IncludesShadersStoreWGSL[e.name]||(t.IncludesShadersStoreWGSL[e.name]=e.shader);var _={name:m,shader:h};export{_ as skyVertexShaderWGSL};