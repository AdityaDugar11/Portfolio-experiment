"""Build the editable Phase 03.1 Blender scene from sculpt.py's local cache."""
import json
import math
import random
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
a = np.load(ROOT / "work/sculpt.npz")
placement = json.loads((ROOT / "work/placement.json").read_text())
rng = random.Random(301)
TAU = math.tau
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

land = collection("01 · Sculpted terrain")
waterways = collection("02 · Lakes and connecting tracks")
plants = collection("03 · Vegetation and stone instances")
villages = collection("04 · Settlements and Junagarh scale study")
sites = collection("05 · Ten geographic anchors")
studio = collection("06 · Studio and review cameras")

def material(name, rgb, roughness=.83):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb,1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*rgb,1)
    bs.inputs["Roughness"].default_value = roughness
    return m

def textured(m, scale, bump_distance, dark, light, attr=None, stretch=None):
    nt = m.node_tree
    def node(kind):
        return nt.nodes.new(kind)
    def link(out, inp):
        nt.links.new(out, inp)
    position = node("ShaderNodeNewGeometry").outputs["Position"]
    if stretch:
        scale_node = node("ShaderNodeVectorMath")
        scale_node.operation = "MULTIPLY"
        scale_node.inputs[1].default_value = stretch
        link(position,scale_node.inputs[0])
        position = scale_node.outputs[0]
    noise = node("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 4.5
    noise.inputs["Roughness"].default_value = .72
    link(position,noise.inputs[0])
    ramp = node("ShaderNodeValToRGB")
    for e,t,c in zip(ramp.color_ramp.elements,(.25,.77),(dark,light)):
        e.position=t
        e.color=(*c,1)
    link(noise.outputs["Fac"],ramp.inputs[0])
    col = ramp.outputs[0]
    if attr:
        paint = node("ShaderNodeVertexColor")
        paint.layer_name=attr
        mix=node("ShaderNodeMixRGB")
        mix.blend_type="MULTIPLY"
        mix.inputs[0].default_value=1
        link(paint.outputs[0],mix.inputs[1])
        link(col,mix.inputs[2])
        col=mix.outputs[0]
    bs=nt.nodes.get("Principled BSDF")
    link(col,bs.inputs["Base Color"])
    bump=node("ShaderNodeBump")
    bump.inputs["Strength"].default_value=.32
    bump.inputs["Distance"].default_value=bump_distance
    link(noise.outputs["Fac"],bump.inputs["Height"])
    link(bump.outputs["Normal"],bs.inputs["Normal"])

def mesh(name, verts, faces, target, mats=(), indices=(), smooth=False):
    geo=bpy.data.meshes.new(name)
    geo.from_pydata(verts,[],faces)
    geo.update()
    for m in mats:
        geo.materials.append(m)
    if len(indices):
        geo.polygons.foreach_set("material_index",np.asarray(indices,dtype='i4'))
    if smooth:
        geo.polygons.foreach_set("use_smooth",np.ones(len(geo.polygons),dtype=bool))
    obj=bpy.data.objects.new(name,geo)
    if target:
        target.objects.link(obj)
    return obj

grid=a["z"]
x0,y0=a["x"][0],a["y"][0]
def height(x,y):
    u,v=np.asarray(x)-x0,np.asarray(y)-y0
    i=np.clip(np.floor(u).astype(int),0,grid.shape[1]-2)
    j=np.clip(np.floor(v).astype(int),0,grid.shape[0]-2)
    fx,fy=u-i,v-j
    return (grid[j,i]*(1-fx)+grid[j,i+1]*fx)*(1-fy)+(grid[j+1,i]*(1-fx)+grid[j+1,i+1]*fx)*fy

soil=material("Ground · sand, dry soil, forest litter and exposed ribs",(.34,.22,.1))
textured(soil,1.08,.24,(.55,.56,.48),(1,.99,.89),"Biome pigments",(1.25,.73,1.25))
rock=material("Escarpment · bedded ferruginous sandstone",(.38,.23,.12))
textured(rock,.38,.55,(.155,.087,.045),(.54,.345,.170),stretch=(.55,.68,2.4))
base=material("Underside · raw stone",(.185,.099,.045))

top=a["top"]; tri=a["tris"]; ring=a["ring"]; edge=top[ring]; count=len(ring)
normal=np.roll(edge[:,:2],-1,axis=0)-np.roll(edge[:,:2],1,axis=0)
normal=normal[:,[1,0]]*np.array([1,-1])
normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),.001)
wall_faces=[]
strata=[]
last=ring
station=np.r_[0,np.cumsum(np.linalg.norm(np.diff(edge[:,:2],axis=0),axis=1))]
for i,(depth,offset) in enumerate([(.06,.17),(.15,-.11),(.23,.32),(.38,-.22),(.48,.36),
                                   (.63,.08),(.72,-.45),(.83,-.12),(.94,-.60),(1,-.9)]):
    joint=(.38*np.sin(station*1.42)+.61*np.sin(station*.43+depth)+.75*np.sin(station*.11))
    coords=edge[:,:2]+normal*(offset+.36*joint)[:,None]
    bottom=-14.8 + .32*np.sin(station*.12)
    zz=edge[:,2]*(1-depth)+bottom*depth+np.sin(depth*np.pi)*(.7*np.sin(station*.095+depth))
    indices=np.arange(count)+len(top)+i*count
    wall_faces.extend(zip(np.roll(last,-1),last,indices,np.roll(indices,-1)))
    strata.append(np.column_stack((coords,zz)))
    last=indices
