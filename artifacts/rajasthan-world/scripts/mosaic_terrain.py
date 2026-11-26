#!/usr/bin/env python3
"""Merge aligned Copernicus tiles, then sample a common WGS84 grid."""
import argparse, math, json
from pathlib import Path
import numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--bbox',nargs=4,type=int,required=True,metavar=('W','S','E','N'));p.add_argument('--samples-per-degree',type=int,default=100);p.add_argument('--output',required=True);a=p.parse_args();w,s,e,n=a.bbox
if not(0<e-w<=12 and 0<n-s<=10 and 2<=a.samples_per_degree<=500):raise SystemExit('Invalid extent or resolution')
cache=Path(__file__).resolve().parents[1]/'data'/'tiles'; tiles={}; shape=None; steps=None
for lat in range(s,n):
 for lon in range(w,e):
  key=f'Copernicus_DSM_COG_30_N{lat:02d}_00_E{lon:03d}_00_DEM.tif';path=cache/key
  with Image.open(path) as im:
   origin=im.tag_v2.get(33922);scale=im.tag_v2.get(33550);keys=im.tag_v2.get(34735,());nodata=im.tag_v2.get(42113)
   if not origin or not scale or 4326 not in keys or abs(origin[3]-lon)>1e-8 or abs(origin[4]-(lat+1))>1e-8:raise ValueError(f'Invalid spatial metadata {path}')
   arr=np.asarray(im,dtype=np.float32).copy();arr[~np.isfinite(arr)]=np.nan
   if nodata is not None:arr[arr==float(str(nodata).strip('\x00'))]=np.nan
   if shape is None:shape=arr.shape;steps=scale[:2]
   if arr.shape!=shape or any(abs(x-y)>1e-12 for x,y in zip(scale[:2],steps)):raise ValueError('Inconsistent tile dimensions or resolution')
   if np.isnan(arr).any():raise ValueError(f'NoData in {path}; refusing to fabricate elevations')
   tiles[lat,lon]=arr
# Source pixels are adjacent samples: assemble once, no tile-by-tile resizing.
mosaic=np.block([[tiles[lat,lon] for lon in range(w,e)] for lat in range(n-1,s-1,-1)])
# One global bilinear resampling across boundaries, including the last center.
ny=(n-s)*a.samples_per_degree;nx=(e-w)*a.samples_per_degree
ys=np.linspace(0,mosaic.shape[0]-1,ny);xs=np.linspace(0,mosaic.shape[1]-1,nx);x0=np.floor(xs).astype(int);x1=np.minimum(x0+1,mosaic.shape[1]-1);fx=xs-x0;out=np.empty((ny,nx),np.float32)
for i,y in enumerate(ys):
 y0=int(y);y1=min(y0+1,mosaic.shape[0]-1);fy=y-y0;row=mosaic[y0]*(1-fy)+mosaic[y1]*fy;out[i]=row[x0]*(1-fx)+row[x1]*fx
# Pixel-center coordinates; x/y projection computed in Blender using local equirectangular.
meta={'bbox':[w,s,e,n],'source_shape':list(mosaic.shape),'shape':[ny,nx],'pixel_scale_degrees':list(steps),'projection':'local equirectangular, sphere R=6371000 m, latitude of origin = bbox midpoint','min_m':float(np.min(out)),'max_m':float(np.max(out)),'nodata':'rejected','vertical_exaggeration':1,'tiles':len(tiles)}
np.savez_compressed(a.output,elevation=out,metadata=json.dumps(meta));print(json.dumps(meta,indent=2))
