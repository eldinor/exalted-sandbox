import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./clipPlaneFragment-La7EHJ7s.js";import{r as o,t as s}from"./clipPlaneFragmentDeclaration-OXiBkWkm.js";import{n as c,t as l}from"./logDepthFragment-CAyoj6n2.js";import{n as u,t as d}from"./logDepthDeclaration-BFam-Z5U.js";var f=t({linePixelShaderWGSL:()=>g}),p,m,h,g,_=e((()=>{n(),o(),d(),l(),i(),p=`linePixelShader`,m=`#include<clipPlaneFragmentDeclaration>
uniform color: vec4f;
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<logDepthFragment>
#include<clipPlaneFragment>
fragmentOutputs.color=uniforms.color;
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStoreWGSL[p]||(r.ShadersStoreWGSL[p]=m),h=[s,u,c,a];for(let e of h)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);g={name:p,shader:m}}));export{g as n,f as r,_ as t};