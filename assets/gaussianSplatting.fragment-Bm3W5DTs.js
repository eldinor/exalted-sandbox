import{n as e}from"./rolldown-runtime-CNC7AqOf.js";import{n as t,t as n}from"./shaderStore-C5hmi3ce.js";import{r,t as i}from"./clipPlaneFragment-La7EHJ7s.js";import{r as a,t as o}from"./clipPlaneFragmentDeclaration-OXiBkWkm.js";import{r as s,t as c}from"./fogFragmentDeclaration-CIOW1O36.js";import{n as l,t as u}from"./logDepthFragment-CAyoj6n2.js";import{n as d,t as f}from"./fogFragment-CIKWQhSH.js";import{r as p,t as m}from"./gaussianSplattingFragmentDeclaration-CD75jMUo.js";import{n as h,t as g}from"./logDepthDeclaration-BFam-Z5U.js";import{n as _,t as v}from"./packingFunctions-BdzhKZ1V.js";var y,b,x,S;e((()=>{t(),a(),g(),s(),v(),u(),d(),p(),r(),y=`gaussianSplattingPixelShader`,b=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vColor: vec4f;varying vPosition: vec2f;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var finalColor: vec4f=gaussianColor(input.vColor,input.vPosition);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
fragmentOutputs.fragData0=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
fragmentOutputs.fragData1=pack(fragmentInputs.position.z);
#else
fragmentOutputs.fragData1=vec4f(fragmentInputs.position.z,0.0,0.0,1.0);
#endif
#else
fragmentOutputs.color=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`,n.ShadersStoreWGSL[y]||(n.ShadersStoreWGSL[y]=b),x=[o,h,c,_,l,f,m,i];for(let e of x)n.IncludesShadersStoreWGSL[e.name]||(n.IncludesShadersStoreWGSL[e.name]=e.shader);S={name:y,shader:b}}))();export{S as gaussianSplattingPixelShaderWGSL};