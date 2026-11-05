import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({shadowMapFragmentSoftTransparentShadowWGSL:()=>s}),a,o,s,c=e((()=>{n(),a=`shadowMapFragmentSoftTransparentShadow`,o=`#if SM_SOFTTRANSPARENTSHADOW==1
if ((bayerDither8(floor(((fragmentInputs.position.xy)%(8.0)))))/64.0>=uniforms.softTransparentShadowSM.x*alpha) {discard;}
#endif
`,r.IncludesShadersStoreWGSL[a]||(r.IncludesShadersStoreWGSL[a]=o),s={name:a,shader:o}}));export{s as n,i as r,c as t};