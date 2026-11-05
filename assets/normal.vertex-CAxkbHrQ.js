import{n as e,t}from"./shaderStore-C5hmi3ce.js";import{n,t as r}from"./logDepthDeclaration-d5YMcyq1.js";import{r as i,t as a}from"./clipPlaneVertex-B7Ah5L7Z.js";import{$t as o,Qt as s,Xt as c,Zt as l,en as u,tn as d}from"./main-CHjTCA0X.js";import{r as f,t as p}from"./bonesDeclaration-BU9fyIZQ.js";import{i as m,n as h,r as g,t as _}from"./bakedVertexAnimation-CqU12QD0.js";import{r as v,t as y}from"./bonesVertex-DPGvSwGK.js";import{r as b,t as x}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";import{n as S,t as C}from"./lightFragmentDeclaration-UPKPyPkG.js";import{n as w,t as T}from"./lightUboDeclaration-DGWaSHwh.js";import{n as E,t as D}from"./shadowsVertex-Ddx_grKS.js";import{n as O,t as k}from"./instancesDeclaration-zH2q8UpI.js";import{n as A,t as j}from"./instancesVertex-C5RTqQSN.js";e(),f(),m(),k(),b(),r(),d(),C(),T(),j(),v(),h(),i(),c(),o(),D();var M=`normalVertexShader`,N=`precision highp float;attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
uniform mat4 view;uniform mat4 viewProjection;
#ifdef DIFFUSE
varying vec2 vDiffuseUV;uniform mat4 diffuseMatrix;uniform vec2 vDiffuseInfos;
#endif
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef NORMAL
varying vec3 vNormalW;
#endif
#include<clipPlaneVertexDeclaration>
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying float vViewDepth;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);gl_Position=viewProjection*worldPos;vPositionW=vec3(worldPos);
#ifdef NORMAL
vNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));
#endif
#ifndef UV1
vec2 uv=vec2(0.,0.);
#endif
#ifndef UV2
vec2 uv2=vec2(0.,0.);
#endif
#ifdef DIFFUSE
if (vDiffuseInfos.x==0.)
{vDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));}
else
{vDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));}
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#include<shadowsVertex>[0..maxSimultaneousLights]
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;t.ShadersStore[M]||(t.ShadersStore[M]=N);var P=[p,g,O,x,n,u,S,w,A,y,_,a,l,s,E];for(let e of P)t.IncludesShadersStore[e.name]||(t.IncludesShadersStore[e.name]=e.shader);var F={name:M,shader:N};export{F as normalVertexShader};