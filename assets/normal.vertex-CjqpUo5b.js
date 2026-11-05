import{n as e,t}from"./shaderStore-C5hmi3ce.js";import{r as n,t as r}from"./bonesDeclaration-BZHChFs4.js";import{r as i,t as a}from"./bonesVertex-BMv7N82S.js";import{r as o,t as s}from"./clipPlaneVertex-bmIC51oI.js";import{r as c,t as l}from"./clipPlaneVertexDeclaration-Dk60ogIX.js";import{n as u,t as d}from"./lightVxUboDeclaration-k8cGDZNz.js";import{n as f,t as p}from"./logDepthDeclaration-BFam-Z5U.js";import{n as m,t as h}from"./shadowsVertex-BJswdWA6.js";import{n as g,t as _}from"./bakedVertexAnimationDeclaration-uvkv1RCK.js";import{n as v,t as y}from"./instancesDeclaration-CT49L0MA.js";import{n as b,t as x}from"./fogVertexDeclaration-CBO3sfBM.js";import{n as S,t as C}from"./instancesVertex-Dnrw1mV6.js";import{n as w,t as T}from"./bakedVertexAnimation-XimApkET.js";import{n as E,t as D}from"./fogVertex-BCBmbvkY.js";import{n as O,t as k}from"./logDepthVertex-DBkTjZb6.js";import{n as A,t as j}from"./lightVxFragmentDeclaration-C4YEH6KP.js";e(),n(),g(),y(),c(),p(),b(),j(),d(),C(),i(),w(),o(),k(),E(),h();var M=`normalVertexShader`,N=`attribute position: vec3f;
#ifdef NORMAL
attribute normal: vec3f;
#endif
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform view: mat4x4f;uniform viewProjection: mat4x4f;
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;uniform diffuseMatrix: mat4x4f;uniform vDiffuseInfos: vec2f;
#endif
#ifdef POINTSIZE
uniform pointSize: f32;
#endif
varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightVxFragment>[0..maxSimultaneousLights]
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;vertexOutputs.vPositionW= worldPos.xyz;
#ifdef NORMAL
vertexOutputs.vNormalW=normalize(( finalWorld* vec4f(vertexInputs.normal,0.0)).xyz);
#endif
#ifndef UV1
var uv: vec2f= vec2f(0.,0.);
#else
var uv: vec2f=vertexInputs.uv;
#endif
#ifndef UV2
var uv2: vec2f= vec2f(0.,0.);
#else
var uv2: vec2f=vertexInputs.uv2;
#endif
#ifdef DIFFUSE
if (uniforms.vDiffuseInfos.x==0.)
{vertexOutputs.vDiffuseUV=(uniforms.diffuseMatrix* vec4f(uv,1.0,0.0)).xy;}
else
{vertexOutputs.vDiffuseUV=(uniforms.diffuseMatrix* vec4f(uv2,1.0,0.0)).xy;}
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#define CUSTOM_VERTEX_MAIN_END
}
`;t.ShadersStoreWGSL[M]||(t.ShadersStoreWGSL[M]=N);var P=[r,_,v,l,f,x,A,u,S,a,T,s,O,D,m];for(let e of P)t.IncludesShadersStoreWGSL[e.name]||(t.IncludesShadersStoreWGSL[e.name]=e.shader);var F={name:M,shader:N};export{F as normalVertexShaderWGSL};