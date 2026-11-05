import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({glowMapMergeVertexShader:()=>s}),a,o,s,c=e((()=>{n(),a=`glowMapMergeVertexShader`,o=`attribute vec2 position;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=position*madd+madd;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`,r.ShadersStore[a]||(r.ShadersStore[a]=o),s={name:a,shader:o}}));export{i as n,c as r,s as t};