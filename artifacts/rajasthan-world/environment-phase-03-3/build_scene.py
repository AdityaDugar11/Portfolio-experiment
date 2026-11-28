"""Build the Phase 03.3 metre-scale environment in Blender."""
import math
import os
from pathlib import Path
import random
import sys

import bpy
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache"
WORLD = ROOT.parent
SCENE = bpy.context.scene
RNG = random.Random(133)
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DRAFT = "--draft" in ARGS
SCAN_ALPHA = "wild_rooibos_bush"


def collection(name):
    group = bpy.data.collections.new(name)
    SCENE.collection.children.link(group)
    return group


def move(obj, group):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    group.objects.link(obj)
    return obj


def mesh_object(name, vertices, faces, group):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    group.objects.link(obj)
    return obj


def smooth_mesh(obj):
    obj.data.polygons.foreach_set("use_smooth", np.ones(len(obj.data.polygons), dtype=bool))


def texture(tree, path, vector, colorspace="Non-Color"):
    node = tree.nodes.new("ShaderNodeTexImage")
    node.image = bpy.data.images.load(str(path), check_existing=True)
    node.image.colorspace_settings.name = colorspace
    tree.links.new(vector, node.inputs["Vector"])
    return node.outputs["Color"]


def terrain_material():
    material = bpy.data.materials.new("Sand, wind ripples and exposed desert pavement")
    material.use_nodes = True
    tree = material.node_tree
    nodes, link = tree.nodes, tree.links.new
    principled = nodes.get("Principled BSDF")
    principled.inputs["Specular IOR Level"].default_value = .26

    attr = nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Exposed pavement"
    maps = nodes.new("ShaderNodeTexCoord")
    coords = maps.outputs["UV"]

    def mapped(scale, heading, offset=(0, 0, 0)):
        node = nodes.new("ShaderNodeMapping")
        node.inputs["Scale"].default_value = (scale, scale, 1)
        node.inputs["Rotation"].default_value.z = math.radians(heading)
        node.inputs["Location"].default_value = offset
        link(coords, node.inputs["Vector"])
        return node.outputs["Vector"]

    def blend(factor, first, second):
        node = nodes.new("ShaderNodeMixRGB")
        if isinstance(factor, float):
            node.inputs[0].default_value = factor
        else:
            link(factor, node.inputs[0])
        link(first, node.inputs[1])
        link(second, node.inputs[2])
        return node.outputs["Color"]

    def tint(color, multiplier):
        node = nodes.new("ShaderNodeMixRGB")
        node.blend_type = "MULTIPLY"
        node.inputs[0].default_value = 1
        node.inputs[2].default_value = (*multiplier, 1)
        link(color, node.inputs[1])
        return node.outputs["Color"]

    def normal(source, strength):
        node = nodes.new("ShaderNodeNormalMap")
        node.inputs["Strength"].default_value = strength
        link(source, node.inputs["Color"])
        return node.outputs["Normal"]

    def bump(source, distance, existing):
        node = nodes.new("ShaderNodeBump")
        node.inputs["Distance"].default_value = distance
        node.inputs["Strength"].default_value = .75
        link(source, node.inputs["Height"])
        link(existing, node.inputs["Normal"])
        return node.outputs["Normal"]

    base_ripples = mapped(.89, 27, (.14, .38, 0))
    warp = nodes.new("ShaderNodeTexNoise")
    warp.inputs["Scale"].default_value = .30
    warp.inputs["Detail"].default_value = 1.2
    link(coords, warp.inputs["Vector"])
    amount = nodes.new("ShaderNodeVectorMath")
    amount.operation = "SCALE"
    amount.inputs["Scale"].default_value = .52
    link(warp.outputs["Color"], amount.inputs[0])
    ripple_coordinates = nodes.new("ShaderNodeVectorMath")
    ripple_coordinates.operation = "ADD"
    link(base_ripples, ripple_coordinates.inputs[0])
    link(amount.outputs[0], ripple_coordinates.inputs[1])
    ripples = ripple_coordinates.outputs[0]
    sand_uv, stones_uv = mapped(.53, -11), mapped(.49, 8, (.31, .52, 0))
    sand, stones, dune = (CACHE / name for name in ("sand_03", "sandy_gravel_02", "Ground097"))

    sand_color = texture(tree, sand / "Diffuse.jpg", sand_uv, "sRGB")
    ripple_color = texture(tree, dune / "Ground097_1K-JPG_Color.jpg", ripples, "sRGB")
    pavement_color = texture(tree, stones / "Diffuse.jpg", stones_uv, "sRGB")
    sand_color = tint(blend(.73, sand_color, ripple_color), (1.12, .93, .65))
    pavement_color = tint(pavement_color, (.94, .81, .63))
    mask = attr.outputs["Fac"]
    link(blend(mask, sand_color, pavement_color), principled.inputs["Base Color"])

    sand_roughness = texture(tree, sand / "Rough.jpg", sand_uv)
    pavement_roughness = texture(tree, stones / "Rough.jpg", stones_uv)
    link(blend(mask, sand_roughness, pavement_roughness), principled.inputs["Roughness"])

    sand_normal = normal(texture(tree, sand / "nor_gl.jpg", sand_uv), .34)
    ripple_height = texture(tree, dune / "Ground097_1K-JPG_Displacement.jpg", ripples)
    dune_normal = bump(ripple_height, .006, sand_normal)
    pavement_normal = normal(texture(tree, stones / "nor_gl.jpg", stones_uv), .57)
    # Mix perturbed shading normals in vector space before passing them to the BSDF.
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "VECTOR"
    link(mask, mix.inputs[0])
    link(dune_normal, mix.inputs[4])
    link(pavement_normal, mix.inputs[5])
    link(mix.outputs[1], principled.inputs["Normal"])
    return material


