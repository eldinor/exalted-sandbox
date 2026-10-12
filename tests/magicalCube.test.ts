import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FOREST_CUBE_SPAWN } from '../src/world/spawnPoints.ts';
import { AUTHORED_WORLD_SCALE } from '../src/world/worldScale.ts';

test('forest Cube restores E activation, fixed portal orientation and edge-triggered entry events',async()=>{
    const {createServer}=await import('vite');
    const server=await createServer({configFile:false,cacheDir:'node_modules/.vite-test-portal',server:{middlewareMode:true,hmr:false},appType:'custom',optimizeDeps:{noDiscovery:true}});
    const engine=new NullEngine(),scene=new Scene(engine),camera=new FreeCamera('portal-camera',new Vector3(0,2,-5),scene);
    const previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
    const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
    const elements:{removed:boolean}[]=[];
    const makeElement=()=>{const classes=new Set<string>();const element={removed:false,style:{},className:'',textContent:'',
        setAttribute:()=>{},append:()=>{},remove:()=>{element.removed=true;},classList:{
            add:(name:string)=>classes.add(name),remove:(name:string)=>classes.delete(name),
            toggle:(name:string,enabled:boolean)=>enabled?classes.add(name):classes.delete(name),
        }};elements.push(element);return element;};
    const events:CustomEvent[]=[],target=new EventTarget();
    target.addEventListener('exalted:portal-entered',event=>{if(event instanceof CustomEvent)events.push(event);});
    Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:makeElement,createTextNode:(text:string)=>text,removeEventListener:()=>{},body:{appendChild:()=>{}}}});
    Object.defineProperty(globalThis,'window',{configurable:true,value:target});
    try{
        const {MagicalCube}=await server.ssrLoadModule('/src/world/magicalCube.ts');
        const location={x:-FOREST_CUBE_SPAWN.x*AUTHORED_WORLD_SCALE,z:-FOREST_CUBE_SPAWN.y*AUTHORED_WORLD_SCALE};
        const ground=71,terrain={heightAt:(x:number,z:number)=>{assert.deepEqual({x,z},location);return ground;}};
        const cube=new MagicalCube(scene,terrain,location);
        assert.deepEqual(cube.mesh.position.asArray(),[-383.5,ground+1.25,52]);
        assert.equal(cube.portalRoot.position.y,ground+1.62);
        cube.update(.1,camera,new Vector3(location.x+10,ground,location.z),true);
        assert.equal(cube.mesh.isVisible,true);assert.equal(cube.ring.isVisible,false);
        const activation=new Vector3(location.x+2,ground,location.z);
        cube.update(0,camera,activation,true);
        assert.equal(cube.portalRoot.rotation.y,Math.PI*.5);
        for(let i=0;i<13;i++)cube.update(.1,camera,activation,false);
        assert.equal(cube.mesh.isVisible,false);assert.equal(cube.ring.isVisible,true);assert.equal(cube.surface.isVisible,true);
        const inside=new Vector3(location.x+.5,ground,location.z);
        cube.update(0,camera,inside,false);assert.equal(events.length,0,'entry waits for settling');
        for(let i=0;i<5;i++)cube.update(.1,camera,inside,false);
        assert.equal(events.length,1);assert.equal(events[0].detail.id,'default-spawn-portal','legacy event ID is preserved');
        assert.deepEqual(events[0].detail.position,{x:location.x,y:ground+1.62,z:location.z});
        cube.update(.1,camera,inside,false);assert.equal(events.length,1);
        cube.update(.1,camera,activation,false);
        cube.update(.1,camera,inside,false);assert.equal(events.length,2);
        assert.equal(cube.portalRoot.rotation.y,Math.PI*.5,'portal retains its activated orientation');
        cube.dispose();assert.ok(cube.mesh.isDisposed());assert.ok(cube.ring.isDisposed());assert.ok(cube.surface.isDisposed());
        assert.ok(elements.filter(e=>e.removed).length>=2,'prompt and world label are removed');
    }finally{
        scene.dispose();engine.dispose();await server.close();
        if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else Reflect.deleteProperty(globalThis,'document');
        if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else Reflect.deleteProperty(globalThis,'window');
    }
});
