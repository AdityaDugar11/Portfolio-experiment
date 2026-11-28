"""Cache and verify the exact zero-cost inputs for the Blender build."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache"
SOURCES = json.loads((ROOT / "asset-sources.json").read_text())


def acquire(url, destination, algorithm, expected):
    if destination.is_file():
        if hashlib.new(algorithm, destination.read_bytes()).hexdigest() == expected:
            return
    destination.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(url, timeout=60) as response:
        data = response.read()
    if hashlib.new(algorithm, data).hexdigest() != expected:
        raise ValueError(f"Checksum mismatch for {url}")
    temporary = destination.with_suffix(destination.suffix + ".part")
    temporary.write_bytes(data)
    temporary.replace(destination)


def main():
    poly = SOURCES["poly_haven"]["assets"]
    work = [(entry["url"], CACHE / asset / file, "md5", entry["md5"])
            for asset, record in poly.items() for file, entry in record["files"].items()]
    ambient = SOURCES["ambient_cg"]
    archive = CACHE / ambient["zip"]
    work.append((ambient["url"], archive, "sha256", ambient["sha256"]))
    with ThreadPoolExecutor(max_workers=6) as pool:
        for result in [pool.submit(acquire, *job) for job in work]:
            result.result()

    ripples = CACHE / ambient["asset"]
    ripples.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive) as source:
        for name in ambient["maps"]:
            (ripples / name).write_bytes(source.read(name))

    usgs = SOURCES["usgs_3dep"]
    raster = ROOT / usgs["file"]
    if hashlib.sha256(raster.read_bytes()).hexdigest() != usgs["sha256"]:
        raise ValueError(f"Checksum mismatch for {raster}")
    with Image.open(raster) as image:
        elevations = np.asarray(image, dtype=np.float32)
    if elevations.shape != (960, 320) or not np.isfinite(elevations).all() or elevations.min() < 1200:
        raise ValueError("Unexpected dimensions or invalid elevations in USGS crop")
    np.save(CACHE / "dunes.npy", elevations)
    print(f"Verified {len(work)} asset files and {elevations.size:,} measured elevation cells.")


if __name__ == "__main__":
    main()