verts=np.vstack((top,*strata))
# Build the dense triangle surface without allocating millions of Python tuples.
terrain=bpy.data.meshes.new("Closed state mesh")
terrain.vertices.add(len(verts))
terrain.vertices.foreach_set("co",np.ascontiguousarray(verts,dtype='f4').ravel())
corner=np.concatenate((tri.ravel(),np.array(wall_faces).ravel(),last[::-1])).astype('i4')
sizes=np.r_[np.full(len(tri),3),np.full(len(wall_faces),4),len(last)]
terrain.loops.add(len(corner))
terrain.loops.foreach_set("vertex_index",corner)
terrain.polygons.add(len(sizes))
terrain.polygons.foreach_set("loop_start",(np.cumsum(sizes)-sizes).astype('i4'))
terrain.update(calc_edges=True)
assert not terrain.validate(verbose=True), "Invalid terrain topology"
assert len(terrain.vertices)-len(terrain.edges)+len(terrain.polygons)==2
for mat in (soil,rock,base):
    terrain.materials.append(mat)
terrain.polygons.foreach_set("material_index",np.r_[np.zeros(len(tri)),np.ones(len(wall_faces)),2].astype('i4'))
terrain.polygons.foreach_set("use_smooth",np.arange(len(sizes))<len(tri))
pigment=terrain.color_attributes.new(name="Biome pigments",type="FLOAT_COLOR",domain="POINT")
rgba=np.ones((len(verts),4),dtype='f4')
rgba[:len(top),:3]=a["color"]
pigment.data.foreach_set("color",rgba.ravel())
obj=bpy.data.objects.new("Rajasthan · dunes, folded ranges and cut stone",terrain)
land.objects.link(obj)

lake_mat=material("Water · blue-green mineral shallows",(.022,.171,.148),.24)
lake_bs=lake_mat.node_tree.nodes.get("Principled BSDF")
lake_bs.inputs["IOR"].default_value=1.333
lake_bs.inputs["Coat Weight"].default_value=.30
textured(lake_mat,.58,.09,(.016,.100,.113),(.044,.213,.185),stretch=(.58,2.8,1))
for name,cx,cy,rx,ry,angle,level in placement["lakes"]:
    theta=np.linspace(0,TAU,240,endpoint=False)
    r=1.24*(1+.16*np.sin(3*theta+.7)+.10*np.sin(5*theta-1)+.06*np.cos(8*theta))
    u,v=rx*r*np.cos(theta),ry*r*np.sin(theta)
    pts=np.array([cx+math.cos(angle)*u-math.sin(angle)*v,cy+math.sin(angle)*u+math.cos(angle)*v,
                  np.full(len(r),level)]).T
    mesh(name+" · inlet",pts,[tuple(range(len(pts)))],waterways,[lake_mat])

