import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./clipPlaneVertex-B7Ah5L7Z.js";import{r as o,t as s}from"./bonesDeclaration-BU9fyIZQ.js";import{i as c,n as l,r as u,t as d}from"./bakedVertexAnimation-CqU12QD0.js";import{n as f,t as p}from"./morphTargetsVertexGlobalDeclaration-yW37AhbK.js";import{n as m,t as h}from"./morphTargetsVertexDeclaration-CBPzzDK5.js";import{n as g,t as _}from"./morphTargetsVertexGlobal-Dbgdr1aw.js";import{n as v,t as y}from"./morphTargetsVertex-DcQcQgjX.js";import{r as b,t as x}from"./bonesVertex-DPGvSwGK.js";import{r as S,t as C}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";import{n as w,t as T}from"./instancesDeclaration-zH2q8UpI.js";import{n as E,t as D}from"./instancesVertex-C5RTqQSN.js";import{n as O,t as k}from"./pointCloudVertex-Cvi66wey.js";var A,j,M,N=e((()=>{n(),A=`pointCloudVertexDeclaration`,j=`#ifdef POINTSIZE
uniform float pointSize;
#endif
`,r.IncludesShadersStore[A]||(r.IncludesShadersStore[A]=j),M={name:A,shader:j}})),P=t({depthVertexShader:()=>R}),F,I,L,R,z=e((()=>{n(),o(),c(),p(),h(),S(),T(),N(),_(),y(),D(),b(),l(),i(),k(),F=`depthVertexShader`,I=`attribute vec3 position;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
#include<instancesDeclaration>
uniform mat4 viewProjection;uniform vec2 depthValues;
#if defined(ALPHATEST) || defined(NEED_UV)
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#ifdef STORE_CAMERASPACE_Z
uniform mat4 view;varying vec4 vViewPos;
#endif
#include<pointCloudVertexDeclaration>
varying float vDepthMetric;
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
#include<clipPlaneVertex>
gl_Position=viewProjection*worldPos;
#ifdef STORE_CAMERASPACE_Z
vViewPos=view*worldPos;
#else
#ifdef USE_REVERSE_DEPTHBUFFER
vDepthMetric=((-gl_Position.z+depthValues.x)/(depthValues.y));
#else
vDepthMetric=((gl_Position.z+depthValues.x)/(depthValues.y));
#endif
#endif
#if defined(ALPHATEST) || defined(BASIC_RENDER)
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#include<pointCloudVertex>
}
`,r.ShadersStore[F]||(r.ShadersStore[F]=I),L=[s,u,f,m,C,w,M,g,v,E,x,d,a,O];for(let e of L)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);R={name:F,shader:I}}));export{P as n,z as r,R as t};