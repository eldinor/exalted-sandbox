import { defineConfig } from "vite";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { productionAssetPackage } from './scripts/production-assets.mjs';

/** Copy offline generator fields that are fetched at runtime by the lab pages. */
function generatedWorldPackage() {
    let root = process.cwd();
    let outDir = "dist";
    return {
        name: "exalted-generated-world-package",
        apply: "build",
        configResolved(config) {
            root = config.root;
            outDir = config.build.outDir;
        },
        writeBundle() {
            const source = resolve(root, "generator/work/generated-world");
            if (!existsSync(source)) {
                throw new Error("Missing generator/work/generated-world. Run the generator bake before building the lab pages.");
            }
            cpSync(source, resolve(root, outDir, "generator/work/generated-world"), { recursive: true });
        },
    };
}

export default defineConfig(({command,mode})=>{
    const labs=mode==='labs';
    return {
    // SSR test servers use Vite's default cache. Keep their dependency scans
    // from invalidating the running app's lazy Inspector chunks.
    cacheDir: 'node_modules/.vite-exalted',
    plugins: command==='build' ? [labs?generatedWorldPackage():productionAssetPackage()] : [],
    // Prepare the lazy Inspector before serving so its first use does not
    // invalidate Babylon's already loaded development chunks.
    optimizeDeps: { include: ['@babylonjs/inspector'] },
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        target: "esnext",
        outDir: labs?'dist-labs':'dist',
        copyPublicDir: labs,
        sourcemap: labs,
        rollupOptions: { input: labs ? { main: 'index.html', heightmap: 'hm.html', forestland: 'forestland.html', spruceland: 'spruceland.html', generatedWorld: 'generator/generated-world.html', grassPerformance: 'generator/grass-performance.html', authoredGrassland: 'generator/grassland.html' } : {main:'index.html'} },
    },
    // .wgsl imported via ?raw
    assetsInclude: ["**/*.hdr", "**/*.env"],
};});
