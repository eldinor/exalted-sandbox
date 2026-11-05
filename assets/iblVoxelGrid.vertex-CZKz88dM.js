import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./bonesDeclaration-BU9fyIZQ.js";import{i as o,n as s,r as c,t as l}from"./bakedVertexAnimation-CqU12QD0.js";import{n as u,t as d}from"./morphTargetsVertexGlobalDeclaration-yW37AhbK.js";import{n as f,t as p}from"./morphTargetsVertexDeclaration-CBPzzDK5.js";import{n as m,t as h}from"./morphTargetsVertexGlobal-Dbgdr1aw.js";import{n as g,t as _}from"./morphTargetsVertex-DcQcQgjX.js";import{r as v,t as y}from"./bonesVertex-DPGvSwGK.js";import{n as b,t as x}from"./instancesDeclaration-zH2q8UpI.js";import{n as S,t as C}from"./instancesVertex-C5RTqQSN.js";var w=t({iblVoxelGridVertexShader:()=>O}),T,E,D,O,k=e((()=>{n(),i(),o(),x(),d(),p(),h(),_(),C(),v(),s(),T=`iblVoxelGridVertexShader`,E=`attribute vec3 position;varying vec3 vNormalizedPosition;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<instancesDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
uniform mat4 invWorldScale;uniform mat4 viewMatrix;void main(void) {vec3 positionUpdated=position;
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);gl_Position=viewMatrix*invWorldScale*worldPos;vNormalizedPosition.xyz=gl_Position.xyz*0.5+0.5;
#ifdef IS_NDC_HALF_ZRANGE
gl_Position.z=gl_Position.z*0.5+0.5;
#endif
}`,r.ShadersStore[T]||(r.ShadersStore[T]=E),D=[a,c,b,u,f,m,g,S,y,l];for(let e of D)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);O={name:T,shader:E}}));export{w as n,k as r,O as t};