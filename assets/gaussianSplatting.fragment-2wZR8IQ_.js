import{n as e}from"./rolldown-runtime-CNC7AqOf.js";import{n as t,t as n}from"./shaderStore-C5hmi3ce.js";import{n as r,t as i}from"./logDepthDeclaration-d5YMcyq1.js";import{r as a,t as o}from"./fogFragmentDeclaration-neuXL8AV.js";import{r as s,t as c}from"./clipPlaneFragment-smHhwblQ.js";import{an as l,in as u,nn as d,rn as f}from"./main-BQTZvqFv.js";import{r as p,t as m}from"./clipPlaneFragmentDeclaration-D9rA-gke.js";import{r as h,t as g}from"./gaussianSplattingFragmentDeclaration-iPD3tOw0.js";import{n as _,t as v}from"./packingFunctions-BMv-fKKe.js";var y,b,x,S;e((()=>{t(),p(),i(),a(),v(),u(),f(),h(),s(),y=`gaussianSplattingPixelShader`,b=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_DEPTH
layout(location=0) out highp vec4 glFragData[2];
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vec4 vColor;varying vec2 vPosition;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
void main () {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 finalColor=gaussianColor(vColor);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
glFragData[0]=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`,n.ShadersStore[y]||(n.ShadersStore[y]=b),x=[m,r,o,_,l,d,g,c];for(let e of x)n.IncludesShadersStore[e.name]||(n.IncludesShadersStore[e.name]=e.shader);S={name:y,shader:b}}))();export{S as gaussianSplattingPixelShader};