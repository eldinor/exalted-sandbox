import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{n as i,t as a}from"./logDepthDeclaration-d5YMcyq1.js";import{r as o,t as s}from"./clipPlaneFragment-smHhwblQ.js";import{an as c,in as l}from"./main-B5ROjULl.js";import{r as u,t as d}from"./clipPlaneFragmentDeclaration-D9rA-gke.js";var f=t({outlinePixelShader:()=>g}),p,m,h,g,_=e((()=>{n(),u(),a(),o(),l(),p=`outlinePixelShader`,m=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
uniform vec4 color;
#ifdef ALPHATEST
varying vec2 vUV;uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#ifdef ALPHATEST
if (texture2D(diffuseSampler,vUV).a<0.4)
discard;
#endif
#include<logDepthFragment>
gl_FragColor=color;
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStore[p]||(r.ShadersStore[p]=m),h=[d,i,s,c];for(let e of h)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);g={name:p,shader:m}}));export{g as n,f as r,_ as t};