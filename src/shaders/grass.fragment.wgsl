varying vNormal: vec3f;
varying vHeight: f32;
varying vWorld: vec3f;
varying vViewZ: f32;
uniform cameraPosition: vec3f;
#ifdef MEADOW_FLOWERS
varying vFlowerUV: vec2f;
var flowerAlbedo: texture_2d<f32>;
var flowerAlbedoSampler: sampler;
uniform flowerGamma: f32;
uniform flowerCutoff: f32;
fn flowerSample(input: FragmentInputs)->vec4f {
  let sample=textureSample(flowerAlbedo,flowerAlbedoSampler,input.vFlowerUV);
  let fade=1.0-smoothstep(35.0,50.0,distance(input.vWorld,uniforms.cameraPosition));
  let threshold=fract(sin(dot(floor(input.vWorld*180.0),vec3f(12.9898,78.233,37.719)))*43758.5453);
  if(sample.a<uniforms.flowerCutoff||threshold>=fade){discard;}
  return sample;
}
#endif
#ifdef GRASS_SHADOW
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#ifdef MEADOW_FLOWERS
  let flower=flowerSample(input);
#endif
  if(distance(input.vWorld.xz,uniforms.cameraPosition.xz)>30.0){discard;}
  fragmentOutputs.color=vec4f(input.position.z,0.0,0.0,1.0);
}
#else
#ifdef GRASS_PREPASS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#ifdef MEADOW_FLOWERS
  let flower=flowerSample(input);
#endif
  fragmentOutputs.color=vec4f(input.vViewZ,0.0,0.0,1.0);
}
#else
#include<snowNoise>
#include<snowShading>
#include<snowAtmosphere>
#include<snowSpellLights>
uniform rootColor: vec3f;
uniform tipColor: vec3f;
uniform colorScale: f32;
uniform sunDir: vec3f;
uniform sunRadiance: vec3f;
uniform shR: array<vec4f,9>;
uniform cascadeMatrices: array<mat4x4f,3>;
uniform cascadeSplits: vec4f;
uniform cascadeParams: array<vec4f,3>;
uniform shadowTexel: f32;
uniform shadowSoftness: f32;
uniform shadowBias: f32;
uniform ambientIntensity: f32;
uniform fogDensity: f32;
uniform fogHeightFalloff: f32;
uniform fogStart: f32;
uniform aerialStrength: f32;
uniform spellLightPos: array<vec4f,4>;
uniform spellLightCol: array<vec4f,4>;
uniform spellLightCount: f32;
var skyLUT: texture_2d<f32>;
var skyLUTSampler: sampler;
var cascade0: texture_2d<f32>;
var cascade0Sampler: sampler;
var cascade1: texture_2d<f32>;
var cascade1Sampler: sampler;
var cascade2: texture_2d<f32>;
var cascade2Sampler: sampler;
#include<snowShadowLookup>
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
  let V=normalize(uniforms.cameraPosition-input.vWorld);
  var N=normalize(input.vNormal);
  if(dot(N,V)<0.0){N=-N;}
#ifdef MEADOW_FLOWERS
  let flower=flowerSample(input);
  let albedo=pow(flower.rgb,vec3f(uniforms.flowerGamma));
#else
  let albedo=mix(uniforms.rootColor,uniforms.tipColor,smoothstep(0.0,1.0,input.vHeight))*(.88+.12*sin(dot(input.vWorld.xz,vec2f(4.17,7.31))))*uniforms.colorScale;
#endif
  let shadow=sunShadow(input.vWorld,N,distance(input.vWorld,uniforms.cameraPosition),0.0);
  let direct=max(dot(N,uniforms.sunDir),0.0)+.25*max(dot(-N,uniforms.sunDir),0.0);
  var color=albedo/PI*(direct*uniforms.sunRadiance*shadow+shIrradiance(N,uniforms.shR)*uniforms.ambientIntensity);
  color+=spellLightingSurface(input.vWorld,N,V,albedo,vec3f(.04),.9,0.0,uniforms.spellLightPos,uniforms.spellLightCol,uniforms.spellLightCount);
  color=applyAerial(color,uniforms.cameraPosition,input.vWorld,-V,uniforms.sunDir,skyLUT,skyLUTSampler,uniforms.sunRadiance,uniforms.fogDensity,uniforms.fogHeightFalloff,uniforms.fogStart,uniforms.aerialStrength);
  fragmentOutputs.color=vec4f(color,1.0);
}
#endif
#endif
