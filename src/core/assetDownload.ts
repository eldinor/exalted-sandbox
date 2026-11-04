/** Retry an interrupted startup transfer once, with optional validated range recovery. */
import { readAssetInRanges } from './assetRanges.ts';

export async function readAsset<T>(url:string,read:(response:Response)=>Promise<T>,options?:{rangeFallback?:boolean}):Promise<T> {
    let retried=false;
    while(true){
        try {
            const response=await fetch(url,retried?{cache:'reload'}:undefined);
            if(!response.ok)throw new Error(`HTTP ${response.status}`);
            return await read(response);
        } catch(cause) {
            const detail=cause instanceof Error?cause.message:String(cause);
            const interrupted=cause instanceof TypeError||/content-length|network|terminated|connection|load failed|unexpected end/i.test(detail);
            if(!retried&&interrupted){
                retried=true;
                console.warn(`[exalted] Retrying interrupted asset download: ${url}`);
                continue;
            }
            if(options?.rangeFallback&&interrupted){
                try{
                    console.warn(`[exalted] Recovering interrupted asset in smaller byte ranges: ${url}`);
                    return await read(await readAssetInRanges(url));
                }catch(recovery){
                    const reason=recovery instanceof Error?recovery.message:String(recovery);
                    throw new Error(`Cannot load ${url}: ${detail}; byte-range recovery failed: ${reason}`,{cause:recovery});
                }
            }
            throw new Error(`Cannot load ${url}: ${detail}`,{cause});
        }
    }
}
