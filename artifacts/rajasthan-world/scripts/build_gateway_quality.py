import bpy, math, os, time
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..')); out=os.path.join(root,'renders','junagarh','gateway-study');os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name=='Collection':bpy.data.collections.remove(c)
def coll(n):
 c=bpy.data.collections.new(n);bpy.context.scene.collection.children.link(c);return c
C={n:coll(n) for n in ['REFERENCE_GUIDES','MASONRY','ARCH_PROFILES','DOORS','PASSAGE','DETAILS','ENVIRONMENT','LIGHTS','CAMERAS']}
def move(o,c):
 for k in list(o.users_collection):k.objects.unlink(o)
 C[c].objects.link(o);return o
def mat(n,c1,c2,scale):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c1,1);m.use_nodes=True;N=m.node_tree.nodes;L=m.node_tree.links;bs=N.get('Principled BSDF');bs.inputs['Roughness'].default_value=.86
 tex=N.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=scale;tex.inputs['Detail'].default_value=3;geo=N.new('ShaderNodeTexCoord');L.new(geo.outputs['Object'],tex.inputs['Vector']);r=N.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(*c1,1);r.color_ramp.elements[1].color=(*c2,1);L.new(tex.outputs['Fac'],r.inputs[0]);L.new(r.outputs['Color'],bs.inputs['Base Color']);b=N.new('ShaderNodeBump');b.inputs['Strength'].default_value=.12;b.inputs['Distance'].default_value=.012;L.new(tex.outputs['Fac'],b.inputs['Height']);L.new(b.outputs['Normal'],bs.inputs['Normal']);return m
stone=mat('Sandstone_procedural',(.32,.25,.17),(.63,.52,.38),4);stone2=mat('Recess_sandstone',(.25,.19,.13),(.47,.37,.26),5);wood=mat('Weathered_timber',(.065,.025,.012),(.16,.075,.03),18);iron=mat('Dark_metal',(.04,.038,.035),(.12,.11,.09),14)
def cube(n,loc,dim,ma,c):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=n;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma);return move(o,c)
def arch(x,r,spring,rise):return spring+rise*(1-(abs(x)/r)**1.3)
def surface(n,coords,ma,c):
 me=bpy.data.meshes.new(n);me.from_pydata(coords,[],[tuple(range(len(coords)))]);me.update();o=bpy.data.objects.new(n,me);C[c].objects.link(o);o.data.materials.append(ma);return o
# approximate meters; front toward -Y. Pier, head wall and layered arched reveals.
cube('Left facade',(-4.4,0,5.5),(3.2,1.4,11),stone,'MASONRY');cube('Right facade',(4.4,0,5.5),(3.2,1.4,11),stone,'MASONRY')
r=2.8;spring=4.5;rise=2.3
for i in range(40):
 x1=-r+2*r*i/40;x2=-r+2*r*(i+1)/40;z1=arch(x1,r,spring,rise);z2=arch(x2,r,spring,rise)
 surface('Spandrel',[(x1,-.71,z1),(x2,-.71,z2),(x2,-.71,11),(x1,-.71,11)],stone,'MASONRY')
 # intrados forms the depth of an actual entrance opening
 surface('Recess intrados',[(x1,-.71,z1),(x1,1.4,z1),(x2,1.4,z2),(x2,-.71,z2)],stone2,'PASSAGE')
for x in (-2.8,2.8):cube('Opening reveal',(x,0.34,2.25),(.15,2.1,4.5),stone2,'PASSAGE')
def band(r,spring,rise,width,depth):
 for side in (-1,1):cube('Arch jamb',(side*r,-depth,2.25),(width,.16,4.5),stone,'ARCH_PROFILES')
 for i in range(64):
  x1=-r+2*r*i/64;x2=-r+2*r*(i+1)/64;z1=arch(x1,r,spring,rise);z2=arch(x2,r,spring,rise)
  surface('Stone arch voussoir',[(x1,-depth,z1),(x2,-depth,z2),(x2,-depth,z2+width),(x1,-depth,z1+width)],stone,'ARCH_PROFILES')
band(2.8,4.5,2.3,.18,.85);band(4.0,5.3,2.4,.24,.77)
for z in (1.15,8.25,9.8,10.8):cube('Continuous stone molding',(0,-.81,z),(12.2,.25,.14),stone,'DETAILS')
# restrained horizontal joints
for z in [1.6+i*.55 for i in range(14)]:
 for side in (-1,1):cube('Masonry course',(side*4.4,-.715,z),(3.2,.025,.018),stone2,'DETAILS')
# hinged doors, local pivots with conservative geometry clearance
for side in (-1,1):
 hinge=bpy.data.objects.new(('Left' if side<0 else 'Right')+'_hinge',None);C['DOORS'].objects.link(hinge);hinge.location=(side*2.55,.4,0)
 door=cube('Door leaf', (side*1.275,.4,2.15),(2.5,.16,4.3),wood,'DOORS');door.parent=hinge;door.matrix_parent_inverse=hinge.matrix_world.inverted()
 for z in (1.0,2.2,3.5):
  rail=cube('Iron strap',(side*1.275,.28,z),(2.3,.06,.12),iron,'DOORS');rail.parent=hinge;rail.matrix_parent_inverse=hinge.matrix_world.inverted()
 for f,angle in [(1,0),(60,side*math.radians(70)),(120,0)]:hinge.rotation_euler.z=angle;hinge.keyframe_insert(data_path='rotation_euler',frame=f)
cube('Passage floor',(0,4,-.08),(5.6,12,.16),stone2,'PASSAGE');cube('Ground',(0,-12,-.15),(60,70,.2),stone2,'ENVIRONMENT')
# A scale mannequin is hidden from all beauty renders.
bpy.ops.mesh.primitive_cube_add(size=1,location=(8,0,.85));human=bpy.context.object;human.name='Scale_reference_1.7m';human.dimensions=(.4,.3,1.7);human.hide_render=True;move(human,'REFERENCE_GUIDES')
world=bpy.data.worlds.new('Sky');world.use_nodes=True;bpy.context.scene.world=world;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.42,.48,.57,1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.7
ld=bpy.data.lights.new('Afternoon','SUN');ld.energy=2.2;ld.color=(1,.82,.66);lo=bpy.data.objects.new('Afternoon',ld);C['LIGHTS'].objects.link(lo);lo.rotation_euler=(math.radians(25),math.radians(-25),math.radians(-28))
def cam(name,loc,target,lens):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);C['CAMERAS'].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;return o
front=cam('Front',(0,-22,5.8),(0,0,5.6),45);angled=cam('Three_quarter',(12,-20,6),(0,0,5),45);close=cam('Detail',(1,-12,7),(0,0,6),55)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.device='CPU';s.render.resolution_x=960;s.render.resolution_y=720;s.render.resolution_percentage=100;s.camera=front;s.frame_set(1);s.render.filepath=os.path.join(out,'01-front.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'blender','junagarh-gateway-quality-study.blend'))
for name,c,f in [('01-front',front,1),('02-three-quarter',angled,1),('03-arch-detail',close,1),('04-open-doors',front,60)]:
 s.camera=c;s.frame_set(f);s.render.filepath=os.path.join(out,name+'.png');t=time.time();bpy.ops.render.render(write_still=True);print('RENDER',name,round(time.time()-t,2),flush=True)
