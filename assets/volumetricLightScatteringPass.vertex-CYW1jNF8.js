import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./bonesDeclaration-BZHChFs4.js";import{r as o,t as s}from"./bonesVertex-BMv7N82S.js";import{n as c,t as l}from"./morphTargetsVertex-CHU15FUT.js";import{n as u,t as d}from"./morphTargetsVertexDeclaration-s7RzSZ1W.js";import{n as f,t as p}from"./morphTargetsVertexGlobal-BR0cyNlP.js";import{n as m,t as h}from"./morphTargetsVertexGlobalDeclaration-CfbPNZM8.js";import{n as g,t as _}from"./bakedVertexAnimationDeclaration-uvkv1RCK.js";import{n as v,t as y}from"./instancesDeclaration-CT49L0MA.js";import{n as b,t as x}from"./instancesVertex-Dnrw1mV6.js";import{n as S,t as C}from"./bakedVertexAnimation-XimApkET.js";var w=t({volumetricLightScatteringPassVertexShaderWGSL:()=>O}),T,E,D,O,k=e((()=>{n(),i(),g(),h(),d(),y(),p(),l(),x(),o(),S(),T=`volumetricLightScatteringPassVertexShader`,E=`attribute position: vec3f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;uniform depthValues: vec2f;
#if defined(ALPHATEST) || defined(NEED_UV)
varying vUV: vec2f;uniform diffuseMatrix: mat4x4f;
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#endif
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input: VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;
#if (defined(ALPHATEST) || defined(NEED_UV)) && defined(UV1)
var uvUpdated: vec2f=vertexInputs.uv;
#endif
#if (defined(ALPHATEST) || defined(NEED_UV)) && defined(UV2)
var uv2Updated: vec2f=vertexInputs.uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vertexOutputs.position=uniforms.viewProjection*finalWorld*vec4f(positionUpdated,1.0);
#if defined(ALPHATEST) || defined(NEED_UV)
#ifdef UV1
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uvUpdated,1.0,0.0)).xy;
#endif
#ifdef UV2
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uv2Updated,1.0,0.0)).xy;
#endif
#endif
}
`,r.ShadersStoreWGSL[T]||(r.ShadersStoreWGSL[T]=E),D=[a,_,m,u,v,f,c,b,s,C];for(let e of D)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);O={name:T,shader:E}}));export{w as n,k as t};