# Blue spruce: cutout and baked impostor

User-supplied source: `../blue_spruce.glb`. Embedded credits:

- Creator: [RosticOstafi](https://sketchfab.com/RosticOstafi).
- Source: [Blue spruce](https://sketchfab.com/3d-models/blue-spruce-f2e8b0f630624e0ea0744057ea5ec560).
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

`blue-spruce-cutout.glb` changes the needle material from alpha BLEND to MASK
with cutoff 0.35. Geometry, hierarchy, root orientation and all embedded image
bytes are preserved. The original GLB is unchanged. The derived GLB records its
source hash and retains attribution. It contains 11,364 triangles: 5,802
bark/branches and 5,562 foliage. This conversion improves pass compatibility;
it does not reduce geometry.

`impostor-colour.png` and `impostor-normal.png` are 4096 by 1536 RGBA8 atlases,
eight columns and three rows of 512-pixel tiles. Frames 0-7 are horizontal
views, 8-15 are 45-degree elevated views, and frame 16 is overhead. Other tiles
are transparent. Colour is unlit sRGB albedo (including source colour factors);
normals are linear object-space normals after the loader's baked transforms.
Both maps have identical alpha silhouettes, baked using the 0.35 cutout. No
sunlight, atmosphere, shadows or tone mapping is baked into the colour.

`impostor.json` records capture direction/right/up bases, source bounds centre,
square plane size, source height, tile layout, threshold and output hashes. Runtime chooses
the closest direction and projects its image on a two-triangle camera-facing
card. Normal sampling supplies world lighting instead of lighting the flat
quad normal; alpha-edge normalization avoids black colour/normal fringes.

## Reproduce

1. Run `node scripts/prepare-blue-spruce.mjs`.
2. Serve the repository with `npm run dev` on port 5173.
3. Start a dedicated native Chrome session with WebGPU and remote debugging
   port 9223, using a separate temporary profile and a hidden window. The
   flags are `--headless=new --remote-debugging-port=9223 --enable-unsafe-webgpu`.
4. Run `node scripts/bake-blue-spruce.mjs`. It visits
   `/generator/spruce/bake.html`, renders the actual cutout meshes into a
   transparent WebGPU target, reads back both atlases, and saves them here.

This is a render-to-texture bake of the supplied model, not a generated drawing.
The runner requires the local debugging browser; it does not use Playwright.
GPU rasterization can differ slightly between drivers, so rerun tests after
rebaking and update the recorded hashes together with the outputs.

## Comparison and limitations

Open `/spruceland.html`: initial left tree is full cutout geometry; right is the
baked card. Both use production `ForestMaterials`, prop WGSL, camera depth,
lighting, atmosphere and the temporal post chain. The full tree casts into two
custom shadow cascades with matching alpha; the distant card casts no shadows.
Ground/aerial/overhead buttons, orbit/zoom, height, detailed-tree threshold and
visibility controls support review. Camera depth can be displayed as a snapshot.
The threshold slider changes the detailed tree's colour/depth/shadow materials;
the atlas remains baked at 0.35 and requires rebaking to change its source cutout.

The main app uses this impostor throughout the closed eastern forest strip,
except the accessible 15 m edge (Babylon X > -367) and a 33 m radius around
Cube Spawn (-383.5, 52). There are 1,005 cards and 164 real pines (117 Big 1,
47 Small 1). Real sites select Small 1 deterministically at 25% without adding
placement density; Small 1 retains its original relative size. Cards preserve
target heights (about 18-22 m), X/Z and yaw. Spruce roots sample actual terrain
with 3 cm embedding. One typed-buffer mesh per occupied 32 m chunk shares atlas
materials. View selection accounts for each tree's yaw, and sampled object
normals rotate by that same yaw. Batches reuse buffers, compact distance
visibility, clean up prepass membership and warm both passes before loading
finishes. The full cutout spruce remains lab-only.

Views switch
discretely; there is no transition blending or true per-pixel depth/parallax.
Card depth matches its colour silhouette, but is planar. Roughness is fixed at
0.8. Atlases use bilinear filtering without mipmaps to avoid ordinary alpha mips
erasing sparse needles; coverage-preserving mips and view blending are future
work. The standalone comparison card has fixed yaw; production cards preserve
placement yaw. There is no spruce wind. Its suitability at approximately 180 m must be measured
on the actual forest route; fewer triangles alone do not prove lower GPU cost.
