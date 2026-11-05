import{n as e,t}from"./shaderStore-C5hmi3ce.js";import{r as n,t as r}from"./clipPlaneFragment-La7EHJ7s.js";import{r as i,t as a}from"./clipPlaneFragmentDeclaration-OXiBkWkm.js";import{r as o,t as s}from"./fogFragmentDeclaration-CIOW1O36.js";import{n as c,t as l}from"./logDepthFragment-CAyoj6n2.js";import{n as u,t as d}from"./fogFragment-CIKWQhSH.js";import{r as f,t as p}from"./helperFunctions-DONL4qtq.js";import{n as m,t as h}from"./lightFragment-DbAppmc8.js";import{n as g,t as _}from"./lightUboDeclaration-cGPw0fOH.js";import{n as v,t as y}from"./lightsFragmentFunctions-B4yX0f2E.js";import{n as b,t as x}from"./logDepthDeclaration-BFam-Z5U.js";import{n as S,t as C}from"./shadowsFragmentFunctions-DVFZme1y.js";import{n as w,t as T}from"./depthPrePass-Dr-xKJyT.js";import{n as E,t as D}from"./imageProcessingCompatibility-CkU2lXoM.js";e(),f(),_(),y(),C(),i(),x(),o(),n(),w(),h(),l(),u(),E();var O=`normalPixelShader`,k=`uniform vEyePosition: vec4f;uniform vDiffuseColor: vec4f;varying vPositionW: vec3f;
#ifdef NORMAL
varying vNormalW: vec3f;
#endif
#ifdef LIGHTING
#include<helperFunctions>
#include<lightUboDeclaration>[0]
#include<lightUboDeclaration>[1]
#include<lightUboDeclaration>[2]
#include<lightUboDeclaration>[3]
#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>
#endif
#ifdef DIFFUSE
varying vDiffuseUV: vec2f;var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;uniform vDiffuseInfos: vec2f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#if defined(CLUSTLIGHT_BATCH) && CLUSTLIGHT_BATCH>0
varying vViewDepth: f32;
#endif
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
var viewDirectionW: vec3f=normalize(uniforms.vEyePosition.xyz-fragmentInputs.vPositionW);var baseColor: vec4f= vec4f(1.,1.,1.,1.);var diffuseColor: vec3f=uniforms.vDiffuseColor.rgb;var alpha: f32=uniforms.vDiffuseColor.a;
#ifdef DIFFUSE
baseColor=textureSample(diffuseSampler,diffuseSamplerSampler,fragmentInputs.vDiffuseUV);
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
#define DEPTHPREPASS_SKIP_EARLY_RETURN
#include<depthPrePass>
#ifndef DEPTHPREPASS
baseColor=vec4f(baseColor.rgb*uniforms.vDiffuseInfos.y,baseColor.a);
#endif
#endif
#ifndef DEPTHPREPASS
#ifdef NORMAL
baseColor=mix(baseColor, vec4f(fragmentInputs.vNormalW,1.0),0.5);
#endif
#ifdef NORMAL
var normalW: vec3f=normalize(fragmentInputs.vNormalW);
#else
var normalW: vec3f= vec3f(1.0,1.0,1.0);
#endif
#ifdef LIGHTING
var diffuseBase: vec3f= vec3f(0.,0.,0.);var info: lightingInfo;var shadow: f32=1.;var glossiness: f32=0.;var aggShadow: f32=0.;var numLights: f32=0.;
#include<lightFragment>[0]
#include<lightFragment>[1]
#include<lightFragment>[2]
#include<lightFragment>[3]
var finalDiffuse: vec3f=clamp(diffuseBase*diffuseColor,vec3f(0.0),vec3f(1.0))*baseColor.rgb;
#else
var finalDiffuse: vec3f= baseColor.rgb;
#endif
var color: vec4f= vec4f(finalDiffuse,alpha);
#include<logDepthFragment>
#include<fogFragment>
fragmentOutputs.color=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
#endif
}
`;t.ShadersStoreWGSL[O]||(t.ShadersStoreWGSL[O]=k);var A=[p,g,v,S,a,b,s,r,T,m,c,d,D];for(let e of A)t.IncludesShadersStoreWGSL[e.name]||(t.IncludesShadersStoreWGSL[e.name]=e.shader);var j={name:O,shader:k};export{j as normalPixelShaderWGSL};