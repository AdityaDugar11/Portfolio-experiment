"""Sculpt a miniature around the local Phase 01 metric boundary and survey points."""
import json
from pathlib import Path

import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates, distance_transform_edt
from scipy.spatial import Delaunay, cKDTree
from shapely import contains_xy
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from shapely.geometry import Polygon
from shapely.geometry.polygon import orient
from skimage.graph import route_through_array

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

broad, middle, small, grit = [noise(s) for s in (53, 16, 5, 1.8)]
dem = np.load(CACHE / "regional-mesh.npz")
measured = map_coordinates(dem["z"], [(y-dem["y"][0])/1.25, (x-dem["x"][0])/1.25], order=1)
regional = gaussian_filter(measured, 6)
local = np.clip((regional-gaussian_filter(regional, 38))/155, -.55, 1.65)

# Offset folded spines follow the SW–NE Aravalli strike. Secondary folds die
# into the plains at different places; gullies cut across the exposed ribs.
strike = .59*x + .81*y
cross = .81*x - .59*y - 46 + 11*np.sin(strike/56) + 5*broad
relief = np.zeros_like(x)
for offset, width, peak, center, extent in [
    (-46,29,36,-112,143), (10,36,53,-118,156), (68,29,35,-160,115),
    (18,25,46,126,82), (94,27,39,67,82), (175,41,37,-71,100),
    (-114,28,25,-58,62),(-19,36,33,-280,79),
]:
    spine = cross-offset-8*np.sin(strike/39 + offset)
    relief += peak*np.exp(-(spine/width)**2 - ((strike-center)/extent)**2)
mass = smooth(relief/36)
rib_phase=.118*cross+.023*strike+.40*middle+.08*small
rock_rib = (1+np.cos(rib_phase))*.5
relief = relief*(.86 + .18*broad + .09*middle + .12*rock_rib)
relief += mass*(8*local + 1.30*small + .35*grit)
# Valleys break the continuous mountain chain into visible groups of summits.
relief *= .72+.28*smooth(.58+.63*np.sin(strike/51)+.22*broad)
edge_distance=distance_transform_edt(contains_xy(state,x,y))
relief *= .24+.76*smooth(edge_distance/34)
desert = smooth((-x-54 + 12*broad - .14*y)/141)
z = 3.8 + 1.65*broad + .70*middle + .19*small + .05*grit + relief
# A family of migrating barchans. The low horns extend beyond the slip face,
# while the crest flattens towards the ends. Fields coalesce at their margins.
sand=np.zeros_like(x)
for row in range(17):
    for col in range(8):
        cx=-472+col*46+rng.uniform(-12,12)+12*(row%2)
        cy=-304+row*43+rng.uniform(-10,10)
        angle=rng.uniform(-.45,.12)+.17*math.sin(row*.6)
        run,span,peak=rng.uniform(14,26),rng.uniform(18,38),rng.uniform(7,17)
        ix=np.flatnonzero(abs(x_axis-cx)<86)
        iy=np.flatnonzero(abs(y_axis-cy)<70)
        if not len(ix) or not len(iy): continue
        patch=np.ix_(iy,ix)
        dx,dy=x[patch]-cx,y[patch]-cy
        along=dx*np.cos(angle)+dy*np.sin(angle)
        side=(-dx*np.sin(angle)+dy*np.cos(angle))/span
        taper=np.maximum(0,1-side**2)**1.45
        crest=along-run*(.92*side**2+.12*np.sin(side*5))-.65*middle[patch]
        windward=np.where(crest<0,np.maximum(0,1+crest/(run*1.6))**1.6,
                          np.maximum(0,1-crest/(run*.45))**1.20)
        sand[patch]=np.maximum(sand[patch],peak*taper*windward)
dunes=gaussian_filter(sand,.72)
supply=smooth(.72+.34*broad+.15*middle)
z+=desert*dunes*supply
# Low knoll under the blue settlement, and a level terrace for the existing
# Junagarh scale study. Art-directed features have no cartographic meaning.
px, py = anchors[1]
z += 28*np.exp(-((x-px)/32)**4 - ((y-py)/19)**2)*(1+.19*small)
px, py = anchors[0]
terrace = smooth((1.37-np.hypot((x-px)/37,(y-py)/29))/.36)
z = z*(1-terrace) + 5.4*terrace

# Individual eroded lake basins. Clip the water by intersection with the bank.
lakes = []
shore = np.full(x.shape, 200.)
wet = np.zeros(x.shape, bool)
for name, cx, cy, rx, ry, angle, level in [
    ("Sambhar",87,46,32,9,-.24,5.7), ("Rajsamand",-15,-153,22,10,.48,13.3),
    ("Jaisamand",-11,-249,25,10,-.78,13.8), ("Eastern reservoir",156,-186,22,9,1.07,8.5),
    ("Southeastern backwater",214,-154,29,8,-.72,9.1),
]:
    dx, dy = x-cx, y-cy
    u = (np.cos(angle)*dx+np.sin(angle)*dy)/rx
    v = (-np.sin(angle)*dx+np.cos(angle)*dy)/ry
    theta = np.arctan2(v,u)
    radius = np.hypot(u,v)/(1+.16*np.sin(3*theta+.7)+.10*np.sin(5*theta-1)+.06*np.cos(8*theta))
    basin = smooth((1.95-radius)/.98)
    bed = level + (radius-1)*9 + .65*small
    z = (1-basin)*z + basin*bed
    shore = np.minimum(shore, abs(radius-1)*ry)
    wet |= (radius<1.45) & (z<level+.30)
    lakes.append((name,cx,cy,rx,ry,angle,level))

