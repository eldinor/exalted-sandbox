import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./bonesDeclaration-BZHChFs4.js";import{r as o,t as s}from"./bonesVertex-BMv7N82S.js";import{r as c,t as l}from"./clipPlaneVertex-bmIC51oI.js";import{r as u,t as d}from"./clipPlaneVertexDeclaration-Dk60ogIX.js";import{n as f,t as p}from"./logDepthDeclaration-BFam-Z5U.js";import{n as m,t as h}from"./morphTargetsVertex-CHU15FUT.js";import{n as g,t as _}from"./morphTargetsVertexDeclaration-s7RzSZ1W.js";import{n as v,t as y}from"./morphTargetsVertexGlobal-BR0cyNlP.js";import{n as b,t as x}from"./morphTargetsVertexGlobalDeclaration-CfbPNZM8.js";import{n as S,t as C}from"./bakedVertexAnimationDeclaration-uvkv1RCK.js";import{n as w,t as T}from"./instancesDeclaration-CT49L0MA.js";import{n as E,t as D}from"./instancesVertex-Dnrw1mV6.js";import{n as O,t as k}from"./bakedVertexAnimation-XimApkET.js";import{n as A,t as j}from"./logDepthVertex-DBkTjZb6.js";var M=t({outlineVertexShaderWGSL:()=>I}),N,P,F,I,L=e((()=>{n(),i(),S(),x(),_(),u(),T(),p(),y(),h(),D(),o(),O(),c(),j(),N=`outlineVertexShader`,P=`attribute position: vec3f;attribute normal: vec3f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
uniform offset: f32;
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#ifdef ALPHATEST
varying vUV: vec2f;uniform diffuseMatrix: mat4x4f; 
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input: VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;var normalUpdated: vec3f=vertexInputs.normal;
#ifdef UV1
var uvUpdated: vec2f=vertexInputs.uv;
#endif
#ifdef UV2
var uv2Updated: vec2f=vertexInputs.uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
var offsetPosition: vec3f=positionUpdated+(normalUpdated*uniforms.offset);
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld*vec4f(offsetPosition,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#ifdef ALPHATEST
#ifdef UV1
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uvUpdated,1.0,0.0)).xy;
#endif
#ifdef UV2
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uv2Updated,1.0,0.0)).xy;
#endif
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
}
`,r.ShadersStoreWGSL[N]||(r.ShadersStoreWGSL[N]=P),F=[a,C,b,g,d,w,f,v,m,E,s,k,l,A];for(let e of F)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);I={name:N,shader:P}}));export{I as n,M as r,L as t};