def smoothstep(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)


def build_ground(group):
    heights = np.load(CACHE / "dunes.npy")[::-1].copy()
    assert heights.shape == (960, 320) and np.isfinite(heights).all()
    heights -= 1211.55
    rows, columns = heights.shape
    # The origin remains at the centre of the initial 320 m review crop.
    x, y = np.meshgrid(np.arange(columns, dtype=np.float32) - 159.5,
                       np.arange(rows, dtype=np.float32) - 159.5)
    vertices = np.column_stack((x.ravel(), y.ravel(), heights.ravel()))
    low = np.arange(rows * columns).reshape(rows, columns)[:-1, :-1].ravel()
    faces = np.column_stack((low, low + 1, low + 1 + columns, low + columns))
    obj = mesh_object("LiDAR · windward slopes, slip faces and interdunes", vertices.tolist(),
                      faces.tolist(), group)
    obj["source"] = "USGS 3DEP NM_WhiteSandsNM_2020_D20; relative metre elevations"
    obj["vertical datum offset (m)"] = 1211.55
    smooth_mesh(obj)

    uv = obj.data.uv_layers.new(name="Metre coordinates")
    loops = np.empty(len(obj.data.loops), dtype=np.int32)
    obj.data.loops.foreach_get("vertex_index", loops)
    uv.uv.foreach_set("vector", np.ascontiguousarray(vertices[loops, :2]).ravel())

    # Stable pavement occupies the low, sheltered east side of the interdune.
    dy, dx = np.gradient(heights)
    edge = x - (13 - .15 * y + 3.3 * np.sin(.12 * y))
    low_ground = 1 - smoothstep((heights - 1.1) / 2.4)
    texture_breakup = .86 + .13 * np.sin(x * .59 + y * .14) * np.cos(y * .25)
    sheltered = smoothstep((edge + 6) / 18) * (1 - smoothstep((edge - 27) / 15))
    apron = 1 - smoothstep((np.hypot((x - 30) * .66, y - 7) - 3.1) / 7)
    pavement = np.maximum(.77 * sheltered * low_ground, apron) * texture_breakup
    pavement *= 1 - smoothstep((np.hypot(dx, dy) - .18) / .35)
    attr = obj.data.attributes.new("Exposed pavement", "FLOAT", "POINT")
    attr.data.foreach_set("value", np.ascontiguousarray(pavement.ravel(), dtype=np.float32))
    obj.data.materials.append(terrain_material())
    return obj


def ground_at(obj, x, y):
    hit, point, normal, _ = obj.ray_cast((x, y, 40), (0, 0, -1))
    assert hit, (x, y)
    return point.z, normal.z


