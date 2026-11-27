"""Build the editable state relief and render the five review cameras in Blender."""
import json
import math
import os
from pathlib import Path

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'.cache'
DATA=ROOT/'data'
PREVIEW=os.getenv('RAJ_PROOF')=='1'
coverage=json.loads((DATA/'coverage.json').read_text())
manifest=json.loads((DATA/'chapters.json').read_text())
stops=manifest['chapters']
bounds=coverage['raster_bounds_km']
exag=manifest['vertical_exaggeration']
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
bpy.context.preferences.filepaths.save_version=0


def collection(name,parent=None):
    c=bpy.data.collections.new(name)
    (parent or scene.collection).children.link(c)
    return c


terrain=collection('Terrain')
boundary=collection('Administrative boundary')
water=collection('Water')
environment=collection('Environmental materials')
anchors=collection('Chapter anchors')
lighting=collection('Lighting')
cameras=collection('Cameras')


def obj(name,dat,coll):
    o=bpy.data.objects.new(name,dat)
    coll.objects.link(o)
    return o


def image_node(nodes,name,raw=False):
    path=CACHE/name
    im=bpy.data.images.load(str(path),check_existing=True)
    if raw: im.colorspace_settings.is_data=True
    n=nodes.new('ShaderNodeTexImage')
    n.image=im
    n.extension='EXTEND'
    return n


def solid(name,color):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*color,1)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    emission=nodes.new('ShaderNodeEmission')
    emission.inputs[0].default_value=(*color,1)
    mat.node_tree.links.new(emission.outputs[0],nodes.get('Material Output').inputs[0])
    return mat


def animate(socket,values):
    for i,v in enumerate(values,1):
        socket.default_value=v
        socket.keyframe_insert(data_path='default_value',frame=i)


def sky_radiance(nodes,link,direction,clamp_horizon=False):
    separate=nodes.new('ShaderNodeSeparateXYZ')
    link(direction,separate.inputs[0])
    vector=nodes.new('ShaderNodeCombineXYZ')
    for axis in ['X','Y']:
        link(separate.outputs[axis],vector.inputs[axis])
    if clamp_horizon:
        vector.inputs['Z'].default_value=.012
    else:
        horizon=nodes.new('ShaderNodeMath')
        horizon.operation='MAXIMUM'
        horizon.inputs[1].default_value=.012
        link(separate.outputs['Z'],horizon.inputs[0])
        link(horizon.outputs[0],vector.inputs['Z'])
    rotate=nodes.new('ShaderNodeVectorRotate')
    rotate.rotation_type='Z_AXIS'
    rotate.inputs['Angle'].default_value=math.radians(180)
    link(vector.outputs[0] if clamp_horizon else direction,rotate.inputs['Vector'])
    env=nodes.new('ShaderNodeTexEnvironment')
    env.image=bpy.data.images.load(str(CACHE/'industrial_sunset_02_puresky.hdr'),check_existing=True)
    link(rotate.outputs[0],env.inputs[0])
    scale=nodes.new('ShaderNodeVectorMath')
    scale.operation='SCALE'
    scale.inputs['Scale'].default_value=.72
    link(env.outputs[0],scale.inputs[0])
    if clamp_horizon:
        cap=nodes.new('ShaderNodeVectorMath')
        cap.operation='MINIMUM'
        cap.inputs[1].default_value=(.92,.81,.75)
        link(scale.outputs[0],cap.inputs[0])
        return cap.outputs[0]
    return scale.outputs[0]


