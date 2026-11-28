"""Build the editable Phase 03.2 Blender scene from sculpt.py's local cache."""
import json
import math
import random
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

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

def textured(m, scale, bump_distance, dark, light, attr=None, stretch=None, position=None):
    nt = m.node_tree
    def node(kind):
        return nt.nodes.new(kind)
    def link(out, inp):
        nt.links.new(out, inp)
    if position is None:
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
    return col, bump

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

soil=material("Ground · sand, dry soil, forest litter and exposed ribs",(.34,.22,.1))
soil_color, soil_bump = textured(soil,.81,.09,(.66,.62,.55),(1.05,1.03,.99),
                                  "Biome pigments",(1.04,.69,1.42))
nt = soil.node_tree
road_field = nt.nodes.new("ShaderNodeAttribute")
road_field.attribute_name = "Distance to cart track"
track_mask = nt.nodes.new("ShaderNodeMapRange")
track_mask.interpolation_type = "SMOOTHERSTEP"
track_mask.inputs["From Min"].default_value = .20
track_mask.inputs["From Max"].default_value = 1.47
track_mask.inputs["To Min"].default_value = .57
track_mask.inputs["To Max"].default_value = 0
nt.links.new(road_field.outputs["Fac"],track_mask.inputs["Value"])
road_mix = nt.nodes.new("ShaderNodeMixRGB")
road_mix.inputs[2].default_value = (.49,.331,.192,1)
nt.links.new(track_mask.outputs["Result"],road_mix.inputs[0])
nt.links.new(soil_color,road_mix.inputs[1])
nt.links.new(road_mix.outputs[0],nt.nodes.get("Principled BSDF").inputs["Base Color"])

# Wind ripples stay in the material where their scale falls below the mesh.
sand_field = nt.nodes.new("ShaderNodeAttribute")
sand_field.attribute_name = "Sand coverage"
position = nt.nodes.new("ShaderNodeNewGeometry").outputs["Position"]
ripple = nt.nodes.new("ShaderNodeTexWave")
ripple.wave_type = "BANDS"
ripple.bands_direction = "X"
ripple.inputs["Scale"].default_value = 3.3
ripple.inputs["Distortion"].default_value = 4.2
ripple.inputs["Detail Scale"].default_value = .65
nt.links.new(position,ripple.inputs["Vector"])
sand_bump = nt.nodes.new("ShaderNodeBump")
sand_bump.inputs["Distance"].default_value = .011
nt.links.new(sand_field.outputs["Fac"],sand_bump.inputs["Strength"])
nt.links.new(ripple.outputs["Fac"],sand_bump.inputs["Height"])
nt.links.new(soil_bump.outputs["Normal"],sand_bump.inputs["Normal"])
exposure_field = nt.nodes.new("ShaderNodeAttribute")
exposure_field.attribute_name = "Exposed bedrock"
bedding_scale = nt.nodes.new("ShaderNodeVectorMath")
bedding_scale.operation = "MULTIPLY"
bedding_scale.inputs[1].default_value = (.38,.46,2.7)
nt.links.new(position,bedding_scale.inputs[0])
bedding_noise = nt.nodes.new("ShaderNodeTexNoise")
bedding_noise.inputs["Scale"].default_value = .93
bedding_noise.inputs["Detail"].default_value = 3.8
nt.links.new(bedding_scale.outputs[0],bedding_noise.inputs["Vector"])
bedrock_bump = nt.nodes.new("ShaderNodeBump")
bedrock_bump.inputs["Distance"].default_value = .27
nt.links.new(exposure_field.outputs["Fac"],bedrock_bump.inputs["Strength"])
nt.links.new(bedding_noise.outputs["Fac"],bedrock_bump.inputs["Height"])
nt.links.new(sand_bump.outputs["Normal"],bedrock_bump.inputs["Normal"])
nt.links.new(bedrock_bump.outputs["Normal"],nt.nodes.get("Principled BSDF").inputs["Normal"])
rock=material("Escarpment · bedded ferruginous sandstone",(.38,.23,.12))
textured(rock,.48,.16,(.158,.103,.067),(.39,.278,.191),stretch=(.68,.74,3.7))
base=material("Underside · raw stone",(.185,.099,.045))

