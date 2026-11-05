import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./bonesDeclaration-BU9fyIZQ.js";import{i as o,n as s,r as c,t as l}from"./bakedVertexAnimation-CqU12QD0.js";import{n as u,t as d}from"./morphTargetsVertexGlobalDeclaration-yW37AhbK.js";import{n as f,t as p}from"./morphTargetsVertexDeclaration-CBPzzDK5.js";import{n as m,t as h}from"./morphTargetsVertexGlobal-Dbgdr1aw.js";import{n as g,t as _}from"./morphTargetsVertex-DcQcQgjX.js";import{r as v,t as y}from"./bonesVertex-DPGvSwGK.js";import{n as b,t as x}from"./instancesDeclaration-zH2q8UpI.js";import{n as S,t as C}from"./instancesVertex-C5RTqQSN.js";var w=t({meshUVSpaceRendererVertexShader:()=>O}),T,E,D,O,k=e((()=>{n(),i(),o(),d(),p(),x(),h(),_(),C(),v(),s(),T=`meshUVSpaceRendererVertexShader`,E=`precision highp float;attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 projMatrix;varying vec2 vDecalTC;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<instancesDeclaration>
void main(void) {vec3 positionUpdated=position;vec3 normalUpdated=normal;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);mat3 normWorldSM=mat3(finalWorld);vec3 vNormalW;
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vNormalW=normalUpdated/vec3(dot(normWorldSM[0],normWorldSM[0]),dot(normWorldSM[1],normWorldSM[1]),dot(normWorldSM[2],normWorldSM[2]));vNormalW=normalize(normWorldSM*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normWorldSM=transposeMat3(inverseMat3(normWorldSM));
#endif
vNormalW=normalize(normWorldSM*normalUpdated);
#endif
vec3 normalView=normalize((projMatrix*vec4(vNormalW,0.0)).xyz);vec3 decalTC=(projMatrix*worldPos).xyz;vDecalTC=decalTC.xy;gl_Position=vec4(uv*2.0-1.0,normalView.z>0.0 ? 2. : decalTC.z,1.0);}`,r.ShadersStore[T]||(r.ShadersStore[T]=E),D=[a,c,u,f,b,m,g,S,y,l];for(let e of D)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);O={name:T,shader:E}}));export{O as n,w as r,k as t};