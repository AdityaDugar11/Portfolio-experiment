"""Sculpt a miniature around the local Phase 01 metric boundary and survey points."""
import json
import math
from pathlib import Path

import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates, distance_transform_edt, binary_fill_holes
from scipy.spatial import Delaunay, cKDTree
from shapely import contains_xy
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from shapely.geometry import Polygon
from shapely.geometry.polygon import orient
from skimage.graph import route_through_array
from skimage.measure import find_contours
from shapely.affinity import scale as scale_polygon
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "map-phase-01"
CACHE = SOURCE / ".cache"
WORK = ROOT / "work"
WORK.mkdir(exist_ok=True)
rng = np.random.default_rng(301)
guides = json.loads((CACHE / "guides.json").read_text())
state = orient(Polygon(np.array(next(g["xyz"] for g in guides if g["layer"] == "state"))[:, :2]), 1)
state = state.simplify(.65, preserve_topology=True)
sites = json.loads((SOURCE / "data/chapters.json").read_text())["chapters"]
anchors = np.array([s["blender_xyz_km"][:2] for s in sites])
assert len(anchors) == 10 and contains_xy(state, *anchors.T).all()

# All working surfaces share a kilometre lattice. The visible mesh is cut later.
x_axis = np.arange(-458., 431.)
y_axis = np.arange(-392., 420.)
x, y = np.meshgrid(x_axis, y_axis)

def read_grid(field, px, py):
    return map_coordinates(field, [py-y_axis[0], px-x_axis[0]], order=1, mode="nearest")

def noise(spacing):
    tile = rng.normal(size=(int(y.shape[0]/spacing)+5, int(x.shape[1]/spacing)+5))
    field = map_coordinates(tile, [(y-y_axis[0])/spacing+1, (x-x_axis[0])/spacing+1], order=3)
    return np.clip(field/1.8, -1.45, 1.45)

def smooth(a):
    t = np.clip(a, 0, 1)
    return t*t*(3-2*t)

broad, middle, small, grit = [noise(s) for s in (57, 17, 5.5, 2.2)]
in_state = contains_xy(state, x, y)
edge_distance = distance_transform_edt(in_state)

# Separate the surveyed ridge-and-valley structure from the regional plateau.
# Anisotropic bedding uses the strike of the exposure and the actual terrain
# elevation, so bands emerge on the flanks and run through the ridge geometry.
dem = np.load(CACHE / "regional-mesh.npz")
measured = map_coordinates(dem["z"], [(y-dem["y"][0])/1.25, (x-dem["x"][0])/1.25],
                           order=1, mode="nearest")
strike = .59*x + .81*y
cross = .81*x - .59*y
ridge_belt = np.exp(-((cross-37-15*np.sin(strike/89))/104)**2)
ridge_belt *= .25 + .75*smooth((strike+341)/90)*smooth((286-strike)/95)
shape = gaussian_filter(measured, 3.0)
foothills = gaussian_filter(measured, 12)
incision = shape-foothills
foothill_relief = (np.maximum(foothills-165, 0)*.026
                  * (.46+.54*ridge_belt))
folded = np.sign(incision)*np.abs(incision)**.89
relief = foothill_relief + folded*(.064+.118*ridge_belt)
# Compressed altitude broadens the high crests while retaining the relief of
# the lower parallel folds, where the visible landscape passes through.
relief = np.where(relief>23,23+25*np.tanh((relief-23)/25),relief)
# A curved, asymmetric fault shoulder links the measured foothills west of
# Jaisamand. It tapers along strike into spurs and separates two valleys.
section = .52*(x+48) + .85*(y+238)
normal = .85*(x+48) - .52*(y+238)
trace = normal - 6*np.sin(section/28) - .065*section - 2.6*middle
apron = smooth(1-np.abs(trace)/np.where(trace<0,27,33))
scarp = smooth(1-np.abs(trace)/np.where(trace<0,15,10))
termination = smooth((section+59)/25)*smooth((75-section)/27)
relief += termination*(7*apron + (7.3+2.6*broad)*scarp)
relief = np.maximum(relief, -2)
relief *= .26+.74*smooth(edge_distance/25)
# Lower topographical extrema to a reachable slope from adjacent terrain.
# Cardinal and diagonal passes leave broad rocky fronts in place while
# removing narrow DEM spikes in the digitally exaggerated cutaway.
for _ in range(28):
    pad = np.pad(relief,1,mode="edge")
    relief = np.minimum.reduce(
        [relief, pad[1:-1,:-2]+1.08, pad[1:-1,2:]+1.08,
         pad[:-2,1:-1]+1.08, pad[2:,1:-1]+1.08,
         pad[:-2,:-2]+1.53, pad[:-2,2:]+1.53, pad[2:,:-2]+1.53, pad[2:,2:]+1.53]
    )
