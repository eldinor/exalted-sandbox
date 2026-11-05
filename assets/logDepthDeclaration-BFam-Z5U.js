import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({logDepthDeclarationWGSL:()=>s}),a,o,s,c=e((()=>{n(),a=`logDepthDeclaration`,o=`#ifdef LOGARITHMICDEPTH
uniform logarithmicDepthConstant: f32;varying vFragmentDepth: f32;
#endif
`,r.IncludesShadersStoreWGSL[a]||(r.IncludesShadersStoreWGSL[a]=o),s={name:a,shader:o}}));export{s as n,i as r,c as t};