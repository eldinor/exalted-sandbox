import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./fogFragmentDeclaration-neuXL8AV.js";import{r as o,t as s}from"./clipPlaneFragment-smHhwblQ.js";import{nn as c,rn as l}from"./main-BQTZvqFv.js";import{r as u,t as d}from"./clipPlaneFragmentDeclaration-D9rA-gke.js";var f=t({colorPixelShader:()=>g}),p,m,h,g,_=e((()=>{n(),u(),i(),o(),l(),p=`colorPixelShader`,m=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
#define VERTEXCOLOR
varying vec4 vColor;
#else
uniform vec4 color;
#endif
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
gl_FragColor=vColor;
#else
gl_FragColor=color;
#endif
#include<fogFragment>(color,gl_FragColor)
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStore[p]||(r.ShadersStore[p]=m),h=[d,a,s,c];for(let e of h)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);g={name:p,shader:m}}));export{f as n,_ as r,g as t};