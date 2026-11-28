"""Check the saved Blender scene and its placement metadata."""
import json
from pathlib import Path

import bpy
import numpy as np

root = Path(__file__).resolve().parent
source = root.parent / "map-phase-01"
data = np.load(root / "work/sculpt.npz")
manifest = json.loads((source / "data/chapters.json").read_text())["chapters"]
placement = json.loads((root / "work/placement.json").read_text())
scene = bpy.context.scene
surface = bpy.data.objects["Rajasthan · dunes, folded ranges and cut stone"]
mesh = surface.data
mesh.calc_loop_triangles()
assert len(mesh.vertices)-len(mesh.edges)+len(mesh.polygons) == 2
verts = np.empty(len(mesh.vertices)*3, dtype="f4")
mesh.vertices.foreach_get("co",verts)
assert np.array_equal(verts.reshape(-1,3)[:len(data["top"])],data["top"])

def ground(x,y):
    hit, pos, _, _ = surface.ray_cast((float(x),float(y),250),(0,0,-1))
    assert hit, (x,y)
    return pos.z

markers = sorted(scene.timeline_markers, key=lambda marker: marker.frame)
assert [m.frame for m in markers] == list(range(1,10))
bpy.context.view_layer.update()
for site in manifest:
    obj = bpy.data.objects[f"{site['chapter']:02} · {site['fort']}"]
    np.testing.assert_allclose(obj.location[:2],site["blender_xyz_km"][:2],atol=1.e-4)
    assert obj["Chapter title"] == site["title"] and obj["Wikidata"] == site["source"]
    assert abs(ground(*obj.location[:2])-obj.location.z)<.002
assert len(bpy.data.collections["05 · Ten geographic anchors"].objects)==10
assert len(bpy.data.objects["Junagarh · existing interpretive courtyard model"].children)>20
camera = markers[4].camera
assert camera.location.z>ground(*camera.location[:2])+3
assert all(im.packed_file or im.source != "FILE" for im in bpy.data.images)

plants = bpy.data.collections["03 · Vegetation and stone instances"]
counts = {}
source_triangles = set()
instance_triangles = 0
max_placement_error = 0
for cloud in plants.objects:
    n = len(cloud.data.vertices)
    source_object = next(node for node in cloud.modifiers[0].node_group.nodes
                         if node.type=="OBJECT_INFO").inputs["Object"].default_value
    source_object.data.calc_loop_triangles()
    instance_triangles += n*len(source_object.data.loop_triangles)
    source_triangles.add(source_object)
    key = cloud.name.split(" · ")[0]
    counts[key] = counts.get(key,0)+n
    for vertex in cloud.data.vertices:
        x,y,z = vertex.co
        max_placement_error = max(max_placement_error,abs(z-ground(x,y)))
assert max_placement_error < .002, max_placement_error

road_points = 0
for track in bpy.data.collections["02 · Lakes and connecting tracks"].objects:
    if track.type != "CURVE":
        continue
    points = track.data.splines[0].points
    road_points += len(points)
    assert track.hide_render
    assert all(abs(point.co.z-ground(*point.co[:2]))<.002 for point in points)
    x0,y0 = data["x"][0],data["y"][0]
    wet = data["wet"]
    assert all(not wet[round(point.co.y-y0),round(point.co.x-x0)] for point in points)

lake_stats = {}
for lake in placement["lakes"]:
    obj = bpy.data.objects[lake["name"]]
    assert obj.data.validate() is False
    assert all(polygon.normal.z>.99 for polygon in obj.data.polygons)
    clearance = [vertex.co.z-ground(*vertex.co[:2]) for vertex in obj.data.vertices]
    assert min(clearance)>.014
    assert max(clearance)>.65
    lake_stats[lake["name"]] = len(obj.data.polygons)

foundation_corners = 0
for village in bpy.data.collections["04 · Settlements and Junagarh scale study"].objects:
    if "Foundation corners XYZ" not in village:
        continue
    foundations = np.array(village["Foundation corners XYZ"]).reshape(-1,3)
    foundation_corners += len(foundations)
    assert all(ground(x,y)-z>=.24 for x,y,z in foundations)

baseline = root.parent / "diorama-phase-03-1/Rajasthan.blend"
if baseline.exists():
    with bpy.data.libraries.load(str(baseline)) as (catalog, library):
        names = [marker.name.removeprefix("match-") for marker in markers[5:]]
        assert all(name in catalog.objects for name in names)
        library.objects = names
    for old, marker in zip(library.objects,markers[5:]):
        np.testing.assert_allclose(old.location,marker.camera.location,atol=1.e-5)
        np.testing.assert_allclose(old.rotation_euler,marker.camera.rotation_euler,atol=1.e-5)
        assert old.data.lens==marker.camera.data.lens

print(json.dumps(dict(terrain_vertices=len(mesh.vertices),terrain_triangles=len(mesh.loop_triangles),
                      waters=lake_stats, plant_instances=counts, plant_variant_meshes=len(source_triangles),
                      instanced_mesh_triangles=sum(len(o.data.loop_triangles) for o in source_triangles),
                      triangles_if_realized=instance_triangles, road_points=road_points,
                      foundation_corners=foundation_corners, max_placement_error=max_placement_error,
                      approach_clearance=float(camera.location.z-ground(*camera.location[:2]))),indent=2))
