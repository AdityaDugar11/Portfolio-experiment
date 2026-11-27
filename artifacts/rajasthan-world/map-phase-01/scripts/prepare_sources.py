"""Acquire regional vector extracts and reduced Sentinel-2 COG overviews."""
from concurrent.futures import ThreadPoolExecutor
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time
import zipfile
import zlib

import numpy as np
import requests
import shapefile
from shapely.geometry import box, mapping, shape
import tifffile

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
CACHE = ROOT / '.cache'
DATA.mkdir(exist_ok=True)
CACHE.mkdir(exist_ok=True)
STATE_BBOX = box(69, 23, 79, 31)
NAMES = ['Junagarh Fort', 'Mehrangarh Fort', 'Kumbhalgarh Fort', 'Amber Fort',
         'Chittorgarh Fort', 'Jaisalmer Fort', 'Gagron Fort', 'Ranthambore Fort',
         'Taragarh Fort, Bundi', 'Nahargarh Fort']
IDS = ['Q2758341', 'Q1483099', 'Q1246283', 'Q456817', 'Q3695769', 'Q3634368',
       'Q16891508', 'Q2724894', 'Q2739151', 'Q2723401']


def get(url, byte_range=None):
    for attempt in range(3):
        try:
            headers={'User-Agent':'LivingSignalTerrainStudy/1.0 (regional map)'}
            if byte_range:
                headers['Range'] = 'bytes=%d-%d' % byte_range
            with requests.get(url, headers=headers, stream=True, timeout=(12, 75)) as r:
                r.raise_for_status()
                if byte_range and not r.headers.get('Content-Range','').startswith(
                        'bytes %d-%d/' % byte_range):
                    raise ValueError('Server did not return requested COG window')
                return r.content
        except (requests.RequestException, ValueError):
            if attempt == 2:
                raise
            time.sleep(1+attempt)


def write_json(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n')


def vector_extract(short, folder, layer):
    archive = CACHE / (short+'.zip')
    if not archive.exists():
        archive.write_bytes(get(f'https://naciscdn.org/naturalearth/10m/{folder}/{layer}.zip'))
    result=[]
    with shapefile.Reader(str(archive)) as reader:
        for item in reader.iterShapeRecords(bbox=STATE_BBOX.bounds):
            rec = item.record.as_dict()
            if short == 'state' and rec['name'] != 'Rajasthan':
                continue
            geo = shape(item.shape.__geo_interface__).intersection(STATE_BBOX)
            if geo.is_empty:
                continue
            result.append({'type':'Feature','properties':{'name':rec.get('name_en') or rec.get('name'),
                           'ne_id':rec.get('ne_id')},'geometry':mapping(geo)})
    write_json(DATA/(short+'.geojson'), {'type':'FeatureCollection','features':result})
    return result


def satellite_tile(pair):
    lon, lat = pair
    tag = f'N{lat:02}E{lon:03}'
    out = CACHE / (tag+'.npz')
    if out.exists():
        return
    url=(f'https://esa-worldcover-s2.s3.eu-central-1.amazonaws.com/rgbnir/2021/N{lat}/'
         f'ESA_WorldCover_10m_2021_v200_{tag}_S2RGBNIR.tif')
    # Fetch only the directory and the smallest native overview. Its single
    # compressed tile uses TIFF horizontal differencing separately per channel.
    with tifffile.TiffFile(io.BytesIO(get(url,(0,16383)))) as tif:
        p=tif.pages[-1]
        assert p.shape==(750,750,4) and len(p.dataoffsets)==1
        assert p.predictor==2 and p.compression==8 and tif.byteorder=='<'
        offset=p.dataoffsets[0]
        raw=get(url,(offset,offset+p.databytecounts[0]-1))
        tile=np.frombuffer(zlib.decompress(raw),dtype='<u2').reshape(p.tilelength,p.tilewidth,4)
        tile=np.cumsum(tile[:750,:750],axis=1,dtype=np.uint16)
    np.savez_compressed(out,reflectance=tile)
    print('Satellite',tag,flush=True)


def inputs():
    state=shape(vector_extract('state','cultural','ne_10m_admin_1_states_provinces')[0]['geometry'])
    vector_extract('rivers','physical','ne_10m_rivers_lake_centerlines')
    vector_extract('lakes','physical','ne_10m_lakes')
    entities_file = CACHE/'entities.json'
    if not entities_file.exists():
        entities_file.write_bytes(get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims%7Clabels&languages=en&ids='+'%7C'.join(IDS)))
    entities=json.loads(entities_file.read_text())['entities']
    forts=[]
    for i,(name,qid) in enumerate(zip(NAMES,IDS),1):
        claim=next(c for c in entities[qid]['claims']['P625'] if c['rank']!='deprecated')
        point=claim['mainsnak']['datavalue']['value']
        forts.append({'chapter':i,'fort':name,'latitude':point['latitude'],'longitude':point['longitude'],
                      'source':'https://www.wikidata.org/wiki/'+qid,'statement':claim['id']})
    write_json(DATA/'locations.json',forts)
    # Additional tile uses the historical validated downloader in its own cache
    # so it cannot replace the manifest for the original 72 acquisitions.
    old=ROOT.parent/'scripts/fetch_multitile.py'
    downloader=CACHE/'scripts'/old.name
    downloader.parent.mkdir(exist_ok=True)
    shutil.copyfile(old,downloader)
    subprocess.run([sys.executable,str(downloader),'--bbox','78','26','79','27'],check=True)
    tiles=[(x,y) for y in range(23,31) for x in range(69,78)]
    tiles += [(78,26)]
    assert state.difference(__import__('shapely').union_all([box(x,y,x+1,y+1) for x,y in tiles])).is_empty
    with ThreadPoolExecutor(6) as pool:
        list(pool.map(satellite_tile,tiles))


if __name__=='__main__':
    inputs()
