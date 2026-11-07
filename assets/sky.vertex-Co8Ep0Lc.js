import{n as e,t}from"./shaderStore-C5hmi3ce.js";import{n,t as r}from"./logDepthDeclaration-d5YMcyq1.js";import{r as i,t as a}from"./clipPlaneVertex-B7Ah5L7Z.js";import{$t as o,Qt as s,Xt as c,Zt as l,en as u,tn as d}from"./main-B5ROjULl.js";import{r as f,t as p}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";e(),r(),f(),d(),i(),c(),o();var m=`skyVertexShader`,h=`precision highp float;attribute vec3 position;
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
uniform mat4 world;uniform mat4 view;uniform mat4 viewProjection;
#ifdef POINTSIZE
uniform float pointSize;
#endif
varying vec3 vPositionW;
#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif
#include<logDepthDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
gl_Position=viewProjection*world*vec4(position,1.0);vec4 worldPos=world*vec4(position,1.0);vPositionW=vec3(worldPos);
#include<clipPlaneVertex>
#include<logDepthVertex>
#include<fogVertex>
#ifdef VERTEXCOLOR
vColor=color;
#endif
#if defined(POINTSIZE) && !defined(WEBGPU)
gl_PointSize=pointSize;
#endif
#define CUSTOM_VERTEX_MAIN_END
}
`;t.ShadersStore[m]||(t.ShadersStore[m]=h);var g=[n,p,u,a,l,s];for(let e of g)t.IncludesShadersStore[e.name]||(t.IncludesShadersStore[e.name]=e.shader);var _={name:m,shader:h};export{_ as skyVertexShader};