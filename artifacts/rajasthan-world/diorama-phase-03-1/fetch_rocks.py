"""Cache the two licensed model downloads and verify the publisher's checksums."""
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent
for asset, source in json.loads((root / "rock-sources.json").read_text()).items():
    for name, spec in source["files"].items():
        path = root / "work" / asset / name
        if path.is_file() and hashlib.md5(path.read_bytes()).hexdigest() == spec["md5"]:
            continue
        request = Request(spec["url"], headers={"User-Agent": "LivingSignal student portfolio asset study"})
        with urlopen(request, timeout=45) as response:
            data = response.read()
        if len(data) != spec["size"] or hashlib.md5(data).hexdigest() != spec["md5"]:
            raise ValueError(f"Incomplete or changed download for {asset}/{name}")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    print(asset, "verified")