top=a["top"]; tri=a["tris"]; ring=a["ring"]; edge=top[ring]; count=len(ring)
normal=np.roll(edge[:,:2],-1,axis=0)-np.roll(edge[:,:2],1,axis=0)
normal=normal[:,[1,0]]*np.array([1,-1])
normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),.001)
wall_faces=[]
strata=[]
last=ring
station=np.r_[0,np.cumsum(np.linalg.norm(np.diff(edge[:,:2],axis=0),axis=1))]
for i, depth in enumerate((.025,.065,.11,.17,.23,.30,.38,.46,.53,.58,.65,.73,.79,.85,.91,.96,1)):
    offset = -.87*depth + .22*math.sin(i*2.2)
    joint=(.38*np.sin(station*1.42)+.61*np.sin(station*.43+depth)+.75*np.sin(station*.11))
    coords=edge[:,:2]+normal*(offset+.16*joint)[:,None]
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
land_surface = obj
view_layer = bpy.context.view_layer
view_layer.update()

def height(x,y):
    hit, ground, _, _ = land_surface.ray_cast((x,y,200),(0,0,-1))
    assert hit, (x,y)
    return ground.z

for name, values in (("Distance to cart track", a["road_dist"]), ("Sand coverage", a["sand"]),
                     ("Exposed bedrock",a["exposed"])):
    field = terrain.attributes.new(name, "FLOAT", "POINT")
    field.data.foreach_set("value", np.r_[values,np.zeros(len(verts)-len(top))].astype("f4"))

lake_mat = material("Water · deep mineral blue and silt shallows",(.048,.18,.21),.265)
lake_bs = lake_mat.node_tree.nodes.get("Principled BSDF")
lake_bs.inputs["IOR"].default_value = 1.333
lake_bs.inputs["Coat Weight"].default_value = .23
lake_bs.inputs["Coat Roughness"].default_value = .26
water_nt = lake_mat.node_tree
chemistry = water_nt.nodes.new("ShaderNodeVertexColor")
chemistry.layer_name = "Depth pigment"
water_nt.links.new(chemistry.outputs[0],lake_bs.inputs["Base Color"])
# Small, anisotropic capillary ripples preserve reflections at diorama scale.
wave = water_nt.nodes.new("ShaderNodeTexNoise")
wave.inputs["Scale"].default_value = 2.7
wave.inputs["Detail"].default_value = 3.2
stretch = water_nt.nodes.new("ShaderNodeVectorMath")
stretch.operation = "MULTIPLY"
stretch.inputs[1].default_value = (2.7,.48,.2)
water_nt.links.new(water_nt.nodes.new("ShaderNodeNewGeometry").outputs["Position"],stretch.inputs[0])
water_nt.links.new(stretch.outputs[0],wave.inputs["Vector"])
bump = water_nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = .23
bump.inputs["Distance"].default_value = .037
water_nt.links.new(wave.outputs["Fac"],bump.inputs["Height"])
water_nt.links.new(bump.outputs[0],lake_bs.inputs["Normal"])

# Clip precisely against the triangles used for visible terrain. Shared edges
# reuse their intersection vertices, and depth is sampled from the same bed.
for lake_index,lake in enumerate(placement["lakes"]):
    name, level = lake["name"], lake["level"]
    test = (a[f"lake_{lake_index}"]<2) & (top[:,2]<level)
    lake_vertices, lake_colors, lake_faces, lookup = [], [], [], {}
    for face in tri[np.any(test[tri],axis=1)]:
        clipped = []
        for i,j in zip(face, np.roll(face,-1)):
            i, j = int(i), int(j)
            start, end = top[i], top[j]
            if test[i]:
                clipped.append(((i,i), start[:2], level-start[2]))
            if test[i] != test[j]:
                blend = (level-start[2])/(end[2]-start[2])
                assert 0 <= blend <= 1, (name, start, end)
                clipped.append((tuple(sorted((i,j))),start[:2]+(end[:2]-start[:2])*blend,0.))
        polygon = []
        for key, xy, depth in clipped:
            if key not in lookup:
                lookup[key] = len(lake_vertices)
                lake_vertices.append((*xy,level+.018))
                # The sunlight lifts a narrow band of submerged sand at the edge.
                deep = 1-math.exp(-float(depth)/2.1)
                shallow = np.array((.207,.332,.245))
                mineral = np.array((.031,.116,.132))
                lake_colors.append((*((1-deep)*shallow+deep*mineral),1))
            polygon.append(lookup[key])
        lake_faces.append(polygon)
    assert len(lake_faces)>35, name
    water = mesh(name, lake_vertices, lake_faces, waterways, [lake_mat])
    paint = water.data.color_attributes.new(name="Depth pigment",type="FLOAT_COLOR",domain="POINT")
    paint.data.foreach_set("color",np.asarray(lake_colors,dtype="f4").ravel())
    water["Shoreline"] = "Source outline enlarged for the diorama. Planar water cut to terrain."

