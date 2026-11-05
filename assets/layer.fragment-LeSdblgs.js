import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./helperFunctions-DONL4qtq.js";var o=t({layerPixelShaderWGSL:()=>u}),s,c,l,u,d=e((()=>{n(),i(),s=`layerPixelShader`,c=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;uniform color: vec4f;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
var baseColor: vec4f=textureSample(textureSampler,textureSamplerSampler,input.vUV);
#if defined(CONVERT_TO_GAMMA)
baseColor=toGammaSpace(baseColor);
#elif defined(CONVERT_TO_LINEAR)
baseColor=toLinearSpaceVec4(baseColor);
#endif
#ifdef ALPHATEST
if (baseColor.a<0.4) {discard;}
#endif
fragmentOutputs.color=baseColor*uniforms.color;
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStoreWGSL[s]||(r.ShadersStoreWGSL[s]=c),l=[a];for(let e of l)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);u={name:s,shader:c}}));export{u as n,o as r,d as t};