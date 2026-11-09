import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{n as i,t as a}from"./logDepthDeclaration-d5YMcyq1.js";import{r as o,t as s}from"./clipPlaneFragment-smHhwblQ.js";import{an as c,in as l}from"./main-BQTZvqFv.js";import{r as u,t as d}from"./clipPlaneFragmentDeclaration-D9rA-gke.js";var f=t({linePixelShader:()=>g}),p,m,h,g,_=e((()=>{n(),u(),a(),l(),o(),p=`linePixelShader`,m=`#include<clipPlaneFragmentDeclaration>
uniform vec4 color;
#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<logDepthFragment>
#include<clipPlaneFragment>
gl_FragColor=color;
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStore[p]||(r.ShadersStore[p]=m),h=[d,i,c,s];for(let e of h)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);g={name:p,shader:m}}));export{g as n,f as r,_ as t};