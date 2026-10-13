import { HEIGHTMAP_WIDTH, HEIGHTMAP_DEPTH, type AuthoredPng } from './authoredHeightmap.ts';

export const IRON_MOUNTAINS_MASK = 'assets/textures/biome-iron-mountains-9.png';
export const IRON_TEXTURE_METRES = 90;

/** Select the rock component containing The Ironspine; retain its existing soft boundary. */
export function buildIronMountainsMask(rock: AuthoredPng): AuthoredPng {
    const {width,height}=rock;
    if(rock.channels!==1||!(rock.pixels instanceof Uint8Array))throw new Error('Iron Mountains requires grayscale8 rock coverage.');
    const pixels=new Uint8Array(width*height),visited=new Uint8Array(pixels.length),queue=new Uint32Array(pixels.length);
    const col=Math.round((.5+257.5/HEIGHTMAP_WIDTH)*(width-1));
    const row=Math.round((.5-190/HEIGHTMAP_DEPTH)*(height-1));
    const seed=row*width+col;
    if(rock.pixels[seed]<128)return {width,height,channels:1,pixels};
    let head=0,tail=1;queue[0]=seed;visited[seed]=1;
    const visit=(index:number)=>{if(!visited[index]&&rock.pixels[index]>=128){visited[index]=1;queue[tail++]=index;}};
    while(head<tail){const i=queue[head++],x=i%width;
        if(x>0)visit(i-1);if(x+1<width)visit(i+1);if(i>=width)visit(i-width);if(i+width<pixels.length)visit(i+width);
    }
    // Reuse the rock mask's Gaussian shoulder, not another independent land blend.
    const radius=Math.ceil(4.5/Math.min(HEIGHTMAP_WIDTH/(width-1),HEIGHTMAP_DEPTH/(height-1)))+1;
    let start=0,end=tail;
    for(let ring=0;ring<radius;ring++){
        const extend=(i:number)=>{if(!visited[i]&&rock.pixels[i]>0){visited[i]=1;queue[tail++]=i;}};
        for(let q=start;q<end;q++){const i=queue[q],x=i%width;
            if(x>0)extend(i-1);if(x+1<width)extend(i+1);if(i>=width)extend(i-width);if(i+width<pixels.length)extend(i+width);
        }
        start=end;end=tail;
    }
    for(let i=0;i<tail;i++)pixels[queue[i]]=rock.pixels[queue[i]];
    return {width,height,channels:1,pixels};
}

/** Height-aware two-layer blend with a guaranteed fallback (never black seams). */
export function ironScreeWeight(up:number,cliffHeight:number,screeHeight:number):number {
    const t=Math.max(0,Math.min(1,(up-.48)/.4)),slope=t*t*(3-2*t);
    const a=cliffHeight+(1-slope)*.6,b=screeHeight+slope*.6,peak=Math.max(a,b)-.22;
    const wa=Math.max(0,a-peak)*(1-slope),wb=Math.max(0,b-peak)*slope;
    return wa+wb>1e-6?wb/(wa+wb):slope;
}
export const ironHeightBlendWGSL=`fn ironScreeWeight(up:f32,cliffHeight:f32,screeHeight:f32)->f32 {
    let slope=smoothstep(.48,.88,up);
    let a=cliffHeight+(1.0-slope)*.6;let b=screeHeight+slope*.6;
    let peak=max(a,b)-.22;
    let wa=max(0.0,a-peak)*(1.0-slope);let wb=max(0.0,b-peak)*slope;
    return select(slope,wb/max(wa+wb,.000001),wa+wb>.000001);
}`;
