import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{n as i,t as a}from"./logDepthDeclaration-d5YMcyq1.js";import{r as o,t as s}from"./clipPlaneVertex-B7Ah5L7Z.js";import{Xt as c,Zt as l}from"./main-CHjTCA0X.js";import{r as u,t as d}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";import{n as f,t as p}from"./sceneUboDeclaration-CF_xguIu.js";import{n as m,t as h}from"./instancesDeclaration-zH2q8UpI.js";import{n as g,t as _}from"./instancesVertex-C5RTqQSN.js";import{n as v,t as y}from"./meshUboDeclaration-CF_UR3-U.js";var b,x,S,C=e((()=>{n(),b=`lineVertexDeclaration`,x=`uniform mat4 viewProjection;
#define ADDITIONAL_VERTEX_DECLARATION
`,r.IncludesShadersStore[b]||(r.IncludesShadersStore[b]=x),S={name:b,shader:x}})),w,T,E,D=e((()=>{n(),p(),y(),w=`lineUboDeclaration`,T=`layout(std140,column_major) uniform;
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`,r.IncludesShadersStore[w]||(r.IncludesShadersStore[w]=T),E={name:w,shader:T}})),O=t({lineVertexShader:()=>M}),k,A,j,M,N=e((()=>{n(),C(),p(),y(),D(),h(),u(),a(),_(),o(),c(),k=`lineVertexShader`,A=`#include<__decl__lineVertex>
#include<instancesDeclaration>
#include<clipPlaneVertexDeclaration>
attribute vec3 position;attribute vec4 normal;uniform float width;uniform float aspectRatio;
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
mat4 worldViewProjection=viewProjection*finalWorld;vec4 viewPosition=worldViewProjection*vec4(position,1.0);vec4 viewPositionNext=worldViewProjection*vec4(normal.xyz,1.0);vec2 currentScreen=viewPosition.xy/viewPosition.w;vec2 nextScreen=viewPositionNext.xy/viewPositionNext.w;currentScreen.x*=aspectRatio;nextScreen.x*=aspectRatio;vec2 dir=normalize(nextScreen-currentScreen);vec2 normalDir=vec2(-dir.y,dir.x);normalDir*=width/2.0;normalDir.x/=aspectRatio;vec4 offset=vec4(normalDir*normal.w,0.0,0.0);gl_Position=viewPosition+offset;
#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
vec4 worldPos=finalWorld*vec4(position,1.0);
#include<clipPlaneVertex>
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}`,r.ShadersStore[k]||(r.ShadersStore[k]=A),j=[S,f,v,E,m,d,i,g,s,l];for(let e of j)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);M={name:k,shader:A}}));export{M as n,O as r,N as t};