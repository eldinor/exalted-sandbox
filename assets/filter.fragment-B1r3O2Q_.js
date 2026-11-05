import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({filterPixelShader:()=>s}),a,o,s,c=e((()=>{n(),a=`filterPixelShader`,o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform mat4 kernelMatrix;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec3 baseColor=texture2D(textureSampler,vUV).rgb;vec3 updatedColor=(kernelMatrix*vec4(baseColor,1.0)).rgb;gl_FragColor=vec4(updatedColor,1.0);}`,r.ShadersStore[a]||(r.ShadersStore[a]=o),s={name:a,shader:o}}));export{i as n,c as r,s as t};