gy, gx = np.gradient(relief)
flank = smooth((np.hypot(gx,gy)-.48)/1.15)
bedding = relief*.28 + .050*cross + .032*strike + .19*middle
ledge = np.tanh(1.7*np.sin(bedding * math.tau))
relief += flank*ridge_belt*(.66*ledge + .42*small + .12*grit)
rock_rib = .5+.5*ledge
desert = smooth((-x-40 + 16*broad - .08*y)/152) * (1-.50*smooth((relief-7)/16))
z = 4.4 + (1-.59*desert)*(1.9*broad + .80*middle + .19*small) + .04*grit + relief

# Six sediment bodies interrupt one another with open interdune corridors.
# A rotated exclusion ellipse enforces the separation in wind coordinates.
fields = [
    (-351,43,70,72,18, .03), (-283,83,71,82,16,-.17),
    (-316,-57,68,78,16, .31), (-236,-137,74,80,12,-.27),
    (-330,155,60,59,12, .24), (-213,143,62,66,13,-.15),
]
dune_rng = np.random.default_rng(417)
centres = []
sand = np.zeros_like(x)
dune_domain = state.buffer(-5)
for cx, cy, rx, ry, quota, yaw in fields:
    accepted = 0
    for _ in range(1200):
        bearing = dune_rng.uniform(0, math.tau)
        distance = math.sqrt(dune_rng.random())
        px, py = cx+rx*math.cos(bearing)*distance, cy+ry*math.sin(bearing)*distance
        if not contains_xy(dune_domain, px, py) or read_grid(desert, np.array([px]), np.array([py]))[0] < .35:
            continue
        if centres:
            dx, dy = np.asarray(centres).T - np.array([[px], [py]])
            if np.min((dx/28)**2 + (dy/22)**2) < 1:
                continue
        centres.append((px, py))
        accepted += 1
        angle = yaw + .095*math.sin(py/28) + dune_rng.uniform(-.10,.10)
        ca, sa = math.cos(angle), math.sin(angle)
        run = dune_rng.uniform(20,33)
        span = dune_rng.uniform(24,46)
        peak = dune_rng.uniform(4.8,10.5) * (1-.32*distance)
        patch = np.ix_(np.flatnonzero(abs(y_axis-py)<70), np.flatnonzero(abs(x_axis-px)<90))
        dx, dy = x[patch]-px, y[patch]-py
        along = dx*ca+dy*sa
        side = (-dx*sa+dy*ca)/span
        taper = np.maximum(0, 1-side**2)**1.32
        crest = along - run*(.57*side**2 + .12*np.sin(side*3.8+py*.03)) - .83*middle[patch]
        stoss = smooth(1+crest/(run*1.9))
        lee = np.maximum(0, 1-crest/(run*.35))**1.22
        dune = peak*taper*np.where(crest<0, stoss, lee)
        sand[patch] = np.maximum(sand[patch], dune)
        if accepted == quota:
            break
centres = np.array(centres)
assert len(centres) > 45 and contains_xy(dune_domain, *centres.T).all()
delta = (centres[:,None,:]-centres[None,:,:])/np.array([28,22])
separation = np.linalg.norm(delta, axis=2)
np.fill_diagonal(separation,np.inf)
assert separation.min() >= 1
dunes = gaussian_filter(sand,.72)
z += dunes*desert*(.88+.12*broad)*smooth(edge_distance/9)

