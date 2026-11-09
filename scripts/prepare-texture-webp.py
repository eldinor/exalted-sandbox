"""Quality-80 WebP derivatives at original dimensions. Never overwrite sources."""
import hashlib
import json
from pathlib import Path
import sys
import io
import struct
from PIL import Image, features

assert features.check('webp'), 'Pillow requires WebP support'
config = json.load(sys.stdin)
public = Path('public').resolve()
root = public / 'textures-webp-80'
root.mkdir(parents=True, exist_ok=True)
outputs = []
for name in config['files']:
    source = (public / name).resolve()
    assert source.is_relative_to(public) and source.suffix.lower() == '.png'
    target = root / Path(name).with_suffix('.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    before = source.read_bytes()
    with Image.open(source) as opened:
        # Explicit byte conversion matches the 8-bit GPU colour/normal/ARM path.
        # No resize, gamma transform, alpha unpremultiplication or normal rebake.
        image = opened.convert('RGBA' if 'A' in opened.getbands() or 'transparency' in opened.info else 'RGB')
        dimensions = list(image.size)
        image.save(target, 'WEBP', quality=80, method=6, lossless=False, exact=True, alpha_quality=100)
        with Image.open(target) as decoded:
            assert decoded.size == image.size
            if image.mode == 'RGBA':
                assert decoded.convert('RGBA').getchannel('A').tobytes() == image.getchannel('A').tobytes(), 'Cutout alpha changed'
    after = target.read_bytes()
    outputs.append({'source': name, 'file': target.relative_to(root).as_posix(), 'dimensions': dimensions,
                    'sourceBytes': len(before), 'bytes': len(after), 'sourceSha256': hashlib.sha256(before).hexdigest(),
                    'sha256': hashlib.sha256(after).hexdigest(), 'alpha': 'unchanged' if image.mode == 'RGBA' else 'opaque'})
    print(f'{name}: {len(before)/1048576:.2f} -> {len(after)/1048576:.2f} MiB', flush=True)
models = []
for name in config.get('models', []):
    source = public / name
    original = source.read_bytes()
    json_length = struct.unpack_from('<I', original, 12)[0]
    doc = json.loads(original[20:20 + json_length])
    binary = original[28 + json_length:]
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    assert all(not view.get('extensions') for view in doc['bufferViews']), 'Unexpected compressed buffer offsets'
    changed, replacements, images = set(), {}, []
    for i, image in enumerate(doc.get('images', [])):
        if 'uri' in image:
            # Selected runtime external images are PNG files already converted above.
            assert image['uri'].endswith('.png') and not image['uri'].startswith(('data:', '/'))
            image['uri'] = str(Path(image['uri']).with_suffix('.webp')).replace('\\', '/')
            image['mimeType'] = 'image/webp'
            changed.add(i)
            continue
        view = doc['bufferViews'][image['bufferView']]
        raw = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
        if not raw.startswith(b'\x89PNG'):
            continue  # Embedded JPEG textures remain byte-identical.
        with Image.open(io.BytesIO(raw)) as opened:
            pixels = opened.convert('RGBA' if 'A' in opened.getbands() or 'transparency' in opened.info else 'RGB')
            encoded = io.BytesIO()
            pixels.save(encoded, 'WEBP', quality=80, method=6, lossless=False, exact=True, alpha_quality=100)
            result = encoded.getvalue()
            with Image.open(io.BytesIO(result)) as decoded:
                assert decoded.size == pixels.size
                if pixels.mode == 'RGBA':
                    assert decoded.convert('RGBA').getchannel('A').tobytes() == pixels.getchannel('A').tobytes()
            images.append({'image': i, 'dimensions': list(pixels.size), 'sourceBytes': len(raw), 'bytes': len(result),
                           'alpha': 'unchanged' if pixels.mode == 'RGBA' else 'opaque'})
        replacements[image['bufferView']] = result
        image['mimeType'] = 'image/webp'
        changed.add(i)
    for texture in doc.get('textures', []):
        if texture.get('source') in changed:
            texture.setdefault('extensions', {})['EXT_texture_webp'] = {'source': texture.pop('source')}
    if changed:
        for key in ['extensionsUsed', 'extensionsRequired']:
            extensions = doc.setdefault(key, [])
            if 'EXT_texture_webp' not in extensions:
                extensions.append('EXT_texture_webp')
    output = bytearray()
    for i, view in enumerate(doc['bufferViews']):
        at = view.get('byteOffset', 0)
        chunk = replacements.get(i, binary[at:at + view['byteLength']])
        output.extend(b'\0' * (-len(output) % 4))
        view['byteOffset'], view['byteLength'] = len(output), len(chunk)
        output.extend(chunk)
    doc['buffers'][0]['byteLength'] = len(output)
    output.extend(b'\0' * (-len(output) % 4))
    text = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    text += b' ' * (-len(text) % 4)
    encoded = struct.pack('<5I', 0x46546c67, 2, 28 + len(text) + len(output), len(text), 0x4e4f534a) + text + struct.pack('<2I', len(output), 0x004e4942) + output
    target = root / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(encoded)
    models.append({'source': name, 'file': name, 'sourceBytes': len(original), 'bytes': len(encoded),
                   'sourceSha256': hashlib.sha256(original).hexdigest(), 'sha256': hashlib.sha256(encoded).hexdigest(), 'images': images})
    print(f'{name}: {len(original)/1048576:.2f} -> {len(encoded)/1048576:.2f} MiB', flush=True)
(root / 'textures.json').write_text(json.dumps({'format': 'exalted-surface-webp-v1', 'quality': 80,
    'method': 6, 'resize': False, 'alphaQuality': 100, 'outputs': outputs, 'models': models}, indent=2) + '\n')
print(f"Total: {sum(e['sourceBytes'] for e in outputs)/1048576:.2f} -> {sum(e['bytes'] for e in outputs)/1048576:.2f} MiB", flush=True)
