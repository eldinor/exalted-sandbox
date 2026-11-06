import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

/** Runtime roots for index.html, including its GLB comparison and prop grounding. */
export const PRODUCTION_ASSETS = [
    ...['desert.glb','pines.glb','boulder.glb','impostor-colour.png','impostor-normal.png','impostor.json'].map(name=>`terrain/props-1k/${name}`),
    'LICENSE.txt', 'THIRD_PARTY_NOTICES.md',
    'assets/branding/exalted-logo.svg',
    'assets/branding/favicon.svg',
    'assets/exalted/alpha-map.glb', 'assets/exalted/exalted_desert.glb',
    ...['vis_ground_heightmap-11.png','vertex_color_4k-9.png','vertex_color_4k copy.png',
        'biome-rock-9.png','biome-beach-9.png','biome-iron-mountains-9.png',
        'ground-coverage-9.png','ground-detail-coverage-9.png','mask-roads-9.png'].map(name=>`assets/textures/${name}`),
    'terrain/grassland/grass_medium_01_1k.glb',
    'terrain/grassland/dandelions/dandelions.glb', 'terrain/grassland/daisies/daisies.glb',
    ...['BaseColor.jpg','Normal.jpg','ORM.png'].map(name=>`terrain/grassland/meadow/Material-326-A_${name}`),
    'terrain/forest/pine-pack-forestland.glb', 'terrain/forest/fir-pack-selected.glb',
    ...['impostor-colour.png','impostor-normal.png','impostor.json'].map(name=>`terrain/forest/blue-spruce/${name}`),
    'terrain/forest/coniferous-selected/boulder-plain.glb',
    ...['diff','nor_gl','arm'].map(map=>`terrain/forest/textures/forrest_ground_01_${map}_2k.png`),
    ...['diff','nor_gl','arm'].map(map=>`terrain/sand/beach/aerial_beach_01_${map}_2k.png`),
    ...['diff','nor_gl','arm'].map(map=>`terrain/road/asp1/asphalt_snow_${map}_2k.jpg`),
    ...['base','normal','arm','height'].flatMap(map=>Array.from({length:5},(_,layer)=>`terrain/rock/iron-mountains-png-1024/${map}-${layer}.png`)),
    ...['meadow','forest','beach','road'].flatMap(set=>['base','normal','arm'].map(map=>`terrain/ground-1k/${set}-${map}.png`)),
];

function localPath(root, name) {
    const target=resolve(root,name), rel=relative(root,target);
    if(isAbsolute(name)||rel==='..'||rel.startsWith('..\\')||rel.startsWith('../')||isAbsolute(rel))throw new Error(`Asset escapes public directory: ${name}`);
    return target;
}

/** Resolve GLB image/buffer dependencies; fail before bundling if anything is missing. */
export function productionAssetFiles(publicDir, roots=PRODUCTION_ASSETS, preserveNotes=true, excluded=new Set()) {
    const files=new Set(),queue=[...roots];
    if(preserveNotes){
        const notes=dir=>{for(const entry of readdirSync(dir,{withFileTypes:true})){
            const file=resolve(dir,entry.name);
            if(entry.isDirectory())notes(file);
            else if(/\.(md|txt|json)$/i.test(entry.name)&&!excluded.has(relative(publicDir,file).replaceAll('\\','/')))queue.push(relative(publicDir,file));
        }};
        notes(publicDir);
    }
    while(queue.length){
        const file=localPath(publicDir,queue.pop()),name=relative(publicDir,file).replaceAll('\\','/');
        if(excluded.has(name))throw new Error(`Excluded original is still referenced by a runtime asset: ${name}`);
        if(files.has(name))continue;
        if(!existsSync(file)||!statSync(file).isFile())throw new Error(`Missing production asset: ${name}`);
        files.add(name);
        if(!/\.glb$/i.test(name))continue;
        const bytes=readFileSync(file);
        if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(16)!==0x4e4f534a)throw new Error(`Invalid GLB: ${name}`);
        const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
        for(const entry of [...(gltf.images??[]),...(gltf.buffers??[])]){
            if(!entry.uri||entry.uri.startsWith('data:'))continue;
            if(/^(?:[a-z]+:|\/)/i.test(entry.uri))throw new Error(`Non-local GLB dependency in ${name}: ${entry.uri}`);
            queue.push(relative(publicDir,resolve(dirname(file),decodeURIComponent(entry.uri.split(/[?#]/)[0]))));
        }
    }
    return [...files].sort();
}

/** Select replacements before resolving GLB dependencies, so old external maps fall away too. */
export function production1kAssetFiles(publicDir) {
    const replacements=new Map();
    for(const root of ['terrain/ground-1k','terrain/props-1k']){
        const manifest=JSON.parse(readFileSync(localPath(publicDir,`${root}/textures.json`),'utf8'));
        for(const entry of manifest.outputs){
            if(typeof entry.source!=='string'||typeof entry.file!=='string')throw new Error(`Invalid 1K manifest: ${root}`);
            replacements.set(entry.source,`${root}/${entry.file}`);
        }
    }
    replacements.set('terrain/forest/blue-spruce/impostor.json','terrain/props-1k/impostor.json');
    const roots=[...new Set(PRODUCTION_ASSETS.map(name=>replacements.get(name)??name))];
    return productionAssetFiles(publicDir,roots,true,new Set(replacements.keys()));
}

/** Archive extensions may be denied by shared hosting; the bytes stay gzipped. */
export function productionAssetOutput(name) {
    return /^terrain\/rock\/iron-mountains(?:-1024)?\/(base|normal|arm-height)\.rgba\.gz$/.test(name)
        ? name.replace(/\.gz$/,'.bin') : name;
}

export function productionAssetPackage({oneK=false}={}) {
    let publicDir='',outDir='',files=[];
    return {
        name:'exalted-production-assets',apply:'build',
        configResolved(config){publicDir=resolve(config.root,'public');outDir=resolve(config.root,config.build.outDir);},
        buildStart(){files=oneK?production1kAssetFiles(publicDir):productionAssetFiles(publicDir);},
        writeBundle(){
            let bytes=0;
            for(const name of files){const source=localPath(publicDir,name),target=localPath(outDir,productionAssetOutput(name));
                mkdirSync(dirname(target),{recursive:true});copyFileSync(source,target);bytes+=statSync(source).size;
            }
            this.info(`Packaged ${files.length} runtime/provenance assets (${(bytes/1048576).toFixed(2)} MiB).`);
        },
    };
}