def atlas_ground(detail=False):
    mat=bpy.data.materials.new('Earth | Sentinel-2 annual median on Copernicus relief')
    mat.use_nodes=True
    n=mat.node_tree.nodes
    link=mat.node_tree.links.new
    shader=n.get('Principled BSDF')
    uv=n.new('ShaderNodeTexCoord')
    rgb=image_node(n,'mewar-surface.jpg' if detail else 'surface.jpg')
    masks=image_node(n,'surface-masks.png',True)
    norm=image_node(n,'mewar-normal.png' if detail else 'relief-normal.png',True)
    for image in (rgb,masks,norm):link(uv.outputs['UV'],image.inputs['Vector'])
    if detail:
        local=n.new('ShaderNodeUVMap')
        local.uv_map='Mewar UV'
        for tex in [rgb,norm]:link(local.outputs[0],tex.inputs[0])
    normal=n.new('ShaderNodeNormalMap')
    normal.space='WORLD'
    animate(normal.inputs['Strength'],[.78,.67,1,1,1])
    link(norm.outputs['Color'],normal.inputs['Color'])
    link(normal.outputs[0],shader.inputs['Normal'])
    split=n.new('ShaderNodeSeparateColor')
    link(masks.outputs['Color'],split.inputs[0])
    tint=n.new('ShaderNodeMixRGB')
    link(split.outputs[0],tint.inputs[0])
    link(rgb.outputs['Color'],tint.inputs[1])
    tint.inputs[2].default_value=(.073,.147,.155,1)
    link(tint.outputs[0],shader.inputs['Base Color'])
    rough=n.new('ShaderNodeMapRange')
    rough.inputs['To Min'].default_value=.93
    rough.inputs['To Max'].default_value=.32
    link(split.outputs[0],rough.inputs[0])
    link(rough.outputs[0],shader.inputs['Roughness'])
    # Airlight follows optical path length. It shares the sky's horizon colour.
    distance=n.new('ShaderNodeCameraData')
    fog=n.new('ShaderNodeMapRange')
    fog.interpolation_type='SMOOTHSTEP'
    animate(fog.inputs['From Min'],[14,5,1500,600,710])
    animate(fog.inputs['From Max'],[405,177,2000,1650,1780])
    link(distance.outputs['View Distance'],fog.inputs[0])
    veil=n.new('ShaderNodeEmission')
    incoming=n.new('ShaderNodeVectorMath')
    incoming.operation='SCALE'
    incoming.inputs['Scale'].default_value=-1
    link(n.new('ShaderNodeNewGeometry').outputs['Incoming'],incoming.inputs[0])
    link(sky_radiance(n,link,incoming.outputs[0],True),veil.inputs[0])
    blend=n.new('ShaderNodeMixShader')
    camera_fog=n.new('ShaderNodeMath')
    camera_fog.operation='MULTIPLY'
    link(fog.outputs[0],camera_fog.inputs[0])
    link(n.new('ShaderNodeLightPath').outputs['Is Camera Ray'],camera_fog.inputs[1])
    link(camera_fog.outputs[0],blend.inputs[0])
    mat.cycles.emission_sampling='NONE'
    link(shader.outputs[0],blend.inputs[1])
    link(veil.outputs[0],blend.inputs[2])
    # In verification view only, exclude land outside the administrative outline.
    inverse=n.new('ShaderNodeMath')
    inverse.operation='SUBTRACT'
    inverse.inputs[0].default_value=1
    link(split.outputs[1],inverse.inputs[1])
    gate=n.new('ShaderNodeMath')
    gate.operation='MULTIPLY'
    link(inverse.outputs[0],gate.inputs[0])
    animate(gate.inputs[1],[0,0,1,0,0])
    cut=n.new('ShaderNodeMixShader')
    link(gate.outputs[0],cut.inputs[0])
    fade=n.new('ShaderNodeMapRange')
    fade.interpolation_type='SMOOTHERSTEP'
    fade.inputs['From Min'].default_value=.45
    fade.inputs['From Max'].default_value=.975
    link(camera_fog.outputs[0],fade.inputs[0])
    horizon=n.new('ShaderNodeMixShader')
    link(fade.outputs[0],horizon.inputs[0])
    link(blend.outputs[0],horizon.inputs[1])
    link(n.new('ShaderNodeBsdfTransparent').outputs[0],horizon.inputs[2])
    link(horizon.outputs[0],cut.inputs[1])
    link(n.new('ShaderNodeBsdfTransparent').outputs[0],cut.inputs[2])
    link(cut.outputs[0],n.get('Material Output').inputs['Surface'])
    return mat


land=atlas_ground()
local_land=atlas_ground(True)
local_land.name="Mewar | native DSM and fine satellite colour"
ink=solid('Lettering | warm chalk',(.97,.90,.72))
marker=solid('Sites | deep umber',(.044,.025,.018))
brass=solid('Selection | pale ochre',(.91,.57,.25))
shore=solid('Hydrography | slate',(.048,.126,.138))
border=solid('Boundary | umber',(.235,.162,.105))


