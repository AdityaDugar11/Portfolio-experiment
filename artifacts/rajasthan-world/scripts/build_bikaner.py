import bpy, csv, math, os
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
with open(os.path.join(root,'data','bikaner-grid.csv')) as f: grid=[[float(v) for v in row] for row in csv.reader(f)]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
N=len(grid); W=98.0; H=111.0
verts=[((j/(N-1)-.5)*W,(.5-i/(N-1))*H,(v-136.65)*.01) for i,row in enumerate(grid) for j,v in enumerate(row)]
faces=[(i*N+j,i*N+j+1,(i+1)*N+j+1,(i+1)*N+j) for i in range(N-1) for j in range(N-1)]
mesh=bpy.data.meshes.new('Copernicus_terrain');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('Bikaner_GLO90_10x_vertical',mesh);bpy.context.collection.objects.link(obj)
for p in mesh.polygons:p.use_smooth=True
mat=bpy.data.materials.new('Draft_sandstone_terrain');mat.diffuse_color=(.46,.27,.16,1);obj.data.materials.append(mat)
# Geo location: longitude 73.318, latitude 28.022. This is an organizational empty only.
empty=bpy.data.objects.new('Junagarh_approx_location_unverified_geometry',None);bpy.context.collection.objects.link(empty);empty.location=((73.318-73-.5)*W,(28.022-28-.5)*H,1);empty.empty_display_size=.8
world=bpy.context.scene.world;world.color=(.18,.21,.28)
bpy.ops.object.light_add(type='SUN',location=(0,0,30));sun=bpy.context.object;sun.data.energy=2;sun.rotation_euler=(math.radians(28),math.radians(-35),math.radians(-25));sun.data.color=(1,.72,.5)
def camera(name,loc,target,lens):
 bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.name=name;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.lens=lens;return c
cam=camera('Draft_oblique_terrain',(-43,-79,30),(0,-12,1),35)
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.device='CPU';scene.render.resolution_x=960;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(root,'renders','bikaner-terrain-draft.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'blender','bikaner-terrain-draft.blend'));bpy.ops.render.render(write_still=True)
