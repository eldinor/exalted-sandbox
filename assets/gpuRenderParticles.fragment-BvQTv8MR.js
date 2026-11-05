import{n as e}from"./rolldown-runtime-CNC7AqOf.js";import{n as t,t as n}from"./shaderStore-C5hmi3ce.js";import{r,t as i}from"./clipPlaneFragment-La7EHJ7s.js";import{r as a,t as o}from"./clipPlaneFragmentDeclaration-OXiBkWkm.js";import{r as s,t as c}from"./fogFragmentDeclaration-CIOW1O36.js";import{n as l,t as u}from"./logDepthFragment-CAyoj6n2.js";import{n as d,t as f}from"./fogFragment-CIKWQhSH.js";import{r as p,t as m}from"./helperFunctions-DONL4qtq.js";import{r as h,t as g}from"./imageProcessingDeclaration-CTp48YEp.js";import{r as _,t as v}from"./imageProcessingFunctions-choHprOY.js";import{n as y,t as b}from"./logDepthDeclaration-BFam-Z5U.js";var x,S,C,w;e((()=>{t(),a(),h(),b(),p(),_(),s(),r(),u(),d(),x=`gpuRenderParticlesPixelShader`,S=`var diffuseSamplerSampler: sampler;var diffuseSampler: texture_2d<f32>;varying vUV: vec2f;varying vColor: vec4f;
#include<clipPlaneFragmentDeclaration>
#include<imageProcessingDeclaration>
#include<logDepthDeclaration>
#include<helperFunctions>
#include<imageProcessingFunctions>
#include<fogFragmentDeclaration>
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#include<clipPlaneFragment>
let textureColor: vec4f=textureSample(diffuseSampler,diffuseSamplerSampler,input.vUV);var baseColor: vec4f=textureColor*input.vColor;
#ifdef BLENDMULTIPLYMODE
let alpha: f32=input.vColor.a*textureColor.a;baseColor=vec4f(baseColor.rgb*alpha+vec3f(1.0)*(1.0-alpha),baseColor.a);
#endif
#include<logDepthFragment>
#include<fogFragment>(color,baseColor)
#ifdef IMAGEPROCESSINGPOSTPROCESS
baseColor=vec4f(toLinearSpaceVec3(baseColor.rgb),baseColor.a);
#else
#ifdef IMAGEPROCESSING
baseColor=vec4f(toLinearSpaceVec3(baseColor.rgb),baseColor.a);baseColor=applyImageProcessing(baseColor);
#endif
#endif
fragmentOutputs.color=baseColor;}
`,n.ShadersStoreWGSL[x]||(n.ShadersStoreWGSL[x]=S),C=[o,g,y,m,v,c,i,l,f];for(let e of C)n.IncludesShadersStoreWGSL[e.name]||(n.IncludesShadersStoreWGSL[e.name]=e.shader);w={name:x,shader:S}}))();export{w as gpuRenderParticlesPixelShaderWGSL};