"""Render one named review view or all views from the saved scene."""
import sys
import time
from pathlib import Path

import bpy

root=Path(__file__).resolve().parent
args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
draft="--draft" in args
out=root/("work/drafts" if draft else "renders")
out.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
if draft:
    scene.render.resolution_percentage=48
    scene.cycles.samples=5
for marker in sorted(scene.timeline_markers,key=lambda m:m.frame):
    if args and any(arg.isdigit() for arg in args) and str(marker.frame) not in args:
        continue
    scene.frame_set(marker.frame)
    scene.camera=marker.camera
    scene.render.filepath=str(out/(marker.name+".png"))
    start=time.monotonic()
    bpy.ops.render.render(write_still=True)
    print("REVIEW_RENDER",marker.name,round(time.monotonic()-start,2),"seconds",flush=True)
