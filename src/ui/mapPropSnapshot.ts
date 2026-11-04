import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Vector2, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

/** Isolated full-placement geometry; never changes live visibility or pass membership. */
export class MapPropSnapshot {
    readonly meshes: Mesh[] = [];
    private readonly materials = new Map<ShaderMaterial, ShaderMaterial>();
    constructor(private readonly scene: Scene, private readonly layer: number, readonly cameraPosition: Vector3) {}
    add(name: string, geometry: VertexData, source: ShaderMaterial, matrices?: Float32Array, sideOrientation?: number): Mesh {
        let material = this.materials.get(source);
        if (!material) {
            material = source.clone(`map:${source.name}`);
            material.options.defines = [...(material.options.defines ?? []), '#define MAP_SCREENSHOT'];
            material.setVector3('cameraPos',this.cameraPosition);
            material.setVector2('cullCenter',Vector2.Zero());material.setFloat('cullDistance',100000);
            material.setVector4('propWind',Vector4.Zero());material.setFloat('windTime',0);
            this.materials.set(source,material);
        }
        const mesh = new Mesh(`map:${name}`,this.scene);
        geometry.applyToMesh(mesh);
        if (matrices) mesh.thinInstanceSetBuffer('matrix',matrices,16,false);
        if (sideOrientation !== undefined) mesh.sideOrientation=sideOrientation;
        mesh.material=material;mesh.layerMask=this.layer;mesh.renderingGroupId=0;mesh.isPickable=false;
        if (matrices) mesh.thinInstanceRefreshBoundingInfo();
        this.meshes.push(mesh);
        return mesh;
    }
    async compile():Promise<void> {
        for (const mesh of this.meshes) {
            const material=mesh.material;
            if (material instanceof ShaderMaterial) await material.forceCompilationAsync(mesh,{useInstances:mesh.hasThinInstances});
        }
    }
    dispose():void {for(const mesh of this.meshes)mesh.dispose();for(const material of this.materials.values())material.dispose();this.meshes.length=0;this.materials.clear();}
}
