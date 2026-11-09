import{n as e,t}from"./shaderStore-C5hmi3ce.js";import{n,t as r}from"./logDepthDeclaration-d5YMcyq1.js";import{r as i,t as a}from"./clipPlaneVertex-B7Ah5L7Z.js";import{$t as o,Qt as s,Xt as c,Zt as l,en as u,tn as d}from"./main-BQTZvqFv.js";import{r as f,t as p}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";import{n as m,t as h}from"./sceneUboDeclaration-CF_xguIu.js";import{n as g,t as _}from"./instancesDeclaration-zH2q8UpI.js";import{n as v,t as y}from"./instancesVertex-C5RTqQSN.js";import{n as b,t as x}from"./sceneVertexDeclaration-rzzexj5z.js";e(),_(),x(),h(),r(),d(),f(),y(),o(),i(),c();var S=`gridVertexShader`,C=`precision highp float;attribute vec3 position;attribute vec3 normal;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#include<instancesDeclaration>
#include<__decl__sceneVertex>
varying vec3 vPosition;varying vec3 vNormal;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
varying vec3 vWorldPos;
#endif
#include<logDepthDeclaration>
#include<fogVertexDeclaration>
#ifdef OPACITY
varying vec2 vOpacityUV;uniform mat4 opacityMatrix;uniform vec2 vOpacityInfos;
#endif
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
vec4 worldPos=finalWorld*vec4(position,1.0);
#include<fogVertex>
vec4 cameraSpacePosition=view*worldPos;gl_Position=projection*cameraSpacePosition;
#ifdef OPACITY
#ifndef UV1
vec2 uv=vec2(0.,0.);
#endif
#ifndef UV2
vec2 uv2=vec2(0.,0.);
#endif
if (vOpacityInfos.x==0.)
{vOpacityUV=vec2(opacityMatrix*vec4(uv,1.0,0.0));}
else
{vOpacityUV=vec2(opacityMatrix*vec4(uv2,1.0,0.0));}
#endif 
#include<clipPlaneVertex>
#include<logDepthVertex>
vPosition=position;vNormal=normal;
#if defined(HORIZON_FADE) || defined(BELOW_LINE_COLOR) || defined(ORIGIN_MARKER)
vWorldPos=worldPos.xyz;
#endif
#define CUSTOM_VERTEX_MAIN_END
}`;t.ShadersStore[S]||(t.ShadersStore[S]=C);var w=[g,b,m,n,u,p,v,s,a,l];for(let e of w)t.IncludesShadersStore[e.name]||(t.IncludesShadersStore[e.name]=e.shader);var T={name:S,shader:C};export{T as gridVertexShader};