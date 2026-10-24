/** Decode gzip payloads by their bytes, after the browser handles HTTP encoding. */
export async function readRockArrayResponse(response:Response):Promise<Uint8Array> {
    if(!response.body)throw new Error('Rock array response has no body.');
    const reader=response.body.getReader(),prefix:Uint8Array<ArrayBuffer>[]=[];
    let first=-1,second=-1;
    while(second<0){
        const chunk=await reader.read();if(chunk.done)break;
        prefix.push(chunk.value);
        for(const byte of chunk.value){if(first<0)first=byte;else {second=byte;break;}}
    }
    const stream=new ReadableStream<BufferSource>({
        start(controller){for(const chunk of prefix)controller.enqueue(chunk);},
        async pull(controller){const chunk=await reader.read();if(chunk.done){reader.releaseLock();controller.close();}else controller.enqueue(chunk.value);},
        cancel(reason){return reader.cancel(reason);},
    });
    const decoded=first===0x1f&&second===0x8b ? stream.pipeThrough(new DecompressionStream('gzip')) : stream;
    return new Uint8Array(await new Response(decoded).arrayBuffer());
}
