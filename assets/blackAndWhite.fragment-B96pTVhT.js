import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({blackAndWhitePixelShader:()=>s}),a,o,s,c=e((()=>{n(),a=`blackAndWhitePixelShader`,o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform float degree;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{vec3 color=texture2D(textureSampler,vUV).rgb;float luminance=dot(color,vec3(0.3,0.59,0.11)); 
vec3 blackAndWhite=vec3(luminance,luminance,luminance);gl_FragColor=vec4(color-((color-blackAndWhite)*degree),1.0);}`,r.ShadersStore[a]||(r.ShadersStore[a]=o),s={name:a,shader:o}}));export{i as n,c as r,s as t};