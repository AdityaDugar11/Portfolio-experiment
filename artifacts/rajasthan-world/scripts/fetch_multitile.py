#!/usr/bin/env python3
"""Cache and validate Copernicus GLO-90 tiles intersecting a WGS84 bbox."""
import argparse, math, os, tempfile, urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
P=argparse.ArgumentParser();P.add_argument('--bbox',nargs=4,type=float,default=[69,24,77,30],metavar=('WEST','SOUTH','EAST','NORTH'));P.add_argument('--workers',type=int,default=4);a=P.parse_args(); w,s,e,n=a.bbox
if not (-180<=w<e<=180 and -90<=s<n<=90):raise SystemExit('Invalid bbox')
cache=Path(__file__).resolve().parents[1]/'data'/'tiles';cache.mkdir(parents=True,exist_ok=True)
def fetch(pair):
 lat,lon=pair
 key=f'Copernicus_DSM_COG_30_{"N" if lat>=0 else "S"}{abs(lat):02d}_00_{"E" if lon>=0 else "W"}{abs(lon):03d}_00_DEM'; path=cache/(key+'.tif');url=f'https://copernicus-dem-90m.s3.amazonaws.com/{key}/{key}.tif'
 if not path.exists():
  fd,tmp=tempfile.mkstemp(dir=cache,suffix='.part');os.close(fd)
  try: urllib.request.urlretrieve(url,tmp);os.replace(tmp,path)
  finally:
   if os.path.exists(tmp):os.unlink(tmp)
 with Image.open(path) as im:
  origin=im.tag_v2.get(33922);scale=im.tag_v2.get(33550);keys=im.tag_v2.get(34735,())
  if not origin or not scale or abs(origin[3]-lon)>1e-7 or abs(origin[4]-(lat+1))>1e-7 or 4326 not in keys or im.width<100 or im.height<100: raise ValueError(f'Invalid georeferencing: {path}')
  im.load()
 print(f'OK {lat} {lon} {path.stat().st_size}',flush=True)
pairs=[(lat,lon) for lat in range(math.floor(s),math.ceil(n)) for lon in range(math.floor(w),math.ceil(e))]
with ThreadPoolExecutor(max_workers=a.workers) as ex:list(ex.map(fetch,pairs))
print('Validated tiles:',len(pairs))
