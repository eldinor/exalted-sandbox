import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./bonesDeclaration-BZHChFs4.js";import{r as o,t as s}from"./bonesVertex-BMv7N82S.js";import{n as c,t as l}from"./morphTargetsVertex-CHU15FUT.js";import{n as u,t as d}from"./morphTargetsVertexDeclaration-s7RzSZ1W.js";import{n as f,t as p}from"./morphTargetsVertexGlobal-BR0cyNlP.js";import{n as m,t as h}from"./morphTargetsVertexGlobalDeclaration-CfbPNZM8.js";import{n as g,t as _}from"./bakedVertexAnimationDeclaration-uvkv1RCK.js";import{n as v,t as y}from"./instancesDeclaration-CT49L0MA.js";import{n as b,t as x}from"./instancesVertex-Dnrw1mV6.js";import{n as S,t as C}from"./bakedVertexAnimation-XimApkET.js";var w=t({meshUVSpaceRendererVertexShaderWGSL:()=>O}),T,E,D,O,k=e((()=>{n(),i(),g(),h(),d(),y(),p(),l(),x(),o(),S(),T=`meshUVSpaceRendererVertexShader`,E=`attribute position: vec3f;attribute normal: vec3f;attribute uv: vec2f;uniform projMatrix: mat4x4f;varying vDecalTC: vec2f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
@vertex
fn main(input : VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;var normalUpdated: vec3f=vertexInputs.normal;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(positionUpdated,1.0);var normWorldSM: mat3x3f= mat3x3f(finalWorld[0].xyz,finalWorld[1].xyz,finalWorld[2].xyz);var vNormalW: vec3f;
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vNormalW=normalUpdated/ vec3f(dot(normWorldSM[0],normWorldSM[0]),dot(normWorldSM[1],normWorldSM[1]),dot(normWorldSM[2],normWorldSM[2]));vNormalW=normalize(normWorldSM*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normWorldSM=transposeMat3(inverseMat3(normWorldSM));
#endif
vNormalW=normalize(normWorldSM*normalUpdated);
#endif
var normalView: vec3f=normalize((uniforms.projMatrix* vec4f(vNormalW,0.0)).xyz);var decalTC: vec3f=(uniforms.projMatrix*worldPos).xyz;vertexOutputs.vDecalTC=decalTC.xy;vertexOutputs.position=vec4f(vertexInputs.uv*2.0-1.0,select(decalTC.z,2.,normalView.z>0.0),1.0);}`,r.ShadersStoreWGSL[T]||(r.ShadersStoreWGSL[T]=E),D=[a,_,m,u,v,f,c,b,s,C];for(let e of D)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);O={name:T,shader:E}}));export{O as n,w as r,k as t};