trail=material("Unpaved tracks · crushed warm limestone",(.55,.40,.23))
textured(trail,1.6,.09,(.38,.27,.15),(.69,.53,.33))
for name in (k for k in a.files if k.startswith("road_")):
    points=a[name]
    tangents=np.gradient(points,axis=0)
    normals=tangents[:,[1,0]]*np.array([1,-1])
    normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),.001)
    verts=[]
    for j in range(len(points)):
        width=.47+.08*math.sin(j*.022)
        for lateral in (-1,0,1):
            xx,yy=points[j]+normals[j]*lateral*width
            verts.append((xx,yy,height(xx,yy)+.13+.035*(1-abs(lateral))))
    faces=[(i,i+3,i+4,i+1) for i in range(3*(len(points)-1)) if i%3!=2]
    mesh(name.replace("road_","Cart track "),verts,faces,waterways,[trail],smooth=True)

class Parts:
    """Accumulate small disjoint solids into a single reusable species or building."""
    def __init__(self):
        self.verts=[]; self.faces=[]; self.slots=[]
    def face(self,indices,slot):
        self.faces.append(indices); self.slots.append(slot)
    def rings(self, rings, slot, caps=True, varied=False):
        start=len(self.verts); n=len(rings[0])
        for ring_coords in rings:
            self.verts.extend(ring_coords)
        for k in range(len(rings)-1):
            for j in range(n):
                i=start+k*n+j; next_i=start+k*n+(j+1)%n
                self.face((i,next_i,next_i+n,i+n),slot+(rng.randrange(3) if varied else 0))
        if caps:
            self.face(tuple(range(start+n-1,start-1,-1)),slot)
            end=start+(len(rings)-1)*n
            self.face(tuple(range(end,end+n)),slot)
    def limb(self,p,q,r1,r2,slot,n=6):
        p,q=Vector(p),Vector(q)
        axis=(q-p).normalized(); u=axis.orthogonal().normalized(); v=axis.cross(u)
        circle=[u*math.cos(t*TAU/n)+v*math.sin(t*TAU/n) for t in range(n)]
        self.rings([[pos+radius*d for d in circle] for pos,radius in ((p,r1),(q,r2))],slot)
    def box(self,x,y,z,w,d,h,slot):
        contour=[(x-w/2,y-d/2),(x+w/2,y-d/2),(x+w/2,y+d/2),(x-w/2,y+d/2)]
        self.rings([[(xx,yy,zz) for xx,yy in contour] for zz in (z,z+h)],slot)
    def object(self,name,target,mats,smooth=False):
        return mesh(name,self.verts,self.faces,target,mats,self.slots,smooth)

bark=material("Acacia bark · dusty fissures",(.135,.076,.034))
leaf_palettes=[[(.069,.105,.023),(.137,.176,.032),(.187,.206,.046)],
               [(.10,.134,.037),(.17,.195,.047),(.237,.242,.066)],
               [(.071,.125,.035),(.106,.163,.040),(.162,.203,.048)],
               [(.163,.158,.042),(.22,.209,.065),(.28,.244,.081)]]
def foliage(name, variant):
    matlist=[bark]+[material(name+" leaf "+str(i),color,.88)
                    for i,color in enumerate(leaf_palettes[variant%4])]
    parts=Parts()
    wide=name=="khejri"; shrub=name=="scrub"
    size=.52 if shrub else 1
    h=(2.85 if wide else 3.8)*size
    # Each crown resolves into separate sprays of irregular, folded leaflets.
    # At overview distance these merge into mottled foliage with porous edges.
    def crown(center,r):
        for _ in range(110 if not shrub else 70):
            theta=rng.uniform(0,TAU); radial=r*math.sqrt(rng.random())
            pos=Vector((radial*math.cos(theta),radial*math.sin(theta),
                        r*(.36*(1-(radial/r)**2)+rng.uniform(-.22,.33))))+center
            l=r*rng.uniform(.12,.26); az=rng.uniform(0,TAU)
            u=Vector((math.cos(az)*l, math.sin(az)*l, rng.uniform(-.12,.05)*r))
            v=Vector((-u.y*.57,u.x*.57,rng.uniform(-.03,.10)*r))
            idx=len(parts.verts)
            parts.verts.extend((pos-u,pos+v,pos+u,pos-v,pos+Vector((0,0,.08*r))))
            tone=rng.choices((1,2,3),weights=(3,5,2))[0]
            for j in range(4): parts.face((idx+j,idx+(j+1)%4,idx+4),tone)
    foot=Vector((0,0,-.25)); fork=Vector((.12,-.06,h*.40))
    parts.limb(foot,fork,.20*size,.13*size,0,8)
    for j in range(7 if wide else 6):
        az=TAU*(j+rng.uniform(-.26,.26))/6
        extent=rng.uniform(.28,.48)*h*(1.55 if wide else 1)
        mid=fork+Vector((math.cos(az)*extent*.54,math.sin(az)*extent*.54,h*rng.uniform(.17,.34)))
        parts.limb(fork,mid,.13*size,.070*size,0)
        for _ in range(3):
            phi=az+rng.uniform(-1.05,1.05)
            tip=mid+Vector((math.cos(phi)*extent*.64,math.sin(phi)*extent*.64,h*rng.uniform(.09,.24)))
            parts.limb(mid,tip,.075*size,.026*size,0)
            crown(tip,rng.uniform(.58,.94)*size*(1.26 if wide else 1))
    return parts.object(name+" · crown "+str(variant+1),None,matlist)

