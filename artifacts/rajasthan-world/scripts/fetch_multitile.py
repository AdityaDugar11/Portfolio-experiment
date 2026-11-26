#!/usr/bin/env python3
"""Download, validate and cache Copernicus GLO-90 tiles."""
import argparse, math, os, tempfile, urllib.request, json, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--bbox',nargs=4,type=float,default=[69,24,77,30]);p.add_argument('--workers',type=int,default=4);p.add_argument('--timeout',type=int,default=25);p.add_argument('--retries',type=int,default=2);a=p.parse_args();w,s,e,n=a.bbox
if not (-180<=w<e<=180 and -90<=s<n<=90 and 1<=a.workers<=16 and a.retries>=0 and a.timeout>0):raise SystemExit('Invalid arguments')
cache=Path(__file__).resolve().parents[1]/'data'/'tiles';cache.mkdir(parents=True,exist_ok=True)
def validate(path,lat,lon):
 with Image.open(path) as im:
  origin=im.tag_v2.get(33922);scale=im.tag_v2.get(33550);keys=im.tag_v2.get(34735,())
  if not origin or not scale or abs(origin[3]-lon)>1e-7 or abs(origin[4]-lat-1)>1e-7 or 4326 not in keys or im.width<100 or im.height<100 or scale[0]<=0 or scale[1]<=0: raise ValueError('invalid georeferencing')
  im.load()
def fetch(pair):
 lat,lon=pair;key=f'Copernicus_DSM_COG_30_{"N" if lat>=0 else "S"}{abs(lat):02d}_00_{"E" if lon>=0 else "W"}{abs(lon):03d}_00_DEM';path=cache/(key+'.tif');url=f'https://copernicus-dem-90m.s3.amazonaws.com/{key}/{key}.tif'
 if path.exists():
  try: validate(path,lat,lon);return {'tile':key,'status':'cached','url':url}
  except Exception as ex: print(f'Invalid cached {key}: {ex}; fetching replacement',flush=True)
 for attempt in range(a.retries+1):
  fd,tmp=tempfile.mkstemp(dir=cache,suffix='.part');os.close(fd)
  try:
   with urllib.request.urlopen(url,timeout=a.timeout) as src,open(tmp,'wb') as dst:
    while chunk:=src.read(1024*1024):dst.write(chunk)
   validate(tmp,lat,lon);os.replace(tmp,path);return {'tile':key,'status':'downloaded','url':url}
  except Exception as ex:
   error=str(ex);print(f'{key} attempt {attempt+1}: {error}',flush=True);time.sleep(min(attempt+1,3))
  finally:
   if os.path.exists(tmp):os.unlink(tmp)
 return {'tile':key,'status':'missing','url':url,'error':error}
pairs=[(lat,lon) for lat in range(math.floor(s),math.ceil(n)) for lon in range(math.floor(w),math.ceil(e))];results=[]
with ThreadPoolExecutor(max_workers=a.workers) as ex:
 for future in as_completed([ex.submit(fetch,pair) for pair in pairs]):
  result=future.result();results.append(result);print(f"[{len(results)}/{len(pairs)}] {result['status']} {result['tile']}",flush=True)
manifest=cache/'manifest.json';manifest.write_text(json.dumps({'bbox':a.bbox,'tiles':sorted(results,key=lambda x:x['tile'])},indent=2));print('Manifest:',manifest)
if any(r['status']=='missing' for r in results):raise SystemExit(1)