# Keep the existing fort study on a level terrace. Its XY is the survey anchor.
px, py = anchors[0]
terrace = smooth((1.36-np.hypot((x-px)/32,(y-py)/25))/.36)
z = z*(1-terrace) + 5.8*terrace

# Trace two Mewar shorelines from the existing Sentinel-2 water index.
# The reservoir outline is the existing Natural Earth feature.
water_mask = np.asarray(Image.open(CACHE/"surface-masks.png"))[:,:,0]
pixel_x, pixel_y = 1005/water_mask.shape[1], 902.5/water_mask.shape[0]
lakes = []
lake_shapes = []
shore = np.full(x.shape, 200.)
wet = np.zeros(x.shape, bool)

def spectral_outline(cx, cy, radius):
    col, row = round((cx+500)/pixel_x), round((492.5-cy)/pixel_y)
    local = water_mask[row-radius:row+radius+1,col-radius:col+radius+1]
    mask = binary_fill_holes(gaussian_filter(local.astype(float),1.15)>100)
    contours = find_contours(mask.astype(float),.5)
    polygons = [Polygon(np.column_stack((-500+(col-radius+rc[:,1]+.5)*pixel_x,
                      492.5-(row-radius+rc[:,0]+.5)*pixel_y))) for rc in contours if len(rc)>8]
    return max(polygons, key=lambda p:p.area).buffer(0).simplify(.23)

reservoir = Polygon(np.asarray(next(g["xyz"] for g in guides if g["layer"]=="lakes"))[:,:2])
for name, polygon, enlargement in [
    ("Rajsamand",spectral_outline(-11.5,-158,28),3.55),
    ("Jaisamand",spectral_outline(-2,-248,53),2.45),
    ("Natural Earth reservoir 1159117563",reservoir,1.22),
]:
    polygon = scale_polygon(polygon, enlargement, enlargement, origin="centroid")
    cx,cy = polygon.centroid.coords[0]
    level = float(read_grid(gaussian_filter(z,9), np.array([cx]), np.array([cy]))[0])-1
    fill = contains_xy(polygon, x, y)
    inside_dist = distance_transform_edt(fill)-.5
    outside_dist = distance_transform_edt(~fill)-.5
    signed = gaussian_filter(np.where(fill,-inside_dist,outside_dist),.65)

    bank_mix = 1-smooth((signed-4.5)/8.0)
    bed = level + 1.10*signed
    z = z*(1-bank_mix)+bed*bank_mix
    shore = np.minimum(shore,np.abs(signed))
    wet |= signed < .13
    lake_shapes.append(signed)
    lakes.append(dict(name=name,bounds=polygon.bounds,level=level))
    assert fill.sum() > 35 and contains_xy(state,cx,cy)
# Seasonal salt-flat treatment in the Sambhar basin, interpreted from the same
# composite. A pale playa keeps the basin readable even in its dry state.
playa = np.hypot((x-105+.32*(y-47))/21,(y-47)/8.5)
salt = (1-smooth((playa-.55+.11*middle)/.53))
flat = smooth((1.6-playa)/.76)
z = z*(1-flat) + (4.65+.14*small)*flat

gy,gx = np.gradient(z)
slope = np.hypot(gx,gy)
exposed = smooth((slope-.35)/.88) * smooth((relief-2.8)/9)
exposed *= .85+.15*rock_rib
moisture = smooth(.37+.45*broad+.27*middle + .22*(1-desert)
                  + .36*np.exp(-shore/9) - .20*smooth((z-19)/22))
clearings = smooth((.56+.49*middle+.24*small-.27*desert))
woods = moisture * clearings * (1-.94*exposed)*(1-.94*desert)*(1-salt)
colors = np.zeros((*x.shape,3))
def pigment(rgb, coverage):
    global colors
    colors = colors*(1-coverage[...,None]) + np.array(rgb)*coverage[...,None]

pigment((.36,.266,.147), np.ones(x.shape))
pigment((.60,.354,.162), desert)
pigment((.72,.462,.219), desert*smooth(.21+(dunes/13)+.38*broad))
pigment((.29,.285,.128), smooth(woods*1.34))
pigment((.165,.204,.08), smooth((woods-.28)/.60)*.75)
pigment((.245,.163,.113), np.clip(exposed*1.25,0,1))
pigment((.53,.352,.239), exposed*(.25+.53*rock_rib))
pigment((.45,.36,.20), np.exp(-shore/2.35)*.62)
pigment((.61,.60,.48), salt*.88)
colors *= (1+.12*middle+.08*small+.05*grit)[...,None]