def import_scans(key):
    existing = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(CACHE / key / f"{key}.gltf"))
    return sorted((obj for obj in set(bpy.data.objects) - existing if obj.type == "MESH"),
                  key=lambda obj: obj.name)


def weather_scan(materials, saturation, rgb):
    for mat in materials:
        tree = mat.node_tree
        shader = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
        base = shader.inputs["Base Color"]
        original = base.links[0].from_socket
        hue = tree.nodes.new("ShaderNodeHueSaturation")
        hue.inputs["Saturation"].default_value = saturation
        tree.links.new(original, hue.inputs["Color"])
        mix = tree.nodes.new("ShaderNodeMixRGB")
        mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1
        mix.inputs[2].default_value = (*rgb, 1)
        tree.links.new(hue.outputs["Color"], mix.inputs[1])
        tree.links.new(mix.outputs["Color"], base)


def scrub_scans():
    objects = import_scans(SCAN_ALPHA)
    for mat in {m for obj in objects for m in obj.data.materials}:
        if not mat.name.endswith(("_twigs", "_leaves")):
            continue
        tree = mat.node_tree
        coords = tree.nodes.new("ShaderNodeTexCoord")
        shader = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
        alpha = texture(tree, CACHE / SCAN_ALPHA / "textures/Alpha.png", coords.outputs["UV"])
        tree.links.new(alpha, shader.inputs["Alpha"])
    return objects


def place_rock(key, name, x, y, z, heading, group):
    angle = math.radians(heading)
    objects = import_scans(key)
    weather_scan({mat for rock in objects for mat in rock.data.materials},
                 .85, (1.08, .88, .66))
    for index, rock in enumerate(objects):
        u, v, w = rock.location
        rock.name = name if index == 0 else f"{name} {index + 1}"
        rock.rotation_euler.z += angle
        rock.location = (x + u * math.cos(angle) - v * math.sin(angle),
                         y + u * math.sin(angle) + v * math.cos(angle), z + w)
        move(rock, group)
    return objects


def repeat_source(source, name, x, y, z, size, angle, group, original=False):
    obj = source if original else source.copy()
    obj.name = name
    obj.location = (x, y, z)
    obj.rotation_euler.z = angle
    obj.scale = (size,) * 3
    if original:
        move(obj, group)
    else:
        group.objects.link(obj)
    return obj


def scatter(ground, sources, group, patches, kind, blocked):
    placed = 0
    for cx, cy, rx, ry, count, min_size, max_size in patches:
        accepted = []
        for _ in range(count * 4):
            if len(accepted) >= count:
                break
            bearing = RNG.uniform(0, math.tau)
            radius = math.sqrt(RNG.random())
            x = cx + rx * radius * math.cos(bearing)
            y = cy + ry * radius * math.sin(bearing)
            if any((x - px) ** 2 + (y - py) ** 2 < r ** 2 for px, py, r in blocked):
                continue
            if any((x - px) ** 2 + (y - py) ** 2 < (.27 if kind == "Scrub" else .10) ** 2 for px, py in accepted):
                continue
            z, nz = ground_at(ground, x, y)
            if nz < .89:
                continue
            accepted.append((x, y))
            source = sources[placed % len(sources)]
            used = placed < len(sources)
            repeat_source(source, f"{kind} · {placed + 1:03d}", x, y, z - .035,
                          RNG.uniform(min_size, max_size), RNG.uniform(0, math.tau), group, used)
            placed += 1
    assert placed >= len(sources)
    return placed


