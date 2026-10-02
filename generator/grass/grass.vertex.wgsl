attribute position: vec3f;
attribute normal: vec3f;
#ifdef INSTANCES
attribute world0: vec4f;
attribute world1: vec4f;
attribute world2: vec4f;
attribute world3: vec4f;
#endif
uniform world: mat4x4f;
uniform viewProjection: mat4x4f;
uniform time: f32;
uniform wind: vec2f;
uniform cameraPosition: vec3f;
uniform windCameraPosition: vec3f;
uniform windFade: vec2f;
uniform interactionEnabled: f32;
uniform impactCount: f32;
uniform impactData: array<vec4f, 8>;
varying vNormal: vec3f;
varying vHeight: f32;
varying vWorld: vec3f;
@vertex
fn main(input: VertexInputs)->FragmentInputs {
#ifdef INSTANCES
  let model=uniforms.world*mat4x4f(input.world0,input.world1,input.world2,input.world3);
#else
  let model=uniforms.world;
#endif
  let root=model[3].xyz;
  let h=clamp(input.position.y,0.0,1.0);
  var bend=vec2f(0.0);
#ifndef GRASS_STATIC
  var windWeight=1.0;
  if(uniforms.windFade.y>0.0) {
    windWeight=1.0-smoothstep(uniforms.windFade.x,uniforms.windFade.y,distance(root.xz,uniforms.windCameraPosition.xz));
  }
  let phase=dot(root.xz,vec2f(.371,.613));
  let gust=.62+.25*sin(uniforms.time*.73+phase*.045)+.13*sin(uniforms.time*1.91+phase*.17);
  bend=vec2f(.78,.32)*uniforms.wind.x*gust*h*h*windWeight;
  if(uniforms.interactionEnabled>.5) {
    for(var i=0;i<8;i=i+1) {
      if(f32(i)>=uniforms.impactCount){break;}
      let impact=uniforms.impactData[i];
      let delta=root.xz-impact.xy;
      let distanceToImpact=length(delta);
      let influence=1.0-smoothstep(impact.z*.12,impact.z,distanceToImpact);
      let fallback=vec2f(cos(dot(root.xz,vec2f(.71,1.13))),sin(dot(root.xz,vec2f(.71,1.13))));
      let away=select(fallback,delta/max(distanceToImpact,.001),distanceToImpact>.001);
      bend+=away*influence*impact.w*h*h;
    }
  }
#endif
  var worldPosition=model*vec4f(input.position,1.0);
  worldPosition.x+=bend.x;
  worldPosition.z+=bend.y;
  vertexOutputs.vNormal=normalize((model*vec4f(input.normal,0.0)).xyz);
  vertexOutputs.vHeight=h;
  vertexOutputs.vWorld=worldPosition.xyz;
  vertexOutputs.position=uniforms.viewProjection*worldPosition;
}