outline = np.asarray(state.segmentize(1.6).exterior.coords)[:-1]
inside = contains_xy(state.buffer(-.65),x,y)
xy = np.stack([x[inside],y[inside]],axis=1)
xy += rng.uniform(-.20,.20,size=xy.shape)
interior = xy
# Recover every outline segment as a Delaunay edge by bisecting missing
# segments. Flood through triangle neighbours up to that constrained boundary.
for refinement in range(8):
    xy = np.vstack((outline,interior))
    tess = Delaunay(xy)
    faces = tess.simplices
    def edge_id(i,j):
        return np.minimum(i,j).astype(np.int64)*len(xy)+np.maximum(i,j)
    edge_keys = np.column_stack([edge_id(faces[:,(i+1)%3],faces[:,(i+2)%3]) for i in range(3)])
    ring = np.arange(len(outline))
    border_keys = edge_id(ring,np.roll(ring,-1))
    missing = ~np.isin(border_keys,edge_keys)
    if not missing.any():
        break
    outline = np.array([point for i,p in enumerate(outline) for point in
                        ([p,(p+outline[(i+1)%len(outline)])/2] if missing[i] else [p])])
else:
    raise ValueError("Could not recover entire state boundary")
open_edge = (tess.neighbors>=0) & ~np.isin(edge_keys,border_keys)
row,side = np.nonzero(open_edge)
adjacency = coo_matrix((np.ones(len(row),dtype=bool),(row,tess.neighbors[row,side])),
                       shape=(len(faces),len(faces)))
_,labels=connected_components(adjacency,directed=False)
inside_point=tess.find_simplex(anchors[0])
tris=faces[labels==labels[inside_point]]
assert len(np.unique(tris))==len(xy)
edge_counts=np.unique(np.sort(np.vstack((tris[:,[0,1]],tris[:,[1,2]],tris[:,[2,0]])),
                              axis=1),axis=0,return_counts=True)[1]
assert (edge_counts==1).sum()==len(ring) and edge_counts.max()==2
top = np.column_stack((xy,read_grid(z,*xy.T)))
# Evaluate placements against the same triangles the Blender scene renders.
def surface_height(points):
    simplex = tess.find_simplex(points)
    assert (simplex >= 0).all()
    transform = tess.transform[simplex]
    weights = np.einsum('nij,nj->ni',transform[:,:2],points-transform[:,2])
    return np.einsum('ni,ni->n',np.column_stack((weights,1-weights.sum(axis=1))),
                     top[tess.simplices[simplex],2])

# Tracks follow passes and leave their mark on the ground material. The saved
# centerlines remain editable without a second surface that can intersect.
towns = np.array([[-298,24],[-110,-40],[-63,139],[-70,-153],[153,60],[55,-183],
                  [216,-204],[232,-57],[158,-111],[-178,59],[21,-55],[58,31],[-7,-225],[-69,151],[-93,111],[-110,64],[-128,14]])
cost = 1 + 6*slope**1.4 + .8*(1+middle) + 2.6*desert*smooth(dunes/9)
valid = in_state & ~wet & (shore>1.4) & (edge_distance>2)
cost[~valid] = np.inf
pathways = []
for a,b in [(0,9),(9,1),(9,2),(2,11),(11,4),(1,3),(1,10),(3,12),(12,5),
            (3,10),(10,11),(10,8),(8,6),(8,7),(7,4),(5,8),(2,13),(13,14),(14,15),(15,16)]:
    def grid_index(point):
        return tuple(np.rint((point[::-1]-[y_axis[0],x_axis[0]])/2).astype(int))
    path, distance = route_through_array(cost[::2,::2],grid_index(towns[a]),grid_index(towns[b]))
    assert np.isfinite(distance), (a,b)
    iy,ix = np.array(path).T*2
    raw = np.column_stack((x_axis[ix],y_axis[iy]))
    path_xy = gaussian_filter(raw,(1.6,0),mode="nearest")
    path_xy[[0,-1]] = raw[[0,-1]]
    dist = np.r_[0,np.cumsum(np.linalg.norm(np.diff(path_xy,axis=0),axis=1))]
    steps = np.linspace(0,dist[-1],math.ceil(dist[-1]/.42)+1)
    pts = np.column_stack([np.interp(steps,dist,arr) for arr in path_xy.T])
    assert contains_xy(state,*pts.T).all()
    assert (read_grid(wet.astype(float),*pts.T)<.05).all(), (a,b)
    pathways.append(np.column_stack((pts,surface_height(pts))))
