import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";var i=t({fluidRenderingParticleDepthVertexShader:()=>s}),a,o,s,c=e((()=>{n(),a=`fluidRenderingParticleDepthVertexShader`,o=`attribute vec3 position;attribute vec2 offset;uniform mat4 view;uniform mat4 projection;uniform vec2 size;varying vec2 uv;varying vec3 viewPos;varying float sphereRadius;
#ifdef FLUIDRENDERING_VELOCITY
attribute vec3 velocity;varying float velocityNorm;
#endif
void main(void) {vec3 cornerPos;cornerPos.xy=vec2(offset.x-0.5,offset.y-0.5)*size;cornerPos.z=0.0;viewPos=(view*vec4(position,1.0)).xyz;gl_Position=projection*vec4(viewPos+cornerPos,1.0);uv=offset;sphereRadius=size.x/2.0;
#ifdef FLUIDRENDERING_VELOCITY
velocityNorm=length(velocity);
#endif
}
`,r.ShadersStore[a]||(r.ShadersStore[a]=o),s={name:a,shader:o}}));export{i as n,c as r,s as t};