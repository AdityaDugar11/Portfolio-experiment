import bpy, math, json, os, time
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'));research=os.path.join(root,'research','junagarh');rend=os.path.join(root,'renders','junagarh','exterior-v01');os.makedirs(rend,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name=='Collection':bpy.data.collections.remove(c)
def group(name):
 c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c
G={s:group(s) for s in ['OSM_REFERENCE','REFERENCE_IMAGE','RAMPART','BASTIONS','GATE','DOORS','PALACE','DETAILS','FOREGROUND','LIGHTING','CAMERAS']}
def link(o,g):
 for c in list(o.users_collection):c.objects.unlink(o)
 G[g].objects.link(o);return o
def cube(n,xyz,dim,m,g,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz);o=bpy.context.object;o.name=n;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);link(o,g);o.data.materials.append(m)
 if bevel:mod=o.modifiers.new('Worn edges','BEVEL');mod.width=bevel;mod.segments=2
 return o
def mat(name,color,asset=None,scale=4):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1);N=m.node_tree.nodes;L=m.node_tree.links;b=N.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=.8
 if asset:
  d=os.path.join(research,'materials',asset);coord=N.new('ShaderNodeTexCoord');mapping=N.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(scale,scale,scale);L.new(coord.outputs['Generated'],mapping.inputs['Vector'])
  for channel in ('Diffuse','Rough','nor_gl'):
   path=os.path.join(d,channel+'.jpg')
   if not os.path.exists(path):continue
   t=N.new('ShaderNodeTexImage');t.image=bpy.data.images.load(path,check_existing=True);t.projection='BOX';t.projection_blend=.2;L.new(mapping.outputs['Vector'],t.inputs['Vector'])
   if channel=='Diffuse':L.new(t.outputs['Color'],b.inputs['Base Color'])
   elif channel=='Rough':t.image.colorspace_settings.name='Non-Color';L.new(t.outputs['Color'],b.inputs['Roughness'])
   else:t.image.colorspace_settings.name='Non-Color';normal=N.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.25;L.new(t.outputs['Color'],normal.inputs['Color']);L.new(normal.outputs['Normal'],b.inputs['Normal'])
 return m
red=mat('Red sandstone provisional',(.42,.18,.11),'red_sandstone_wall',8);pale=mat('Pale weathered stone',(.62,.46,.29),'old_sandstone_02',5);wood=mat('Timber',(.17,.08,.04),'fine_grained_wood',2);ground=mat('Dry earth',(.35,.28,.20),'dry_ground_01',12);iron=mat('Iron',(.1,.09,.08));
# OSM boundary is imported as a separate non-rendering, local metric guide. Model alignment remains provisional.
j=json.load(open(os.path.join(research,'geodata','selected-ways.geojson')));f=next(x for x in j['features'] if x['properties']['osm_id']=='126998139');points=f['geometry']['coordinates'][0];lon0=sum(p[0] for p in points)/len(points);lat0=sum(p[1] for p in points)/len(points);mx=111320*math.cos(math.radians(lat0));my=111132
co=[((p[0]-lon0)*mx,(p[1]-lat0)*my,.05) for p in points];mesh=bpy.data.meshes.new('OSM boundary guide');mesh.from_pydata(co,[(i,i+1) for i in range(len(co)-1)],[]);ob=bpy.data.objects.new('OSM_126998139_guide',mesh);G['OSM_REFERENCE'].objects.link(ob);ob.hide_render=True;ob['attribution']='© OpenStreetMap contributors ODbL';
# Local-only reference image; never packed or rendered.
ref=os.path.join(research,'references','primary-exterior','india-cine-hub-exterior.jpg');img=bpy.data.images.load(ref,check_existing=True);refob=bpy.data.objects.new('PRIMARY_REFERENCE_LOCAL_ONLY',None);G['REFERENCE_IMAGE'].objects.link(refob);refob.empty_display_type='IMAGE';refob.data=img;refob.empty_display_size=30;refob.hide_render=True;refob.hide_viewport=True
# Entrance-facing composition: estimated relative proportions, not surveyed; asymmetrical facade.
cube('Rampart long',(-39,0,7),(102,3,14),red,'RAMPART');cube('Rampart right',(84,0,8),(24,3,16),red,'RAMPART');cube('Wall lower plinth',(-38,-1.7,1),(102,.6,2),pale,'RAMPART')
def tower(name,x,y,r,h):
 bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=r,depth=h,location=(x,y,h/2));o=bpy.context.object;o.name=name;link(o,'BASTIONS');o.data.materials.append(red)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Soft edge','BEVEL');mod.width=.16;mod.segments=3
 return o
tower('Right large curved bastion',92,1,14,18);tower('Central curved bastion',2,1,8,15)
cube('Rampart gateway connection',(22,0,7),(24,3,14),red,'RAMPART');cube('Rampart east connection',(64,0,8),(16,3,16),red,'RAMPART')
# Battlement silhouette: rounded merlons, varied by facade span.
for x in range(-86,6,4):
 cube('Rampart merlon',(x,-.1,14.55),(2.5,3,1.1),red,'DETAILS',.12)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(x,-.1,15.1));o=bpy.context.object;o.name='Rounded merlon cap';o.scale=(1.25,1.5,.52);o.data.materials.append(red);link(o,'DETAILS')
