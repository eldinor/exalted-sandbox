import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./helperFunctions-DONL4qtq.js";import{r as o,t as s}from"./imageProcessingDeclaration-CTp48YEp.js";import{r as c,t as l}from"./imageProcessingFunctions-choHprOY.js";var u=t({imageProcessingPixelShaderWGSL:()=>m}),d,f,p,m,h=e((()=>{n(),o(),i(),c(),d=`imageProcessingPixelShader`,f=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<imageProcessingDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var result: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);result=vec4f(max(result.rgb,vec3f(0.)),result.a);
#ifdef IMAGEPROCESSING
#ifndef FROMLINEARSPACE
result=vec4f(toLinearSpaceVec3(result.rgb),result.a);
#endif
result=applyImageProcessing(result);
#else
#ifdef FROMLINEARSPACE
result=applyImageProcessing(result);
#endif
#endif
fragmentOutputs.color=result;}`,r.ShadersStoreWGSL[d]||(r.ShadersStoreWGSL[d]=f),p=[s,a,l];for(let e of p)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);m={name:d,shader:f}}));export{u as n,h as r,m as t};