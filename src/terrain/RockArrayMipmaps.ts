/** Box-filter every RGBA array layer; Babylon 9.18 WebGPU auto-mips only fill layer 0. */
export function downsampleRockArray(data:Uint8Array,width:number,height:number,layers:number):Uint8Array {
    if(!Number.isInteger(width)||!Number.isInteger(height)||!Number.isInteger(layers)
        ||width<1||height<1||layers<1||data.length!==width*height*layers*4)throw new Error('Invalid rock-array mip dimensions.');
    const nextWidth=Math.max(1,width>>1),nextHeight=Math.max(1,height>>1);
    const result=new Uint8Array(nextWidth*nextHeight*layers*4);
    for(let layer=0;layer<layers;layer++)for(let y=0;y<nextHeight;y++)for(let x=0;x<nextWidth;x++){
        const x0=Math.min(width-1,x*2),x1=Math.min(width-1,x*2+1);
        const y0=Math.min(height-1,y*2),y1=Math.min(height-1,y*2+1);
        const a=(layer*width*height+y0*width+x0)*4,b=(layer*width*height+y0*width+x1)*4;
        const c=(layer*width*height+y1*width+x0)*4,d=(layer*width*height+y1*width+x1)*4;
        const out=(layer*nextWidth*nextHeight+y*nextWidth+x)*4;
        for(let channel=0;channel<4;channel++)result[out+channel]=Math.round((data[a+channel]+data[b+channel]+data[c+channel]+data[d+channel])*.25);
    }
    return result;
}