all_tracks = KDTree(sum(len(a[key]) for key in a.files if key.startswith("road_") and key[5:].isdigit()))
index = 0
for name in (key for key in a.files if key.startswith("road_") and key[5:].isdigit()):
    points = a[name]
    curve = bpy.data.curves.new(name,"CURVE")
    curve.dimensions = "3D"
    spline = curve.splines.new("POLY")
    spline.points.add(len(points)-1)
    spline.points.foreach_set("co",np.column_stack((points,np.ones(len(points)))).ravel())
    track = bpy.data.objects.new(name.replace("road_","Cart track "),curve)
    waterways.objects.link(track)
    track.hide_set(True)
    track.hide_render = True
    for xx,yy,zz in points:
        all_tracks.insert((xx,yy,0),index)
        index += 1
all_tracks.balance()

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

bark=material("Acacia bark · dusty fissures",(.166,.105,.056))
leaf_palettes = [
    [(.142,.187,.062),(.218,.249,.085),(.299,.308,.116)],
    [(.168,.204,.089),(.249,.276,.126),(.325,.336,.153)],
    [(.119,.171,.076),(.179,.224,.096),(.270,.300,.134)],
    [(.222,.210,.076),(.306,.269,.096),(.369,.303,.118)],
]
def foliage(name, variant):
    wide = name == "khejri" or (name == "woodland" and variant == 3)
    shrub = name == "scrub"
    matlist=[bark]+[material(name+" leaf "+str(i),color,.88)
                    for i,color in enumerate(leaf_palettes[(variant+(1 if wide else 0))%4])]
    parts=Parts()
    size=.52 if shrub else 1
    h=(2.9 if wide else (3.2+.44*variant))*size
    # Each crown resolves into separate sprays of irregular, folded leaflets.
    # At overview distance these merge into mottled foliage with porous edges.
    def crown(center,r):
        for _ in range(34 if not shrub else 24):
            theta=rng.uniform(0,TAU); radial=r*math.sqrt(rng.random())
            pos=Vector((radial*math.cos(theta),radial*math.sin(theta),
                        r*(.36*(1-(radial/r)**2)+rng.uniform(-.22,.33))))+center
            l=r*rng.uniform(.20,.37); az=rng.uniform(0,TAU)
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
        for _ in range(2 if shrub else 3):
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
        source.use_fake_user = True
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
for t,(cx,cy) in enumerate(towns[:13]):
    p=Parts()
    major = t in (0,1,2,4)
    occupied = []
    foundations = []
    for cluster in range(5 if major else 3):
        angle = cluster*2.4 + rng.uniform(-.35,.35)
        reach = rng.uniform(3,9) if cluster else 0
        ox, oy = cx+reach*math.cos(angle), cy+reach*math.sin(angle)
        bearing = .42*math.sin(t*1.7+cluster)
        for k in range(80 if major else 37):
            dx,dy = rng.gauss(0,3.5),rng.gauss(0,2.2)
            if abs(dx)>7 or abs(dy)>4:
                continue
            ca,sa = math.cos(bearing),math.sin(bearing)
            xx,yy = ox+dx*ca-dy*sa,oy+dx*sa+dy*ca
            w = rng.uniform(.84,1.82)
            d = w*rng.uniform(.78,1.31)
            radius = math.hypot(w,d)*.5+.095
            if any(math.hypot(xx-qx,yy-qy)<radius+qr for qx,qy,qr in occupied):
                continue
            _,_,road_distance = all_tracks.find((xx,yy,0))
            if road_distance < radius+1:
                continue
            footprint = [(xx+u*ca-v*sa,yy+u*sa+v*ca)
                         for u,v in ((-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2))]
            corners = [height(qx,qy) for qx,qy in footprint]
            if max(corners)-min(corners) > .8:
                continue
            occupied.append((xx,yy,radius))
            slot = rng.choice([0,1,2,3,6] if t!=1 else [1,3,4,4,5])
            start = len(p.verts)
            h = rng.uniform(.65,1.16) + (rng.uniform(.46,.94) if rng.random()<.21 else 0)
            floor_height = min(corners)+.40
            foundations.extend([component for qx,qy in footprint for component in (qx,qy,floor_height-.65)])
            house(p,0,0,floor_height,w,d,h,slot,rng.random()<.085)
            for i in range(start,len(p.verts)):
                lx,ly,lz = p.verts[i]
                p.verts[i] = (xx+lx*ca-ly*sa, yy+lx*sa+ly*ca,lz)
    village = p.object("Limewashed settlement · "+str(t+1),villages,masonry)
    village["Foundation corners XYZ"] = foundations
    print("SETTLEMENT", t+1, len(occupied),flush=True)

