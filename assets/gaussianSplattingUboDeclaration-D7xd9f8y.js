import{n as e}from"./rolldown-runtime-CNC7AqOf.js";import{n as t,t as n}from"./shaderStore-C5hmi3ce.js";import{t as r}from"./sceneUboDeclaration-CF_xguIu.js";import{t as i}from"./meshUboDeclaration-CF_UR3-U.js";var a,o,s,c=e((()=>{t(),r(),i(),a=`gaussianSplattingUboDeclaration`,o=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute vec3 position;attribute vec4 splatIndex0;attribute vec4 splatIndex1;attribute vec4 splatIndex2;attribute vec4 splatIndex3;
`,n.IncludesShadersStore[a]||(n.IncludesShadersStore[a]=o),s={name:a,shader:o}}));export{c as n,s as t};