gy,gx = np.gradient(z)
slope = np.hypot(gx,gy)
woods = smooth((1-desert)*(.37+.39*mass+.40*broad+.31*middle+.12*small)
               + .28*np.exp(-shore/9) - .25*smooth((slope-1.15)/1.1))
exposed = smooth((slope-.63)/1.4)*smooth(relief/20) + .22*mass*rock_rib
colors = np.zeros((*x.shape,3))
def pigment(rgb, coverage):
    global colors
    colors = colors*(1-coverage[...,None]) + np.array(rgb)*coverage[...,None]
# Pigments are linear-light reflectances, interpolated in a point attribute.
pigment((.40,.235,.092), np.ones(x.shape))
pigment((.61,.327,.098), desert)
pigment((.69,.389,.142), desert*smooth(.45+.48*(dunes/13)+.34*broad))
pigment((.23,.181,.047), smooth(woods*1.2))
pigment((.114,.145,.028), smooth((woods-.39)/.51))
pigment((.26,.173,.103), np.clip(exposed,0,.95))
pigment((.41,.30,.19), np.clip(exposed*.43*rock_rib,0,1))
colors *= (1+.12*middle+.11*small+.085*grit)[...,None]

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
color = np.stack([read_grid(c,*xy.T) for c in colors.transpose(2,0,1)],axis=1)

# Road centre lines follow low-cost passes and local settlements. Forbid water
# and routes outside the outline. Smooth the lattice steps into contiguous tracks.
towns = np.array([[-298,31],[-105,-40],[-62,140],[-70,-156],[153,60],[56,-183],
                  [216,-204],[232,-57],[158,-111],[-178,59],[21,-55],[58,31],[-7,-225]])
cost = 1 + 4*slope**1.3 + .9*(1+middle)
cost[~contains_xy(state,x,y)|wet] = 1.e6
pathways = []
for a,b in [(0,9),(9,1),(9,2),(2,11),(11,4),(1,3),(1,10),(3,12),(12,5),
            (3,10),(10,11),(10,8),(8,6),(8,7),(7,4),(5,8)]:
    def grid_index(p):
        return tuple(np.rint((p[::-1]-[y_axis[0],x_axis[0]])/3).astype(int))
    path,_ = route_through_array(cost[::3,::3],grid_index(towns[a]),grid_index(towns[b]))
    yy,xx = np.array(path).T*3
    path_xy = gaussian_filter(np.stack((x_axis[xx],y_axis[yy]),axis=1).astype(float),
                              (1.5,0),mode="nearest")
    dist = np.r_[0,np.cumsum(np.linalg.norm(np.diff(path_xy,axis=0),axis=1))]
    steps = np.arange(0,dist[-1],.58)
    px,py = [np.interp(steps,dist,arr) for arr in path_xy.T]
    pathways.append(np.stack((px,py),axis=1))
road_tree = cKDTree(np.concatenate(pathways))
def distance_to_road(px,py):
    return road_tree.query(np.column_stack((px,py)))[0]

# Point clouds carry species, size and azimuth. Blender instances each source.
n = 226000
px = rng.uniform(x_axis.min(),x_axis.max(),n)
py = rng.uniform(y_axis.min(),y_axis.max(),n)
keep = contains_xy(state.buffer(-1.2),px,py)
px,py = px[keep],py[keep]
def sampled(field):
    return read_grid(field,px,py)
forest, arid, grade = sampled(woods), sampled(desert), sampled(slope)
dry = sampled(wet.astype(float))<.1
dry &= distance_to_road(px,py)>1.15
dry &= np.hypot((px-anchors[0,0])/36,(py-anchors[0,1])/26)>1
for tx,ty in towns:
    dry &= np.hypot((px-tx)/11,(py-ty)/7)>1
clouds = {}
def scatter(name,mask,scale):
    xx,yy = px[mask],py[mask]
    zz = read_grid(z,xx,yy)
    clouds[name] = np.column_stack((xx,yy,zz,scale[mask],rng.uniform(0,2*np.pi,len(xx))))
p = rng.random(len(px))
scatter("woodland",dry & (p < (.009 + .49*forest**1.8)*(1-arid*.98)) & (grade<1.75),
        rng.uniform(.73,1.42,len(px))*(1+.21*forest))
scatter("khejri",dry & (p>.989) & (sampled(dunes)<5) & (arid>.1) & (grade<.5),rng.uniform(.45,1.13,len(px)))
scatter("scrub",dry & (p>.42) & (p<.429+.067*forest) & (sampled(dunes)*arid<4),rng.uniform(.46,1.5,len(px)))
scatter("grass",dry & (p>.55) & (p<.59+.06*(1-arid)) & (sampled(dunes)*arid<4),rng.uniform(.72,1.65,len(px)))
scatter("outcrop",dry & (p>.70) & (p<.704+.24*sampled(exposed)),rng.uniform(.48,1.9,len(px)))
np.savez_compressed(WORK/'sculpt.npz',top=top.astype('f4'),tris=tris.astype('i4'),ring=ring,
                    color=color.astype('f4'),sand=read_grid(desert,*xy.T).astype('f4'),x=x_axis,y=y_axis,z=z.astype('f4'),towns=towns,
                    **clouds,**{f'road_{i}':p for i,p in enumerate(pathways)})
(WORK/'placement.json').write_text(json.dumps(dict(lakes=lakes,sites=sites)))
print("top vertices / faces",len(top),len(tris),"instances",{k:len(v) for k,v in clouds.items()})
