/** Run the local WebGPU bake through native Chrome CDP; no Playwright. */
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = targets.find(value => value.type === 'page');
if (!target) throw new Error('Start a local Chrome CDP page on port 9223 first.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0; const pending = new Map();
socket.onmessage = event => { const value = JSON.parse(event.data); if (value.id) { pending.get(value.id)?.(value); pending.delete(value.id); } };
const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, value => value.error ? reject(value.error) : resolve(value.result));
    socket.send(JSON.stringify({ id, method, params }));
});
try {
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:5173/generator/spruce/bake.html' });
    let result;
    for (let i = 0; i < 90; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const value = await send('Runtime.evaluate', { expression: '({result:window.spruceBake,error:window.bakeError,status:document.getElementById("status")?.textContent})', returnByValue: true });
        if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
        const state = value.result.value;
        if (state.error) throw new Error(state.error);
        if (i % 10 === 0) console.log(state.status);
        if (state.result) { result = state.result; break; }
    }
    if (!result) throw new Error('Spruce bake timed out.');
    const root = 'public/terrain/forest/blue-spruce';
    for (const [key, name] of [['colour', 'impostor-colour.png'], ['normal', 'impostor-normal.png']]) {
        const bytes = Buffer.from(result[key].split(',')[1], 'base64'); writeFileSync(`${root}/${name}`, bytes);
        result.metadata[`${key}Sha256`] = createHash('sha256').update(bytes).digest('hex');
    }
    writeFileSync(`${root}/impostor.json`, JSON.stringify(result.metadata, null, 2) + '\n');
    console.log(`Saved ${result.metadata.views.length} albedo/normal views, including overhead.`);
} finally { socket.close(); }
