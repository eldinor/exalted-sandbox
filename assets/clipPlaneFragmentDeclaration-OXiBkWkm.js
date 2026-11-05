import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({clipPlaneFragmentDeclarationWGSL:()=>s}),a,o,s,c=e((()=>{n(),a=`clipPlaneFragmentDeclaration`,o=`#ifdef CLIPPLANE
varying fClipDistance: f32;
#endif
#ifdef CLIPPLANE2
varying fClipDistance2: f32;
#endif
#ifdef CLIPPLANE3
varying fClipDistance3: f32;
#endif
#ifdef CLIPPLANE4
varying fClipDistance4: f32;
#endif
#ifdef CLIPPLANE5
varying fClipDistance5: f32;
#endif
#ifdef CLIPPLANE6
varying fClipDistance6: f32;
#endif
`,r.IncludesShadersStoreWGSL[a]||(r.IncludesShadersStoreWGSL[a]=o),s={name:a,shader:o}}));export{i as n,c as r,s as t};