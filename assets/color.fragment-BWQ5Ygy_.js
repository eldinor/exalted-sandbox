import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./clipPlaneFragment-La7EHJ7s.js";import{r as o,t as s}from"./clipPlaneFragmentDeclaration-OXiBkWkm.js";import{r as c,t as l}from"./fogFragmentDeclaration-CIOW1O36.js";import{n as u,t as d}from"./fogFragment-CIKWQhSH.js";var f=t({colorPixelShaderWGSL:()=>g}),p,m,h,g,_=e((()=>{n(),o(),c(),i(),u(),p=`colorPixelShader`,m=`#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
#define VERTEXCOLOR
varying vColor: vec4f;
#else
uniform color: vec4f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
fragmentOutputs.color=input.vColor;
#else
fragmentOutputs.color=uniforms.color;
#endif
#include<fogFragment>(color,fragmentOutputs.color)
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStoreWGSL[p]||(r.ShadersStoreWGSL[p]=m),h=[s,l,a,d];for(let e of h)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);g={name:p,shader:m}}));export{f as n,_ as r,g as t};