# Gateway as pierced elevation: custom masonry above pointed arch, thick lateral piers.
gx=45;spring=7;rise=4;r=5;top=18; cube('Gate left pier',(gx-8,0,top/2),(6,5,top),pale,'GATE');cube('Gate right pier',(gx+8,0,top/2),(6,5,top),pale,'GATE')
def arch(x,r,spring,rise):return spring+rise*(1-(abs(x)/r)**1.25)
def face(name,coords,material,g):
 me=bpy.data.meshes.new(name);me.from_pydata(coords,[],[list(range(len(coords)))]);me.update();o=bpy.data.objects.new(name,me);G[g].objects.link(o);o.data.materials.append(material);return o
for i in range(64):
 x1=-r+2*r*i/64;x2=-r+2*r*(i+1)/64;z1=arch(x1,r,spring,rise);z2=arch(x2,r,spring,rise)
 face('Gateway head wall',[(gx+x1,-2.55,z1),(gx+x2,-2.55,z2),(gx+x2,-2.55,top),(gx+x1,-2.55,top)],pale,'GATE');face('Arch intrados',[(gx+x1,-2.55,z1),(gx+x1,3,z1),(gx+x2,3,z2),(gx+x2,-2.55,z2)],pale,'GATE')
for rr in (5.15,5.85,6.5):
 for i in range(64):
  x1=-rr+2*rr*i/64;x2=-rr+2*rr*(i+1)/64;z1=arch(x1,rr,7,4);z2=arch(x2,rr,7,4)
  face('Layered arch stone',[(gx+x1,-2.63,z1),(gx+x2,-2.63,z2),(gx+x2,-2.63,z2+.18),(gx+x1,-2.63,z1+.18)],pale,'DETAILS')
for z in (2,12.5,16.5,18):cube('Gate stringcourse',(gx,-2.65,z),(21,.28,.22),pale,'DETAILS')
# two independent local hinges and leaves; no collision or historical direction claims.
for side in (-1,1):
 hinge=bpy.data.objects.new(('Left' if side<0 else 'Right')+'_hinge',None);G['DOORS'].objects.link(hinge);hinge.location=(gx+side*4.7,1,0);leaf=cube('Timber leaf',(gx+side*2.35,1,3.4),(4.7,.22,6.8),wood,'DOORS',.03);leaf.parent=hinge;leaf.matrix_parent_inverse=hinge.matrix_world.inverted()
 for frame,angle in [(1,0),(60,side*math.radians(70))]:hinge.rotation_euler.z=angle;hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
cube('Passage paving',(gx,5,-.02),(9,16,.15),pale,'GATE')
# Raised, offset palace planes, balconies and repetitive apertures.
for x,y,width,height in [(-69,26,36,27),(-35,32,36,30),(-3,37,25,25),(48,27,24,27)]:
 cube('Palace mass',(x,y,height/2+2),(width,16,height),red,'PALACE')
 for z in (12,20):
  cube('Palace cornice',(x,y-8.3,z),(width+.6,.8,.6),pale,'DETAILS')
  for k in range(max(1,int(width/5))):
   xx=x-width/2+3+k*5;cube('Recess',(xx,y-8.12,z+2),(1.8,.25,2.7),wood,'DETAILS',.1);cube('Balcony sill',(xx,y-8.7,z+.5),(2.5,1.2,.25),pale,'DETAILS')
 cube('Roof parapet',(x,y,height+2),(width+1,16.5,.7),pale,'DETAILS')
# foreground wall and ground kept separate.
cube('Foreground low wall left',(-46,-20,1.4),(100,1,2.8),red,'FOREGROUND');cube('Foreground low wall right',(84,-20,1.4),(36,1,2.8),red,'FOREGROUND');cube('Ground and road',(0,-40,-.2),(450,260,.3),ground,'FOREGROUND')
world=bpy.data.worlds.new('Daylight');world.use_nodes=True;bpy.context.scene.world=world;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.42,.56,.78,1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.65
ld=bpy.data.lights.new('Daylight sun','SUN');ld.energy=2.2;lo=bpy.data.objects.new('Daylight sun',ld);G['LIGHTING'].objects.link(lo);lo.rotation_euler=(math.radians(26),math.radians(-25),math.radians(-35))
def camera(name,loc,target,lens):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);G['CAMERAS'].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;return o
cams=[('01-reference-matched-exterior',camera('Reference_match_estimate',(10,-185,24),(-5,8,14),42)),('02-three-quarter-exterior',camera('Three_quarter',(-115,-165,35),(0,10,14),40)),('03-human-eye-approach',camera('Approach',(34,-52,1.7),(gx,0,7),35)),('04-gateway-closeup',camera('Gateway',(gx,-58,10),(gx,0,9),45)),('05-architectural-detail',camera('Palace_detail',(-55,-80,20),(-55,24,20),65))]
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.device='CPU';s.render.resolution_x=1600;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.frame_set(1);s.camera=cams[0][1];bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'blender','junagarh-exterior-v01.blend'))
for name,c in cams:
 s.camera=c;s.render.filepath=os.path.join(rend,name+'.png');t=time.time();bpy.ops.render.render(write_still=True);print('RENDER',name,round(time.time()-t,2),flush=True)
print('STAT',len([o for o in bpy.data.objects if o.type=='MESH']),sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'),flush=True)
