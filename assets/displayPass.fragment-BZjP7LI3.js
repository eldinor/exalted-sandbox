import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({displayPassPixelShader:()=>s}),a,o,s,c=e((()=>{n(),a=`displayPassPixelShader`,o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D passSampler;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{gl_FragColor=texture2D(passSampler,vUV);}`,r.ShadersStore[a]||(r.ShadersStore[a]=o),s={name:a,shader:o}}));export{i as n,c as r,s as t};