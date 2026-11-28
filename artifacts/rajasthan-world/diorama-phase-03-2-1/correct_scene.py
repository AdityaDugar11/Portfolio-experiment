"""Apply Phase 03.2.1 to an open copy of the Phase 03.2 file."""
from collections import Counter
from pathlib import Path
import math
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

root = Path(__file__).resolve().parent
world = root.parent
source = world / "blender/junagarh-exterior-v01.blend"
scene = bpy.context.scene
land = bpy.data.objects["Rajasthan · dunes, folded ranges and cut stone"]
mesh = land.data
anchor = next(o for o in bpy.data.collections["05 · Ten geographic anchors"].objects if o.name.startswith("01"))
assert len(bpy.data.collections["05 · Ten geographic anchors"].objects) == 10
placeholder = bpy.data.objects["Junagarh · existing interpretive courtyard model"]
for obj in list(placeholder.children_recursive) + [placeholder]:
    bpy.data.objects.remove(obj, do_unlink=True)

prior_images = set(bpy.data.images)
with bpy.data.libraries.load(str(source), link=False) as (catalog, loaded):
    loaded.collections = [c for c in catalog.collections if c[:2] in {"01","02","03","04","05","06"}]
fort = bpy.data.collections.new("Junagarh · existing detailed street elevation")
scene.collection.children.link(fort)
for col in loaded.collections:
    fort.children.link(col)
for obj in list(fort.all_objects):
    if obj.name.startswith("Road bed |"):
        bpy.data.objects.remove(obj, do_unlink=True)

mount = bpy.data.objects.new("Junagarh · geographic placement", None)
fort.objects.link(mount)
mount.location = anchor.location
mount.rotation_euler.z = -.08
scale = .44
mount.scale = (scale,)*3
datum = bpy.data.objects.new("Junagarh · source metre datum", None)
fort.objects.link(datum)
datum.parent = mount
datum.location = (38,-11,0)
architecture = [o for o in fort.all_objects if o.type == "MESH"]
assert len(architecture) == 116, len(architecture)
for obj in architecture:
    if obj.parent is None:
        obj.parent = datum
for im in set(bpy.data.images) - prior_images:
    if im.source != "FILE":
        continue
    path = (source.parent / im.filepath[2:]).resolve()
    assert path.is_file(), path
    im.filepath = str(path)
    im.colorspace_settings.name = "sRGB" if path.name.startswith("Diffuse") else "Non-Color"
    im.pack()

bpy.context.view_layer.update()
xyz = np.empty((len(mesh.vertices),3),dtype=np.float32)
mesh.vertices.foreach_get("co",xyz.ravel())
xy = xyz[:,:2].copy()
inverse = datum.matrix_world.inverted()
def local_xy(points):
    return (points @ np.array(inverse.to_3x3())[:2,:2].T
            + np.array(inverse.translation)[:2])

def smooth(t):
    t = np.clip(t,0,1)
    return t*t*(3-2*t)

# Grade the forecourt and passage only. Positive ground height would otherwise
# rise through the source paving and block the opening.
uv = local_xy(xy)
edge = np.maximum.reduce((-142-uv[:,0],uv[:,0]-53,-15-uv[:,1],uv[:,1]-45))
construction = 1-smooth(edge/24)
sculpt = np.load(world/"diorama-phase-03-2/work/sculpt.npz")
assert not np.any(construction[sculpt["ring"]])
assert not np.any(construction[len(sculpt["top"]):])
xyz[:,2] += construction*(anchor.location.z-.045-xyz[:,2])
mesh.vertices.foreach_set("co",xyz.ravel())
mesh.update()
bpy.context.view_layer.update()

def point_field(name):
    arr = np.empty(len(mesh.vertices), dtype=np.float32)
    mesh.attributes[name].data.foreach_get("value",arr)
    return arr

def attribute_colors(attribute):
    arr = np.empty((len(attribute.data),4),dtype=np.float32)
    attribute.data.foreach_get("color",arr.ravel())
    return arr

paint = mesh.color_attributes["Biome pigments"]
rgba = attribute_colors(paint)
old = rgba[:,:3].copy()
sand = point_field("Sand coverage")
stone = smooth(point_field("Exposed bedrock")*1.40)
olive = (1-sand)*smooth((old[:,1]/np.maximum(old[:,0],.025)-.76)/.26)
rgb = old * (1-olive[:,None]) * [1.05,.80,.54] + old * olive[:,None] * [.73,.94,.50]
gold = old * [1.04,.76,.41]
rgb += (gold-rgb)*sand[:,None]
ironstone = old * [1.05,.77,.60]
rgb += (ironstone-rgb)*stone[:,None]
rgba[:,:3] = rgb