def mesh_grid(name,path,regional):
    arr=np.load(path)
    x,y,z,valid=[arr[k].copy() for k in ('x','y','z','valid')]
    nx,ny=len(x),len(y)
    (xlo,xhi),(ylo,yhi)=coverage['detail_index_bounds']
    is_native=path.name=='native-mesh.npz'
    if not regional and not is_native:
        # Snap the high-resolution perimeter onto the coarse linear edge to
        # prevent cracks between grids with different sample spacing.
        for row in (0,-1):
            z[row]=np.interp(x,x[::5],z[row,::5])
        for col in (0,-1):
            z[:,col]=np.interp(y,y[::5],z[::5,col])
    xx,yy=np.meshgrid(x,y)
    points=np.stack((xx,yy,z*exag/1000),axis=-1).astype('f4').reshape(-1,3)
    mask=valid[:-1,:-1]&valid[1:,:-1]&valid[1:,1:]&valid[:-1,1:]
    if regional:mask[ylo:yhi,xlo:xhi]=False
    if not regional and not is_native:
        mask[np.ix_((y[:-1]>=-190)&(y[:-1]<-123),(x[:-1]>=-65)&(x[:-1]<-2))]=False
    rows,cols=np.where(mask)
    a=(rows*nx+cols).astype('i4')
    loop=np.column_stack((a,a+1,a+nx+1,a+nx)).ravel()
    mesh=bpy.data.meshes.new(name)
    mesh.vertices.add(len(points))
    mesh.vertices.foreach_set('co',points.ravel())
    mesh.loops.add(len(loop))
    mesh.loops.foreach_set('vertex_index',loop)
    mesh.polygons.add(len(a))
    mesh.polygons.foreach_set('loop_start',np.arange(0,len(loop),4,dtype='i4'))
    mesh.polygons.foreach_set('use_smooth',np.ones(len(a),dtype=bool))
    uv=mesh.uv_layers.new(name='Projected Lambert UV')
    xy=points[loop,:2].copy()
    xy[:,0]=(xy[:,0]-bounds[0])/(bounds[2]-bounds[0])
    xy[:,1]=(xy[:,1]-bounds[1])/(bounds[3]-bounds[1])
    uv.data.foreach_set('uv',xy.ravel())
    if is_native:
        uv=mesh.uv_layers.new(name='Mewar UV')
        local_xy=points[loop,:2].copy()
        local_xy[:,0]=(local_xy[:,0]+65)/63
        local_xy[:,1]=(local_xy[:,1]+190)/67
        uv.data.foreach_set('uv',local_xy.ravel())
        mesh.uv_layers['Projected Lambert UV'].active_render=True
    mesh.update(calc_edges=True)
    assert mesh.polygons[len(a)//2].normal.z>0
    o=obj(name,mesh,terrain)
    mesh.materials.append(local_land if is_native else land)
    o['grid_spacing_km']=float(x[1]-x[0])
    o['source']='Copernicus GLO-90 DSM; elevation in metres × 3.2 / 1000'
    for frame,vertical in enumerate([2.5,1.65,exag,exag,exag],1):
        o.scale.z=vertical/exag
        o.keyframe_insert(data_path='scale',frame=frame)
    return o


mesh_grid('Rajasthan and geographical surround | regional relief',CACHE/'regional-mesh.npz',True)
mesh_grid('Mewar | finer Aravalli and lake catchments',CACHE/'mewar-mesh.npz',False)


mesh_grid('Kumbhalgarh approaches | native DSM detail',CACHE/'native-mesh.npz',False)


def line(name,coll,coords,width,material):
    curve=bpy.data.curves.new(name,'CURVE')
    curve.dimensions='3D'
    curve.resolution_u=1
    curve.bevel_depth=width
    curve.bevel_resolution=1
    spline=curve.splines.new('POLY')
    spline.points.add(len(coords)-1)
    pts=np.ones((len(coords),4),dtype='f4')
    pts[:,:3]=coords
    spline.points.foreach_set('co',pts.ravel())
    o=obj(name,curve,coll)
    curve.materials.append(material)
    return o


def shown_only(o,frame):
    for i in range(1,6):
        for attr in ('hide_render','hide_viewport'):
            setattr(o,attr,i!=frame)
            o.keyframe_insert(data_path=attr,frame=i)


for feature in json.loads((CACHE/'guides.json').read_text()):
    admin=feature['layer']=='state'
    coords=np.asarray(feature['xyz'])
    coords[:,2]+=.12
    o=line(feature['name'] or feature['layer'],boundary if admin else water,
           coords,.51 if admin else .31,border if admin else shore)
    shown_only(o,3)
# The water class in the ground shader retains observed shoreline detail at a
# scale finer than the regional mesh. Named datasets remain independently editable.
water['surface_mask']='surface-masks.png, R = composite-derived water confidence'
environment['surface_sources']='Packed satellite albedo, hydrography/state/vegetation mask and DEM normals'
for m in [land,shore,border]:
    handle=obj(m.name,None,environment)
    handle.empty_display_size=.01
    handle['material']=m

for stop in stops:
    o=obj(f"{stop['chapter']:02} | {stop['fort']}",None,anchors)
    o.location=stop['blender_xyz_km']
    o.empty_display_type='CIRCLE'
    o.empty_display_size=1.7
    for k in ('chapter','title','latitude','longitude','source','elevation_dsm_m'):
        o[k]=stop[k]

sun_data=bpy.data.lights.new('Western sun','SUN')
sun=obj('Low western sun',sun_data,lighting)
sun.rotation_euler=Vector((.92,.32,-.265)).to_track_quat('-Z','Y').to_euler()
sun_data.energy=4.15
sun_data.angle=math.radians(1.7)
sun_data.color=(1,.83,.68)
world=bpy.data.worlds.new('Dry evening sky | horizon scattering')
scene.world=world
world.use_nodes=True
n=world.node_tree.nodes
link=world.node_tree.links.new
coords=n.new('ShaderNodeTexCoord')
sky=sky_radiance(n,link,coords.outputs['Generated'])
bg=n.get('Background')
verification=n.new('ShaderNodeMixRGB')
animate(verification.inputs[0],[0,0,1,0,0])
link(sky,verification.inputs[1])
verification.inputs[2].default_value=(.82,.79,.70,1)
link(verification.outputs[0],bg.inputs[0])
env=n.new('ShaderNodeBackground')
env.inputs[0].default_value=(.43,.51,.62,1)
env.inputs[1].default_value=.76
mix=n.new('ShaderNodeMixShader')
link(n.new('ShaderNodeLightPath').outputs['Is Camera Ray'],mix.inputs[0])
link(env.outputs[0],mix.inputs[1])
link(bg.outputs[0],mix.inputs[2])
link(mix.outputs[0],n.get('World Output').inputs['Surface'])

scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=32 if not PREVIEW else 8
scene.cycles.use_denoising=True
scene.cycles.denoising_input_passes='RGB_ALBEDO_NORMAL'
scene.cycles.max_bounces=3
scene.cycles.transparent_max_bounces=32
scene.render.image_settings.file_format='PNG'
scene.render.resolution_percentage=100
scene.render.film_transparent=False
scene.frame_end=5
scene.render.fps=1


def camera(name,where,target,lens=40,ortho=None):
    data=bpy.data.cameras.new(name)
    data.clip_end=3500
    data.clip_start=.015
    data.sensor_fit='HORIZONTAL'
    data.lens=lens
    o=obj(name,data,cameras)
    o.location=where
    if ortho:
        data.type='ORTHO'
        data.ortho_scale=ortho
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    return o


shots=[
    ('01-wide-aerial',1920,1080,camera('01 | Across the Aravalli front',(24,-198,22),(-98,-103,1),41)),
    ('02-rajsamand-approach',1600,1000,camera('02 | Rajsamand water and the Aravalli front',(-3.45,-159.75,2.65),(-27,-149,1.14),45)),
    ('03-geographic-verification',1400,1400,camera('03 | North-up verification',(-18,10,900),(-18,10,0),ortho=989)),
    ('04-desktop',1440,900,camera('04 | Regional atlas',(-47,-418,474),(-30,-15,1),ortho=711)),
    ('05-mobile',390,844,camera('05 | From the eastern plains toward the Thar',(227.662,-142.744,690),(137.783,-98.907,590),lens=65.574717)),
]
shots[4][3].data.shift_x=.07760418
shots[4][3].data.shift_y=-1.11886837
for frame,(name,width,height,cam) in enumerate(shots,1):
    timeline=scene.timeline_markers.new(name,frame=frame)
    timeline.camera=cam
shots[2][3].rotation_euler=(0,0,0)


def label(name,coll,text,size,pos,material,align='CENTER'):
    font=bpy.data.curves.new(name,'FONT')
    font.body=text
    font.size=size
    font.align_x=align
    font.align_y='CENTER'
    o=obj(name,font,coll)
    o.location=pos
    font.materials.append(material)
    return o


def circle(name,coll,cx,cy,z,r,mat):
    count=40
    coords=[(cx+r*math.cos(a*math.tau/count),cy+r*math.sin(a*math.tau/count),z) for a in range(count)]
    m=bpy.data.meshes.new(name)
    m.from_pydata(coords,[],[list(range(count))])
    m.materials.append(mat)
    return obj(name,m,coll)


def annotate(frame):
    name,w,h,cam=shots[frame-1]
    scene.frame_set(frame)
    scene.render.resolution_x=w
    scene.render.resolution_y=h
    scene.camera=cam
    bpy.context.view_layer.update()
    coll=collection(name+' | site labels',anchors)
    exact=[]
    for s in stops:
        uv=world_to_camera_view(scene,cam,Vector(s['blender_xyz_km']))
        exact.append((uv.x*w,uv.y*h))
    assert all(12<x<w-12 and 15<y<h-15 for x,y in exact),(name,exact)
    # The two Jaipur sites are about 7 km apart. Offset their screen labels
    # only; short leaders terminate at the exact two projected coordinates.
    perspective=cam.data.type=='PERSP'
    span=10*36/cam.data.lens if perspective else cam.data.ortho_scale
    px=span/w
    def xy(x,y,z):
        depth=10+(-z-1)*.02 if perspective else -z
        ratio=depth/10 if perspective else 1
        return (((x-w/2)*px+cam.data.shift_x*span)*ratio,
                ((y-h/2)*px+cam.data.shift_y*span)*ratio,-depth)
    r=10.5 if frame==5 else 12
    for i,(x,y) in enumerate(exact):
        u,v=x,y
        if i in (3,9):
            sign=1 if (i==3)==(exact[3][1]>exact[9][1]) else -1
            u+=13 if i==3 else -13
            v+=sign*(r+3)
            line('Exact site',coll,[xy(x,y,-1.08),xy(u,v,-1.08)],.68*px,ink)
            circle('Ground contact',coll,*xy(x,y,-1.075),2.1*px,ink)
        circle('Inlay',coll,*xy(u,v,-1.06),(r+1.15)*px,brass if i==0 else ink)
        circle('Site number ground',coll,*xy(u,v,-1.05),r*px,marker)
        label('Chapter '+str(i+1),coll,f'{i+1:02}',(r*1.34)*px,xy(u,v,-1.04),ink)
        if i==0 and frame!=3:
            # Text belongs to the initially selected site. Keep it inside both
            # frames and attach it to the numbered point in screen space.
            side=1 if u<w*.57 else -1
            align='LEFT' if side==1 else 'RIGHT'
            tx=u+side*(r+7)
            for title,font_size,yy in [('Junagarh Fort',19,v+7),('THE BEGINNING',10.5,v-9)]:
                outline=label('Type keyline',coll,title,font_size*px,xy(tx,yy,-1.035),ink,align)
                outline.data.offset=.75*px
                label('Selected site',coll,title,font_size*px,xy(tx,yy,-1.03),marker,align)
    for o in coll.objects:
        o.parent=cam
        o.visible_shadow=False
        o.visible_diffuse=False
        o.visible_glossy=False
        shown_only(o,frame)
    print('PROJECTED SITES',name,[(round(a),round(b)) for a,b in exact],flush=True)


for index in (3,4,5):annotate(index)
scene.frame_set(4)
scene.camera=shots[3][3]
scene.render.resolution_x,scene.render.resolution_y=1440,900
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.clip_end=3500
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.overlay.show_overlays=False
scene['Georeferencing']=manifest['crs']
scene['Units']='1 Blender unit = 1 projected kilometre. Elevation amplified 3.2×.'
scene['Sources']='Copernicus GLO-90; ESA WorldCover Sentinel-2 2021; Natural Earth; Wikidata. See README.'
renders=ROOT/('renders' if not PREVIEW else '.cache/proofs')
renders.mkdir(parents=True,exist_ok=True)
if not PREVIEW:
    bpy.ops.file.pack_all()
    scene.render.filepath='//renders/'
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rajasthan-terrain-map.blend'),compress=True)
for frame,(name,w,h,cam) in enumerate(shots,1):
    scene.frame_set(frame)
    scene.camera=cam
    scene.render.resolution_x=w
    scene.render.resolution_y=h
    scene.render.resolution_percentage=50 if PREVIEW and frame!=5 else 100
    scene.render.filepath=str(renders/(name+'.png'))
    bpy.ops.render.render(write_still=True)
