import{n as e,t}from"./shaderStore-C5hmi3ce.js";import{r as n,t as r}from"./clipPlaneVertex-bmIC51oI.js";import{r as i,t as a}from"./clipPlaneVertexDeclaration-Dk60ogIX.js";import{n as o,t as s}from"./logDepthDeclaration-BFam-Z5U.js";import{n as c,t as l}from"./sceneUboDeclaration-pbYrmhhb.js";import{n as u,t as d}from"./instancesDeclaration-CT49L0MA.js";import{n as f,t as p}from"./fogVertexDeclaration-CBO3sfBM.js";import{n as m,t as h}from"./instancesVertex-Dnrw1mV6.js";import{n as g,t as _}from"./fogVertex-BCBmbvkY.js";import{n as v,t as y}from"./logDepthVertex-DBkTjZb6.js";e(),d(),l(),s(),f(),i(),h(),g(),n(),y();var b=`gridVertexShader`,x=`attribute position: vec3f;attribute normal: vec3f;
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#include<instancesDeclaration>
#include<sceneUboDeclaration>
varying vPosition: vec3f;varying vNormal: vec3f;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
varying vWorldPos: vec3f;
#endif
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#ifdef OPACITY
varying vOpacityUV: vec2f;uniform opacityMatrix: mat4x4f;uniform vOpacityInfos: vec2f;
#endif
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);
#include<fogVertex>
var cameraSpacePosition: vec4f=scene.view*worldPos;vertexOutputs.position=scene.projection*cameraSpacePosition;
#ifdef OPACITY
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
if (uniforms.vOpacityInfos.x==0.)
{vertexOutputs.vOpacityUV=(uniforms.opacityMatrix* vec4f(uv,1.0,0.0)).xy;}
else
{vertexOutputs.vOpacityUV=(uniforms.opacityMatrix* vec4f(uv2,1.0,0.0)).xy;}
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
vertexOutputs.vPosition=vertexInputs.position;vertexOutputs.vNormal=vertexInputs.normal;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
vertexOutputs.vWorldPos=worldPos.xyz;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;t.ShadersStoreWGSL[b]||(t.ShadersStoreWGSL[b]=x);var S=[u,c,o,p,a,m,_,r,v];for(let e of S)t.IncludesShadersStoreWGSL[e.name]||(t.IncludesShadersStoreWGSL[e.name]=e.shader);var C={name:b,shader:x};export{C as gridVertexShaderWGSL};