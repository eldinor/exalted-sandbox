"""Read-only sources; cap prop images at 1024, preserving model data and aspect ratio.
Requires Pillow 12+. Rebuild GLB bufferViews without retaining superseded images.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import struct
from urllib.parse import unquote
from PIL import Image

PUBLIC = Path('public').resolve()
ROOT = PUBLIC / 'terrain/props-1k'
ROOT.mkdir(parents=True, exist_ok=True)
sources = {}

def read(path):
    path = path.resolve()
    if not path.is_relative_to(PUBLIC):
        raise ValueError(f'Non-local asset: {path}')
    data = path.read_bytes()
    sources[path.relative_to(PUBLIC).as_posix()] = hashlib.sha256(data).hexdigest()
    return data

lut = [(v / 255 / 12.92 if v / 255 <= .04045 else ((v / 255 + .055) / 1.055) ** 2.4) for v in range(256)]

def encode(v):
    v = max(0., min(1., v))
    return round(255 * (12.92 * v if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055))

def coverage(alpha, cutoff):
    histogram = alpha.histogram()
    return sum(histogram[math.ceil(cutoff * 255):]) / (alpha.width * alpha.height)

def reduce_image(data, kind, cutoff=None):
    with Image.open(io.BytesIO(data)) as image:
        original_size = image.size
        if max(image.size) <= 1024:
            return data, original_size, original_size
        size = tuple(max(1, round(v * 1024 / max(image.size))) for v in image.size)
        rgba = image.convert('RGBA')
    alpha = rgba.getchannel('A')
    reduced_alpha = alpha.resize(size, Image.Resampling.BOX)
    if kind == 'colour':
        # Linear-light, premultiplied filtering avoids dark cutout fringes.
        alpha_values = list(alpha.get_flattened_data())
        alpha_small = list(reduced_alpha.get_flattened_data())
        channels = []
        for channel in rgba.convert('RGB').split():
            floats = Image.new('F', original_size)
            floats.putdata([lut[c] * a / 255 for c, a in zip(channel.get_flattened_data(), alpha_values)])
            reduced = floats.resize(size, Image.Resampling.BOX)
            channels.append(Image.frombytes('L', size, bytes(encode(v * 255 / a) if a else 0 for v, a in zip(reduced.get_flattened_data(), alpha_small))))
        rgb = Image.merge('RGB', channels)
    elif kind == 'normal':
        pixels = bytearray()
        for pixel in rgba.convert('RGB').resize(size, Image.Resampling.BOX).get_flattened_data():
            xyz = [c / 127.5 - 1 for c in pixel]
            length = math.sqrt(sum(v * v for v in xyz))
            if length < 1e-8:
                xyz, length = [0, 0, 1], 1
            pixels.extend(max(0, min(255, round((v / length + 1) * 127.5))) for v in xyz)
        rgb = Image.frombytes('RGB', size, bytes(pixels))
    else:
        rgb = rgba.convert('RGB').resize(size, Image.Resampling.BOX)
    if alpha.getextrema() != (255, 255):
        if cutoff is not None:
            target = coverage(alpha, cutoff)
            lo, hi = 0., 8.
            for _ in range(20):
                scale = (lo + hi) / 2
                scaled = reduced_alpha.point([min(255, round(v * scale)) for v in range(256)])
                if coverage(scaled, cutoff) < target:
                    lo = scale
                else:
                    hi = scale
            reduced_alpha = reduced_alpha.point([min(255, round(v * hi)) for v in range(256)])
        rgb.putalpha(reduced_alpha)
    encoded = io.BytesIO()
    rgb.save(encoded, format='PNG', optimize=True)
    return encoded.getvalue(), original_size, size

def reduce_premultiplied_atlas(data):
    # The bake stores encoded RGB * alpha, including encoded object-space normals.
    # The shader unpremultiplies and normalises after sampling. Filter stored
    # channels directly, just as GPU bilinear filtering does; do not unpremultiply,
    # gamma-convert or renormalise these images as ordinary glTF textures.
    with Image.open(io.BytesIO(data)) as image:
        rgba = image.convert('RGBA')
        before = rgba.size
        size = tuple(round(v * 1024 / max(before)) for v in before)
        reduced = Image.merge('RGBA', [channel.resize(size, Image.Resampling.BOX) for channel in rgba.split()])
    encoded = io.BytesIO()
    reduced.save(encoded, format='PNG', optimize=True)
    return encoded.getvalue(), before, size

def glb(source, target):
    path = PUBLIC / source
    data = read(path)
    magic, version, length, json_length, json_type = struct.unpack_from('<5I', data)
    assert (magic, version, length, json_type) == (0x46546c67, 2, len(data), 0x4e4f534a)
    doc = json.loads(data[20:20 + json_length])
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    binary = data[28 + json_length:]
    # These selected packs contain plain geometry views, not meshopt offset extensions.
    assert all(not view.get('extensions') for view in doc['bufferViews'])
    replacements, images = {}, []
    roles = {}
    def visit(value, key=''):
        if isinstance(value, dict):
            if key.endswith('Texture') and 'index' in value:
                image_index = doc['textures'][value['index']]['source']
                kind = 'normal' if key == 'normalTexture' else 'colour' if key in ('baseColorTexture', 'diffuseTexture', 'emissiveTexture', 'specularColorTexture') else 'linear'
                previous = roles.setdefault(image_index, kind)
                assert previous == kind, 'Conflicting image colour spaces'
            for k, v in value.items():
                visit(v, k)
        elif isinstance(value, list):
            for v in value:
                visit(v)
    visit(doc.get('materials', []))
    cutoffs = {}
    for material in doc.get('materials', []):
        if material.get('alphaMode') == 'MASK':
            texture = material.get('pbrMetallicRoughness', {}).get('baseColorTexture')
            if texture:
                cutoffs[doc['textures'][texture['index']]['source']] = material.get('alphaCutoff', .5)
    for i, image in enumerate(doc.get('images', [])):
        if 'bufferView' in image:
            index = image['bufferView']
            view = doc['bufferViews'][index]
            raw = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        else:
            raw = read(path.parent / unquote(image.pop('uri')))
            index = len(doc['bufferViews'])
            doc['bufferViews'].append({'buffer': 0, 'byteLength': len(raw)})
            image['bufferView'] = index
        reduced, before, after = reduce_image(raw, roles.get(i, 'linear'), cutoffs.get(i))
        if reduced != raw:
            image['mimeType'] = 'image/png'
        elif 'mimeType' not in image:
            image['mimeType'] = 'image/png' if raw.startswith(b'\x89PNG') else 'image/jpeg'
        replacements[index] = reduced
        images.append({'image': i, 'kind': roles.get(i, 'linear'), 'sourceDimensions': before, 'dimensions': after})
    output = bytearray()
    for i, view in enumerate(doc['bufferViews']):
        chunk = replacements.get(i)
        if chunk is None:
            start = view.get('byteOffset', 0)
            chunk = binary[start:start + view['byteLength']]
        output.extend(b'\0' * (-len(output) % 4))
        view['byteOffset'], view['byteLength'] = len(output), len(chunk)
        output.extend(chunk)
    doc['buffers'][0]['byteLength'] = len(output)
    output.extend(b'\0' * (-len(output) % 4))
    text = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    text += b' ' * (-len(text) % 4)
    encoded = struct.pack('<5I', 0x46546c67, 2, 28 + len(text) + len(output), len(text), 0x4e4f534a) + text + struct.pack('<2I', len(output), 0x004e4942) + output
    (ROOT / target).write_bytes(encoded)
    print(f'{target}: {len(data)/1048576:.2f} -> {len(encoded)/1048576:.2f} MiB', flush=True)
    return {'source': source, 'file': target, 'sourceBytes': len(data), 'bytes': len(encoded), 'sha256': hashlib.sha256(encoded).hexdigest(), 'images': images}

outputs = [glb(source, target) for source, target in [
    ('assets/exalted/exalted_desert.glb', 'desert.glb'),
    ('terrain/forest/pine-pack-forestland.glb', 'pines.glb'),
    ('terrain/forest/coniferous-selected/boulder-plain.glb', 'boulder.glb'),
]]
atlas_source = 'terrain/forest/blue-spruce/'
atlas = json.loads(read(PUBLIC / atlas_source / 'impostor.json'))
for name, kind in [('colour', 'colour'), ('normal', 'normal')]:
    source = f'{atlas_source}impostor-{name}.png'
    original = read(PUBLIC / source)
    encoded, before, after = reduce_premultiplied_atlas(original)
    target = f'impostor-{name}.png'
    (ROOT / target).write_bytes(encoded)
    outputs.append({'source': source, 'file': target, 'sourceBytes': len(original), 'bytes': len(encoded), 'sourceDimensions': before, 'dimensions': after, 'storage': 'premultiplied-encoded-rgba', 'sha256': hashlib.sha256(encoded).hexdigest()})
atlas['tileSize'] = 128
(ROOT / 'impostor.json').write_text(json.dumps(atlas, indent=2) + '\n')
(ROOT / 'textures.json').write_text(json.dumps({'format': 'exalted-props-1k-v1', 'sources': sources, 'outputs': outputs}, indent=2) + '\n')
print(f"Selected assets: {sum(o['sourceBytes'] for o in outputs)/1048576:.2f} -> {sum(o['bytes'] for o in outputs)/1048576:.2f} MiB (boulder external source textures additional).", flush=True)
