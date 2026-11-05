import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({passPixelShaderWGSL:()=>s}),a,o,s,c=e((()=>{n(),a=`passPixelShader`,o=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`,r.ShadersStoreWGSL[a]||(r.ShadersStoreWGSL[a]=o),s={name:a,shader:o}}));export{s as n,i as r,c as t};