"""Export optimized web-ready GLB terrain LODs, graded WebP textures, and chapter manifest
from existing Map Phase 01 datasets into public/preview/rajasthan-world/."""
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache'
DATA = ROOT / 'data'
REPO_ROOT = ROOT.parents[2]
OUT = REPO_ROOT / 'public' / 'preview' / 'rajasthan-world'
OUT.mkdir(parents=True, exist_ok=True)

EXAG = 3.2


def write_glb(path: Path, positions: np.ndarray, normals: np.ndarray, uvs: np.ndarray, indices: np.ndarray):
    """Write a minimal, valid glTF 2.0 binary (.glb) with a single indexed mesh."""
    pos_bytes = positions.astype('<f4').tobytes()
    norm_bytes = normals.astype('<f4').tobytes()
    uv_bytes = uvs.astype('<f4').tobytes()
    idx_dtype = '<u2' if positions.shape[0] <= 65535 else '<u4'
    idx_component_type = 5123 if idx_dtype == '<u2' else 5125
    idx_bytes = indices.astype(idx_dtype).tobytes()

    def pad4(b: bytes) -> bytes:
        rem = len(b) % 4
        return b + (b'\x00' * (4 - rem) if rem else b'')

    pos_off = 0
    pos_len = len(pos_bytes)
    norm_off = pos_off + len(pad4(pos_bytes))
    norm_len = len(norm_bytes)
    uv_off = norm_off + len(pad4(norm_bytes))
    uv_len = len(uv_bytes)
    idx_off = uv_off + len(pad4(uv_bytes))
    idx_len = len(idx_bytes)

    bin_chunk = pad4(pos_bytes) + pad4(norm_bytes) + pad4(uv_bytes) + pad4(idx_bytes)

    pos_min = positions.min(axis=0).astype(float).tolist()
    pos_max = positions.max(axis=0).astype(float).tolist()

    gltf = {
        'asset': {'version': '2.0', 'generator': 'TheLivingSignal-MapPhase02'},
        'scene': 0,
        'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'name': path.stem}],
        'meshes': [{
            'name': path.stem,
            'primitives': [{
                'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2},
                'indices': 3,
                'mode': 4,
            }],
        }],
        'buffers': [{'byteLength': len(bin_chunk)}],
        'bufferViews': [
            {'buffer': 0, 'byteOffset': pos_off, 'byteLength': pos_len, 'target': 34962},
            {'buffer': 0, 'byteOffset': norm_off, 'byteLength': norm_len, 'target': 34962},
            {'buffer': 0, 'byteOffset': uv_off, 'byteLength': uv_len, 'target': 34962},
            {'buffer': 0, 'byteOffset': idx_off, 'byteLength': idx_len, 'target': 34963},
        ],
        'accessors': [
            {
                'bufferView': 0, 'componentType': 5126, 'count': int(positions.shape[0]),
                'type': 'VEC3', 'min': pos_min, 'max': pos_max,
            },
            {
                'bufferView': 1, 'componentType': 5126, 'count': int(normals.shape[0]),
                'type': 'VEC3',
            },
            {
                'bufferView': 2, 'componentType': 5126, 'count': int(uvs.shape[0]),
                'type': 'VEC2',
            },
            {
                'bufferView': 3, 'componentType': idx_component_type, 'count': int(indices.shape[0]),
                'type': 'SCALAR',
            },
        ],
    }

    json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    rem = len(json_bytes) % 4
    if rem:
        json_bytes += b' ' * (4 - rem)

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_chunk)
    header = struct.pack('<III', 0x46546C67, 2, total_len)
    chunk0 = struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes
    chunk1 = struct.pack('<II', len(bin_chunk), 0x004E4942) + bin_chunk
    path.write_bytes(header + chunk0 + chunk1)


