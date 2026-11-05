import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({logDepthDeclaration:()=>s}),a,o,s,c=e((()=>{n(),a=`logDepthDeclaration`,o=`#ifdef LOGARITHMICDEPTH
uniform float logarithmicDepthConstant;varying float vFragmentDepth;
#endif
`,r.IncludesShadersStore[a]||(r.IncludesShadersStore[a]=o),s={name:a,shader:o}}));export{s as n,i as r,c as t};