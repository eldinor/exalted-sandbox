/** Pine materials share the production prop WGSL and its alpha-tested depth pass. */
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Matrix, Vector2, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { Sky } from '../render/sky.ts';
import type { ShadowSystem } from '../render/shadows.ts';
import { S } from '../core/settings.ts';
import { bindMatrixArray } from '../core/gpuUtil.ts';
interface TextureSrgbState { _texture?: { _useSRGBBuffer?: boolean } | null; }
export class ForestMaterials {
    readonly entries: { mat: ShaderMaterial; pass?: 'PROP_PREPASS' | 'PROP_SHADOW' }[] = [];
    private readonly white: RawTexture;
    private readonly flat: RawTexture;
    private readonly center = new Vector2();
    private readonly splits = new Vector4();
    constructor(private readonly scene: Scene, private readonly sky: Sky, private readonly shadows: ShadowSystem) {
        this.white = RawTexture.CreateRGBATexture(new Uint8Array([255,255,255,255]), 1, 1, scene, false, false);
        this.flat = RawTexture.CreateRGBATexture(new Uint8Array([128,128,255,255]), 1, 1, scene, false, false);
    }
    create(source: PBRMaterial, pass?: 'PROP_PREPASS' | 'PROP_SHADOW', impostor = false, batch = false): ShaderMaterial {
        const mat = new ShaderMaterial(`forest:${pass || 'beauty'}:${source.name}`, this.scene, 'desertProp', {
            shaderLanguage: ShaderLanguage.WGSL,
            attributes: ['position','normal','uv', ...(batch ? ['impostorYaw'] : [])],
            defines: [...(pass ? [`#define ${pass}`] : []), ...(source.unlit ? ['#define PROP_UNLIT'] : []), ...(impostor ? ['#define PROP_IMPOSTOR'] : []), ...(batch ? ['#define PROP_IMPOSTOR_BATCH'] : [])],
            uniforms: ['world','viewProjection','lightViewProjection','uvMatrix','baseColor','alphaCutoff','gammaDecode','roughness','normalStrength',
                'cameraPos','cullCenter','cullDistance','sunDir','sunRadiance','shR','cascadeMatrices','cascadeSplits','cascadeParams','shadowTexel','shadowSoftness','shadowBias',
                'ambientIntensity','fogDensity','fogHeightFalloff','fogStart','aerialStrength','spellLightPos','spellLightCol','spellLightCount',
                'propWind','windTime','windBounds','emissiveMatrix','emissiveColor','emissiveGamma','impostorNormalMatrix'],
            samplers: ['baseTex','normalTex','roughTex','emissiveTex','skyLUT','cascade0','cascade1','cascade2'],
        });
        mat.backFaceCulling = source.backFaceCulling;
        mat.setTexture('baseTex', source.albedoTexture || this.white);
        mat.setTexture('normalTex', source.bumpTexture || this.flat);
        mat.setTexture('roughTex', source.metallicTexture || this.white);
        mat.setMatrix('uvMatrix', source.albedoTexture?.getTextureMatrix() || Matrix.Identity());
        const emission=source.emissiveTexture;
        const strength=(source.emissiveIntensity ?? 1)*(emission?.level ?? 1);
        mat.setTexture('emissiveTex',emission || this.white);
        mat.setMatrix('emissiveMatrix',emission?.getTextureMatrix() || Matrix.Identity());
        mat.setVector3('emissiveColor',new Vector3(
            (source.emissiveColor?.r ?? 0)*strength,
            (source.emissiveColor?.g ?? 0)*strength,
            (source.emissiveColor?.b ?? 0)*strength));
        const emissionState = emission as (typeof emission & TextureSrgbState) | null;
        mat.setFloat('emissiveGamma',emissionState?.gammaSpace && !emissionState._texture?._useSRGBBuffer ? 1 : 0);
        const color = source.albedoColor;
        mat.setVector4('baseColor', new Vector4(color.r,color.g,color.b,source.alpha));
        mat.setFloat('alphaCutoff', source.needAlphaBlending() || source.needAlphaTesting() ? (source.alphaCutOff || .5) : 0);
        const albedoState = source.albedoTexture as (typeof source.albedoTexture & TextureSrgbState) | null;
        mat.setFloat('gammaDecode', albedoState?.gammaSpace && !albedoState._texture?._useSRGBBuffer ? 1 : 0);
        mat.setFloat('roughness', source.roughness ?? 1);
        mat.setFloat('normalStrength', source.bumpTexture ? (source.bumpTexture.level ?? 1) : 0);
        if (impostor) mat.setMatrix('impostorNormalMatrix', Matrix.Identity());
        mat.setFloat('cullDistance', 2000);
        mat.setFloat('spellLightCount', 0);
        mat.setVector4('propWind', Vector4.Zero());
        mat.setFloat('windTime', 0);
        mat.setVector2('windBounds', Vector2.Zero());
        mat.setTexture('skyLUT', this.sky.lut);
        for (let i=0;i<3;i++) mat.setTexture(`cascade${i}`,this.shadows.maps[i]);
        this.entries.push({ mat, pass });
        return mat;
    }
    update(camera: Vector3): void {
        this.center.set(camera.x, camera.z);
        this.splits.set(this.shadows.splits[0], this.shadows.splits[1], this.shadows.splits[2], this.shadows.splits[3]);
        for (const { mat, pass } of this.entries) {
            mat.setVector3('cameraPos',camera); mat.setVector2('cullCenter',this.center);
            if (pass) continue;
            mat.setVector3('sunDir',this.sky.sunDir); mat.setColor3('sunRadiance',this.sky.sunRadiance);
            mat.setArray4('shR',this.sky.sh as unknown as number[]); bindMatrixArray(mat,'cascadeMatrices',this.shadows.matrixData);
            mat.setVector4('cascadeSplits',this.splits); mat.setArray4('cascadeParams',this.shadows.paramData as unknown as number[]);
            mat.setFloat('shadowTexel',this.shadows.texelSize); mat.setFloat('shadowSoftness',1.8); mat.setFloat('shadowBias',.01);
            mat.setFloat('ambientIntensity',S.ambientIntensity); mat.setFloat('fogDensity',S.fogDensity);
            mat.setFloat('fogHeightFalloff',S.fogHeightFalloff); mat.setFloat('fogStart',S.fogStart); mat.setFloat('aerialStrength',S.aerialStrength);
        }
    }
    dispose(): void {
        for (const entry of this.entries) entry.mat.dispose();
        this.entries.length = 0;
        this.white.dispose(); this.flat.dispose();
    }
}
