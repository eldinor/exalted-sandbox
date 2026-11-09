import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{n as i,t as a}from"./logDepthDeclaration-d5YMcyq1.js";import{r as o,t as s}from"./clipPlaneVertex-B7Ah5L7Z.js";import{Xt as c,Zt as l}from"./main-BQTZvqFv.js";import{r as u,t as d}from"./bonesDeclaration-BU9fyIZQ.js";import{i as f,n as p,r as m,t as h}from"./bakedVertexAnimation-CqU12QD0.js";import{n as g,t as _}from"./morphTargetsVertexGlobalDeclaration-yW37AhbK.js";import{n as v,t as y}from"./morphTargetsVertexDeclaration-CBPzzDK5.js";import{n as b,t as x}from"./morphTargetsVertexGlobal-Dbgdr1aw.js";import{n as S,t as C}from"./morphTargetsVertex-DcQcQgjX.js";import{r as w,t as T}from"./bonesVertex-DPGvSwGK.js";import{r as E,t as D}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";import{n as O,t as k}from"./instancesDeclaration-zH2q8UpI.js";import{n as A,t as j}from"./instancesVertex-C5RTqQSN.js";var M=t({outlineVertexShader:()=>I}),N,P,F,I,L=e((()=>{n(),u(),f(),_(),y(),E(),k(),a(),x(),C(),j(),w(),p(),o(),c(),N=`outlineVertexShader`,P=`attribute vec3 position;attribute vec3 normal;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
uniform float offset;
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef ALPHATEST
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;vec3 normalUpdated=normal;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
vec3 offsetPosition=positionUpdated+(normalUpdated*offset);
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(offsetPosition,1.0);gl_Position=viewProjection*worldPos;
#ifdef ALPHATEST
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
}
`,r.ShadersStore[N]||(r.ShadersStore[N]=P),F=[d,m,g,v,D,O,i,b,S,A,T,h,s,l];for(let e of F)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);I={name:N,shader:P}}));export{I as n,M as r,L as t};