road_tree = cKDTree(np.concatenate(pathways)[:,:2])
road_dist = road_tree.query(xy)[0]
color = np.stack([read_grid(c,*xy.T) for c in colors.transpose(2,0,1)],axis=1)

# Site factors drive each plant community. A shared variant palette gives
# woodland, khejri, scrub and grasses distinct silhouettes and scale.
n = 108000
px = rng.uniform(x_axis.min(),x_axis.max(),n)
py = rng.uniform(y_axis.min(),y_axis.max(),n)
keep = contains_xy(state.buffer(-1.5),px,py)
px,py = px[keep],py[keep]
def sampled(field):
    return read_grid(field,px,py)

forest, arid, grade = sampled(woods), sampled(desert), sampled(slope)
sandy = sampled(dunes)*arid
stone = sampled(exposed)
dry = (sampled(wet.astype(float))<.01) & (sampled(shore)>1.05)
dry &= (road_tree.query(np.column_stack((px,py)))[0]>1.10) & (sampled(salt)<.15)
dry &= np.hypot((px-anchors[0,0])/31,(py-anchors[0,1])/24)>1
for tx,ty in towns:
    dry &= np.hypot((px-tx)/10,(py-ty)/7)>1
clouds = {}
def scatter(name,mask,scale):
    pts = np.column_stack((px[mask],py[mask]))
    clouds[name] = np.column_stack((pts,surface_height(pts),scale[mask],
                                    rng.uniform(0,2*np.pi,len(pts))))

p = rng.random(len(px))
woodland = .006 + .27*forest**1.55
scatter("woodland",dry & (p<woodland) & (grade<1.35) & (stone<.48),
        rng.uniform(.55,1.15,len(px))*(.82+.24*forest))
scatter("khejri",dry & (p>.984) & (sandy<2.3) & (arid>.35) & (grade<.62),
        rng.uniform(.49,1.06,len(px)))
scatter("scrub",dry & (p>.44) & (p<.46+.089*sampled(moisture)) & (sandy<3.6) & (grade<1.5),
        rng.uniform(.42,1.02,len(px)))
scatter("grass",dry & (p>.58) & (p<.60+.075*sampled(clearings)) & (sandy<3.2),
        rng.uniform(.55,1.13,len(px)))
scatter("outcrop",dry & (p>.79) & (p<.792+.018*stone) & (sandy<.8) & (arid<.55),
        rng.uniform(.29,.72,len(px)))

np.savez_compressed(WORK/'sculpt.npz',top=top.astype('f4'),tris=tris.astype('i4'),ring=ring,
                    color=color.astype('f4'),road_dist=road_dist.astype('f4'),
                    exposed=read_grid(exposed,*xy.T).astype("f4"),
                    sand=read_grid(desert,*xy.T).astype('f4'),x=x_axis,y=y_axis,z=z.astype('f4'),
                    wet=wet,towns=towns,dune_centres=centres,**clouds,
                    **{f'lake_{i}':read_grid(shape,*xy.T).astype('f4')
                       for i,shape in enumerate(lake_shapes)},
                    **{f'road_{i}':p for i,p in enumerate(pathways)})
(WORK/'placement.json').write_text(json.dumps(dict(lakes=lakes,sites=sites),indent=2))
print("top vertices / faces",len(top),len(tris),"dunes",len(centres),
      "minimum normalized spacing",round(float(separation.min()),3),
      "instances",{k:len(v) for k,v in clouds.items()})
