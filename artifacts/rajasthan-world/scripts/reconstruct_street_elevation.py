"""Build the street-facing Junagarh study in a fresh Blender process.

Preview with JUNAGARH_PROOF=1. The restricted photograph is an external camera
guide. Geometry, shading and lighting render independently of the photograph.
"""
from pathlib import Path
import json
import math
import os
import random

from math import sin, cos, pi, sqrt

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'research/junagarh'
RENDERS = ROOT / 'renders/junagarh/exterior-v01'
PRIVATE = RESEARCH / 'references/primary-exterior'
PROOF = os.getenv('JUNAGARH_PROOF') == '1'
rng = random.Random(811)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
bpy.context.preferences.filepaths.save_version = 0


def collection(name):
    coll = bpy.data.collections.new(name)
    scene.collection.children.link(coll)
    return coll


wall = collection('01  •  Rampart and drum bastions')
gate = collection('02  •  Dressed gateway and reveals')
passage = collection('03  •  Passage and independent door leaves')
palace = collection('04  •  Palace wings and projecting galleries')
roof = collection('05  •  Pavilions and roofline')
street = collection('06  •  Road, forecourt and street enclosure')
rig = collection('07  •  Cameras and light')
guides = collection('08  •  Map and photograph  |  survey guides')
guides.hide_render = True


