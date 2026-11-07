import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{n as i,t as a}from"./logDepthDeclaration-d5YMcyq1.js";import{r as o,t as s}from"./fogFragmentDeclaration-neuXL8AV.js";import{an as c,in as l,nn as u,rn as d}from"./main-B5ROjULl.js";import{n as f,t as p}from"./imageProcessingCompatibility-A9AeKJra.js";var m=t({spritesPixelShader:()=>v}),h,g,_,v,y=e((()=>{n(),o(),a(),l(),d(),f(),h=`spritesPixelShader`,g=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
uniform bool alphaTest;varying vec4 vColor;varying vec2 vUV;uniform sampler2D diffuseSampler;
#include<fogFragmentDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
#ifdef PIXEL_PERFECT
vec2 uvPixelPerfect(vec2 uv) {vec2 res=vec2(textureSize(diffuseSampler,0));uv=uv*res;vec2 seam=floor(uv+0.5);uv=seam+clamp((uv-seam)/fwidth(uv),-0.5,0.5);return uv/res;}
#endif
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#ifdef PIXEL_PERFECT
vec2 uv=uvPixelPerfect(vUV);
#else
vec2 uv=vUV;
#endif
vec4 color=texture2D(diffuseSampler,uv);float fAlphaTest=float(alphaTest);if (fAlphaTest != 0.)
{if (color.a<0.95)
discard;}
color*=vColor;
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStore[h]||(r.ShadersStore[h]=g),_=[s,i,c,u,p];for(let e of _)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);v={name:h,shader:g}}));export{v as n,m as r,y as t};