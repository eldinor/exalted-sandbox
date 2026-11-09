import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./imageProcessingDeclaration-BUOQt5T9.js";import{n as o,t as s}from"./logDepthDeclaration-d5YMcyq1.js";import{r as c,t as l}from"./helperFunctions-3XR9MQdT.js";import{r as u,t as d}from"./imageProcessingFunctions-Ckw_JnYm.js";import{r as f,t as p}from"./fogFragmentDeclaration-neuXL8AV.js";import{r as m,t as h}from"./clipPlaneFragment-smHhwblQ.js";import{an as g,in as _,nn as v,rn as y}from"./main-BQTZvqFv.js";import{r as b,t as x}from"./clipPlaneFragmentDeclaration-D9rA-gke.js";var S=t({particlesPixelShader:()=>E}),C,w,T,E,D=e((()=>{n(),b(),i(),s(),c(),u(),f(),m(),_(),y(),C=`particlesPixelShader`,w=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
varying vec2 vUV;varying vec4 vColor;uniform vec4 textureMask;uniform sampler2D diffuseSampler;
#include<clipPlaneFragmentDeclaration>
#include<imageProcessingDeclaration>
#include<logDepthDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#ifdef RAMPGRADIENT
varying vec4 remapRanges;uniform sampler2D rampSampler;
#endif
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 textureColor=texture2D(diffuseSampler,vUV);vec4 baseColor=(textureColor*textureMask+(vec4(1.,1.,1.,1.)-textureMask))*vColor;
#ifdef RAMPGRADIENT
float alpha=baseColor.a;float remappedColorIndex=clamp((alpha-remapRanges.x)/remapRanges.y,0.0,1.0);vec4 rampColor=texture2D(rampSampler,vec2(1.0-remappedColorIndex,0.));baseColor.rgb*=rampColor.rgb;float finalAlpha=baseColor.a;baseColor.a=clamp((alpha*rampColor.a-remapRanges.z)/remapRanges.w,0.0,1.0);
#endif
#ifdef BLENDMULTIPLYMODE
float sourceAlpha=vColor.a*textureColor.a;baseColor.rgb=baseColor.rgb*sourceAlpha+vec3(1.0)*(1.0-sourceAlpha);
#endif
#include<logDepthFragment>
#include<fogFragment>(color,baseColor)
#ifdef IMAGEPROCESSINGPOSTPROCESS
baseColor.rgb=toLinearSpace(baseColor.rgb);
#else
#ifdef IMAGEPROCESSING
baseColor.rgb=toLinearSpace(baseColor.rgb);baseColor=applyImageProcessing(baseColor);
#endif
#endif
gl_FragColor=baseColor;
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStore[C]||(r.ShadersStore[C]=w),T=[x,a,o,l,d,p,h,g,v];for(let e of T)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);E={name:C,shader:w}}));export{E as n,S as r,D as t};