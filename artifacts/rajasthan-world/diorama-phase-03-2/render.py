"""Render the five review cameras, or an explicit list of timeline frames."""
import argparse
import sys
import time
from pathlib import Path

import bpy

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--draft", action="store_true")
parser.add_argument("--studies", action="store_true", help="Only desert and Aravalli/water cameras")
parser.add_argument("--matches", action="store_true", help="Use the Phase 03.1 cameras")
parser.add_argument("frames", type=int, nargs="*")
args = parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])

out = root / ("work/studies" if args.studies else "work/drafts" if args.draft else
              "work/matches" if args.matches else "renders")
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
if args.draft or args.studies:
    scene.render.resolution_percentage = 48
    scene.cycles.samples = 8
frames = args.frames or ([3,4] if args.studies else range(6,10) if args.matches else range(1,6))
assert all(1 <= frame <= 9 for frame in frames), "Review frame must be between 1 and 9"
for marker in sorted(scene.timeline_markers, key=lambda m:m.frame):
    if marker.frame not in frames:
        continue
    scene.frame_set(marker.frame)
    scene.camera = marker.camera
    scene.render.filepath = str(out/(marker.name+".png"))
    start = time.monotonic()
    bpy.ops.render.render(write_still=True)
    print("REVIEW_RENDER", marker.name, round(time.monotonic()-start,2), "seconds", flush=True)