water_objects = [o for o in bpy.data.collections["02 · Lakes and connecting tracks"].objects if o.type=="MESH"]
for obj in water_objects:
    colors = obj.data.color_attributes["Depth pigment"]
    pigments = attribute_colors(colors)
    depth = smooth((.207-pigments[:,0])/.176)
    pigments[:,:3] = np.array([.17,.235,.138]) + depth[:,None]*np.array([-.15,-.156,-.135])
    pigments[:,2] += .107*depth
    pigments[:,1] += .026*depth
    colors.data.foreach_set("color", pigments.ravel())
    counts = Counter(tuple(sorted(e)) for f in obj.data.polygons for e in f.edge_keys)
    rim = sorted({i for edge,num in counts.items() if num==1 for i in edge})
    shore = KDTree(len(rim))
    for i in rim:
        v = obj.data.vertices[i].co
        shore.insert((v.x,v.y,0),i)
    shore.balance()
    bounds = np.array([tuple(obj.matrix_world @ Vector(v)) for v in obj.bound_box])
    ids = np.flatnonzero(np.all((xy>=bounds.min(0)[:2]-2.5)&(xy<=bounds.max(0)[:2]+2.5),axis=1))
    distance = np.array([shore.find((*xy[i],0))[2] for i in ids])
    strand = (.62*(1-smooth(distance/1.55))*(xyz[ids,2]>bounds.min(0)[2]-.03))[:,None]
    rgba[ids,:3] += (np.array([.40,.258,.102])-rgba[ids,:3])*strand

tracks = point_field("Distance to cart track")
# Connect the last inherited cart track to the relocated forecourt entrance.
old_end = np.array([-69.,151.])
entry = np.array((datum.matrix_world @ Vector((0,-13,0)))[:2])
vector = entry-old_end
progress = np.clip((xy-old_end)@vector/(vector@vector),0,1)
tracks = np.minimum(tracks, np.linalg.norm(xy-old_end-progress[:,None]*vector,axis=1))
mesh.attributes["Distance to cart track"].data.foreach_set("value",tracks.astype("f4"))
paint.data.foreach_set("color",rgba.ravel())

soil = mesh.materials[0].node_tree
bump = next(n for n in soil.nodes if n.type=="BUMP" and abs(n.inputs["Distance"].default_value-.27)<.001)
grain = bump.inputs["Height"].links[0].from_node
coordinates = grain.inputs["Vector"].links[0].from_socket
fissures = soil.nodes.new("ShaderNodeTexVoronoi")
fissures.feature = "DISTANCE_TO_EDGE"
fissures.inputs["Scale"].default_value = .57
soil.links.new(coordinates,fissures.inputs["Vector"])
layers = soil.nodes.new("ShaderNodeMapRange")
layers.interpolation_type = "SMOOTHERSTEP"
layers.inputs["From Max"].default_value = .19
soil.links.new(fissures.outputs["Distance"],layers.inputs["Value"])
split = soil.nodes.new("ShaderNodeMath")
split.operation = "MULTIPLY"
soil.links.new(grain.outputs["Fac"],split.inputs[0])
soil.links.new(layers.outputs["Result"],split.inputs[1])
soil.links.new(split.outputs[0],bump.inputs["Height"])
bump.inputs["Distance"].default_value = .43

water = water_objects[0].data.materials[0].node_tree
surface = water.nodes.get("Principled BSDF")
surface.inputs["Roughness"].default_value = .185
surface.inputs["Coat Weight"].default_value = .08
water.nodes.get("Noise Texture").inputs["Scale"].default_value = 1.14
water.nodes.get("Bump").inputs["Strength"].default_value = .39
water.nodes.get("Bump").inputs["Distance"].default_value = .026

for material in bpy.data.materials:
    if not any(material.name.startswith(f"{species} leaf ") for species in ("woodland","scrub","khejri")):
        continue
    color = material.node_tree.nodes.get("Principled BSDF").inputs["Base Color"]
    factor = (.70,.88,.36)
    tint = tuple(float(v)*f for v,f in zip(color.default_value[:3],factor)) + (1,)
    color.default_value = material.diffuse_color = tint

# Extend existing vegetation clusters, leaving steep rock, tracks and lake
# margins open. Keep all accepted points on the evaluated terrain.
def ground(x,y):
    hit, pos, normal, _ = land.ray_cast((float(x),float(y),180),(0,0,-1))
    return (pos.z,normal.z) if hit else (None,0)

