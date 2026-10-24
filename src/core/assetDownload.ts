/** Retry an interrupted startup transfer once, retaining its URL on final failure. */
export async function readAsset<T>(url:string,read:(response:Response)=>Promise<T>):Promise<T> {
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
            throw new Error(`Cannot load ${url}: ${detail}`,{cause});
        }
    }
}
