import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{r as i,t as a}from"./helperFunctions-3XR9MQdT.js";import{r as o,t as s}from"./clipPlaneVertex-B7Ah5L7Z.js";import{r as c,t as l}from"./bonesDeclaration-BU9fyIZQ.js";import{i as ee,n as u,r as d,t as f}from"./bakedVertexAnimation-CqU12QD0.js";import{n as p,t as m}from"./morphTargetsVertexGlobalDeclaration-yW37AhbK.js";import{n as h,t as g}from"./morphTargetsVertexDeclaration-CBPzzDK5.js";import{n as _,t as v}from"./morphTargetsVertexGlobal-Dbgdr1aw.js";import{n as y,t as te}from"./morphTargetsVertex-DcQcQgjX.js";import{r as ne,t as re}from"./bonesVertex-DPGvSwGK.js";import{r as ie,t as b}from"./clipPlaneVertexDeclaration-CMQ-YQPt.js";import{n as x,t as S}from"./shadowMapVertexMetric-D0t4Jwyx.js";import{n as C,t as w}from"./sceneUboDeclaration-CF_xguIu.js";import{n as T,t as E}from"./instancesVertex-C5RTqQSN.js";import{n as D,t as O}from"./meshUboDeclaration-CF_UR3-U.js";import{n as k,t as A}from"./sceneVertexDeclaration-rzzexj5z.js";import{n as j,t as M}from"./meshVertexDeclaration-CGgPx3q1.js";var N,P,F,I=e((()=>{n(),A(),M(),N=`shadowMapVertexDeclaration`,P=`#include<sceneVertexDeclaration>
#include<meshVertexDeclaration>
`,r.IncludesShadersStore[N]||(r.IncludesShadersStore[N]=P),F={name:N,shader:P}})),L,R,z,B=e((()=>{n(),w(),O(),L=`shadowMapUboDeclaration`,R=`layout(std140,column_major) uniform;
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`,r.IncludesShadersStore[L]||(r.IncludesShadersStore[L]=R),z={name:L,shader:R}})),V,H,U,W=e((()=>{n(),V=`shadowMapVertexExtraDeclaration`,H=`#if SM_NORMALBIAS==1
uniform vec3 lightDataSM;
#endif
uniform vec3 biasAndScaleSM;uniform vec2 depthValuesSM;varying float vDepthMetricSM;
#if SM_USEDISTANCE==1
varying vec3 vPositionWSM;
#endif
#if defined(SM_DEPTHCLAMP) && SM_DEPTHCLAMP==1
varying float zSM;
#endif
`,r.IncludesShadersStore[V]||(r.IncludesShadersStore[V]=H),U={name:V,shader:H}})),G,K,q,J=e((()=>{n(),G=`shadowMapVertexNormalBias`,K=`#if SM_NORMALBIAS==1
#if SM_DIRECTIONINLIGHTDATA==1
vec3 worldLightDirSM=normalize(-lightDataSM.xyz);
#else
vec3 directionToLightSM=lightDataSM.xyz-worldPos.xyz;vec3 worldLightDirSM=normalize(directionToLightSM);
#endif
float ndlSM=dot(vNormalW,worldLightDirSM);float sinNLSM=sqrt(1.0-ndlSM*ndlSM);float normalBiasSM=biasAndScaleSM.y*sinNLSM;worldPos.xyz-=vNormalW*normalBiasSM;
#endif
`,r.IncludesShadersStore[G]||(r.IncludesShadersStore[G]=K),q={name:G,shader:K}})),Y=t({shadowMapVertexShader:()=>$}),X,Z,Q,$,ae=e((()=>{n(),c(),ee(),m(),g(),i(),A(),M(),I(),w(),O(),B(),W(),ie(),v(),te(),E(),ne(),u(),J(),S(),o(),X=`shadowMapVertexShader`,Z=`attribute vec3 position;
#ifdef NORMAL
attribute vec3 normal;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#ifdef INSTANCES
attribute vec4 world0;attribute vec4 world1;attribute vec4 world2;attribute vec4 world3;
#endif
#include<helperFunctions>
#include<__decl__shadowMapVertex>
#ifdef ALPHATEXTURE
varying vec2 vUV;uniform mat4 diffuseMatrix;
#ifdef UV1
attribute vec2 uv;
#endif
#ifdef UV2
attribute vec2 uv2;
#endif
#endif
#include<shadowMapVertexExtraDeclaration>
#include<clipPlaneVertexDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void)
{vec3 positionUpdated=position;
#ifdef UV1
vec2 uvUpdated=uv;
#endif
#ifdef UV2
vec2 uv2Updated=uv2;
#endif
#ifdef NORMAL
vec3 normalUpdated=normal;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);
#ifdef NORMAL
mat3 normWorldSM=mat3(finalWorld);
#if defined(INSTANCES) && defined(THIN_INSTANCES)
vec3 vNormalW=normalUpdated/vec3(dot(normWorldSM[0],normWorldSM[0]),dot(normWorldSM[1],normWorldSM[1]),dot(normWorldSM[2],normWorldSM[2]));vNormalW=normalize(normWorldSM*vNormalW);
#else
#ifdef NONUNIFORMSCALING
normWorldSM=transposeMat3(inverseMat3(normWorldSM));
#endif
vec3 vNormalW=normalize(normWorldSM*normalUpdated);
#endif
#endif
#include<shadowMapVertexNormalBias>
gl_Position=viewProjection*worldPos;
#include<shadowMapVertexMetric>
#ifdef ALPHATEXTURE
#ifdef UV1
vUV=vec2(diffuseMatrix*vec4(uvUpdated,1.0,0.0));
#endif
#ifdef UV2
vUV=vec2(diffuseMatrix*vec4(uv2Updated,1.0,0.0));
#endif
#endif
#include<clipPlaneVertex>
}`,r.ShadersStore[X]||(r.ShadersStore[X]=Z),Q=[l,d,p,h,a,k,j,F,C,D,z,U,b,_,y,T,re,f,q,x,s];for(let e of Q)r.IncludesShadersStore[e.name]||(r.IncludesShadersStore[e.name]=e.shader);$={name:X,shader:Z}}));export{$ as n,Y as r,ae as t};