rng = np.random.default_rng(321)
water_grid = sculpt["wet"]
kept_extra = 0
for obj in bpy.data.collections["03 · Vegetation and stone instances"].objects:
    name = obj.name.partition(" · ")[0]
    points = np.array([v.co[:] for v in obj.data.vertices])
    properties = np.array([[d.value for d in obj.data.attributes[k].data] for k in ("Size","Bearing")]).T
    local = local_xy(points[:,:2])
    keep = (local[:,0] < -146)|(local[:,0] > 57)|(local[:,1]<-19)|(local[:,1]>50)
    keep &= np.hypot(points[:,0]-entry[0],points[:,1]-entry[1])>1.4
    modified = ~keep | ((local[:,0]>-170)&(local[:,0]<79)&(local[:,1]>-42)&(local[:,1]<72))
    for idx in np.flatnonzero(keep & modified):
        z,_ = ground(*points[idx,:2])
        points[idx,2] = z
    indices = np.flatnonzero(keep)
    builds = np.column_stack((points[indices],properties[indices])).tolist()
    if name in {"woodland","scrub"}:
        choices = indices[rng.random(len(indices))<(.48 if name=="woodland" else .23)]
        nearest = KDTree(len(points))
        for i, (x,y,z) in enumerate(points):
            nearest.insert((x,y,0),i)
        nearest.balance()
        for i in choices:
            angle = rng.uniform(0,math.tau)
            x,y = points[i,:2]+rng.uniform(1.4,3.5)*np.array([math.cos(angle),math.sin(angle)])
            if x < -190 or nearest.find((x,y,0))[2] < 1.05:
                continue
            if water_grid[round(y+392),round(x+458)]:
                continue
            z,normal = ground(x,y)
            if z is None or normal < .82 or abs(points[i,2]-z) > 1:
                continue
            q = local_xy(np.array([[x,y]]))[0]
            if -163<q[0]<72 and -38<q[1]<67:
                continue
            builds.append((x,y,z,properties[i,0]*rng.uniform(.56,.85),angle))
            kept_extra += 1
    cloud = np.asarray(builds,dtype="f4")
    obj.data.clear_geometry()
    obj.data.from_pydata(cloud[:,:3].tolist(),[],[])
    for i,name in enumerate(("Size","Bearing"),3):
        attr = obj.data.attributes.get(name) or obj.data.attributes.new(name,"FLOAT","POINT")
        attr.data.foreach_set("value",np.ascontiguousarray(cloud[:,i]))

floor = bpy.data.objects["Continuous studio sweep"]
air = bpy.data.objects["Junagarh approach air volume"]
for obj in (floor,air):
    obj.animation_data_clear()
for frame,approach in ((61,False),(62,True)):
    floor.hide_render, air.hide_render = approach, not approach
    for obj in (floor,air):
        obj.keyframe_insert(data_path="hide_render",frame=frame)
backdrop = floor.data.materials[0].node_tree.nodes.get("Principled BSDF")
backdrop.inputs["Base Color"].default_value = (.115,.068,.051,1)
air.data.materials[0].node_tree.nodes.get("Volume Scatter").inputs["Density"].default_value = .00019
scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .26
sun = bpy.data.objects["Sun · WSW golden light"]
sun.data.color = (1,.83,.63)
sun.data.energy = 3.30
sun.data.angle = math.radians(4.2)
sun.rotation_euler = (-Vector((-690,-310,415))).to_track_quat("-Z","Y").to_euler()
fill = bpy.data.objects["Sky bounce · broad cool fill"].data
fill.energy = 360000
# The reverse light catches the cutaway rim without whitening the terrain.
rim = bpy.data.lights.new("Warm edge bounce","AREA")
rim.color, rim.energy, rim.shape, rim.size = (1,.81,.61),530000,"DISK",620
edge_light = bpy.data.objects.new(rim.name,rim)
sun.users_collection[0].objects.link(edge_light)
edge_light.location = (80,475,415)
edge_light.rotation_euler = (-edge_light.location).to_track_quat("-Z","Y").to_euler()

overview = bpy.data.objects["01-overview"]
overview.data.lens = 58
overview.data.shift_y = -.013
approach = bpy.data.objects["05-junagarh-approach"]
approach.data.lens = 38
approach.location = datum.matrix_world @ Vector((-49,-156,14.0))
focus = datum.matrix_world @ Vector((-34,3,8.0))
approach.rotation_euler = (focus-approach.location).to_track_quat("-Z","Y").to_euler()

scene.timeline_markers.clear()
for frame,title,camera in [(61,"01-overview",overview),(62,"02-junagarh-approach",approach)]:
    scene.timeline_markers.new(title,frame=frame).camera = camera
scene.frame_end = 62
scene.frame_set(61)
scene.camera = overview
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.view_settings.exposure = .11
scene.render.resolution_x,scene.render.resolution_y = 990,660
scene.render.resolution_percentage = 100
scene.cycles.samples = 11
scene.cycles.adaptive_threshold = .07

bpy.context.view_layer.update()
assert np.array_equal(xy,xyz[:,:2])
assert len([o for o in architecture if "hinge origin" in o.name]) == 2
assert approach.location.z > ground(*approach.location[:2])[0]
depsgraph = bpy.context.evaluated_depsgraph_get()
for x in (-.55,0,.55):
    for z in (.85,1.70,2.35):
        origin = datum.matrix_world @ Vector((x,-7,z))
        direction = (datum.matrix_world.to_3x3() @ Vector((0,1,0))).normalized()
        hit,*result = scene.ray_cast(depsgraph,origin,direction,distance=23.95*scale)
        assert not hit, (x,z,result)
print(f"INTEGRATION {len(architecture)} source meshes, {kept_extra} added plants, nine clear gateway rays")

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(root / "Rajasthan.blend"),compress=True)
if "--render" in sys.argv:
    for marker in sorted(scene.timeline_markers,key=lambda m:m.frame):
        scene.frame_set(marker.frame)
        scene.camera = marker.camera
        scene.render.filepath = str(root/"renders"/(marker.name+".png"))
        bpy.ops.render.render(write_still=True)
