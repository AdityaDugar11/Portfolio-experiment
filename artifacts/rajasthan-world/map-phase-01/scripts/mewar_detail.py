"""Build a small nested native-DEM patch and its 2021 Sentinel-2 colour crop."""
import io
import hashlib
import zlib

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates
import tifffile

from prepare_sources import CACHE, ROOT, get
from project_map import inverse, EXAG

# Align these limits to the 250 m parent grid. They bound the foreground
# of the approach camera; source coverage fits in two one-degree tiles.
xmin,xmax,ymin,ymax=-65.,-2.,-190.,-123.
x=np.arange(xmin,xmax+.01,.10)
y=np.arange(ymin,ymax+.01,.10)
dem=[]
spectral=[]
for lat in [25,24]:
    tag=f'N{lat}E073'
    path=ROOT.parent/f'data/tiles/Copernicus_DSM_COG_30_N{lat}_00_E073_00_DEM.tif'
    with Image.open(path) as im:dem.append(np.asarray(im).copy())
    cache=CACHE/(tag+'-3000.npz')
    if not cache.exists():
        url=(f'https://esa-worldcover-s2.s3.eu-central-1.amazonaws.com/rgbnir/2021/N{lat}/'
             f'ESA_WorldCover_10m_2021_v200_{tag}_S2RGBNIR.tif')
        with tifffile.TiffFile(io.BytesIO(get(url,(0,16383)))) as src:
            p=src.pages[2]
            assert p.shape==(3000,3000,4) and p.tilewidth==1024 and p.compression==8 and p.predictor==2
            full=np.zeros((3072,3072,3),np.uint16)
            first,last=p.dataoffsets[0],p.dataoffsets[-1]+p.databytecounts[-1]-1
            content=get(url,(first,last))
            for k,(start,count) in enumerate(zip(p.dataoffsets,p.databytecounts)):
                raw=zlib.decompress(content[start-first:start-first+count])
                decoded=np.frombuffer(raw,dtype='<u2').reshape(1024,1024,4)[:,:,:3].cumsum(axis=1,dtype=np.uint16)
                j,i=divmod(k,3)
                full[j*1024:(j+1)*1024,i*1024:(i+1)*1024]=decoded
            np.savez_compressed(cache,rgb=full[:3000,:3000])
    spectral.append(np.load(cache)['rgb'])
dem=np.vstack(dem)
spectral=np.vstack(spectral)
def lookup(data,lon,lat,size,offset):
    return map_coordinates(data,[(26-lat)*size-offset,(lon-73)*size-offset],order=1,mode='nearest',prefilter=False)

lon,lat=inverse.transform(*np.meshgrid(x*1000,y*1000))
assert lon.min()>73 and lon.max()<74 and lat.min()>24 and lat.max()<26
z=lookup(dem,lon,lat,1200,0)
# Weld the native patch to the actual parent grid, including its independent
# 480 samples/degree resampling, not the native DEM edge values.
parent=np.load(CACHE/'mewar-mesh.npz')
for j in [0,-1]:
    z[j]=np.interp(x,parent['x'],parent['z'][np.abs(parent['y']-y[j]).argmin()])
for i in [0,-1]:
    z[:,i]=np.interp(y,parent['y'],parent['z'][:,np.abs(parent['x']-x[i]).argmin()])
np.savez_compressed(CACHE/'native-mesh.npz',x=x,y=y,z=z,valid=np.ones_like(z,bool))
w,h=2520,2680
xx=xmin+(np.arange(w)+.5)*(xmax-xmin)/w
out=np.empty((h,w,3),np.uint8)
height=np.empty((h,w),np.float32)
for j in range(0,h,64):
    end=min(j+64,h)
    yy=ymax-(np.arange(j,end)+.5)*(ymax-ymin)/h
    lon,lat=inverse.transform(*np.meshgrid(xx*1000,yy*1000))
    rgb=np.stack([lookup(spectral[:,:,i],lon,lat,3000,.5) for i in range(3)],axis=-1)
    linear=np.clip((rgb.astype(np.float32)/10000-.012)*2.7,0,1)
    out[j:end]=np.rint(255*np.where(linear<.0031308,linear*12.92,1.055*linear**(1/2.4)-.055))
    height[j:end]=lookup(dem,lon,lat,1200,0)
dy,dx=np.gradient(height,25.,25.)
norm=np.stack((-dx*EXAG,dy*EXAG,np.ones_like(dx)),axis=-1)
norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
Image.fromarray(np.uint8((norm*.5+.5)*255+.5)).save(CACHE/'mewar-normal.png')
Image.fromarray(out).save(CACHE/'mewar-surface.jpg',quality=95,subsampling=0)
hdr=CACHE/'industrial_sunset_02_puresky.hdr'
if not hdr.exists():
    hdr.write_bytes(get('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/industrial_sunset_02_puresky_2k.hdr'))
assert hashlib.md5(hdr.read_bytes()).hexdigest()=='b54af864f1868a59cdc391744532776c'
