import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./clipPlaneFragment-La7EHJ7s.js";import{r as o,t as s}from"./clipPlaneFragmentDeclaration-OXiBkWkm.js";import{n as c,t as l}from"./packingFunctions-BdzhKZ1V.js";import{n as u,t as d}from"./shadowMapFragment-C3jXRVlo.js";var f,p,m,h=e((()=>{n(),f=`bayerDitherFunctions`,p=`fn bayerDither2(_P: vec2f)->f32 {return ((2.0*_P.y+_P.x+1.0)%(4.0));}
fn bayerDither4(_P: vec2f)->f32 {var P1: vec2f=((_P)%(2.0)); 
var P2: vec2f=floor(0.5*((_P)%(4.0))); 
return 4.0*bayerDither2(P1)+bayerDither2(P2);}
fn bayerDither8(_P: vec2f)->f32 {var P1: vec2f=((_P)%(2.0)); 
var P2: vec2f=floor(0.5 *((_P)%(4.0))); 
var P4: vec2f=floor(0.25*((_P)%(8.0))); 
return 4.0*(4.0*bayerDither2(P1)+bayerDither2(P2))+bayerDither2(P4);}
`,r.IncludesShadersStoreWGSL[f]||(r.IncludesShadersStoreWGSL[f]=p),m={name:f,shader:p}})),g,_,v,y=e((()=>{n(),l(),h(),g=`shadowMapFragmentExtraDeclaration`,_=`#if SM_FLOAT==0
#include<packingFunctions>
#endif
#if SM_SOFTTRANSPARENTSHADOW==1
#include<bayerDitherFunctions>
uniform softTransparentShadowSM: vec2f;
#endif
varying vDepthMetricSM: f32;
#if SM_USEDISTANCE==1
uniform lightDataSM: vec3f;varying vPositionWSM: vec3f;
#endif
uniform biasAndScaleSM: vec3f;uniform depthValuesSM: vec2f;
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying zSM: f32;
#endif
`,r.IncludesShadersStoreWGSL[g]||(r.IncludesShadersStoreWGSL[g]=_),v={name:g,shader:_}})),b=t({shadowMapPixelShaderWGSL:()=>w}),x,S,C,w,T=e((()=>{n(),l(),h(),y(),o(),i(),d(),x=`shadowMapPixelShader`,S=`#include<shadowMapFragmentExtraDeclaration>
#ifdef ALPHATEXTURE
varying vUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;
#endif
#include<clipPlaneFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#include<clipPlaneFragment>
#ifdef ALPHATEXTURE
var opacityMap: vec4f=textureSample(diffuseSampler,diffuseSamplerSampler,fragmentInputs.vUV);var alphaFromAlphaTexture: f32=opacityMap.a;
#if SM_SOFTTRANSPARENTSHADOW==1
if (uniforms.softTransparentShadowSM.y==1.0) {opacityMap=vec4f(opacityMap.rgb* vec3f(0.3,0.59,0.11),opacityMap.a);alphaFromAlphaTexture=opacityMap.x+opacityMap.y+opacityMap.z;}
#endif
#ifdef ALPHATESTVALUE
if (alphaFromAlphaTexture<ALPHATESTVALUE) {discard;}
#endif
#endif
#if SM_SOFTTRANSPARENTSHADOW==1
#ifdef ALPHATEXTURE
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alphaFromAlphaTexture) {discard;}
#else
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x) {discard;} 
#endif
#endif
#include<shadowMapFragment>
}`,r.ShadersStoreWGSL[x]||(r.ShadersStoreWGSL[x]=S),C=[c,m,v,s,a,u];for(let e of C)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);w={name:x,shader:S}}));export{w as n,b as r,T as t};