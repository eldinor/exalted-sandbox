import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{in as i,rn as a}from"./main-B5ROjULl.js";var o=t({gaussianSplattingFragmentDeclaration:()=>l}),s,c,l,u=e((()=>{n(),i(),a(),s=`gaussianSplattingFragmentDeclaration`,c=`vec4 gaussianColor(vec4 inColor)
{float A=-dot(vPosition,vPosition);if (A<-4.0) discard;float B=exp(A)*inColor.a;
#include<logDepthFragment>
vec3 color=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4(color,B);}
`,r.IncludesShadersStore[s]||(r.IncludesShadersStore[s]=c),l={name:s,shader:c}}));export{o as n,u as r,l as t};