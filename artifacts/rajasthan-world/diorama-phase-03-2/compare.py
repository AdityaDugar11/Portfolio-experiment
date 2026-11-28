"""Lay out four camera-matched Phase 03.1 and Phase 03.2 review pairs."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
before = root.parent / "diorama-phase-03-1/renders"
after = root / "work/matches"
out = root / "renders/comparisons"
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.load_default(size=17)

for title, filename in (
    ("Rajasthan overview", "01-overview"),
    ("Alternate isometric", "02-alternate"),
    ("Thar Desert", "03-desert"),
    ("Aravalli foothills", "04-mountains"),
):
    original = Image.open(before / f"{filename}.png").convert("RGB")
    updated = Image.open(after / f"match-{filename}.png").convert("RGB")
    assert abs(original.width/original.height-updated.width/updated.height)<.005
    updated = updated.resize(original.size, Image.Resampling.LANCZOS)
    w, h = original.size
    sheet = Image.new("RGB", (2*w+12, h+37), "#26221e")
    sheet.paste(original, (0,37))
    sheet.paste(updated, (w+12,37))
    draw = ImageDraw.Draw(sheet)
    draw.text((12,9), f"{title}  /  Phase 03.1", font=font, fill="#f6e7d6")
    draw.text((w+24,9), f"{title}  /  Phase 03.2", font=font, fill="#f6e7d6")
    sheet.save(out / f"{filename}.jpg", quality=93, subsampling=0)
