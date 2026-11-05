import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./clipPlaneVertex-B7Ah5L7Z.js";import{r as o,t as s}from"./bonesDeclaration-BU9fyIZQ.js";import{i as c,n as l,r as u,t as d}from"./bakedVertexAnimation-CqU12QD0.js";import{n as f,t as p}from"./morphTargetsVertexGlobalDeclaration-yW37AhbK.js";import{n as m,t as h}from"./morphTargetsVertexDeclaration-CBPzzDK5.js";import{n as g,t as _}from"./morphTargetsVertexGlobal-Dbgdr1aw.js";import{n as v,t as y}from"./morphTargetsVertex-DcQcQgjX.js";import{r as b,t as x}from"./bonesVertex-DPGvSwGK.js";import{r as S,t as C}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";import{n as w,t as T}from"./instancesDeclaration-zH2q8UpI.js";import{n as E,t as D}from"./instancesVertex-C5RTqQSN.js";var O=t({glowMapGenerationVertexShader:()=>M}),k,A,j,M,N=e((()=>{n(),o(),c(),p(),h(),S(),T(),_(),y(),D(),b(),l(),i(),k=`glowMapGenerationVertexShader`,A=`attribute vec3 position;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
#include<instancesDeclaration>
uniform mat4 viewProjection;varying vec4 vPosition;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#ifdef DIFFUSE
varying vec2 vUVDiffuse;uniform mat4 diffuseMatrix;
#endif
#ifdef OPACITY
varying vec2 vUVOpacity;uniform mat4 opacityMatrix;
#endif
#ifdef EMISSIVE
varying vec2 vUVEmissive;uniform mat4 emissiveMatrix;
#endif
#ifdef VERTEXALPHA
attribute vec4 color;varying vec4 vColor;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
#ifdef CUBEMAP
vPosition=worldPos;gl_Position=viewProjection*finalWorld*vec4(position,1.0);
#else
vPosition=viewProjection*worldPos;gl_Position=vPosition;
#endif
#ifdef DIFFUSE
#ifdef DIFFUSEUV1
vUVDiffuse=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef DIFFUSEUV2
vUVDiffuse=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#ifdef OPACITY
#ifdef OPACITYUV1
vUVOpacity=vec2(opacityMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef OPACITYUV2
vUVOpacity=vec2(opacityMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#ifdef EMISSIVE
#ifdef EMISSIVEUV1
vUVEmissive=vec2(emissiveMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef EMISSIVEUV2
vUVEmissive=vec2(emissiveMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#ifdef VERTEXALPHA
vColor=color;
#endif
#include<clipPlaneVertex>
}`,r.ShadersStore[k]||(r.ShadersStore[k]=A),j=[s,u,f,m,C,w,g,v,E,x,d,a];for(let e of j)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);M={name:k,shader:A}}));export{O as n,N as r,M as t};