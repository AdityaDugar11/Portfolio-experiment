from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parent.parent
data=root/'data'; data.mkdir(exist_ok=True)
url='https://copernicus-dem-90m.s3.amazonaws.com/Copernicus_DSM_COG_30_N28_00_E073_00_DEM/Copernicus_DSM_COG_30_N28_00_E073_00_DEM.tif'
urlretrieve(url,data/'bikaner-dem.tif')
im=Image.open(data/'bikaner-dem.tif'); a=np.asarray(im.resize((240,240),Image.Resampling.BILINEAR),dtype=float)
np.savetxt(data/'bikaner-grid.csv',a,fmt='%.2f',delimiter=',')