def outcrop(variant):
    parts=Parts()
    mats=[material("Quartzite "+str(i),c) for i,c in enumerate(
        [(.272,.188,.123),(.321,.239,.159),(.37,.277,.181)])]
    for k in range(4+variant%3):
        xx,yy=rng.uniform(-1.6,1.6),rng.uniform(-.8,.8)
        rx,ry=rng.uniform(.67,2.05),rng.uniform(.39,1.05)
        h=rng.uniform(.57,1.65)
        azimuth=[TAU*(i+rng.uniform(-.23,.23))/9 for i in range(9)]
        contour=[(math.cos(t)*rx*rng.uniform(.85,1.12),math.sin(t)*ry*rng.uniform(.85,1.12)) for t in azimuth]
        rings=[]
        for fraction,scale in [(-.6,.69),(.13,1),(.64,.86),(1,.59)]:
            rings.append([(xx+dx*scale+fraction*.38,yy+dy*scale,
                           h*fraction+dx*.32+rng.uniform(-.06,.06)) for dx,dy in contour])
        parts.rings(rings,0,varied=True)
    return parts.object("Weathered inclined slabs "+str(variant),None,mats)

def grass(variant):
    parts=Parts()
    mats=[material("Seed heads "+str(i),c) for i,c in enumerate(
        [(.33,.235,.086),(.405,.334,.147),(.24,.248,.078)])]
    for _ in range(32):
        phi=rng.uniform(0,TAU); r=rng.uniform(0,.30)
        x,y=math.cos(phi)*r,math.sin(phi)*r; w=rng.uniform(.018,.058)
        reach=rng.uniform(.2,.61);h=rng.uniform(.32,.82)
        i=len(parts.verts)
        parts.verts.extend([(x-w,y,-.07),(x+w,y,-.07),(x+reach*.43+w,y+reach*.3,h*.74),
                            (x+reach*math.cos(phi),y+reach*math.sin(phi),h),
                            (x+reach*.43-w,y+reach*.3,h*.74)])
        parts.face((i,i+1,i+2,i+3,i+4),rng.randrange(3))
    return parts.object("Dry tussock "+str(variant),None,mats)

def instance_cloud(label,points,source):
    points_mesh=mesh(label,points[:,:3],[],plants)
    geo=points_mesh.data
    for name,col in (("Size",3),("Bearing",4)):
        field=geo.attributes.new(name,"FLOAT","POINT")
        field.data.foreach_set("value",np.ascontiguousarray(points[:,col],dtype='f4'))
    group=bpy.data.node_groups.new(label,"GeometryNodeTree")
    for direction in ("INPUT","OUTPUT"):
        group.interface.new_socket(name="Geometry",in_out=direction,socket_type="NodeSocketGeometry")
    def node(t):return group.nodes.new(t)
    link=group.links.new
    inp=node("NodeGroupInput"); out=node("NodeGroupOutput")
    inst=node("GeometryNodeInstanceOnPoints")
    info=node("GeometryNodeObjectInfo"); info.inputs["Object"].default_value=source
    link(inp.outputs[0],inst.inputs["Points"]); link(info.outputs["Geometry"],inst.inputs["Instance"])
    for name,socket in (("Size","Scale"),("Bearing","Rotation")):
        attr=node("GeometryNodeInputNamedAttribute"); attr.data_type="FLOAT"
        attr.inputs["Name"].default_value=name
        output=attr.outputs["Attribute"]
        if name=="Bearing":
            rot=node("ShaderNodeCombineXYZ");link(output,rot.inputs["Z"]);output=rot.outputs[0]
        link(output,inst.inputs[socket])
    link(inst.outputs["Instances"],out.inputs[0])
    mod=points_mesh.modifiers.new(label,"NODES");mod.node_group=group