def make_tussock(group, variant):
    """Fine leaf blades and thin seed heads retain their silhouettes at eye level."""
    vertices, faces, indices = [], [], []
    for blade in range(51):
        angle = RNG.uniform(0, math.tau)
        dx, dy = math.cos(angle), math.sin(angle)
        length = RNG.uniform(.16, .49)
        spread = RNG.uniform(.12, .78)
        width = RNG.uniform(.0019, .0062)
        root = RNG.uniform(.005, .085)
        brown = RNG.randrange(4)
        first = len(vertices)
        for j in range(7):
            t = j / 6
            reach = root + length * spread * t ** 1.7
            height = length * (t - spread * t ** 2 * .61)
            w = width * (1 - .98 * t)
            x, y = dx * reach + .11 * t ** 2, dy * reach
            vertices.extend(((x - dy * w, y + dx * w, height),
                             (x, y, height + .7 * w),
                             (x + dy * w, y - dx * w, height)))
            if j:
                for k in (0, 1):
                    i = first + j * 3 + k
                    faces.append((i - 3, i - 2, i + 1, i))
                    indices.append(brown if j < 4 else max(0, brown - 1))
        if blade % 13 == 0:
            tip = Vector(vertices[-2])
            for row in range(5):
                z = tip.z + row * .009
                d = .009 - row * .0014
                a = len(vertices)
                vertices.extend(((tip.x - d, tip.y, z), (tip.x, tip.y, z + .014),
                                 (tip.x + d, tip.y, z), (tip.x, tip.y + d * .55, z - .004)))
                faces.extend(((a, a + 1, a + 3), (a + 1, a + 2, a + 3)))
                indices.extend((1, 1))
    obj = mesh_object(f"Bunchgrass source {variant}", vertices, faces, group)
    for i, color in enumerate(((.46, .30, .13), (.32, .194, .070),
                               (.225, .127, .045), (.185, .121, .044))):
        name = f"Dry leaf tones {i}"
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.use_nodes = True
        node = mat.node_tree.nodes["Principled BSDF"]
        node.inputs["Base Color"].default_value = (*color, 1)
        node.inputs["Roughness"].default_value = .84
        obj.data.materials.append(mat)
    obj.data.polygons.foreach_set("material_index", np.array(indices, dtype=np.int32))
    return obj


def add_architecture(ground, group):
    source = WORLD / "blender/junagarh-exterior-v01.blend"
    with bpy.data.libraries.load(str(source), link=False) as (available, loaded):
        assert "Rooftop belvedere 00" in available.objects
        loaded.objects = ["Rooftop belvedere 00"]
    pavilion, = loaded.objects
    group.objects.link(pavilion)
    pavilion.name = "Sandstone chhatri · one component from the Junagarh study"
    # The rooftop part is repurposed off site for the scale and material study.
    source_min_z = min(v[2] for v in pavilion.bound_box)
    center = Vector(pavilion.bound_box[0]) + Vector(pavilion.bound_box[6])
    center *= .5
    plinth = (17.8, 1.9)
    z = ground_at(ground, *plinth)[0]
    pavilion.location = (plinth[0] - center.x, plinth[1] - center.y, z + .44 - source_min_z)
    pavilion["source"] = "Rooftop belvedere 00, project Junagarh street elevation"
    pavilion["placement"] = "Illustrative desert pavilion, relocated for this material benchmark"
    for mat in pavilion.data.materials:
        if mat and mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type == "TEX_IMAGE":
                    img = node.image
                    img.filepath = str((source.parent / img.filepath.removeprefix("//")).resolve())
                    assert Path(img.filepath).is_file(), img.filepath
                    img.colorspace_settings.name = "sRGB" if Path(img.filepath).name == "Diffuse.jpg" else "Non-Color"

    stone = next(mat for mat in pavilion.data.materials if mat and mat.use_nodes)
    # Restore the photographed stone variation suppressed by the source color ramp.
    tree = stone.node_tree
    bsdf = tree.nodes.get("Principled BSDF")
    diffuse = next(n for n in tree.nodes if n.type == "TEX_IMAGE" and
                   Path(n.image.filepath).name == "Diffuse.jpg")
    base = bsdf.inputs["Base Color"]
    previous = base.links[0].from_socket
    mix = tree.nodes.new("ShaderNodeMixRGB")
    mix.inputs[0].default_value = .84
    tree.links.new(previous, mix.inputs[1])
    tree.links.new(diffuse.outputs["Color"], mix.inputs[2])
    tree.links.new(mix.outputs["Color"], base)
    bsdf.inputs["Specular IOR Level"].default_value = .19
    next(n for n in tree.nodes if n.type == "NORMAL_MAP").inputs["Strength"].default_value = .53
    for number, (width, depth, height, offset) in enumerate(((3.5, 3.62, .29, -.27),
                                                              (3.18, 3.19, .14, -.09),
                                                              (2.92, 2.92, .13, 0))):
        bottom = z - .12 + sum((.29, .14, .13)[:number])
        bpy.ops.mesh.primitive_cube_add(size=1, location=(*plinth, bottom + height / 2))
        step = move(bpy.context.object, group)
        step.name = f"Sandstone plinth course {number + 1}"
        step.location.y += offset
        step.scale = (width, depth, height)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        # The study material uses UVs. Map each course at its actual scale.
        uv = step.data.uv_layers.active
        for face in step.data.polygons:
            axes = [i for i in range(3) if i != max(range(3), key=lambda i: abs(face.normal[i]))]
            for li in face.loop_indices:
                vertex = step.data.vertices[step.data.loops[li].vertex_index].co + step.location
                uv.data[li].uv = [vertex[i] / (.40 * 1.53) for i in axes]
        step.data.materials.append(stone)
        bevel = step.modifiers.new("Worn projecting stone edges", "BEVEL")
        bevel.width, bevel.segments = .015, 2
    return pavilion


