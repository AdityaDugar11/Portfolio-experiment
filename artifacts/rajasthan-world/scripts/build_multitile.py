import bpy, math, os, json, time, sys
import numpy as np
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [];inputfile=args[0] if args else os.path.join(root,'data','proof-mosaic.npz'); name=args[1] if len(args)>1 else 'rajasthan-multitile-proof'
data=np.load(inputfile);z=data['elevation'];meta=json.loads(str(data['metadata']));w,s,e,n=meta['bbox'];ny,nx=z.shape;transform=meta['grid_transform'];R=6371000.;midlat=(s+n)/2;midlon=(w+e)/2
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for col in list(bpy.data.collections):
 if col.name=='Collection':bpy.data.collections.remove(col)
def collection(name):
 c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
terrain=collection('WORLD_TERRAIN');cams=collection('CAMERAS');lights=collection('LIGHTING');collection('TERRAIN_DETAIL_ZONES');collection('FORT_LOCATIONS')
xs=transform['origin_center_lon']+np.arange(nx)*transform['step_lon'];ys=transform['origin_center_lat']+np.arange(ny)*transform['step_lat'];mx=R*math.cos(math.radians(midlat))*math.pi/180;my=R*math.pi/180
verts=[((lon-midlon)*mx,(lat-midlat)*my,float(z[i,j])) for i,lat in enumerate(ys) for j,lon in enumerate(xs)];faces=[(i*nx+j,(i+1)*nx+j,(i+1)*nx+j+1,i*nx+j+1) for i in range(ny-1) for j in range(nx-1)]
mesh=bpy.data.meshes.new('Georeferenced_elevation');mesh.from_pydata(verts,[],faces);mesh.update();ob=bpy.data.objects.new('Terrain_true_scale',mesh);terrain.objects.link(ob)
for poly in mesh.polygons:poly.use_smooth=True
mat=bpy.data.materials.new('Preview_desert_ground');mat.diffuse_color=(.43,.29,.19,1);ob.data.materials.append(mat)
camdata=bpy.data.cameras.new('Oblique');cam=bpy.data.objects.new('Oblique',camdata);cams.objects.link(cam);extent_x=(xs[-1]-xs[0])*mx;extent_y=(ys[0]-ys[-1])*my;cam.location=(-extent_x*.30,-extent_y*.35,max(extent_y*.17,5000));target=Vector((0,0,float(np.mean(z))));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.lens=45;camdata.clip_end=1000000
sun_data=bpy.data.lights.new('Warm_sun','SUN');sun_data.energy=2;sun_data.color=(1,.78,.60);sun=bpy.data.objects.new('Warm_sun',sun_data);lights.objects.link(sun);sun.rotation_euler=(math.radians(25),math.radians(-35),math.radians(-30))
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.device='CPU';scene.render.resolution_x=960;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.world.color=(.23,.25,.3);scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(root,'renders',name+'.png');scene['terrain_metadata']=json.dumps(meta)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'blender',name+'.blend'));start=time.time();bpy.ops.render.render(write_still=True);print('RESULT',json.dumps({'vertices':len(verts),'faces':len(faces),'render_seconds':round(time.time()-start,2),'bbox':meta['bbox']}))
