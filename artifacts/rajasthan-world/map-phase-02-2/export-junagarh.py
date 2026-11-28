"""Export preview-only static meshes from a separately opened Junagarh Blender study."""
from collections import defaultdict
from pathlib import Path
import sys

import bpy

out = Path(sys.argv[sys.argv.index('--') + 1])
out.mkdir(parents=True, exist_ok=True)
source = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

# Flat PBR proxies preserve the relative warm/cool stone families. The original
# Blender materials and reference image are never exported.
PALETTE = {
    'Rampart': '#9a5c45', 'Portal': '#cead76', 'Rose': '#b87e62',
    'Pale': '#e1c496', 'Palace': '#87503c', 'Recessed': '#70563c',
    'Oiled': '#473225', 'Paving': '#ac9174', 'Street asphalt': '#807469',
    'Street enclosure': '#c6ad8e', 'Street tree | grey bark': '#625349',
    'Street tree | dusty foliage': '#5b6241', 'Blackened': '#3c3932',
}
materials = {}
for prefix, hex_color in PALETTE.items():
    mat = bpy.data.materials.new(f'Preview {prefix}')
    rgb = [int(hex_color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = tuple(((v + .055) / 1.055)**2.4 if v > .04045 else v / 12.92 for v in rgb)
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = mat.diffuse_color
    bsdf.inputs['Roughness'].default_value = .91
    materials[prefix] = mat

def collections(obj):
    return {c.name[:2] for c in obj.users_collection}

def exterior(obj):
    if not collections(obj) & {'01', '02', '04', '05', '06'}:
        return False
    return not any(text in obj.name for text in (
        'carved surrounds', 'flagstaff', 'pennant', 'Road bed', 'leaf canopy',
        'forged', 'street tree | branches',
    ))

def atlas(obj):
    return exterior(obj) and any(text in obj.name for text in (
        'battered sweep', 'pierced portal body', 'raised base', 'inner core',
        'coping and roof parapet', 'Rooftop belvedere 00', 'Rooftop belvedere 03',
        'Rooftop belvedere 08', 'flanking vaulted passage', 'gallery over passage',
    ))

def export(name, include):
    vertices, faces = defaultdict(list), defaultdict(list)
    for obj in filter(include, source):
        label = obj.data.materials[0].name
        group = next(prefix for prefix in materials if label.startswith(prefix))
        offset = len(vertices[group])
        vertices[group].extend(tuple(obj.matrix_world @ v.co) for v in obj.data.vertices)
        faces[group].extend(tuple(i + offset for i in face.vertices) for face in obj.data.polygons)

    bpy.ops.object.select_all(action='DESELECT')
    for group, points in vertices.items():
        geo = bpy.data.meshes.new(group)
        geo.from_pydata(points, [], faces[group])
        geo.materials.append(materials[group])
        geo.update()
        obj = bpy.data.objects.new(group, geo)
        bpy.context.collection.objects.link(obj)
        obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=str(out / f'{name}.glb'), export_format='GLB', use_selection=True,
        export_yup=True, export_texcoords=False, export_animations=False,
    )

export('junagarh-atlas', atlas)
export('junagarh-exterior', exterior)
