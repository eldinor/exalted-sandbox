import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./clipPlaneVertex-B7Ah5L7Z.js";import{$t as o,Qt as s,en as c,tn as l}from"./main-BQTZvqFv.js";import{r as u,t as d}from"./bonesDeclaration-BU9fyIZQ.js";import{i as f,n as p,r as m,t as h}from"./bakedVertexAnimation-CqU12QD0.js";import{r as g,t as _}from"./bonesVertex-DPGvSwGK.js";import{r as v,t as y}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";import{n as b,t as x}from"./instancesDeclaration-zH2q8UpI.js";import{n as S,t as C}from"./instancesVertex-C5RTqQSN.js";import{n as w,t as T}from"./vertexColorMixing-F0BxBduW.js";var E=t({colorVertexShader:()=>A}),D,O,k,A,j=e((()=>{n(),u(),f(),v(),l(),x(),C(),g(),p(),i(),o(),T(),D=`colorVertexShader`,O=`attribute vec3 position;
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform mat4 view;
#endif
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
vec4 colorUpdated=color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {gl_Position=viewProjection*worldPos;} else {gl_Position=viewProjectionR*worldPos;}
#else
gl_Position=viewProjection*worldPos;
#endif
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`,r.ShadersStore[D]||(r.ShadersStore[D]=O),k=[d,m,y,c,b,S,_,h,a,s,w];for(let e of k)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);A={name:D,shader:O}}));export{E as n,j as r,A as t};