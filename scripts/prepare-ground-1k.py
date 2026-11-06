"""Offline 1024-square tiled textures. Originals, terrain masks and GLBs are read-only."""
import hashlib
import json
import math
from pathlib import Path
import sys
from PIL import Image

config = json.load(sys.stdin)
root = Path('public') / config['root']
root.mkdir(parents=True, exist_ok=True)
size = (1024, 1024)
linear_lut = [(v / 255 / 12.92 if v / 255 <= .04045 else ((v / 255 + .055) / 1.055) ** 2.4) for v in range(256)]

def encode_linear(v):
    v = max(0., min(1., v))
    return max(0, min(255, round(255 * (12.92 * v if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055))))

def resize_colour(image):
    channels = []
    for channel in image.split():
        reduced = channel.point(linear_lut, 'F').resize(size, Image.Resampling.BOX)
        channels.append(Image.frombytes('L', size, bytes(encode_linear(v) for v in reduced.get_flattened_data())))
    return Image.merge('RGB', channels)

def resize_normal(image):
    reduced = image.resize(size, Image.Resampling.BOX)
    output = bytearray()
    for rgb in reduced.get_flattened_data():
        xyz = [v / 127.5 - 1 for v in rgb]
        length = math.sqrt(sum(v * v for v in xyz))
        if length < 1e-8:
            xyz, length = [0, 0, 1], 1
        output.extend(max(0, min(255, round((v / length + 1) * 127.5))) for v in xyz)
    return Image.frombytes('RGB', size, bytes(output))

outputs = []
for entry in config['textures']:
    source = Path('public') / entry['source']
    original = source.read_bytes()
    with Image.open(source) as opened:
        dimensions = list(opened.size)
        if opened.width != opened.height or opened.width < 1024:
            raise ValueError(f'Expected a square source >=1024: {source} {dimensions}')
        image = opened.convert('RGB')
    if entry['kind'] == 'colour':
        result = resize_colour(image)
    elif entry['kind'] == 'normal':
        result = resize_normal(image)
    else:
        result = image.resize(size, Image.Resampling.BOX)
    target = root / entry['file']
    # New image avoids inheriting ICC/gamma/EXIF tags; runtime retains channel colour spaces.
    Image.frombytes('RGB', size, result.tobytes()).save(target, format='PNG', optimize=True)
    encoded = target.read_bytes()
    outputs.append({**entry, 'width': 1024, 'height': 1024, 'sourceDimensions': dimensions,
                    'sourceBytes': len(original), 'bytes': len(encoded),
                    'sourceSha256': hashlib.sha256(original).hexdigest(),
                    'sha256': hashlib.sha256(encoded).hexdigest()})
    print(f"{entry['file']}: {dimensions[0]} -> 1024, {len(original)/1048576:.2f} -> {len(encoded)/1048576:.2f} MiB")
(root / 'textures.json').write_text(json.dumps({'format': 'exalted-ground-1k-v1',
    'method': 'Colour: linear-light box reduction, re-encoded sRGB. Normals: linear box reduction and vector renormalisation. Packed maps: linear box reduction. Original physical texture scales unchanged.',
    'outputs': outputs}, indent=2) + '\n', encoding='utf8')
print(f"Total: {sum(o['sourceBytes'] for o in outputs)/1048576:.2f} -> {sum(o['bytes'] for o in outputs)/1048576:.2f} MiB")
