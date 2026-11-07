import{n as e,r as t}from"./rolldown-runtime-CNC7AqOf.js";import{n,t as r}from"./shaderStore-C5hmi3ce.js";import{c as i,l as a}from"./tools.functions-DXnqCYM0.js";import{c as o,o as s}from"./math.vector.pure-C-qMt1QQ.js";import{l as c,r as l}from"./buffer.pure-Dkr8mgim.js";import{n as u,t as d}from"./uniformBuffer-BWZ__SPT.js";import{Bt as f,Gt as p,Ut as m,Wt as h}from"./main-B5ROjULl.js";var g,_=e((()=>{m(),p(),c(),o(),u(),a(),g=class{constructor(e){this._computeShadersCache={},this._positionBuffers={},this._indexBuffers={},this._weightBuffers={},this._indexExtraBuffers={},this._weightExtraBuffers={},this._morphTargetInfluenceBuffers={},this._morphTargetTextureIndexBuffers={},this._ubos=[],this._uboIndex=0,this._processedMeshes=[],this._computeShaders=[],this._uniqueComputeShaders=new Set,this._resultBuffers=[],this._engine=e}_getComputeShader(e,t,n){let r,i=e.join(`
`);if(this._computeShadersCache[i])r=this._computeShadersCache[i];else{let a={positionBuffer:{group:0,binding:0},resultBuffer:{group:0,binding:1},settings:{group:0,binding:7}};t&&(a.boneSampler={group:0,binding:2},a.indexBuffer={group:0,binding:3},a.weightBuffer={group:0,binding:4},a.indexExtraBuffer={group:0,binding:5},a.weightExtraBuffer={group:0,binding:6}),n&&(a.morphTargets={group:0,binding:8},a.morphTargetInfluences={group:0,binding:9},a.morphTargetTextureIndices={group:0,binding:10}),r=new f(`boundingInfoCompute${t?`_bones`:``}${n?`_morphs`:``}`,this._engine,`boundingInfo`,{bindingsMapping:a,defines:e}),this._computeShadersCache[i]=r}return r}_getUBO(){if(this._uboIndex>=this._ubos.length){let e=new d(this._engine);e.addFloat2(`boneTextureInfo`,0,0),e.addFloat3(`morphTargetTextureInfo`,0,0,0),e.addUniform(`morphTargetCount`,1),e.addUniform(`indexResult`,1),this._ubos.push(e)}return this._ubos[this._uboIndex++]}_extractDataAndLink(e,t,n,r,i,a){let o,s=t.getTotalVertices();if(a[t.uniqueId])o=a[t.uniqueId];else{let e=t.getVertexBuffer(n)?.getFloatData(s);o=new h(this._engine,Float32Array.BYTES_PER_ELEMENT*s*r),o.update(e),a[t.uniqueId]=o}e.setStorageBuffer(i,o)}_prepareStorage(e,t,n,r,i,a){let o;r[n]?o=r[n]:(o=new h(this._engine,Float32Array.BYTES_PER_ELEMENT*i),r[n]=o),o.update(a),e.setStorageBuffer(t,o)}async processAsync(e){await this.registerMeshListAsync(e),this.processMeshList(),await this.fetchResultsForMeshListAsync()}registerMeshListAsync(e){this._disposeForMeshList(),Array.isArray(e)||(e=[e]);let t=0;for(let n=0;n<e.length;n++){let r=e[n];if(r.getTotalVertices()===0||!r.getVertexBuffer||!r.getVertexBuffer(l.PositionKind))continue;this._processedMeshes.push(r);let i=r.morphTargetManager;i&&i.supportsPositions&&(t=Math.max(t,i.numTargets))}for(let e=0;e<this._processedMeshes.length;e++){let n=this._processedMeshes[e],r=[``],i=!1;n&&n.useBones&&n.computeBonesUsingShaders&&n.skeleton&&(r.push(`#define NUM_BONE_INFLUENCERS `+n.numBoneInfluencers),i=!0);let a=this._getComputeShader(r,i,!1);this._uniqueComputeShaders.add(a);let o=n.morphTargetManager;if(o&&o.supportsPositions){r=r.slice(),r.push(`#define MORPHTARGETS`),r.push(`#define NUM_MORPH_INFLUENCERS `+t);let e=this._getComputeShader(r,i,!0);this._uniqueComputeShaders.add(e),this._computeShaders.push([a,e])}else this._computeShaders.push([a,a]);let s=this._getUBO();s.updateUInt(`indexResult`,e),s.update()}return new Promise(e=>{i(()=>{let e=this._uniqueComputeShaders.keys();for(let t=e.next();t.done!==!0;t=e.next())if(!t.value.isReady())return!1;return!0},e)})}processMeshList(){if(this._processedMeshes.length===0)return;this._uboIndex=0;let e=8*this._processedMeshes.length,t=new Float32Array(e),n=new h(this._engine,Float32Array.BYTES_PER_ELEMENT*e);this._resultBuffers.push(n);for(let e=0;e<this._processedMeshes.length;e++)t[e*8+0]=1/0,t[e*8+1]=1/0,t[e*8+2]=1/0,t[e*8+3]=-1/0,t[e*8+4]=-1/0,t[e*8+5]=-1/0;n.update(t);for(let e=0;e<this._processedMeshes.length;e++){let t=this._processedMeshes[e],r=t.getTotalVertices(),[i,a]=this._computeShaders[e],o=t.morphTargetManager,s=o&&o.numInfluencers>0&&o.supportsPositions,c=s?a:i;this._extractDataAndLink(c,t,l.PositionKind,3,`positionBuffer`,this._positionBuffers);let u=this._getUBO(),d=!1;if(t&&t.useBones&&t.computeBonesUsingShaders&&t.skeleton&&t.skeleton.useTextureToStoreBoneMatrices){this._extractDataAndLink(c,t,l.MatricesIndicesKind,4,`indexBuffer`,this._indexBuffers),this._extractDataAndLink(c,t,l.MatricesWeightsKind,4,`weightBuffer`,this._weightBuffers);let e=t.skeleton.getTransformMatrixTexture(t);c.setTexture(`boneSampler`,e,!1),u.updateFloat2(`boneTextureInfo`,t.skeleton._textureWidth,t.skeleton._textureHeight),d=!0,t.numBoneInfluencers>4&&(this._extractDataAndLink(c,t,l.MatricesIndicesExtraKind,4,`indexExtraBuffer`,this._indexExtraBuffers),this._extractDataAndLink(c,t,l.MatricesWeightsExtraKind,4,`weightExtraBuffer`,this._weightExtraBuffers))}if(s){let e=o._targetStoreTexture;c.setTexture(`morphTargets`,e,!1),this._prepareStorage(c,`morphTargetInfluences`,t.uniqueId,this._morphTargetInfluenceBuffers,o.numInfluencers,o.influences),this._prepareStorage(c,`morphTargetTextureIndices`,t.uniqueId,this._morphTargetTextureIndexBuffers,o.numInfluencers,o._morphTargetTextureIndices),u.updateFloat3(`morphTargetTextureInfo`,o._textureVertexStride,o._textureWidth,o._textureHeight),u.updateFloat(`morphTargetCount`,o.numInfluencers),d=!0}d&&u.update(),c.setStorageBuffer(`resultBuffer`,n),c.setUniformBuffer(`settings`,u),c.dispatch(Math.ceil(r/256)),this._engine.flushFramebuffer()}}async fetchResultsForMeshListAsync(){return await new Promise(e=>{let t=[],n=0;for(let e=0;e<this._resultBuffers.length;e++){let r=this._resultBuffers[e].getBuffer();t.push(r),n+=r.capacity}let r=new Float32Array(n/Float32Array.BYTES_PER_ELEMENT),i=s.Zero(),a=s.Zero(),o={minimum:i,maximum:a};this._engine.readFromMultipleStorageBuffers(t,0,void 0,r,!0).then(()=>{let t=0;for(let e=0;e<this._resultBuffers.length;e++){for(let n=0;n<this._processedMeshes.length;n++){let c=this._processedMeshes[n];s.FromArrayToRef(r,t+n*8,i),s.FromArrayToRef(r,t+n*8+3,a),e>0&&(i.minimizeInPlace(c.getBoundingInfo().minimum),a.maximizeInPlace(c.getBoundingInfo().maximum)),c._refreshBoundingInfoDirect(o)}t+=8*this._processedMeshes.length}for(let e of this._resultBuffers)e.dispose();this._resultBuffers=[],this._uboIndex=0,e()})})}_disposeCache(e){for(let t in e)e[t].dispose()}_disposeForMeshList(){for(let e of this._resultBuffers)e.dispose();this._resultBuffers=[],this._processedMeshes=[],this._computeShaders=[],this._uniqueComputeShaders=new Set}dispose(){this._disposeCache(this._positionBuffers),this._positionBuffers={},this._disposeCache(this._indexBuffers),this._indexBuffers={},this._disposeCache(this._weightBuffers),this._weightBuffers={},this._disposeCache(this._morphTargetInfluenceBuffers),this._morphTargetInfluenceBuffers={},this._disposeCache(this._morphTargetTextureIndexBuffers),this._morphTargetTextureIndexBuffers={};for(let e of this._ubos)e.dispose();this._ubos=[],this._computeShadersCache={},this._engine=void 0,this._disposeForMeshList()}}})),v,y,b=e((()=>{n(),v=`boundingInfoComputeShader`,y=`struct Results {minX : atomic<i32>,
minY : atomic<i32>,
minZ : atomic<i32>,
maxX : atomic<i32>,
maxY : atomic<i32>,
maxZ : atomic<i32>,
dummy1 : i32,
dummy2 : i32,};fn floatToBits(value: f32)->i32 {return bitcast<i32>(value);}
fn bitsToFloat(value: i32)->f32 {return bitcast<f32>(value);}
fn atomicMinFloat(atomicVar: ptr<storage,atomic<i32>,read_write>,value: f32) {let intValue=floatToBits(value);loop {let oldIntValue=atomicLoad(atomicVar);let oldValue=bitsToFloat(oldIntValue);if (value>=oldValue) {break;}
if (atomicCompareExchangeWeak(atomicVar,oldIntValue,intValue).old_value==oldIntValue) {break;}}}
fn atomicMaxFloat(atomicVar: ptr<storage,atomic<i32>,read_write>,value: f32) {let intValue=floatToBits(value);loop {let oldIntValue=atomicLoad(atomicVar);let oldValue=bitsToFloat(oldIntValue);if (value<=oldValue) {break;}
if (atomicCompareExchangeWeak(atomicVar,oldIntValue,intValue).old_value==oldIntValue) {break;}}}
fn readMatrixFromRawSampler(smp : texture_2d<f32>,index : f32)->mat4x4<f32>
{let offset=i32(index)*4; 
let textureWidth=i32(settings.boneTextureInfo.x);let y=offset/textureWidth;let x=offset % textureWidth;let m0=textureLoad(smp,vec2<i32>(x+0,y),0);let m1=textureLoad(smp,vec2<i32>(x+1,y),0);let m2=textureLoad(smp,vec2<i32>(x+2,y),0);let m3=textureLoad(smp,vec2<i32>(x+3,y),0);return mat4x4<f32>(m0,m1,m2,m3);}
const identity=mat4x4f(
vec4f(1.0,0.0,0.0,0.0),
vec4f(0.0,1.0,0.0,0.0),
vec4f(0.0,0.0,1.0,0.0),
vec4f(0.0,0.0,0.0,1.0)
);struct Settings {boneTextureInfo: vec2f,
morphTargetTextureInfo: vec3f,
morphTargetCount: f32,
indexResult : u32,};@group(0) @binding(0) var<storage,read> positionBuffer : array<f32>;@group(0) @binding(1) var<storage,read_write> resultBuffer : array<Results>;@group(0) @binding(7) var<uniform> settings : Settings;
#if NUM_BONE_INFLUENCERS>0
@group(0) @binding(2) var boneSampler : texture_2d<f32>;@group(0) @binding(3) var<storage,read> indexBuffer : array<vec4f>;@group(0) @binding(4) var<storage,read> weightBuffer : array<vec4f>;
#if NUM_BONE_INFLUENCERS>4
@group(0) @binding(5) var<storage,read> indexExtraBuffer : array<vec4f>;@group(0) @binding(6) var<storage,read> weightExtraBuffer : array<vec4f>;
#endif
#endif
#ifdef MORPHTARGETS
@group(0) @binding(8) var morphTargets : texture_2d_array<f32>;@group(0) @binding(9) var<storage,read> morphTargetInfluences : array<f32>;@group(0) @binding(10) var<storage,read> morphTargetTextureIndices : array<f32>;
#endif
#ifdef MORPHTARGETS
fn readVector3FromRawSampler(targetIndex : i32,vertexIndex : u32)->vec3f
{ 
let vertexID: u32=vertexIndex*u32(settings.morphTargetTextureInfo.x);let textureWidth: u32=u32(settings.morphTargetTextureInfo.y);let y: u32=vertexID/textureWidth;let x: u32=vertexID % textureWidth;return textureLoad(morphTargets,vec2u(x,y),u32(morphTargetTextureIndices[targetIndex]),0).xyz;}
fn readVector4FromRawSampler(targetIndex : i32,vertexIndex : u32)->vec4f
{ 
let vertexID: u32=vertexIndex*u32(settings.morphTargetTextureInfo.x);let textureWidth: u32=u32(settings.morphTargetTextureInfo.y);let y: u32=vertexID/textureWidth;let x: u32=vertexID % textureWidth;return textureLoad(morphTargets,vec2u(x,y),u32(morphTargetTextureIndices[targetIndex]),0);}
#endif
@compute @workgroup_size(256,1,1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {let index=global_id.x;if (index>=arrayLength(&positionBuffer)/3) {return;}
let position=vec3f(positionBuffer[index*3],positionBuffer[index*3+1],positionBuffer[index*3+2]);var finalWorld=identity;var positionUpdated=position;
#if NUM_BONE_INFLUENCERS>0
var influence : mat4x4<f32>;let matricesIndices=indexBuffer[index];let matricesWeights=weightBuffer[index];influence=readMatrixFromRawSampler(boneSampler,matricesIndices[0])*matricesWeights[0];
#if NUM_BONE_INFLUENCERS>1
influence=influence+readMatrixFromRawSampler(boneSampler,matricesIndices[1])*matricesWeights[1];
#endif 
#if NUM_BONE_INFLUENCERS>2
influence=influence+readMatrixFromRawSampler(boneSampler,matricesIndices[2])*matricesWeights[2];
#endif 
#if NUM_BONE_INFLUENCERS>3
influence=influence+readMatrixFromRawSampler(boneSampler,matricesIndices[3])*matricesWeights[3];
#endif 
#if NUM_BONE_INFLUENCERS>4
let matricesIndicesExtra=indexExtraBuffer[index];let matricesWeightsExtra=weightExtraBuffer[index];influence=influence+readMatrixFromRawSampler(boneSampler,matricesIndicesExtra.x)*matricesWeightsExtra.x;
#if NUM_BONE_INFLUENCERS>5
influence=influence+readMatrixFromRawSampler(boneSampler,matricesIndicesExtra.y)*matricesWeightsExtra.y;
#endif 
#if NUM_BONE_INFLUENCERS>6
influence=influence+readMatrixFromRawSampler(boneSampler,matricesIndicesExtra.z)*matricesWeightsExtra.z;
#endif 
#if NUM_BONE_INFLUENCERS>7
influence=influence+readMatrixFromRawSampler(boneSampler,matricesIndicesExtra.w)*matricesWeightsExtra.w;
#endif 
#endif 
finalWorld=finalWorld*influence;
#endif
#ifdef MORPHTARGETS
for (var i=0; i<NUM_MORPH_INFLUENCERS; i=i+1) {if (f32(i)>=settings.morphTargetCount) {break;}
positionUpdated=positionUpdated+(readVector3FromRawSampler(i,index)-position)*morphTargetInfluences[i];}
#endif
var worldPos=finalWorld*vec4f(positionUpdated.x,positionUpdated.y,positionUpdated.z,1.0);atomicMinFloat(&resultBuffer[settings.indexResult].minX,worldPos.x);atomicMinFloat(&resultBuffer[settings.indexResult].minY,worldPos.y);atomicMinFloat(&resultBuffer[settings.indexResult].minZ,worldPos.z);atomicMaxFloat(&resultBuffer[settings.indexResult].maxX,worldPos.x);atomicMaxFloat(&resultBuffer[settings.indexResult].maxY,worldPos.y);atomicMaxFloat(&resultBuffer[settings.indexResult].maxZ,worldPos.z);}
`,r.ShadersStoreWGSL[v]||(r.ShadersStoreWGSL[v]=y)})),x=t({ComputeShaderBoundingHelper:()=>g}),S=e((()=>{_(),b()}));export{_ as i,S as n,g as r,x as t};