for species in ("woodland","khejri","scrub","outcrop","grass"):
    points=a[species]
    for i in range(4):
        source=outcrop(i) if species=="outcrop" else grass(i) if species=="grass" else foliage(species,i)
        instance_cloud(species+" · "+str(i+1),points[i::4],source)

wall_tones=[(.55,.36,.19),(.56,.425,.265),(.455,.26,.135),(.64,.515,.351),
            (.136,.273,.338),(.26,.363,.405),(.62,.383,.224)]
masonry=[material("Village limewash "+str(i+1),c) for i,c in enumerate(wall_tones)]
trim=len(masonry); masonry.append(material("Lime cornice and parapet",(.68,.53,.347)))
opening=len(masonry); masonry.append(material("Shadowed timber and niches",(.074,.050,.031)))
roof=len(masonry); masonry.append(material("Sandstone terrace",(.465,.315,.172)))

def house(p,x,y,z,w,d,h,slot,pavilion):
    p.box(x,y,z-.65,w,d,h+.65,slot)
    p.box(x,y,z+h-.14,w+.14,d+.15,.15,trim)
    p.box(x,y,z+h,w,d,.07,roof)
    for side in (-1,1):
        p.box(x+side*(w/2-.045),y,z+h+.055,.09,d,.20,slot)
        p.box(x,y+side*(d/2-.045),z+h+.055,w-.16,.09,.20,slot)
    facade=y-d/2-.016
    for dx in (-w*.30,0,w*.30):
        p.box(x+dx,facade,z+h*.34,.19,.04,h*.24,opening)
        p.box(x+dx,facade-.045,z+h*.62,.29,.17,.07,trim)
    if pavilion:
        r=w*.23
        for dx in (-r*.64,r*.64):
            for dy in (-r*.64,r*.64):
                p.box(x+dx,y+dy,z+h,.10,.10,.65,slot)
        p.box(x,y,z+h+.63,r*2.4,r*2.4,.16,trim)
        rings=[]
        for fraction,radius in [(0,1),(.31,.92),(.70,.63),(.94,.25),(1.18,.073)]:
            rings.append([(x+math.cos(j*TAU/12)*r*radius,y+math.sin(j*TAU/12)*r*radius,
                           z+h+.79+r*fraction) for j in range(12)])
        p.rings(rings,trim)

towns=a["towns"]
for t,(cx,cy) in enumerate(towns):
    p=Parts()
    big=t in (0,1,2,4)
    angle=rng.uniform(-.5,.5)
    for iy in range(-4 if big else -2,5 if big else 3):
        for ix in range(-6 if big else -3,7 if big else 4):
            if (ix/(6.7 if big else 4))**2+(iy/(4.6 if big else 3))**2>rng.uniform(.68,1.25):continue
            if rng.random()<.14:continue
            dx=ix*2.36+rng.uniform(-.37,.37)+math.sin(iy*.59)
            dy=iy*2.64+rng.uniform(-.44,.44)+math.sin(ix*.39)
            xx=cx+dx*math.cos(angle)-dy*math.sin(angle)
            yy=cy+dx*math.sin(angle)+dy*math.cos(angle)
            w,d=rng.uniform(1.30,2.05),rng.uniform(1.28,2.02)
            slot=rng.choice([0,1,2,3,6] if t!=1 else [1,3,4,4,5])
            house(p,xx,yy,height(xx,yy),w,d,rng.uniform(.9,2.40),slot,rng.random()<.17)
    p.object("Lime and sandstone terraces · "+str(t+1),villages,masonry)

