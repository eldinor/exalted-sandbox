import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./clipPlaneFragment-smHhwblQ.js";import{r as o,t as s}from"./clipPlaneFragmentDeclaration-D9rA-gke.js";import{n as c,t as l}from"./packingFunctions-BMv-fKKe.js";import{n as u,t as d}from"./shadowMapFragment-BEmm4rHw.js";var f,p,m,h=e((()=>{n(),f=`bayerDitherFunctions`,p=`float bayerDither2(vec2 _P) {return mod(2.0*_P.y+_P.x+1.0,4.0);}
float bayerDither4(vec2 _P) {vec2 P1=mod(_P,2.0); 
vec2 P2=floor(0.5*mod(_P,4.0)); 
return 4.0*bayerDither2(P1)+bayerDither2(P2);}
float bayerDither8(vec2 _P) {vec2 P1=mod(_P,2.0); 
vec2 P2=floor(0.5 *mod(_P,4.0)); 
vec2 P4=floor(0.25*mod(_P,8.0)); 
return 4.0*(4.0*bayerDither2(P1)+bayerDither2(P2))+bayerDither2(P4);}
`,r.IncludesShadersStore[f]||(r.IncludesShadersStore[f]=p),m={name:f,shader:p}})),g,_,v,y=e((()=>{n(),l(),h(),g=`shadowMapFragmentExtraDeclaration`,_=`#if SM_FLOAT==0
#include<packingFunctions>
#endif
#if SM_SOFTTRANSPARENTSHADOW==1
#include<bayerDitherFunctions>
uniform vec2 softTransparentShadowSM;
#endif
varying float vDepthMetricSM;
#if SM_USEDISTANCE==1
uniform vec3 lightDataSM;varying vec3 vPositionWSM;
#endif
uniform vec3 biasAndScaleSM;uniform vec2 depthValuesSM;
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying float zSM;
#endif
`,r.IncludesShadersStore[g]||(r.IncludesShadersStore[g]=_),v={name:g,shader:_}})),b=t({shadowMapPixelShader:()=>w}),x,S,C,w,T=e((()=>{n(),l(),h(),y(),o(),i(),d(),x=`shadowMapPixelShader`,S=`#include<shadowMapFragmentExtraDeclaration>
#ifdef ALPHATEXTURE
varying vec2 vUV;uniform sampler2D diffuseSampler;
#endif
#include<clipPlaneFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{
#include<clipPlaneFragment>
#ifdef ALPHATEXTURE
vec4 opacityMap=texture2D(diffuseSampler,vUV);float alphaFromAlphaTexture=opacityMap.a;
#if SM_SOFTTRANSPARENTSHADOW==1
if (softTransparentShadowSM.y==1.0) {opacityMap.rgb=opacityMap.rgb*vec3(0.3,0.59,0.11);alphaFromAlphaTexture=opacityMap.x+opacityMap.y+opacityMap.z;}
#endif
#ifdef ALPHATESTVALUE
if (alphaFromAlphaTexture<ALPHATESTVALUE)
discard;
#endif
#endif
#if SM_SOFTTRANSPARENTSHADOW==1
#ifdef ALPHATEXTURE
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x*alphaFromAlphaTexture) discard;
#else
if ((bayerDither8(floor(mod(gl_FragCoord.xy,8.0))))/64.0>=softTransparentShadowSM.x) discard;
#endif
#endif
#include<shadowMapFragment>
}`,r.ShadersStore[x]||(r.ShadersStore[x]=S),C=[c,m,v,s,a,u];for(let e of C)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);w={name:x,shader:S}}));export{w as n,b as r,T as t};