import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({lensFlarePixelShader:()=>s}),a,o,s,c=e((()=>{n(),a=`lensFlarePixelShader`,o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec4 color;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
vec4 baseColor=texture2D(textureSampler,vUV);gl_FragColor=baseColor*color;
#define CUSTOM_FRAGMENT_MAIN_END
}`,r.ShadersStore[a]||(r.ShadersStore[a]=o),s={name:a,shader:o}}));export{s as n,i as r,c as t};