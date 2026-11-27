"""Prepare metric terrain, co-registered imagery, state mask and chapter manifest."""
import json
from pathlib import Path
import re
import subprocess
import sys

import numpy as np
from PIL import Image
from pyproj import CRS, Transformer
from scipy.ndimage import map_coordinates
from shapely import contains_xy, segmentize, union_all
from shapely.geometry import box, shape
from shapely.ops import transform

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
CACHE=ROOT/'.cache'
CRS_DEF='+proj=lcc +lat_1=24 +lat_2=29.5 +lat_0=26.5 +lon_0=74 +datum=WGS84 +units=m +no_defs'
crs=CRS.from_proj4(CRS_DEF)
project=Transformer.from_crs(4326,crs,always_xy=True)
inverse=Transformer.from_crs(crs,4326,always_xy=True)
EXAG=3.2
# Kilometres in Blender. Uniform local axes and zero false easting/northing.
X0,Y0=-500.,-410.
DX=1.25
NX,NY=805,723
X1,Y1=X0+(NX-1)*DX,Y0+(NY-1)*DX


def json_file(name):
    return json.loads((DATA/name).read_text())


def sample(arr,col,row):
    return map_coordinates(arr,[row,col],order=1,mode='nearest',prefilter=False)


def run():
    tile_dir=ROOT.parent/'data/tiles'
    state=shape(json_file('state.geojson')['features'][0]['geometry'])
    tiles=[(lo,la) for la in range(23,31) for lo in range(69,78)]+[(78,26)]
    for lo,la in tiles:
        tag=f'Copernicus_DSM_COG_30_N{la:02}_00_E{lo:03}_00_DEM.tif'
        assert ((CACHE/'data/tiles' if lo==78 else tile_dir)/tag).is_file()
    original=box(69,23,78,31)
    covered=union_all([box(lo,la,lo+1,la+1) for lo,la in tiles])
    assert state.difference(covered).is_empty
    state_projected=transform(project.transform,state)
    gap=transform(project.transform,state.difference(original)).area/1e6
    mosaic=CACHE/'regional-dem.npz'
    if not mosaic.exists():
        subprocess.run([sys.executable,str(ROOT.parent/'scripts/mosaic_terrain.py'),'--bbox','69','23','78','31',
                        '--samples-per-degree','480','--output',str(mosaic)],check=True)
    src=np.load(mosaic)
    height=src['elevation']
    meta=json.loads(str(src['metadata']))
    assert meta['tiles']==72 and meta['bbox']==[69,23,78,31] and meta['source_raster_type']=='PixelIsPoint'
    gt=meta['grid_transform']
    extra_path=next((CACHE/'data/tiles').glob('*_DEM.tif'))
    with Image.open(extra_path) as src_tile:
        assert tuple(src_tile.tag_v2[33922][3:5])==(78.,27.) and src_tile.size==(1200,1200)
        extra=np.asarray(src_tile,dtype=np.float32)
        assert np.isfinite(extra).all()
    def elevations(lon,lat):
        z=sample(height,(lon-gt['origin_center_lon'])/gt['step_lon'],(lat-gt['origin_center_lat'])/gt['step_lat'])
        east=(lon>=78)&(lat>=26)&(lat<=27)
        if np.any(east):
            z[east]=sample(extra,(lon[east]-78)*1200,(27-lat[east])*1200)
        return z
    def height_grid(name,x,y):
        lon,lat=inverse.transform(*np.meshgrid(x*1000,y*1000))
        valid=((lon>=69)&(lon<78)&(lat>=23)&(lat<=31))|((lon>=78)&(lon<=79)&(lat>=26)&(lat<=27))
        z=elevations(lon,lat)
        np.savez_compressed(CACHE/(name+'.npz'),x=x,y=y,z=z,valid=valid)
        return z
    x=X0+np.arange(NX)*DX
    y=Y0+np.arange(NY)*DX
    height_grid('regional-mesh',x,y)
    fine=[(300,402),(136,257)]  # exact regional grid indices at both patch edges
    detail_x=np.linspace(x[fine[0][0]],x[fine[0][1]],(fine[0][1]-fine[0][0])*5+1)
    detail_y=np.linspace(y[fine[1][0]],y[fine[1][1]],(fine[1][1]-fine[1][0])*5+1)
    height_grid('mewar-mesh',detail_x,detail_y)
    # Build one continuous RGBNIR lattice before resampling so image edges do
    # not depend on independent tile stretching or per-tile contrast.
    spectral=np.zeros((6000,7500,4),np.uint16)
    for lo,la in tiles:
        row=(30-la)*750
        col=(lo-69)*750
        spectral[row:row+750,col:col+750]=np.load(CACHE/f'N{la:02}E{lo:03}.npz')['reflectance']
    width,height_px=4800,4304
    albedo=np.empty((height_px,width,3),np.uint8)
    masks=np.empty((height_px,width,3),np.uint8)
    fine_dem=np.empty((height_px,width),np.float32)
    xx=X0+(np.arange(width)+.5)*(X1-X0)/width
    for i in range(0,height_px,48):
        end=min(height_px,i+48)
        yy=Y1-(np.arange(i,end)+.5)*(Y1-Y0)/height_px
        east,north=np.meshgrid(xx*1000,yy*1000)
        lon,lat=inverse.transform(east,north)
        fine_dem[i:end]=elevations(lon,lat)
        rgbn=np.stack([sample(spectral[:,:,ch],(lon-69)*750-.5,(31-lat)*750-.5) for ch in range(4)],axis=-1).astype(np.float32)/10000
        # Fixed exposure across all tiles. Retain seasonal colour and field
        # patterns; suppress slight cool haze already present in the composite.
        rgb=np.clip((rgbn[:,:,:3]-.012)*2.7,0,1)
        rgb=np.where(rgb<=.0031308,12.92*rgb,1.055*np.maximum(rgb,.00001)**(1/2.4)-.055)
        albedo[i:end]=np.rint(255*rgb).astype('uint8')
        green,nir=rgbn[:,:,1],rgbn[:,:,3]
        ndwi=(green-nir)/np.maximum(green+nir,.001)
        wet=np.clip((ndwi-.025)*6,0,1)*np.clip((.155-nir)*18,0,1)
        masks[i:end,:,0]=np.rint(255*wet)
        masks[i:end,:,1]=contains_xy(state_projected,east,north).astype('uint8')*255
        masks[i:end,:,2]=np.rint(255*np.clip((nir-rgbn[:,:,0])/np.maximum(nir+rgbn[:,:,0],.001),0,1))
    # World-space normals retain measured fine relief in the regional overview.
    dy,dx=np.gradient(fine_dem, (Y1-Y0)*1000/height_px, (X1-X0)*1000/width)
    normals=np.stack((-dx*EXAG,dy*EXAG,np.ones_like(dx)),axis=-1)
    normals/=np.linalg.norm(normals,axis=-1,keepdims=True)
    Image.fromarray(np.uint8(np.clip(normals*.5+.5,0,1)*255+.5)).save(CACHE/'relief-normal.png')
    Image.fromarray(albedo).save(CACHE/'surface.jpg',quality=94,subsampling=0)
    Image.fromarray(masks).save(CACHE/'surface-masks.png')
    titles=re.findall(r'^# CHAPTER (\d+) — (.+)$',(ROOT.parents[2]/'docs/STORY_CONTENT.md').read_text(),re.M)
    stops=json_file('locations.json')
    assert len(titles)==len(stops)==10
    for stop,(number,title) in zip(stops,titles):
        assert stop['chapter']==int(number)
        lon,lat=stop['longitude'],stop['latitude']
        assert contains_xy(state,lon,lat)
        px,py=project.transform(lon,lat)
        h=float(elevations(np.array([lon]),np.array([lat]))[0])
        stop.update(title=title,elevation_dsm_m=round(h,2),blender_xyz_km=[round(px/1000,5),round(py/1000,5),round(h*EXAG/1000,5)])
    manifest={'crs':CRS_DEF,'axes':'Blender X east, Y north, Z up. One unit = 1 km. glTF basis [x,z,-y].',
              'vertical_exaggeration':EXAG,'coordinate_role':'representative site point, not entrance',
              'chapters':stops}
    (DATA/'chapters.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    # Densification keeps geographic verification lines seated on the rendered surface.
    traces=[]
    for key in ['state','rivers','lakes']:
        for feature in json_file(key+'.geojson')['features']:
            geom=shape(feature['geometry'])
            if key!='state':geom=geom.intersection(state)
            if geom.is_empty: continue
            if key in ('state','lakes'):geom=geom.boundary
            lines=geom.geoms if geom.geom_type.startswith('Multi') else [geom]
            for line in lines:
                if line.geom_type!='LineString':continue
                ll=np.array(segmentize(line,.018).coords)
                east,north=project.transform(ll[:,0],ll[:,1])
                zz=elevations(ll[:,0],ll[:,1])*EXAG/1000
                traces.append({'layer':key,'name':feature['properties']['name'],'xyz':np.column_stack((east/1000,north/1000,zz)).round(4).tolist()})
    (CACHE/'guides.json').write_text(json.dumps(traces))
    report={'boundary_bounds_wgs84':state.bounds,'boundary_area_lcc_km2':round(state_projected.area/1e6,2),
            'missing_before_km2_lcc':round(gap,2),'missing_after_km2':0,'cached_dem_tiles':72,'supplementary_tile':'N26E078',
            'regional_grid':[NX,NY],'spacing_km':DX,'detail_grid':[len(detail_x),len(detail_y)],'detail_index_bounds':fine,
            'surface_texture_px':[width,height_px],'surface_crs':CRS_DEF,'raster_bounds_km':[X0,Y0,X1,Y1]}
    (DATA/'coverage.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    run()