for site in placement["sites"]:
    xx,yy=site["blender_xyz_km"][:2]
    anchor=bpy.data.objects.new(f"{site['chapter']:02} · {site['fort']}",None)
    sites.objects.link(anchor)
    anchor.location=(xx,yy,height(xx,yy))
    anchor.empty_display_type="PLAIN_AXES";anchor.empty_display_size=3
    anchor["Wikidata"]=site["source"]

# Use the project's freestanding courtyard study, stripped of its old ground,
# cameras and animation. It is a static, illustrative scale cue at this phase.
source=ROOT.parent/"blender/junagarh-fort-study.blend"
with bpy.data.libraries.load(str(source),link=False) as (catalog,library):
    library.objects=[n for n in catalog.objects if n.startswith(
        ("Foundation","Courtyard","Side_wall","Front_wall","Rear_wall","Round_bastion","Bastion",
         "Side_bastion","Gateway","Outer_frame","Inner_frame","Palace","Window","Chhatri","Gate_panel"))]
xx,yy=placement["sites"][0]["blender_xyz_km"][:2]
group=bpy.data.objects.new("Junagarh · existing interpretive courtyard model",None)
villages.objects.link(group);group.location=(xx,yy,height(xx,yy)-.25)
group.scale=(.43,)*3;group.rotation_euler.z=-.16
for obj in library.objects:
    villages.objects.link(obj);obj.parent=group

backdrop=material("Studio · matte warm umber",(.095,.066,.058),.94)
mesh("Continuous studio sweep",[(-9000,-9000,-15.3),(9000,-9000,-15.3),(9000,9000,-15.3),
     (-9000,9000,-15.3)],[(0,1,2,3)],studio,[backdrop])

world=bpy.data.worlds.new("Soft skylight");world.use_nodes=True;scene.world=world
bg=world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value=(.84,.875,1,1);bg.inputs["Strength"].default_value=.28
def light(name,kind,position,energy,color,size):
    data=bpy.data.lights.new(name,kind);data.energy=energy;data.color=color
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=position
    obj.rotation_euler=(-Vector(position)).to_track_quat('-Z','Y').to_euler()
    if kind=="SUN":data.angle=math.radians(size)
    else:data.shape='DISK';data.size=size
# Low raking sun from the west-southwest to cast long shadows across the dunes.
light("Sun · raking golden hour from WSW","SUN",(-620,-180,280),3.10,(1,.875,.680),5)
light("Softbox · cool atmospheric fill","AREA",(90,-350,490),650000,(.82,.90,1),630)
light("Softbox · warm edge highlight","AREA",(290,360,410),1600000,(1,.92,.76),440)
scene.render.engine="CYCLES";scene.cycles.samples=48
scene.cycles.use_denoising=True;scene.cycles.max_bounces=6;scene.cycles.diffuse_bounces=4
scene.cycles.transparent_max_bounces=3
scene.render.resolution_x=1800;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGB"
scene.view_settings.view_transform="AgX";scene.view_settings.look="AgX - Medium High Contrast"
def camera(name,target,offset,lens):
    data=bpy.data.cameras.new(name);obj=bpy.data.objects.new(name,data);studio.objects.link(obj)
    obj.location=Vector(target)+Vector(offset);obj.rotation_euler=(-Vector(offset)).to_track_quat('-Z','Y').to_euler()
    data.type='PERSP';data.lens=lens;data.clip_end=8000;data.clip_start=.1
    return obj
cams=[
    camera("01-overview",(-15,-12,8),(45,-1225,1180),58),
    camera("02-alternate",(-15,15,6),(-945,-870,770),47),
    camera("03-desert",(-290,55,8),(-18,-108,65),44),
    camera("04-mountains",(-55,-120,30),(90,-220,165),48),
]
scene.camera=cams[0]
for i,cam in enumerate(cams,1):
    marker=scene.timeline_markers.new(cam.name,frame=i);marker.camera=cam
scene.frame_end=4;scene.frame_set(1)
for area in bpy.context.screen.areas:
    if area.type=="VIEW_3D":
        area.spaces.active.region_3d.view_perspective="CAMERA"
        area.spaces.active.overlay.show_overlays=False
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"Rajasthan.blend"),compress=True)
print("Closed terrain",len(terrain.vertices),len(terrain.polygons),"faces. Euler 2.",flush=True)
