import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./helperFunctions-DONL4qtq.js";import{n as o,t as s}from"./pbrBRDFFunctions-Cl5qGB34.js";import{i as c,n as l,r as u,t as d}from"./hdrFilteringFunctions-BQ6ba086.js";var f=t({hdrIrradianceFilteringPixelShaderWGSL:()=>g}),p,m,h,g,_=e((()=>{n(),i(),c(),s(),l(),p=`hdrIrradianceFilteringPixelShader`,m=`#include<helperFunctions>
#include<importanceSampling>
#include<pbrBRDFFunctions>
#include<hdrFilteringFunctions>
var inputTextureSampler: sampler;var inputTexture: texture_cube<f32>;
#ifdef IBL_CDF_FILTERING
var icdfTextureSampler: sampler;var icdfTexture: texture_2d<f32>;
#endif
uniform vFilteringInfo: vec2f;uniform hdrScale: f32;varying direction: vec3f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {var color: vec3f=irradiance(inputTexture,inputTextureSampler,input.direction,uniforms.vFilteringInfo,0.0,vec3f(1.0),input.direction
#ifdef IBL_CDF_FILTERING
,icdfTexture,icdfTextureSampler
#endif
);fragmentOutputs.color= vec4f(color*uniforms.hdrScale,1.0);}`,r.ShadersStoreWGSL[p]||(r.ShadersStoreWGSL[p]=m),h=[a,u,o,d];for(let e of h)r.IncludesShadersStoreWGSL[e.name]||(r.IncludesShadersStoreWGSL[e.name]=e.shader);g={name:p,shader:m}}));export{f as n,_ as r,g as t};