def grid_to_glb(npz_path: Path, glb_path: Path, bounds_km: list[float], stride: int):
    """Convert a cached (x, y, z, valid) terrain grid into a Y-up glTF binary."""
    arr = np.load(npz_path)
    x = arr['x'][::stride]
    y = arr['y'][::stride]
    z = arr['z'][::stride, ::stride]
    valid = arr['valid'][::stride, ::stride]

    nx, ny = len(x), len(y)
    assert nx * ny <= 65535, f'{glb_path.name} vertex count {nx * ny} exceeds Uint16 limit'

    xx, yy = np.meshgrid(x, y)
    # glTF basis [x, z, -y] -> East=+X, Up=+Y, North=-Z
    ty = (z * EXAG / 1000.0).astype(np.float32)
    positions = np.stack((xx, ty, -yy), axis=-1).reshape(-1, 3).astype(np.float32)

    # Smooth geometric normals from heightfield
    dx_km = float(x[1] - x[0])
    dy_km = float(y[1] - y[0])
    dz_dy, dz_dx = np.gradient(ty, dy_km, dx_km)
    normals = np.stack((-dz_dx, np.ones_like(ty), dz_dy), axis=-1)
    normals /= np.linalg.norm(normals, axis=-1, keepdims=True)
    normals = normals.reshape(-1, 3).astype(np.float32)

    # Standard glTF UV (0,0 top-left of image): u = east, v = 1 - north
    u = (xx - bounds_km[0]) / (bounds_km[2] - bounds_km[0])
    v = 1.0 - (yy - bounds_km[1]) / (bounds_km[3] - bounds_km[1])
    uvs = np.stack((u, v), axis=-1).reshape(-1, 2).astype(np.float32)

    mask = valid[:-1, :-1] & valid[1:, :-1] & valid[1:, 1:] & valid[:-1, 1:]
    rows, cols = np.where(mask)
    a = (rows * nx + cols).astype(np.uint32)
    # Counter-clockwise winding when viewed from +Y above
    t1 = np.column_stack((a, a + 1, a + nx + 1))
    t2 = np.column_stack((a, a + nx + 1, a + nx))
    indices = np.hstack((t1, t2)).ravel()

    write_glb(glb_path, positions, normals, uvs, indices)
    return int(positions.shape[0]), int(indices.shape[0] // 3)


def grade_surface(src_rgb: np.ndarray, masks: np.ndarray | None = None) -> np.ndarray:
    """Shift desaturated Sentinel-2 reflectance toward warm Rajasthani sandstone,
    champagne-ochre desert, olive-sage Aravalli hills, and natural blue-green water."""
    rgb = src_rgb.astype(np.float32) / 255.0
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

    # Balanced warm sandstone & desert ivory grade (avoiding orange/rust cast)
    warm = np.empty_like(rgb)
    warm[..., 0] = np.clip(rgb[..., 0] * 1.07 + 0.045, 0, 1)
    warm[..., 1] = np.clip(rgb[..., 1] * 1.02 + 0.032, 0, 1)
    warm[..., 2] = np.clip(rgb[..., 2] * 0.90 + 0.005, 0, 1)

    # Gentle tonal contrast
    warm = np.clip((warm - 0.5) * 1.14 + 0.5, 0, 1)

    if masks is not None:
        water = masks[..., 0].astype(np.float32) / 255.0
        veg = masks[..., 2].astype(np.float32) / 255.0

        # Subtle olive / dry scrub variation in vegetated Aravalli & eastern zones
        veg_w = np.clip((veg - 0.14) * 1.55, 0, 0.58)
        olive = np.stack((lum * 0.76 + 0.05, lum * 0.88 + 0.07, lum * 0.60 + 0.03), axis=-1)
        warm = warm * (1.0 - veg_w[..., None]) + olive * veg_w[..., None]

        # Natural blue-green water for lakes/reservoirs
        water_w = np.clip(water * 1.3, 0, 0.94)
        lake = np.array([0.08, 0.30, 0.34], dtype=np.float32)
        warm = warm * (1.0 - water_w[..., None]) + lake * water_w[..., None]

    return np.rint(np.clip(warm, 0, 1) * 255.0).astype(np.uint8)


def run():
    coverage = json.loads((DATA / 'coverage.json').read_text())
    chapters = json.loads((DATA / 'chapters.json').read_text())
    bounds = coverage['raster_bounds_km']

    # 1. Overview GLB (805x723 -> stride 4 = 202x181 = 36,562 verts, ~72k tris)
    ov_verts, ov_tris = grid_to_glb(
        CACHE / 'regional-mesh.npz', OUT / 'rajasthan-overview.glb', bounds, stride=4
    )

    # 2. Mewar / Aravalli detail GLB (511x606 -> stride 3 = 171x202 = 34,542 verts, ~68k tris)
    mewar_verts, mewar_tris = grid_to_glb(
        CACHE / 'mewar-mesh.npz', OUT / 'mewar-detail.glb', bounds, stride=3
    )

    # 3. Graded WebP textures (2048px wide for overview, 1024px for masks)
    albedo_img = Image.open(CACHE / 'surface.jpg').convert('RGB')
    masks_img = Image.open(CACHE / 'surface-masks.png').convert('RGB')
    normal_img = Image.open(CACHE / 'relief-normal.png').convert('RGB')

    target_size = (2048, 1836)
    mask_size = (1024, 918)

    albedo_resized = np.asarray(albedo_img.resize(target_size, Image.Resampling.LANCZOS))
    masks_for_grade = np.asarray(masks_img.resize(target_size, Image.Resampling.BILINEAR))
    graded = grade_surface(albedo_resized, masks_for_grade)
    Image.fromarray(graded).save(OUT / 'surface-warm.webp', format='WEBP', quality=84, method=6)

    normal_img.resize(target_size, Image.Resampling.LANCZOS).save(
        OUT / 'relief-normal.webp', format='WEBP', quality=86, method=6
    )
    masks_img.resize(mask_size, Image.Resampling.BILINEAR).save(
        OUT / 'surface-masks.webp', format='WEBP', quality=85, method=6
    )

    # 4. Lazy-loaded Mewar detail albedo & normal (1280x1360 WebP)
    mewar_rgb = np.asarray(
        Image.open(CACHE / 'mewar-surface.jpg').convert('RGB').resize((1280, 1360), Image.Resampling.LANCZOS)
    )
    mewar_graded = grade_surface(mewar_rgb, None)
    Image.fromarray(mewar_graded).save(OUT / 'mewar-warm.webp', format='WEBP', quality=84, method=6)
    Image.open(CACHE / 'mewar-normal.png').convert('RGB').resize((1280, 1360), Image.Resampling.LANCZOS).save(
        OUT / 'mewar-normal.webp', format='WEBP', quality=86, method=6
    )

    # 5. Export chapter manifest with glTF coordinates [x, z, -y]
    web_chapters = []
    for ch in chapters['chapters']:
        bx, by, bz = ch['blender_xyz_km']
        web_chapters.append({
            'chapter': ch['chapter'],
            'fort': ch['fort'],
            'title': ch['title'],
            'latitude': ch['latitude'],
            'longitude': ch['longitude'],
            'elevation_dsm_m': ch['elevation_dsm_m'],
            'world_xyz_km': [round(bx, 4), round(bz, 4), round(-by, 4)],
        })

    manifest = {
        'crs': chapters['crs'],
        'axes': 'Three.js / glTF Y-up: X east, Y up, Z south (-north). 1 unit = 1 km.',
        'vertical_exaggeration': EXAG,
        'raster_bounds_km': bounds,
        'mewar_bounds_km': [-125.0, -240.0, 2.5, -88.75],
        'geometry': {
            'overview': {'vertices': ov_verts, 'triangles': ov_tris},
            'mewar_detail': {'vertices': mewar_verts, 'triangles': mewar_tris},
        },
        'chapters': web_chapters,
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

    # Print exported sizes
    total = 0
    for f in sorted(OUT.iterdir()):
        sz = f.stat().st_size
        total += sz
        print(f'{f.name:28s} {sz / 1024:8.1f} KB')
    print(f'TOTAL EXPORTED: {total / (1024 * 1024):.2f} MB')


if __name__ == '__main__':
    run()
