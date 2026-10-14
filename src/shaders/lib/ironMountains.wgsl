struct IronSample { base:vec3f, arm:vec3f, normal:vec3f, height:f32 };

fn ironAxis(layer:i32,uv:vec2f,dx:vec2f,dy:vec2f,T:vec3f,B:vec3f,N:vec3f,fine:f32)->IronSample {
    // Small continuous warping and a per-layer offset break recognisable alignment.
    let warp=vec2f(noise2(uv*.7),noise2(uv*.7+vec2f(17.3,9.1)))*.035;
    let coord=uv+warp+vec2f(f32(layer)*.371,f32(layer)*.619);
    let base=textureSampleGrad(rockBaseTex,meadowBaseTexSampler,coord,layer,dx,dy).rgb;
    var linear=select(base/12.92,pow((base+vec3f(.055))/1.055,vec3f(2.4)),base>vec3f(.04045));
    let arm=textureSampleGrad(rockArmTex,meadowOrmTexSampler,coord,layer,dx,dy);
    var bump=textureSampleGrad(rockNormalTex,meadowNormalTexSampler,coord,layer,dx,dy).xyz*2.0-1.0;
    if(layer==1&&fine>0.0){
        let micro=textureSampleGrad(rockNormalTex,meadowNormalTexSampler,uv*8.0+vec2f(.13,.79),1,dx*8.0,dy*8.0).xyz*2.0-1.0;
        bump=normalize(vec3f(bump.xy+micro.xy*.18*fine,max(bump.z,.1)));
        let grain=textureSampleGrad(rockBaseTex,meadowBaseTexSampler,uv*8.0+vec2f(.13,.79),2,dx*8.0,dy*8.0).rgb;
        linear*=mix(1.0,.85+dot(grain,vec3f(.333333))*.4,fine);
    }
    // Neutral tangent normals preserve the geometric normal on either sign of each axis.
    let mapped=normalize(N*max(bump.z,.15)+T*bump.x+B*bump.y);
    return IronSample(linear,arm.rgb,mapped,arm.a);
}

fn ironLayer(layer:i32,p:vec3f,N:vec3f,dx:vec3f,dy:vec3f,fine:f32)->IronSample {
    let tileMetres=select(90.0,8.0,layer>=3);
    var weights=pow(abs(N),vec3f(4.0));
    weights=select(weights,vec3f(0.0),weights<vec3f(.02));
    weights/=max(dot(weights,vec3f(1.0)),.000001);
    let s=select(vec3f(-1.0),vec3f(1.0),N>=vec3f(0.0));
    var result=IronSample(vec3f(0.0),vec3f(0.0),vec3f(0.0),0.0);
    if(weights.x>0.0){
        let sample=ironAxis(layer,vec2f(-p.z*s.x,p.y)/tileMetres,vec2f(-dx.z*s.x,dx.y)/tileMetres,vec2f(-dy.z*s.x,dy.y)/tileMetres,
            vec3f(0.0,0.0,-s.x),vec3f(0.0,1.0,0.0),N,fine);
        result.base+=sample.base*weights.x;result.arm+=sample.arm*weights.x;result.normal+=sample.normal*weights.x;result.height+=sample.height*weights.x;
    }
    if(weights.y>0.0){
        let sample=ironAxis(layer,vec2f(-p.x,p.z*s.y)/tileMetres,vec2f(-dx.x,dx.z*s.y)/tileMetres,vec2f(-dy.x,dy.z*s.y)/tileMetres,
            vec3f(-1.0,0.0,0.0),vec3f(0.0,0.0,s.y),N,fine);
        result.base+=sample.base*weights.y;result.arm+=sample.arm*weights.y;result.normal+=sample.normal*weights.y;result.height+=sample.height*weights.y;
    }
    if(weights.z>0.0){
        let sample=ironAxis(layer,vec2f(p.x*s.z,p.y)/tileMetres,vec2f(dx.x*s.z,dx.y)/tileMetres,vec2f(dy.x*s.z,dy.y)/tileMetres,
            vec3f(s.z,0.0,0.0),vec3f(0.0,1.0,0.0),N,fine);
        result.base+=sample.base*weights.z;result.arm+=sample.arm*weights.z;result.normal+=sample.normal*weights.z;result.height+=sample.height*weights.z;
    }
    result.normal=normalize(result.normal);return result;
}

fn sampleIronMountains(p:vec3f,N:vec3f,dx:vec3f,dy:vec3f,camera:vec3f)->IronSample {
    let fine=1.0-smoothstep(35.0,65.0,distance(p,camera));
    let cliff=ironLayer(1,p,N,dx,dy,fine);let scree=ironLayer(2,p,N,dx,dy,0.0);
    let blend=ironScreeWeight(abs(N.y),cliff.height,scree.height);
    let arm=mix(cliff.arm,scree.arm,blend);let h=mix(cliff.height,scree.height,blend);
    let steep=1.0-smoothstep(.48,.88,abs(N.y));
    let source=mix(cliff.base,scree.base,blend);
    let luma=dot(source,vec3f(.2126,.7152,.0722));
    var base=mix(source,vec3f(luma)*vec3f(.66,.69,.72),.82*steep);
    let broad=.88+.18*noise2(p.xz*.006+p.y*.003);
    let rust=steep*.085*smoothstep(.12,.65,noise2(vec2f(p.x*.018+p.z*.011,p.y*.025)));
    base=mix(base,vec3f(luma)*vec3f(1.12,.61,.31),rust)*broad;
    let crevice=(1.0-smoothstep(.12,.43,h))*(1.0-arm.r*.65);
    base*=1.0-crevice*.16;
    var surface=arm;surface.g=clamp(surface.g,.90,.98);surface.b=0.0;
    return IronSample(base,surface,normalize(mix(cliff.normal,scree.normal,blend)),h);
}
