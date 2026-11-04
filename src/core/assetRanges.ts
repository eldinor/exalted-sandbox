const CHUNK_BYTES=1024*1024;
const MAX_BYTES=64*1024*1024;

/** Bounded recovery for a static asset whose whole-body transfers were interrupted. */
export async function readAssetInRanges(url:string):Promise<Response> {
    let total=0,validator='',etag='',modified='';
    const chunk=async(start:number,end:number):Promise<Uint8Array<ArrayBuffer>>=>{
        for(let attempt=0;;attempt++){
            let response:Response|undefined;
            try{
                const headers:Record<string,string>={Range:`bytes=${start}-${end}`};
                if(validator)headers['If-Range']=validator;
                response=await fetch(url,{cache:'reload',headers});
                if(response.status!==206)throw new Error(`Byte-range recovery requires HTTP 206; received ${response.status}.`);
                const encoding=response.headers.get('content-encoding');
                if(encoding&&encoding.toLowerCase()!=='identity')throw new Error('Byte-range response must not use transport compression.');
                const range=/^bytes (\d+)-(\d+)\/(\d+)$/i.exec(response.headers.get('content-range')??'');
                if(!range)throw new Error('Missing or invalid Content-Range.');
                const [from,to,size]=range.slice(1).map(Number);
                if(!Number.isSafeInteger(size)||size<1||size>MAX_BYTES||from!==start||to!==Math.min(end,size-1)||to<from||(total&&size!==total))throw new Error('Unexpected byte-range boundaries or asset size.');
                if(!total){
                    etag=response.headers.get('etag')??'';modified=response.headers.get('last-modified')??'';
                    validator=etag&&!etag.startsWith('W/')?etag:modified;
                    if(!validator)throw new Error('Byte-range recovery requires an ETag or Last-Modified validator.');
                    total=size;
                }else if((etag&&response.headers.get('etag')!==etag)||(modified&&response.headers.get('last-modified')!==modified))throw new Error('Asset changed during byte-range recovery.');
                const bytes=new Uint8Array(await response.arrayBuffer());
                if(bytes.length!==to-from+1)throw new TypeError('Incomplete byte-range response body.');
                return bytes;
            }catch(error){
                if(response?.body&&!response.body.locked)await response.body.cancel().catch(()=>{});
                if(attempt===0&&error instanceof TypeError)continue;
                throw error;
            }
        }
    };
    const first=await chunk(0,CHUNK_BYTES-1),bytes=new Uint8Array(total);
    bytes.set(first);
    for(let start=first.length;start<total;start+=CHUNK_BYTES)bytes.set(await chunk(start,Math.min(start+CHUNK_BYTES,total)-1),start);
    return new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}});
}