for site in placement["sites"]:
    xx,yy=site["blender_xyz_km"][:2]
    anchor=bpy.data.objects.new(f"{site['chapter']:02} · {site['fort']}",None)
    sites.objects.link(anchor)
    anchor.location=(xx,yy,height(xx,yy))
    anchor.empty_display_type="PLAIN_AXES";anchor.empty_display_size=3
    anchor["Wikidata"]=site["source"]
    anchor["Chapter title"]=site["title"]
    anchor["Source XYZ km"]=site["blender_xyz_km"]

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
    villages.objects.link(obj)
    obj.parent = group
    if obj.name.startswith("Chhatri"):
        # Seat the inherited studies on their respective palace eaves.
        # Local transforms change on these imported copies only.
        roof_height = 25.35 if obj.location.x>30 else 32.35 if obj.location.x>-7 else 28.35
        obj.location.z += roof_height-29.5

backdrop=material("Studio · warm limestone sweep",(.22,.168,.138),.91)
floor = mesh("Continuous studio sweep",[(-9000,-9000,-15.3),(9000,-9000,-15.3),(9000,9000,-15.3),
     (-9000,9000,-15.3)],[(0,1,2,3)],studio,[backdrop])

world=bpy.data.worlds.new("Late afternoon sky")
world.use_nodes=True
scene.world=world
wn = world.node_tree
bg=wn.nodes.get("Background")
bg.inputs["Strength"].default_value=.34
hdri_path = ROOT.parent/"map-phase-01/.cache/industrial_sunset_02_puresky.hdr"
hdri = wn.nodes.new("ShaderNodeTexEnvironment")
hdri.image = bpy.data.images.load(str(hdri_path))
hdri.image.pack()

mapping=wn.nodes.new("ShaderNodeVectorRotate")
mapping.rotation_type = "AXIS_ANGLE"
mapping.inputs["Axis"].default_value=(0,0,1)
mapping.inputs["Angle"].default_value=1.74
wn.links.new(wn.nodes.new("ShaderNodeTexCoord").outputs["Generated"],mapping.inputs["Vector"])
wn.links.new(mapping.outputs[0],hdri.inputs["Vector"])
altitude = wn.nodes.new("ShaderNodeSeparateXYZ")
wn.links.new(mapping.outputs[0],altitude.inputs[0])
horizon = wn.nodes.new("ShaderNodeMapRange")
horizon.interpolation_type = "SMOOTHERSTEP"
horizon.inputs["From Min"].default_value = 0
horizon.inputs["From Max"].default_value = .29
horizon.inputs["To Min"].default_value = .72
horizon.inputs["To Max"].default_value = 0
absolute = wn.nodes.new("ShaderNodeMath")
absolute.operation = "ABSOLUTE"
wn.links.new(altitude.outputs["Z"],absolute.inputs[0])
wn.links.new(absolute.outputs[0],horizon.inputs["Value"])
sky_tint = wn.nodes.new("ShaderNodeMixRGB")
sky_tint.inputs[2].default_value = (1.28,.84,.57,1)
wn.links.new(horizon.outputs["Result"],sky_tint.inputs[0])
wn.links.new(hdri.outputs["Color"],sky_tint.inputs[1])
wn.links.new(sky_tint.outputs[0],bg.inputs["Color"])

