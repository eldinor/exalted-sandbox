import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./bonesDeclaration-BZHChFs4.js";import{r as o,t as s}from"./bonesVertex-BMv7N82S.js";import{r as c,t as l}from"./clipPlaneVertex-bmIC51oI.js";import{r as u,t as d}from"./clipPlaneVertexDeclaration-Dk60ogIX.js";import{n as f,t as p}from"./bakedVertexAnimationDeclaration-uvkv1RCK.js";import{n as m,t as h}from"./instancesDeclaration-CT49L0MA.js";import{n as g,t as _}from"./fogVertexDeclaration-CBO3sfBM.js";import{n as v,t as y}from"./instancesVertex-Dnrw1mV6.js";import{n as b,t as x}from"./bakedVertexAnimation-XimApkET.js";import{n as S,t as C}from"./fogVertex-BCBmbvkY.js";import{n as w,t as T}from"./vertexColorMixing-kkJXv7O1.js";var E=t({colorVertexShaderWGSL:()=>A}),D,O,k,A,j=e((()=>{n(),i(),f(),u(),g(),h(),y(),o(),b(),c(),S(),T(),D=`colorVertexShader`,O=`attribute position: vec3f;
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform view: mat4x4f;
#endif
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
var colorUpdated: vec4f=vertexInputs.color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`,r.ShadersStoreWGSL[D]||(r.ShadersStoreWGSL[D]=O),k=[a,p,d,_,m,v,s,x,l,C,w];for(let e of k)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);A={name:D,shader:O}}));export{E as n,j as r,A as t};