def finish(name, coll, points, faces, mat=None, bevel=0):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    if mat:
        mesh.materials.append(mat)
        uv = mesh.uv_layers.new(name='Metre projection')
        for face in mesh.polygons:
            n = face.normal
            # Vertical surfaces unwrap along their tangent, floors in plan.
            t = Vector((-n.y, n.x, 0)).normalized()
            for i in face.loop_indices:
                p = mesh.vertices[mesh.loops[i].vertex_index].co
                uv.data[i].uv = (p.x, p.y) if abs(n.z) > .72 else (t.dot(p), p.z)
    if bevel:
        mod = obj.modifiers.new('Chipped arris radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        mod = obj.modifiers.new('Face weighted stone normals', 'WEIGHTED_NORMAL')
        mod.keep_sharp = True
    return obj


class Carving:
    """One editable mesh per assembly. Sections use rings of corresponding vertices."""
    def __init__(self):
        self.verts = []
        self.faces = []

    def rings(self, rings, closed=True):
        offset = len(self.verts)
        n = len(rings[0])
        for ring in rings:
            self.verts.extend(ring)
        for j in range(len(rings)-1):
            for i in range(n if closed else n-1):
                a = offset+j*n+i
                b = offset+j*n+(i+1)%n
                self.faces.append((a,b,b+n,a+n))
        if closed:
            self.faces.extend([tuple(offset+i for i in reversed(range(n))),
                               tuple(offset+(len(rings)-1)*n+i for i in range(n))])

    def front(self, outline, y, back):
        # Outline is in facade x,z coordinates.
        self.rings([[(x,d,z) for x,z in outline] for d in (back,y)])

    def box(self,x1,x2,y1,y2,z1,z2):
        self.front([(x1,z1),(x2,z1),(x2,z2),(x1,z2)],y1,y2)

    def turn(self,x,y,profile,n=24,phase=0):
        self.rings([[(x+r*cos(2*pi*i/n+phase),y+r*sin(2*pi*i/n+phase),z)
                     for i in range(n)] for z,r in profile])

    def emit(self,name,coll,mat,bevel=0):
        return finish(name,coll,self.verts,self.faces,mat,bevel)


def slab(name,coll,mat,bounds,bevel=0):
    stone=Carving()
    stone.box(*bounds)
    return stone.emit(name,coll,mat,bevel)


def stone_material(name,low,high,asset=None,repeat=1,metal=0,rough=.8):
    material=bpy.data.materials.new(name)
    material.diffuse_color=(*high,1)
    material.use_nodes=True
    nodes=material.node_tree.nodes
    link=material.node_tree.links.new
    shader=nodes.get('Principled BSDF')
    shader.inputs['Metallic'].default_value=metal
    shader.inputs['Roughness'].default_value=rough
    coord=nodes.new('ShaderNodeTexCoord')
    mapping=nodes.new('ShaderNodeVectorMath')
    mapping.operation='SCALE'
    mapping.inputs['Scale'].default_value=repeat
    link(coord.outputs['UV'],mapping.inputs[0])
    def noise(scale,detail):
        n=nodes.new('ShaderNodeTexNoise')
        n.inputs['Scale'].default_value=scale
        n.inputs['Detail'].default_value=detail
        link(coord.outputs['Object'],n.inputs['Vector'])
        return n.outputs['Fac']
    mottling=noise(.56,5)
    pore=noise(88,2)
    if asset:
        def channel(file):
            path=RESEARCH/'materials'/asset/(file+'.jpg')
            im=bpy.data.images.load(str(path),check_existing=True)
            if file!='Diffuse':
                im.colorspace_settings.is_data=True
            t=nodes.new('ShaderNodeTexImage')
            t.image=im
            link(mapping.outputs[0],t.inputs['Vector'])
            return t.outputs['Color']
        mix=nodes.new('ShaderNodeMixRGB')
        mix.inputs[0].default_value=.40
        link(channel('Diffuse'),mix.inputs[1])
        link(mottling,mix.inputs[2])
        mottling=mix.outputs[0]
        link(channel('Rough'),shader.inputs['Roughness'])
        normal=nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value=.14
        link(channel('nor_gl'),normal.inputs['Color'])
    ramp=nodes.new('ShaderNodeValToRGB')
    for stop,pos,color in zip(ramp.color_ramp.elements,(.12,.69),(low,high)):
        stop.position=pos
        stop.color=(*color,1)
    link(mottling,ramp.inputs[0])
    link(ramp.outputs[0],shader.inputs['Base Color'])
    bump=nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value=.17
    bump.inputs['Distance'].default_value=.016
    link(pore,bump.inputs['Height'])
    if asset:
        link(normal.outputs[0],bump.inputs['Normal'])
    link(bump.outputs[0],shader.inputs['Normal'])
    return material


red=stone_material('Rampart • weathered red lime and sandstone',(.31,.135,.091),(.66,.352,.235),'old_sandstone_02',.29)
rose=stone_material('Rose sandstone • dressed mouldings',(.24,.102,.071),(.59,.319,.209),'red_sandstone_wall',.42)
umber=stone_material('Palace • deep red stone',(.236,.116,.078),(.57,.317,.222),'old_sandstone_02',.40)
cream=stone_material('Portal • buff sandstone',(.34,.243,.161),(.76,.598,.409),'old_sandstone_02',.46)
carved=stone_material('Pale carved sandstone • fresh edges',(.43,.317,.211),(.84,.688,.489),'old_sandstone_02',.70)
lime=stone_material('Street enclosure • lime edging',(.47,.38,.29),(.80,.70,.54))
wood=stone_material('Oiled timber • leaf and shutter',(.037,.018,.009),(.17,.079,.034),'fine_grained_wood',.64)
iron=stone_material('Blackened wrought iron',(.028,.024,.021),(.105,.080,.054),metal=.68,rough=.56)
shade=stone_material('Recessed stone • sheltered surface',(.083,.037,.023),(.21,.111,.072))
grit=stone_material('Paving • dusty slabs',(.23,.179,.141),(.50,.403,.302),'dry_ground_01',.32)
road=stone_material('Street asphalt • warm aggregate',(.135,.130,.126),(.164,.157,.152))
flagmat=stone_material('Saffron cloth',(.58,.115,.021),(.88,.395,.038))

# Pinhole match in the source 800 × 500 frame. The horizontal vanishing point
# for the wall is near (-370,339). Depth is fixed only up to a similarity.
f=700
horizon=339
cam_z=2.75
right=Vector((.740,.673))
forward=Vector((-.673,.740))
right.normalize()
forward.normalize()
eye=-(right*(150*55/f)+forward*55)


def plan_x(u,y=0):
    ray=forward+right*((u-400)/f)
    return eye.x+(y-eye.y)*ray.x/ray.y


def projected_z(u,v,y):
    x=plan_x(u,y)
    depth=(Vector((x,y))-eye).dot(forward)
    return cam_z+(horizon-v)*depth/f


def camera(name,loc,target,lens):
    data=bpy.data.cameras.new(name)
    obj=bpy.data.objects.new(name,data)
    rig.objects.link(obj)
    obj.location=loc
    obj.rotation_euler=(Vector(target)-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    data.lens=lens
    data.clip_end=1200
    return obj


match=camera('01 | Street perspective',(*eye,cam_z),(*(eye+forward),cam_z),f*36/800)
match.data.shift_y=(horizon-250)/800
image=bpy.data.images.load(str(PRIVATE/'india-cine-hub-exterior.jpg'))
match.data.show_background_images=True
guide=match.data.background_images.new()
guide.image=image
guide.alpha=.38
guide.display_depth='FRONT'
guide.show_background_image=False


def import_map():
    features=json.loads((RESEARCH/'geodata/selected-ways.geojson').read_text())['features']
    boundary=next(f for f in features if f['properties']['osm_id']=='126998139')
    ring=boundary['geometry']['coordinates'][0]
    # Provisional attachment to the straight southern mapped frontage. Reversible
    # translation only; the identity of the photographed elevation is unconfirmed.
    ox=(min(p[0] for p in ring)+max(p[0] for p in ring))/2
    oy=min(p[1] for p in ring)
    def inside(x,y):
        crossings=sum((b[1]>y)!=(a[1]>y) and x<(a[0]-b[0])*(y-b[1])/(a[1]-b[1])+b[0]
                      for a,b in zip(ring,ring[1:]))
        return crossings%2==1
    count=0
    for feat in features:
        if feat['geometry']['type']!='Polygon':
            continue
        pts=feat['geometry']['coordinates'][0]
        if feat is not boundary:
            if 'building' not in feat['properties'] or not inside(*[sum(p[i] for p in pts)/len(pts) for i in (0,1)]):
                continue
            count+=1
        xy=[((p[0]-ox)*111320*cos(math.radians(oy)),(p[1]-oy)*111132,0) for p in pts[:-1]]
        mesh=bpy.data.meshes.new('Metric mapped outline')
        mesh.from_pydata(xy,[(i,(i+1)%len(xy)) for i in range(len(xy))],[])
        obj=bpy.data.objects.new('OSM '+feat['properties']['osm_id'],mesh)
        guides.objects.link(obj)
        obj['credit']='© OpenStreetMap contributors / ODbL'
    assert count==26
    guides.hide_viewport=True


import_map()


def arch_line(radius,spring,rise,steps=24):
    # Two intersecting circular segments. Vertical tangents at both springers.
    c=(rise*rise-radius*radius)/(2*radius)
    R=radius+c
    a=math.acos(c/R)
    left=[(c-R*cos(a*i/steps),spring+R*sin(a*i/steps)) for i in range(steps+1)]
    return left+[(-x,z) for x,z in reversed(left[:-1])]


def arch_shell(part,x,r,s,rise,y1,y2,half,top,base=0):
    arc=arch_line(r,s,rise)
    polygon=[(-half,base),(-r,base)]+arc+[(r,base),(half,base),(half,top),(-half,top)]
    part.front([(x+u,z) for u,z in polygon],y1,y2)


def band(part,x,r,spring,rise,thick,y,back,base,segments=19):
    inner=arch_line(r,spring,rise,segments)
    outer=arch_line(r+thick,spring,rise+thick,segments)
    for i in range(len(inner)-1):
        points=[inner[i],inner[i+1],outer[i+1],outer[i]]
        cx=sum(p[0] for p in points)/4
        cz=sum(p[1] for p in points)/4
        part.front([(x+cx+(u-cx)*.979,cz+(z-cz)*.979) for u,z in points],y,back)
    for side in (-1,1):
        a,b=sorted((x+side*r,x+side*(r+thick)))
        part.box(a,b,y,back,base,spring)


portal=Carving()
arch_shell(portal,0,2.58,4.17,3.16,-.04,1.35,7.7,11.31,.40)
portal.emit('Facade | pierced portal body',gate,cream,.025)
dressed=Carving()
# Individually bedded ashlar courses. Trim each course at the outer arch profile.
def outer_width(z):
    r,s,h=3.22,4.17,3.83
    if z <= s: return r
    if z >= s+h: return 0
    c=(h*h-r*r)/(2*r)
    return sqrt((r+c)**2-(z-s)**2)-c


for j in range(19):
    z=.46+j*.565
    for side in (-1,1):
        cuts=[0]+[v for i in range(8) if 0<(v:=i*1.42+(.63 if j%2 else .0))<7.7]+[7.7]
        for l,r in zip(cuts,cuts[1:]):
            # Follow both ends of a course where the arch intersects the joint.
            outline=[]
            for zz in [z+.008,z+.56]:
                q=outer_width(zz)
                outline.append((max(l+.009,min(r-.009,q)),zz))
            if all(v>=r-.011 for v,_ in outline):continue
            poly=[outline[0],(r-.008,z+.008),(r-.008,z+.56),outline[1]]
            dressed.front([(side*v,zz) for v,zz in poly],-.104-rng.uniform(0,.018),-.025)
dressed.emit('Portal | jointed ashlar spandrels and jambs',gate,cream,.009)
for k,(r,h,w,y,mat) in enumerate([(2.54,3.15,.19,-.075,carved),(2.72,3.33,.14,-.16,rose),
                                  (2.85,3.45,.22,-.23,carved),(3.06,3.66,.19,-.30,cream)]):
    course=Carving()
    band(course,0,r,4.17,h,w,y,.19,.45,14)
    course.emit('Archivolt %d | cut voussoirs and responds'%k,gate,mat,.012)
for j,(z,d,h) in enumerate([(8.8,.20,.11),(9.06,.31,.15),(10.86,.2,.12),(11.14,.43,.19)]):
    slab('Gateway | overhanging stringcourse '+str(j),gate,carved,(-7.8,7.8,-d,.55,z,z+h),.028)

# Continuous vaulted reveal and inner gate throat.
inner=Carving()
for a,b in [(1.32,5.75),(8.85,10.8)]:
    arch_shell(inner,0,2.49,4.17,3.00,a,b,5.0,8.3,.40)
# An internal square-headed rebate gives each arched leaf room to rotate.
for a,b in [(-5,-2.66),(2.66,5)]:
    inner.box(a,b,5.75,8.85,.40,8.3)
inner.box(-2.66,2.66,5.75,8.85,7.48,8.30)
inner.emit('Passage | full sidewalls and pointed barrel soffit',passage,shade,.038)
for y in [1.42,4.3,9.05,10.6]:
    rib=Carving()
    band(rib,0,2.37,4.17,2.93,.18,y,y+.27,.4,12)
    rib.emit('Passage | masonry transverse rib',passage,cream,.015)
slab('Passage | running stone floor',passage,grit,(-3.2,3.2,-1.5,17,.25,.46),.015)
for j in range(3):
    slab('Threshold | shallow tread '+str(j),gate,cream,(-3.64,3.64,-2.8+j*.53,-1.12,.01,.14*(j+1)),.028)

# Leaf meshes are built in pivot-local coordinates. Rotate inwards in opposite
# senses. Stiles, rails, peened bosses and pintles travel with the relevant leaf.
doors=[]
for side in (-1,1):
    sign=-side
    leaf=Carving()
    for i in range(10):
        a=.065+i*.226
        b=a+.222
        xworld=2.35-(a+b)/2
        crown=4.17+sqrt(max(0,(2.37+.59)**2-(abs(xworld)+.59)**2))-.18
        l,r=sorted((sign*a,sign*b))
        leaf.box(l,r,-.086,.086,.51,crown)
    obj=leaf.emit(('Left' if side==-1 else 'Right')+' | studded timber leaf, hinge origin',passage,wood,.012)
    obj.location=(2.35*side,6.1,0)
    fitting=Carving()
    for level in (1.0,2.08,3.18,4.2):
        l,r=sorted((sign*.03,sign*2.25))
        fitting.box(l,r,-.131,-.085,level-.049,level+.049)
    for i in range(9):
        for j in range(11):
            x=sign*(.20+i*.239)
            z=.85+j*.34
            fitting.rings([[(x+r*cos(t*pi/4),y,z+r*sin(t*pi/4)) for t in range(8)]
                           for r,y in ((.035,-.086),(.037,-.119),(.012,-.142))])
    hardware=fitting.emit('Forged straps and nailheads',passage,iron,.003)
    hardware.parent=obj
    for frame,angle in [(1,0),(61,sign*math.radians(86))]:
        obj.rotation_euler.z=angle
        obj.keyframe_insert(data_path='rotation_euler',frame=frame)
    doors.append(obj)

def rampart(name, route, base_top, crown=.98):
    """Sweep battered masonry along the survey-plane path with a parapet walk."""
    body=Carving()
    pts=[Vector(p) for p in route]
    tangents=[(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized() for i in range(len(pts))]
    normals=[Vector((t.y,-t.x)) for t in tangents]
    tops=[base_top(p.x) if callable(base_top) else base_top for p in pts]
    def loft(profile):
        rings=[]
        for p,n,h in zip(pts,normals,tops):
            rings.append([(*(p+n*offset),z(h)) for offset,z in profile])
        body.rings(rings)
    loft([(.45,lambda h:.08),(.40,lambda h:1.0),(.05,lambda h:h-.40),
          (.13,lambda h:h-.32),(.17,lambda h:h-.21),(.16,lambda h:h),
          (-1.8,lambda h:h),(-2.05,lambda h:.08)])
    obj=body.emit(name+' | battered sweep',wall,red,.025)
    nper=8
    for i,face in enumerate(obj.data.polygons):
        if i<nper*(len(route)-1) and i%nper in (1,2,3,4): face.use_smooth=True
    lengths=[0]
    for a,b in zip(pts,pts[1:]):lengths.append(lengths[-1]+(b-a).length)
    def station(s):
        i=next((i for i in range(len(pts)-1) if lengths[i+1]>=s),len(pts)-2)
        t=(s-lengths[i])/(lengths[i+1]-lengths[i])
        return pts[i].lerp(pts[i+1],t),normals[i].lerp(normals[i+1],t).normalized(),tops[i]*(1-t)+tops[i+1]*t
    merlons=Carving()
    count=max(1,round(lengths[-1]/1.49))
    pitch=lengths[-1]/count
    # Solid, arched shoulders with a tapered top and a through slit. Each is
    # one stone-thick in depth; the narrow gaps cut the parapet silhouette.
    for j in range(count):
        section=[]
        for frac,height in [(0,.69),(.12,.81),(.27,.90),(.40,.97),(.50,1),(.60,.97),(.73,.90),(.88,.81),(1,.69)]:
            s=(j+.015+.97*frac)*pitch
            p,n,h=station(s)
            section.append((p,n,h+crown*height))
        def outline(lo,hi,bottom,top):
            rings=[]
            for idx in range(lo,hi+1):
                p,n,h=section[idx]
                wall_h=h-crown*[.69,.81,.90,.94,1,.94,.90,.81,.69][idx]
                a=wall_h+bottom*crown
                b=h if top is None else wall_h+crown*top
                rings.append([(*(p+n*.09),a),(*(p+n*.09),b),(*(p-n*.42),b),(*(p-n*.42),a)])
            merlons.rings(rings)
        outline(0,3,-.12,None)
        outline(5,8,-.12,None)
        outline(3,5,-.12,.31)
        outline(3,5,.48,None)
    merlons.emit(name+' | pierced merlon course',wall,cream if name=='Gateway crown' else red,.033)


def swell(start,end,centres):
    path=[]
    x=start
    while x<end+.001:
        y=0
        for c,r,depth in centres:
            if abs(x-c)<r:
                # C1 blend at shoulders into the curtain, fuller at the nose.
                y-=depth*(.5+.5*cos(pi*(x-c)/r))**.83
        path.append((x,y))
        x+=.45
    if path[-1][0]<end:path.append((end,0))
    return path


rampart('Western curtain',swell(-94,-7.72,[(-75,8.75,4.8),(-11.9,5.8,6.5)]),
        lambda x:6.45+max(0,min(1,(x+80)/65))*3.33,1.65)
# Right drum turns around its outer flank and into the return, keeping the crown
# on the same curve. Its far edge is deliberately cropped by the matched lens.
r=6.5
cx=14.35
route=[(7.70,0)]+[(cx+r*cos(a),.55+r*sin(a)) for a in [pi+i*pi/64 for i in range(65)]]+[(cx+r,12)]
rampart('Eastern drum and return',route,9.04,1.90)
rampart('Gateway crown', [(-7.7,.32),(7.7,.32)],11.28,1.06)
# This crown sits above the gateway. Remove the sweep body below it to keep the
# entrance clear; the separately modeled ashlar body supports the merlons.
crown_body=next(o for o in wall.objects if o.name.startswith('Gateway crown | battered'))
bpy.data.objects.remove(crown_body,do_unlink=True)


def profile_box(part,x1,x2,y1,y2,levels):
    part.rings([[(x1-r,y1-r,z),(x2+r,y1-r,z),(x2+r,y2+r,z),(x1-r,y2+r,z)] for z,r in levels])


def cornice(name,coll,x1,x2,y1,y2,z,reach,mat):
    p=Carving()
    profile_box(p,x1,x2,y1,y2,[(z-.40,0),(z-.29,.11*reach),(z-.19,.11*reach),
                                 (z-.13,.39*reach),(z-.04,.49*reach),(z,.84*reach),
                                 (z+.10,reach),(z+.20,reach),(z+.24,.88*reach)])
    return p.emit(name,coll,mat,.013)


def pillar(part,x,y,z,h,r):
    profile=[(0,1.38),(.055,1.38),(.074,1.03),(.105,1.18),(.126,1.02),
             (.14,.73),(.225,.79),(.248,.88),(.267,.73),(.77,.62),
             (.79,.82),(.83,.86),(.86,.75),(.90,1.05),(.94,1.32),(1,1.46)]
    part.turn(x,y,[(z+h*a,r*b) for a,b in profile],12)


def brackets(part,x,y,z,width,depth):
    # Three stepped corbels spring from the facade before cantilevering out.
    profile=[(0,0),(-depth*.24,0),(-depth*.28,.16),(-depth*.43,.23),
             (-depth*.46,.39),(-depth*.69,.51),(-depth*.75,.66),
             (-depth*.94,.72),(-depth,.88),(0,.88)]
    part.rings([[(x+u,y+d,z+h) for d,h in profile] for u in (-width/2,width/2)])


def pattern_screen(part,x,y,z,w,h):
    # Small perforated stone lattice built from two sets of clipped diagonal ribs.
    for direction in (-1,1):
        for k in range(-10,16):
            mid=k*.28
            a=max(-w/2,mid-h/2)
            b=min(w/2,mid+h/2)
            if b-a<.04:continue
            za=z+h*.5+direction*(a-mid)
            zb=z+h*.5+direction*(b-mid)
            part.front([(x+a,za-.025),(x+b,zb-.025),(x+b,zb+.025),(x+a,za+.025)],y,y+.06)


def cusped_head(part,x,y,z,w,h,depth):
    # Scallops are in the underside of the stone lintel, with a real reveal.
    underside=[]
    for i in range(41):
        t=i/40
        underside.append((x+w*(t-.5), z+h*(.42+.52*(sin(pi*t)**.75)+.095*abs(sin(5*pi*t)))))
    part.front(underside+[(x+w*.5,z+h*1.04),(x-w*.5,z+h*1.04)],y,y+depth)


def projecting_bay(width=3.35):
    p=Carving()
    for x in [-width*.37,0,width*.37]:brackets(p,x,0,-.89,.28,1.0)
    profile_box(p,-width/2,width/2,-1.0,0,[(0,0),(.10,.10),(.18,.15),(.26,.06)])
    p.box(-width/2,width/2,-.95,-.79,.25,.80)
    for x in [-width/2+.12,0,width/2-.12]:pillar(p,x,-.83,.76,1.83,.12)
    for x in [-width*.231,width*.231]:cusped_head(p,x,-.95,1.97,width*.47,.65,.21)
    for side in [-1,1]:
        p.box(side*width/2-.08,side*width/2+.08,-.81,-.02,.27,.80)
    profile_box(p,-width/2,width/2,-1,0,[(2.58,0),(2.67,.12),(2.76,.27),(2.83,.31),(2.91,.12)])
    for j in range(10):
        xx=(j-4.5)*width/10
        p.front([(xx-.09,.38),(xx,.66),(xx+.09,.38),(xx,.31)],-.98,-.94)
    return p.emit('Jharokha | corbels, cusp screens and chhajja',palace,rose,.012)


balcony=projecting_bay()
first_bay=True


def bay_at(x,y,z,angle=0):
    global first_bay
    obj=balcony if first_bay else balcony.copy()
    if not first_bay: palace.objects.link(obj)
    first_bay=False
    obj.location=(x,y,z)
    obj.rotation_euler.z=angle


def facade_run(label,x,y,z,angle,length,height,bays,outer,balconies=(),screens=True):
    # Build in a local elevation plane. The masonry between bays is continuous
    # in depth, while each arched opening reveals a shaded inner face.
    p=Carving()
    timber=Carving()
    mould=Carving()
    pitch=length/bays
    for i in range(bays):
        center=(i+.5)*pitch
        w=min(1.52,pitch*.65)
        sill=z+.20*height
        head=z+.78*height
        p.box(center-pitch/2,center+pitch/2,0,.82,z,sill)
        p.box(center-pitch/2,center-w/2,0,.82,sill,z+height)
        p.box(center+w/2,center+pitch/2,0,.82,sill,z+height)
        cusped_head(p,center,0,sill+(head-sill)*.71,w,head-(sill+(head-sill)*.71),.82)
        p.box(center-w/2,center+w/2,0,.83,head+.015,z+height)
        if screens:
            timber.box(center-w*.54,center+w*.54,.75,.84,sill,head)
            pattern_screen(mould,center,.47,sill,w,head-sill)
        for a in [-1,1]:
            pillar(mould,center+a*(w*.5+.07),-.055,sill,head-sill,.095)
        mould.box(center-w*.65,center+w*.65,-.17,.13,sill-.1,sill+.03)
        if i in balconies:
            bay_at(x+center*cos(angle),y+center*sin(angle),sill-.25,angle)
    for part,suffix,mat in [(p,' | pierced masonry',outer),(timber,' | inset shutters',wood),(mould,' | carved surrounds',rose)]:
        if not part.verts:continue
        obj=part.emit(label+suffix,palace,mat,.013)
        obj.location=(x,y,0)
        obj.rotation_euler.z=angle


def palace_wing(label,x1,x2,y1,y2,bottom,top,bays,mat,show_upper=True):
    # An inner load-bearing volume stands behind the recessed street and return
    # elevations. Overhanging floors cast shadows onto the lower ranges.
    size=top-bottom
    slab(label+' | inner core',palace,mat,(x1+.80,x2-.85,y1+.91,y2,bottom,top))
    facade_run(label+' front',x1,y1,bottom,0,x2-x1,size,bays,mat,
               tuple(i for i in range(bays) if show_upper and i in (1,bays-2)),True)
    for xx in [x1+.34,x2-.34]:
        slab(label+' | corner bond',palace,mat,(xx-.34,xx+.34,y1+.03,y1+1.05,bottom,top),.026)
    facade_run(label+' return',x2,y1,bottom,pi/2,y2-y1,size,max(2,round((y2-y1)/3.9)),mat)
    cornice(label+' | carved chhajja',palace,x1,x2,y1,y2,top,.65,rose)
    dentils=Carving()
    for i in range(round((x2-x1)/.82)):
        brackets(dentils,x1+.4+i*.82,y1,top-.94,.16,.52)
    dentils.emit(label+' | corbel course',palace,rose,.012)
    parapet=Carving()
    parapet.box(x1,x2,y1,y1+.38,top+.2,top+.9)
    parapet.box(x2-.38,x2,y1,y2,top+.2,top+.9)
    parapet.emit(label+' | coping and roof parapet',roof,mat,.035)


west1,west2=plan_x(102,9),plan_x(230,9)
# Solve the return wing depth against its visible back corner in the photo.
ray=forward+right*((385-400)/f)
west_back=eye.y+(west2-eye.x)*ray.y/ray.x
slab('Western palace | raised base',palace,umber,(west1,west2,9,west_back,.1,10.3))
palace_wing('West • audience gallery',west1,west2,9,west_back,10.2,15.1,15,umber,False)
palace_wing('West • upper apartments',west1+1,west2-.5,9.9,west_back-.7,15.55,18.6,13,umber)
palace_wing('West • raised corner range',west2-12,west2-.6,9.95,24,18.94,21.25,4,umber,False)
# Eastern pavilion is lower and partly obscured by the crescent drum.
east1,east2=plan_x(433,6.8),plan_x(760,6.8)
for a,b in [(east1,-5.02),(5.02,east2)]:
    slab('East palace | terrace flanking vaulted passage',palace,red,(a,b,6.8,16,.07,11.1))
slab('East palace | gallery over passage',palace,red,(-5.02,5.02,6.8,16,8.32,11.1))
rear=Carving()
arch_shell(rear,0,2.55,4.17,3.12,10.8,16.0,3.14,8.16,.40)
rear.emit('Passage | rear vault to open yard',passage,red,.027)
for a,b in [(-7.7,-2.58),(2.58,7.7)]:
    slab('Portal | footing below plinth',gate,cream,(a,b,-.07,1.38,.05,.43),.017)

palace_wing('East • gate terrace gallery',east1,east2,6.8,15.7,11.08,14.25,12,rose)

def pavilion(name,x,y,z,r,mat,large=False):
    p=Carving()
    sides=8 if large else 4
    start=pi/sides
    profile=[(z,r*1.06),(z+.08*r,r*1.12),(z+.17*r,r*1.02)]
    p.turn(x,y,profile,sides,start)
    for i in range(sides):
        t=start+2*pi*i/sides
        pillar(p,x+.86*r*cos(t),y+.86*r*sin(t),z+.17*r,1.03*r,.104*r)
    p.turn(x,y,[(z+h*r,s*r) for h,s in [(1.16,.97),(1.22,1.07),(1.28,1.21),
                                         (1.33,1.24),(1.40,.98),(1.51,.84)]],sides,start)
    dome=[(1.48,.81),(1.55,.85),(1.67,.82),(1.8,.73),(1.95,.56),
          (2.06,.34),(2.16,.16),(2.19,.09),(2.24,.16),(2.30,.13),(2.34,.06),(2.46,.008)]
    p.turn(x,y,[(z+h*r,s*r) for h,s in dome],32)
    p.emit(name,roof,mat,.011)


for i,(x,y,z,r,stone) in enumerate([(west2-.9,11.2,22.15,1.14,umber),(west2-1,23.2,22.15,1.03,umber),
        (west1+8.4,11.5,19.51,.80,cream),(west1+16.5,12.1,19.51,.97,cream),
        (west2-.9,west_back-1.5,19.51,.83,umber),(east1+.8,7.7,15.14,.70,rose),
        (east1+6.4,7.7,15.14,.88,rose),(east1+15.5,8,15.14,.76,umber),(east2-.6,8.15,15.14,.80,rose)]):
    pavilion('Rooftop belvedere %02d'%i,x,y,z,r,stone,i in (0,1,3))
# Aparapet marker/pole appears at the near corner of the right gallery.
mast=Carving()
mx=plan_x(571,7.0)
mast.turn(mx,7,[(14.5,.12),(15.2,.083),(21.8,.045),(22.65,.026)],12)
mast.emit('Terrace • flagstaff',roof,iron)
cloth=Carving()
for i in range(14):
    t=i/13
    cloth.verts.extend([(mx-1.54*t,7+.16*sin(8*t),22.5-.58*t+.10*sin(4*t)),
                        (mx-1.54*t,7+.16*sin(8*t),21.33+.59*t+.08*sin(4*t))])
    if i:cloth.faces.append((2*i-2,2*i,2*i+1,2*i-1))
cloth.emit('Terrace • small pennant',roof,flagmat)

slab('Road bed | aggregate',street,road,(-380,360,-240,240,-.20,-.015))
slab('Approach | inner court paving',street,grit,(-110,34,-7,26,-.02,.075),.012)
# Low enclosure with individual recessed field, chamfered corners and lime lining.
def enclosure(name,u1,u2,y):
    x1=plan_x(u1,y)
    x2=plan_x(u2,y)
    count=max(1,round((x2-x1)/5.0))
    pitch=(x2-x1)/count
    body=Carving()
    lining=Carving()
    body.box(x1,x2,y,y+.55,.28,2.52)
    for j in range(count):
        a=x1+j*pitch+.17
        b=x1+(j+1)*pitch-.17
        def octagon(inset):
            l=a+inset
            r=b-inset
            z=.57+inset
            h=2.28-inset
            c=.23
            return [(l+c,z),(r-c,z),(r,z+c),(r,h-c),(r-c,h),(l+c,h),(l,h-c),(l,z+c)]
        outer,inner=octagon(0),octagon(.054)
        for i in range(8):
            ii=(i+1)%8
            lining.front([outer[i],outer[ii],inner[ii],inner[i]],y-.034,y-.006)
    body.emit(name+' | rendered solid wall',street,red,.045)
    lining.emit(name+' | chamfered lime panel outlines',street,lime,.006)
    slab(name+' | capping',street,rose,(x1-.04,x2+.04,y-.06,y+.61,2.49,2.62),.033)
    slab(name+' | battered plinth',street,grit,(x1-.12,x2+.12,y-.17,y+.7,.11,.36),.041)
    return x1,x2


ycurb=-8.6
_,left_end=enclosure('West street boundary',-128,402,ycurb)
right_start,_=enclosure('East street boundary',516,960,ycurb)
slab('Kerb | cut road edge',street,grit,(-137,43,ycurb-1.85,ycurb+1.4,-.01,.14),.045)
for j,(xx,h) in enumerate([(plan_x(286,ycurb),4.95),(left_end,5.05),(right_start,5.45)]):
    p=Carving()
    profile_box(p,xx-.37,xx+.37,ycurb-.1,ycurb+.66,[(.12,.13),(.28,.13),(.37,.02),(2.61,0),(2.74,.11),(2.84,.12)])
    p.turn(xx,ycurb+.23,[(2.83,.31),(3.08,.21),(h-.96,.16),(h-.88,.32),(h-.78,.37)],8,pi/8)
    for i in range(4):
        t=pi/4+i*pi/2
        pillar(p,xx+.28*cos(t),ycurb+.23+.28*sin(t),h-.78,.61,.046)
    p.turn(xx,ycurb+.23,[(h-.17,.35),(h-.13,.46),(h-.03,.42),(h+.16,.23),(h+.26,.07),(h+.42,.025)],8)
    p.emit('Street pier • lantern finial %d'%j,street,umber,.013)


# The approach in the photograph has a second, inclined wall in front of
# the long curtain. Its diagonal gives the left elevation a scale cue.
run=Carving()
lip=Carving()
for shape,offset in [(run,0),(lip,.075)]:
    sections=[]
    for u,v in [(132,337),(228,316),(304,298),(385,277)]:
        x=plan_x(u,-5.6)
        z=projected_z(u,v,-5.6)
        low=.12 if offset==0 else z-.09
        sections.append([(x,-5.6-offset,low),(x,-5.6-offset,z+offset),
                         (x,-5.03+offset,z+offset),(x,-5.03+offset,low)])
    shape.rings(sections)
run.emit('West approach | ascending enclosure',wall,rose,.04)
lip.emit('West approach | raised coping',wall,cream,.018)

# The west corner is partly screened by a street tree in the benchmark.
# Build fine silhouette and leaf clusters at that location; species is unknown.
def street_tree():
    twigs=Carving()
    leaves=Carving()
    bark=stone_material('Street tree | grey bark',(.075,.052,.036),(.21,.16,.102))
    green=stone_material('Street tree | dusty foliage',(.025,.060,.026),(.125,.205,.067))
    x=plan_x(65,-4.4)
    root=Vector((x,-4.4,.08))
    def branch(a,b,r0,r1):
        axis=(b-a).normalized()
        u=axis.cross(Vector((0,1,0))).normalized()
        v=axis.cross(u)
        twigs.rings([[tuple(point+rad*(u*cos(i*pi/3)+v*sin(i*pi/3))) for i in range(6)]
                     for point,rad in [(a,r0),(b,r1)]])
    fork=root+Vector((-.4,.2,3.0))
    branch(root,fork,.34,.24)
    for i in range(19):
        az=i*2.40
        length=rng.uniform(2.3,4.2)
        limb=fork+Vector((length*.53*cos(az),length*.53*sin(az),rng.uniform(1.7,3.3)))
        tip=limb+Vector((length*.48*cos(az),length*.48*sin(az),rng.uniform(.65,2.6)))
        branch(fork,limb,.105,.056)
        branch(limb,tip,.056,.022)
        for j in range(13):
            a=rng.uniform(0,2*pi)
            end=tip+Vector((1.3*cos(a),1.3*sin(a),rng.uniform(-.65,1.35)))
            branch(tip,end,.025,.008)
            for k in range(103):
                pos=end+Vector((rng.gauss(0,.62),rng.gauss(0,.55),rng.gauss(0,.43)))
                t=rng.uniform(0,2*pi)
                axis=Vector((.15*cos(t),.15*sin(t),rng.uniform(-.11,.10)))
                cross=Vector((-.06*sin(t),.06*cos(t),.035))
                idx=len(leaves.verts)
                leaves.verts.extend([tuple(pos-axis),tuple(pos+cross),tuple(pos+axis),tuple(pos-cross)])
                leaves.faces.append(tuple(range(idx,idx+4)))
    twigs.emit('West street tree | branches',street,bark)
    leaves.emit('West street tree | leaf canopy',street,green)
street_tree()


def add_cartouche():
    relief=Carving()
    for side in (-1,1):
        x=side*3.73
        z=7.48
        for i in range(12):
            t=2*pi*i/12
            # Four-sided petals lift forward at their rib.
            verts=[(x+.095*cos(t-.27),-.135,z+.095*sin(t-.27)),
                   (x+.29*cos(t),-.15,z+.29*sin(t)),
                   (x+.095*cos(t+.27),-.135,z+.095*sin(t+.27)),
                   (x+.17*cos(t),-.203,z+.17*sin(t))]
            start=len(relief.verts)
            relief.verts.extend(verts)
            for a,b in [(0,1),(1,2),(2,0)]:
                relief.faces.append((start+a,start+b,start+3))
    relief.emit('Spandrels • cut stone rosettes, interpreted',gate,carved)


add_cartouche()
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1600
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.view_settings.exposure=.32
scene.frame_end=61
scene.frame_set(61)

world=bpy.data.worlds.new('Horizon daylight')
world.use_nodes=True
scene.world=world
nodes=world.node_tree.nodes
link=world.node_tree.links.new
tex=nodes.new('ShaderNodeTexCoord')
xyz=nodes.new('ShaderNodeSeparateXYZ')
link(tex.outputs['Generated'],xyz.inputs[0])
sky=nodes.new('ShaderNodeValToRGB')
sky.color_ramp.elements[0].color=(.63,.71,.87,1)
sky.color_ramp.elements[1].position=.61
sky.color_ramp.elements[1].color=(.161,.236,.478,1)
link(xyz.outputs['Z'],sky.inputs[0])
bg=nodes.get('Background')
link(sky.outputs[0],bg.inputs[0])
bg.inputs['Strength'].default_value=1.05
light=bpy.data.lights.new('Day sun','SUN')
light.energy=4.1
light.angle=math.radians(1.2)
sun=bpy.data.objects.new('Sun • street daylight',light)
rig.objects.link(sun)
sun.rotation_euler=Vector((.55,.73,-.92)).to_track_quat('-Z','Y').to_euler()
light.color=(1,.931,.824)
cams=[('01-reference-matched-exterior',match),
      ('02-three-quarter-exterior',camera('02 | Along the western curtain',(-34,-47,7),(-8,3,8.20),37)),
      ('03-human-eye-approach',camera('03 | Forecourt, eye level',(-4.2,-21.0,1.72),(-.35,1,4.9),33)),
      ('04-gateway-closeup',camera('04 | Threshold and vaulted return',(1.9,-7.7,2.05),(-.31,1.7,3.80),25)),
      ('05-architectural-detail',camera('05 | Western jharokha and roof pavilions',(west2+3.4,-3.0,15.2),(west2-5.3,10,17.45),47)),
      ('06-cinematic-exterior',camera('06 | Late sun, street frontage',(17.4,-46,3.3),(-11,4,9.2),34))]
scene.camera=match
scene['Reference']='India Cine Hub street exterior • external local guide • unverified gate name'
scene['Layout']='Provisional placement on southern OSM boundary. Photo constrains the visible elevation.'
scene['Door motion']='Frame 1 closed → 61 open. Passage volume and pivots are interpretive.'
scene['Color configuration']=os.getenv('OCIO','System default')
# Open the editable file in the matched camera. All view overlays remain optional.
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.overlay.show_overlays=False

if PROOF:
    scene.render.resolution_percentage=50
    scene.cycles.samples=6
    for filename,cam in cams[:-1]:
        scene.camera=cam
        scene.render.filepath=str(PRIVATE/(filename+'-proof.png'))
        bpy.ops.render.render(write_still=True)
else:
    blend=ROOT/'blender/junagarh-exterior-v01.blend'
    for im in bpy.data.images:
        if im.filepath:
            im.filepath='//'+os.path.relpath(bpy.path.abspath(im.filepath),blend.parent)
    scene.render.filepath='//../renders/junagarh/exterior-v01/'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True,relative_remap=False)
    RENDERS.mkdir(parents=True,exist_ok=True)
    for filename,cam in cams:
        scene.camera=cam
        if filename.startswith('06'):
            sun.rotation_euler=Vector((.88,.52,-.27)).to_track_quat('-Z','Y').to_euler()
            light.color=(1,.67,.41)
            light.energy=4
            bg.inputs['Strength'].default_value=.49
            sky.color_ramp.elements[0].color=(.89,.60,.44,1)
        scene.render.filepath=str(RENDERS/(filename+'.png'))
        bpy.ops.render.render(write_still=True)