air_mat = material("Approach · fine atmospheric dust",(1,1,1))
air_nodes = air_mat.node_tree
air_nodes.nodes.remove(air_nodes.nodes.get("Principled BSDF"))
air = air_nodes.nodes.new("ShaderNodeVolumeScatter")
air.inputs["Color"].default_value = (.89,.74,.58,1)
air.inputs["Density"].default_value = .00048
air.inputs["Anisotropy"].default_value = .25
air_nodes.links.new(air.outputs[0],air_nodes.nodes.get("Material Output").inputs["Volume"])
air_bounds = [(-500,-50,-20),(340,-50,-20),(340,435,-20),(-500,435,-20),
              (-500,-50,95),(340,-50,95),(340,435,95),(-500,435,95)]
air_faces = [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
atmosphere = mesh("Junagarh approach air volume",air_bounds,air_faces,studio,[air_mat])
atmosphere.display_type = "WIRE"

def light(name,kind,position,energy,color,size):
    data=bpy.data.lights.new(name,kind)
    data.energy=energy
    data.color=color
    obj=bpy.data.objects.new(name,data)
    studio.objects.link(obj)
    obj.location=position
    obj.rotation_euler=(-Vector(position)).to_track_quat('-Z','Y').to_euler()
    if kind=="SUN":
        data.angle=math.radians(size)
    else:
        data.shape='DISK'
        data.size=size

light("Sun · WSW golden light","SUN",(-640,-260,337),3.08,(1,.810,.628),6.8)
light("Sky bounce · broad cool fill","AREA",(85,-490,620),730000,(.93,.96,1),850)
scene.render.engine="CYCLES"
scene.cycles.samples=40
scene.cycles.use_denoising=True
scene.cycles.adaptive_threshold=.035
scene.cycles.max_bounces=5
scene.cycles.diffuse_bounces=3
scene.cycles.glossy_bounces=3
scene.render.resolution_x=1800
scene.render.resolution_y=1200
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
scene.view_settings.exposure=.28
def camera(name,target,offset,lens):
    data=bpy.data.cameras.new(name);obj=bpy.data.objects.new(name,data);studio.objects.link(obj)
    obj.location=Vector(target)+Vector(offset);obj.rotation_euler=(-Vector(offset)).to_track_quat('-Z','Y').to_euler()
    data.type='PERSP';data.lens=lens;data.clip_end=8000;data.clip_start=.1
    return obj
cams=[
    camera("01-overview",(-15,-30,9),(45,-1175,1050),55),
    camera("02-alternate",(-12,-26,9),(-855,-750,865),50),
    camera("03-desert",(-316,48,6),(13,-102,85),48),
    camera("04-aravalli-water",(-13,-237,10),(-56,-64,88),53),
    camera("05-junagarh-approach",(-91,145,9),(-56,-128,14),39),
    camera("match-01-overview",(-15,-12,8),(45,-1225,1180),58),
    camera("match-02-alternate",(-15,15,6),(-945,-870,770),47),
    camera("match-03-desert",(-290,55,8),(-18,-108,65),44),
    camera("match-04-mountains",(-55,-120,30),(90,-220,165),48),
]
scene.camera=cams[0]
for i,cam in enumerate(cams,1):
    marker=scene.timeline_markers.new(cam.name,frame=i)
    marker.camera=cam
scene.frame_end=len(cams)
for frame, hide in ((1,False),(5,True),(6,False)):
    floor.hide_render = hide
    floor.keyframe_insert(data_path="hide_render",frame=frame)
    atmosphere.hide_render = not hide
    atmosphere.keyframe_insert(data_path="hide_render",frame=frame)
scene.frame_set(1)
scene["Attribution"] = (
    "Made with Natural Earth. Produced using Copernicus WorldDEM™-90 © DLR e.V. 2010-2014 "
    "and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union "
    "and ESA; all rights reserved. © ESA WorldCover project 2021 / Contains modified Copernicus "
    "Sentinel data (2021) processed by ESA WorldCover consortium. See ASSETS.md."
)
for area in bpy.context.screen.areas:
    if area.type=="VIEW_3D":
        area.spaces.active.region_3d.view_perspective="CAMERA"
        area.spaces.active.overlay.show_overlays=False
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"Rajasthan.blend"),compress=True)
print("Closed terrain",len(terrain.vertices),len(terrain.polygons),"faces. Euler 2.",flush=True)
