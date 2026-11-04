attribute position: vec3f;
attribute normal: vec3f;
#ifdef MEADOW_FLOWERS
attribute uv: vec2f;
varying vFlowerUV: vec2f;
#endif
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
#ifdef GRASS_PRODUCTION
uniform lightViewProjection: mat4x4f;
uniform windDirection: vec2f;
uniform surfSegmentCount: f32;
uniform surfSegments: array<vec4f, 16>;
uniform surfBounds: vec4f;
uniform grassLodBand: vec4f;
uniform grassLodCenter: vec2f;
uniform grassEdgeDensity: f32;
varying vViewZ: f32;
#endif
varying vNormal: vec3f;
varying vHeight: f32;
varying vWorld: vec3f;
#ifdef GRASS_PRODUCTION
fn grassRootHash(key:u32)->f32 {
  var v=key;
  v=((v>>16u)^v)*0x45d9f3bu;
  v=((v>>16u)^v)*0x45d9f3bu;
  return min(f32((v>>16u)^v)/4294967296.0,.99999994);
}
#endif
@vertex
fn main(input: VertexInputs)->FragmentInputs {
#ifdef INSTANCES
  let model=uniforms.world*mat4x4f(input.world0,input.world1,input.world2,input.world3);
#else
  let model=uniforms.world;
#endif
  let root=model[3].xyz;
#ifdef GRASS_PRODUCTION
  if(uniforms.grassLodBand.z>0.0) {
    // Select one complete tuft, identically in colour and camera depth. The
    // decision follows its root, never the containing 16-metre patch centre.
    let d=distance(root.xz,uniforms.grassLodCenter);
    let farWeight=smoothstep(uniforms.grassLodBand.x,uniforms.grassLodBand.y,d);
    let rootKey=bitcast<u32>(i32(floor(root.x*1000.0)))^(bitcast<u32>(i32(floor(root.z*1000.0)))*19349663u);
    let choice=grassRootHash(rootKey);
    let densityChoice=grassRootHash(rootKey^83492791u);
    let densityWeight=1.0-smoothstep(uniforms.grassLodBand.x,uniforms.grassLodBand.z,d)*(1.0-uniforms.grassEdgeDensity);
    let useFar=choice<farWeight;
    if(d>uniforms.grassLodBand.z||densityChoice>=densityWeight||useFar!=(uniforms.grassLodBand.w>.5)) {
      vertexOutputs.vWorld=root;
      vertexOutputs.vNormal=vec3f(0.0,1.0,0.0);
      vertexOutputs.vHeight=0.0;
      vertexOutputs.vViewZ=0.0;
#ifdef MEADOW_FLOWERS
      vertexOutputs.vFlowerUV=vec2f(0.0);
#endif
      vertexOutputs.position=vec4f(2.0,2.0,2.0,1.0);
      return vertexOutputs;
    }
  }
#endif
  let h=clamp(input.position.y,0.0,1.0);
  var bend=vec2f(0.0);
#ifndef GRASS_STATIC
  var windWeight=1.0;
  if(uniforms.windFade.y>0.0) {
    windWeight=1.0-smoothstep(uniforms.windFade.x,uniforms.windFade.y,distance(root.xz,uniforms.windCameraPosition.xz));
  }
  let phase=dot(root.xz,vec2f(.371,.613));
  let gust=.62+.25*sin(uniforms.time*.73+phase*.045)+.13*sin(uniforms.time*1.91+phase*.17);
#ifdef GRASS_PRODUCTION
  let windDirection=uniforms.windDirection;
#else
  let windDirection=vec2f(.78,.32);
#endif
  bend=windDirection*uniforms.wind.x*gust*h*h*windWeight;
  if(uniforms.interactionEnabled>.5) {
    for(var i=0;i<8;i=i+1) {
      if(f32(i)>=uniforms.impactCount){break;}
      let impact=uniforms.impactData[i];
      let delta=root.xz-impact.xy;
      let distanceToImpact=length(delta);
      let influence=1.0-smoothstep(impact.z*.12,impact.z,distanceToImpact);
      let fallback=vec2f(cos(dot(root.xz,vec2f(.71,1.13))),sin(dot(root.xz,vec2f(.71,1.13))));
      let away=select(fallback,delta/max(distanceToImpact,.001),distanceToImpact>.001);
    #ifdef GRASS_PRODUCTION
      bend+=away*influence*impact.w*h*h*length(model[1].xyz);
#else
      bend+=away*influence*impact.w*h*h;
#endif
    }
  }
#ifdef GRASS_PRODUCTION
  if(uniforms.interactionEnabled>.5&&uniforms.surfSegmentCount>0.0&&all(root.xz>=uniforms.surfBounds.xy)&&all(root.xz<=uniforms.surfBounds.zw)) {
    // Work is restricted to the avatar's short trail, even in animated wind patches.
    var strongestSurf=vec2f(0.0);
    for(var i=0;i<8;i=i+1) {
      if(f32(i)>=uniforms.surfSegmentCount){break;}
      let a=uniforms.surfSegments[i*2];
      let b=uniforms.surfSegments[i*2+1];
      let path=b.xz-a.xz;
      let length2=max(dot(path,path),.000001);
      let along=clamp(dot(root.xz-a.xz,path)/length2,0.0,1.0);
      let closest=mix(a.xyz,b.xyz,along);
      let delta=root.xz-closest.xz;
      let dist=length(delta);
      if(dist>=2.4||abs(root.y-closest.y)>1.4){continue;}
      let right=vec2f(path.y,-path.x)*inverseSqrt(length2);
      let side=select(-1.0,1.0,dot(delta,right)>=0.0);
      let influence=1.0-smoothstep(.288,2.4,dist);
      let strength=mix(a.w,b.w,along);
      // Use strongest segment, avoiding additive knots at turns.
      let surfBend=right*side*influence*strength*.85*h*h*length(model[1].xyz);
      if(dot(surfBend,surfBend)>dot(strongestSurf,strongestSurf)){strongestSurf=surfBend;}
    }
    bend+=strongestSurf;
  }
  let limit=length(model[1].xyz)*.85;
  bend*=min(1.0,limit/max(length(bend),.0001));
#endif
#endif
  var worldPosition=model*vec4f(input.position,1.0);
  worldPosition.x+=bend.x;
  worldPosition.z+=bend.y;
#ifdef GRASS_PRODUCTION
  let basis=mat3x3f(model[0].xyz/max(dot(model[0].xyz,model[0].xyz),.000001),model[1].xyz/max(dot(model[1].xyz,model[1].xyz),.000001),model[2].xyz/max(dot(model[2].xyz,model[2].xyz),.000001));
  let n=normalize(basis*input.normal);
  let slope=vec3f(bend.x,0.0,bend.y)*2.0/max(h,.001);
  vertexOutputs.vNormal=normalize(n-basis[1]*dot(slope,n));
#else
  vertexOutputs.vNormal=normalize((model*vec4f(input.normal,0.0)).xyz);
#endif
  vertexOutputs.vHeight=h;
  vertexOutputs.vWorld=worldPosition.xyz;
#ifdef MEADOW_FLOWERS
  vertexOutputs.vFlowerUV=input.uv;
#endif
  let clip=uniforms.viewProjection*worldPosition;
#ifdef GRASS_PRODUCTION
  vertexOutputs.vViewZ=clip.w;
#endif
#ifdef GRASS_SHADOW
  vertexOutputs.position=uniforms.lightViewProjection*worldPosition;
#else
  vertexOutputs.position=clip;
#endif
}