def camera(name, location, target, focal_length, group):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()
    data.lens, data.clip_end = focal_length, 1250
    return obj


def configure_lighting(group):
    world = bpy.data.worlds.new("Sunlight and dry evening sky")
    world.use_nodes = True
    SCENE.world = world
    sky = world.node_tree.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "MULTIPLE_SCATTERING"
    sky.sun_elevation, sky.sun_rotation = math.radians(24), math.radians(348)
    sky.sun_disc = False
    sky.altitude, sky.air_density = .3, 1
    background = world.node_tree.nodes["Background"]
    world.node_tree.links.new(sky.outputs["Color"], background.inputs["Color"])
    background.inputs["Strength"].default_value = .25
    data = bpy.data.lights.new("Late-afternoon sun", "SUN")
    data.energy, data.angle, data.color = 2.8, math.radians(.72), (1., .826, .629)
    sun = bpy.data.objects.new(data.name, data)
    group.objects.link(sun)
    elevation, azimuth = sky.sun_elevation, sky.sun_rotation
    light_direction = Vector((math.cos(elevation) * math.cos(azimuth),
                              math.cos(elevation) * math.sin(azimuth), math.sin(elevation)))
    sun.rotation_euler = (-light_direction).to_track_quat("-Z", "Y").to_euler()


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    SCENE.unit_settings.system = "METRIC"
    SCENE.unit_settings.scale_length = 1
    ground_group = collection("01 · Measured dune landform")
    geology = collection("02 · Photogrammetry and weathered talus")
    plants = collection("03 · Dry scrub and bunchgrass")
    detail = collection("04 · Sandstone pavilion study")
    cameras = collection("05 · Review cameras and daylight")

    ground = build_ground(ground_group)
    # Continue the distant sightline past the measured crop without replacing its relief.
    apron = mesh_object("Distant sand below the surveyed terrain", [
        (-1800, -1800, -.77), (1800, -1800, -.77), (1800, 1800, -.77), (-1800, 1800, -.77)
    ], [(0, 1, 2, 3)], ground_group)
    apron_uv = apron.data.uv_layers.new(name="Metre coordinates")
    for loop in apron.data.loops:
        apron_uv.data[loop.index].uv = apron.data.vertices[loop.vertex_index].co.xy
    apron.data.materials.append(ground.data.materials[0])
    place_rock("namaqualand_cliff_02", "Main weathered outcrop", 30.2, 11.1, .19, -15, geology)
    place_rock("namaqualand_cliff_01", "Jointed continuation of the outcrop", 38.5, 7.2, .43, -30, geology)
    bx, by = 26.4, -8.9
    bz = ground_at(ground, bx, by)[0] - .22
    slab, = place_rock("namaqualand_boulder_03", "Displaced slab below the outcrop",
                       bx, by, bz, 19, geology)
    for x, y, scale, angle in ((33.4, 3.9, .43, -2.6), (39.4, 3.1, .29, 1.2)):
        height = ground_at(ground, x, y)[0]
        repeat_source(slab, "Detached toe fragment", x, y, height - .15, scale, angle, geology)
    place_rock("namaqualand_boulders_01", "Broken stones beneath the ledge", 23.7, 6.5, .46, -36,
               geology)
    add_architecture(ground, detail)
    exclusions = [(17.8, 1.9, 2.25), (30.2, 11.1, 5.5), (38.5, 7.2, 3.4), (bx, by, 1.34)]
    stone_patches = [(29, 5, 8, 3.3, 87, .29, 1.51), (38, 3, 5, 3.2, 57, .25, 1.4),
                     (20, 7, 4, 2.3, 37, .29, 1.15), (31, -9, 4, 2, 27, .26, 1.08),
                     (24, -14, 3, 3, 21, .26, .78), (32, -18, 3, 4, 12, .34, .84)]
    talus = import_scans("namaqualand_rocks_01")
    weather_scan({mat for obj in talus for mat in obj.data.materials}, .66, (.77, .61, .44))
    stone_count = scatter(ground, talus, geology, stone_patches, "Talus", exclusions)
    vegetated = [(30, 3, 7, 3, 20, .68, 1.34), (40, 2, 5, 3, 22, .61, 1.33),
                  (11, 5, 4, 4, 9, .67, 1.13), (23, -10, 4, 6, 16, .56, 1.14),
                  (23, -24, 3.5, 3, 16, .64, 1.18), (31, -23, 3.2, 5.5, 24, .60, 1.48),
                  (39, -18, 6, 5, 14, .65, 1.2), (50, 13, 9, 5, 18, .63, 1.18),
                  (24, 22, 12, 7, 13, .66, 1.27), (-17, 23, 5, 4, 7, .6, 1.1),
                  (8, 30, 6, 4, 7, .5, 1.13), (20, -34, 4, 3, 12, .65, 1.2)]
    shrub_count = scatter(ground, scrub_scans(), plants, vegetated, "Scrub", exclusions)
    grasses = [make_tussock(plants, i) for i in range(4)]
    grass_count = scatter(ground, grasses, plants, vegetated, "Bunchgrass", exclusions)

    configure_lighting(cameras)
    high = camera("01-elevated", (44, -51, 47), (9.5, 14, 1.9), 39, cameras)
    gx, gy = 19.3, -25.8
    low_z = ground_at(ground, gx, gy)[0] + 1.66
    low = camera("02-ground-level", (gx, gy, low_z), (20.6, 6.9, 2.1), 33, cameras)
    for frame, obj in enumerate((high, low), 1):
        SCENE.timeline_markers.new(obj.name, frame=frame).camera = obj
        assert obj.location.z > ground_at(ground, *obj.location[:2])[0] + 1.5
    SCENE.frame_end = 2
    SCENE.frame_set(1)
    SCENE.camera = high
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"
                area.spaces.active.overlay.show_overlays = False

    SCENE.render.engine = "CYCLES"
    SCENE.cycles.device = "CPU"
    SCENE.cycles.samples = 10 if DRAFT else 48
    SCENE.cycles.adaptive_threshold = .053 if DRAFT else .022
    SCENE.cycles.use_denoising = True
    SCENE.cycles.max_bounces = 6
    SCENE.cycles.transparent_max_bounces = 8
    SCENE.view_settings.view_transform = "AgX"
    SCENE.view_settings.look = "AgX - Medium High Contrast"
    SCENE.view_settings.exposure = -.18
    SCENE.render.resolution_x, SCENE.render.resolution_y = 1600, 1000
    SCENE.render.resolution_percentage = 50 if DRAFT else 100
    SCENE.render.image_settings.file_format = "PNG"
    SCENE.render.image_settings.color_mode = "RGB"
    output = Path(os.environ["PHASE033_DRAFT_DIR"]) if DRAFT else ROOT / "renders"
    output.mkdir(parents=True, exist_ok=True)
    SCENE.render.filepath = "//renders/01-elevated.png"
    SCENE["benchmark context"] = "Synthetic scene arrangement based on measured dune relief; no fort or mapped locality."
    bpy.ops.file.pack_all()
    assert all(im.packed_file for im in bpy.data.images if im.source == "FILE" and im.users)
    print("PLACED", stone_count, "talus;", shrub_count, "scanned scrub;", grass_count, "grass clumps")
    bpy.context.preferences.filepaths.save_version = 0
    if not DRAFT:
        bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "Dune and Sandstone.blend"), compress=True)
    for frame in (1, 2):
        SCENE.frame_set(frame)
        SCENE.render.filepath = str(output / (SCENE.camera.name + ".png"))
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
