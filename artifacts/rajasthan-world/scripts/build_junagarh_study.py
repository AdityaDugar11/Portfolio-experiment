import bpy, math, os, time
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..')); bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name=='Collection':bpy.data.collections.remove(c)
def col(n):
 c=bpy.data.collections.new(n);bpy.context.scene.collection.children.link(c);return c
C={n:col(n) for n in ['FORT_FOUNDATIONS','EXTERIOR_WALLS','BASTIONS','ENTRANCE_GATEWAY','ENTRANCE_DOORS','PALACE_STRUCTURES','WINDOWS_JHAROKHAS','CHHATRIS','COURTYARD','ORNAMENTS','ENVIRONMENT','LIGHTING','CAMERAS']}
def relink(o,c):
 for cc in list(o.users_collection):cc.objects.unlink(o)
 C[c].objects.link(o);return o
def material(n,color,rough=0.85):
 m=bpy.data.materials.new(n);m.diffuse_color=(*color,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;return m
red=material('Red sandstone',(.38,.16,.10));gold=material('Golden gateway stone',(.65,.49,.32));shadow=material('Recess shadow',(.07,.035,.022));wood=material('Timber',(.12,.055,.028));ground=material('Dry earth',(.39,.29,.20));metal=material('Iron',(.12,.10,.08),.55)
def cube(n,loc,scale,ma,collection):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma);return relink(o,collection)
def cylinder(n,loc,r,depth,ma,collection,verts=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=n;o.data.materials.append(ma);return relink(o,collection)
# Estimated layout, all distances illustrative meters, not measured plans.
cube('Desert_ground',(0,0,-.5),(330,300,1),ground,'ENVIRONMENT');cube('Foundation',(0,0,0),(126,96,2),red,'FORT_FOUNDATIONS');cube('Courtyard',(0,0,1),(112,82,.2),gold,'COURTYARD')
for x in (-61,61):cube('Side_wall',(x,0,8),(3,94,16),red,'EXTERIOR_WALLS')
for y in (-46,46):
 if y==-46:
  for x in (-37,37):cube('Front_wall',(x,y,8),(48,3,16),red,'EXTERIOR_WALLS')
 else:cube('Rear_wall',(0,y,8),(125,3,16),red,'EXTERIOR_WALLS')
for x in (-60,-30,0,30,60):
 for y in (-46,46):
  if x == 0 and y == -46: continue
  cylinder('Round_bastion',(x,y,8.5),5,17,red,'BASTIONS');cylinder('Bastion_coping',(x,y,17.2),5.35,.6,gold,'BASTIONS')
for x in (-61,61):
 for y in (-23,0,23):cylinder('Side_bastion',(x,y,8.5),5,17,red,'BASTIONS')
# Gate elevation: broad recessed pointed arch over a narrower opening.
for x in (-10,10):cube('Gateway_pier',(x,-47,10),(7,5,20),gold,'ENTRANCE_GATEWAY')
cube('Gateway_crown',(0,-47,17),(16,5,6),gold,'ENTRANCE_GATEWAY')
cube('Gateway_cap',(0,-47,20.2),(29,5.7,.8),gold,'ENTRANCE_GATEWAY')
def arch_band(name,width,height,base,depth,y,ma):
 # two straight legs and nested pointed arch using swept stone segments
 r=width/2; spring=base+height*.58
 for side in (-1,1):cube(name+'_jamb',(side*r,y,(base+spring)/2),(.65,depth,spring-base),ma,'ENTRANCE_GATEWAY')
 pts=[]
 for k in range(33):
  x=-r+2*r*k/32;z=spring+(height-(spring-base))*(1-(abs(x)/r)**1.4);pts.append((x,z))
 for (x1,z1),(x2,z2) in zip(pts,pts[1:]):
  mid=((x1+x2)/2,y,(z1+z2)/2);o=cube(name+'_arch',mid,(math.hypot(x2-x1,z2-z1)+.05,depth,.55),ma,'ENTRANCE_GATEWAY');o.rotation_euler[1]=-math.atan2(z2-z1,x2-x1)
arch_band('Outer_frame',19,15,2,.6,-49.8,red);arch_band('Inner_frame',12,12,2,.7,-50.2,gold)
# Separate door leaves, local hinge origins, interpretive mechanism.
for side in (-1,1):
 hinge=bpy.data.objects.new(('Left' if side<0 else 'Right')+'_door_hinge',None);C['ENTRANCE_DOORS'].objects.link(hinge);hinge.location=(side*5.7,-45.4,2)
 door=cube(('Left' if side<0 else 'Right')+'_wood_leaf',(side*2.85,-45.4,6.3),(5.7,.5,8.6),wood,'ENTRANCE_DOORS');door.parent=hinge;door.matrix_parent_inverse=hinge.matrix_world.inverted()
 for frame,angle in [(1,0),(60,side*math.radians(80)),(120,0)]:hinge.rotation_euler.z=angle;hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
for x in (-18,18):
 for z in (3,6,9,12):cube('Gate_panel',(x,-48.7,z),(2,.35,1.8),shadow,'ORNAMENTS')
# Palace massing and tiered, recessed arched window rhythms.
for x,y,w,h in [(-32,20,45,27),(12,26,38,31),(39,18,23,24)]:
 cube('Palace_wing',(x,y,h/2+1),(w,18,h),red,'PALACE_STRUCTURES')
 for level in range(2,int(h//6)):
  for j in range(int(w//5)):
   wx=x-w/2+3+j*5;wz=level*5+1;cube('Window_recess',(wx,y-9.08,wz),(2,.25,3),shadow,'WINDOWS_JHAROKHAS');cube('Window_lintel',(wx,y-9.25,wz+1.65),(2.4,.45,.3),gold,'WINDOWS_JHAROKHAS')
 cube('Palace_eave',(x,y,h+1),(w+2,19,.7),gold,'ORNAMENTS')
for x in (-48,-17,14,43):
 y=27;z=32
 for dx in (-2,2):
  for dy in (-2,2):cylinder('Chhatri_column',(x+dx,y+dy,z),.22,5,gold,'CHHATRIS',12)
 cylinder('Chhatri_roof',(x,y,z+2.8),3.4,.55,gold,'CHHATRIS');bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=(x,y,z+3.2));o=bpy.context.object;o.name='Chhatri_dome';o.scale=(2.8,2.8,1.2);o.data.materials.append(gold);relink(o,'CHHATRIS')
world=bpy.data.worlds.new('Warm_sky');world.use_nodes=True;bpy.context.scene.world=world;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.34,.42,.56,1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.7
ld=bpy.data.lights.new('Late_sun','SUN');ld.energy=2.5;ld.color=(1,.80,.65);lo=bpy.data.objects.new('Late_sun',ld);C['LIGHTING'].objects.link(lo);lo.rotation_euler=(math.radians(25),math.radians(-35),math.radians(-35))
def camera(name,pos,target,lens):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);C['CAMERAS'].objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;return o
cams=[('01-elevated',camera('Elevated',(145,-185,135),(0,0,10),38)),('02-exterior',camera('Exterior',(-90,-155,55),(0,-8,12),40)),('03-gateway',camera('Gateway',(0,-95,11),(0,-46,11),42))]
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.device='CPU';scene.render.resolution_x=960;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.frame_set(1);scene.camera=cams[0][1];bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'blender','junagarh-fort-study.blend'))
for name,cam in cams:
 scene.camera=cam;scene.render.filepath=os.path.join(root,'renders','junagarh',name+'.png');start=time.time();bpy.ops.render.render(write_still=True);print('RENDER',name,round(time.time()-start,2),flush=True)
print('MESH_COUNTS',sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'))
