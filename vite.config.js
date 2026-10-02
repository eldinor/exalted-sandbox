import { defineConfig } from "vite";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
        closeBundle() {
            const source = resolve(root, "generator/work/generated-world");
            if (!existsSync(source)) {
                throw new Error("Missing generator/work/generated-world. Run the generator bake before building the lab pages.");
            }
            cpSync(source, resolve(root, outDir, "generator/work/generated-world"), { recursive: true });
        },
    };
}

export default defineConfig({
    plugins: [generatedWorldPackage()],
    // Prepare the lazy Inspector before serving so its first use does not
    // invalidate Babylon's already loaded development chunks.
    optimizeDeps: { include: ['@babylonjs/inspector'] },
    server: {
        port: 5173,
        strictPort: true,
    },
    build: {
        target: "esnext",
        sourcemap: true,
        rollupOptions: { input: { main: 'index.html', halved: 'halved.html', heightmap: 'hm.html', forest: 'forest.html', mountain: 'snow_mountain.html', forestRoad: 'forest_road.html', generatedWorld: 'generator/generated-world.html', grassPerformance: 'generator/grass-performance.html', authoredGrassland: 'generator/grassland.html' } },
    },
    // .wgsl imported via ?raw
    assetsInclude: ["**/*.hdr", "**/*.env"],
});
