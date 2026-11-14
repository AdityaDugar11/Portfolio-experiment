import cv2
import numpy as np
from PIL import Image

# Load clean browser screenshot at 1440x900
shot1440 = Image.open('docs/screenshots/prototype_1440x900_clean.png')

# 1. Right shoulder crop (where extension occurred)
# In 1440x900, portrait is centered at x=720, width=672 => x from 384 to 1056
# Right shoulder is around x: 880 to 1060, y: 700 to 900
crop_right = shot1440.crop((860, 680, 1060, 900))
zoom_right = crop_right.resize((crop_right.width * 2, crop_right.height * 2), Image.Resampling.NEAREST)
zoom_right.save('docs/screenshots/verify_right_shoulder_200.png')

# 2. Hair crop (to verify no halo)
# Head is centered around x: 600 to 840, y: 150 to 450
crop_hair = shot1440.crop((580, 140, 860, 420))
zoom_hair = crop_hair.resize((crop_hair.width * 2, crop_hair.height * 2), Image.Resampling.NEAREST)
zoom_hair.save('docs/screenshots/verify_hair_200.png')

# 3. Face crop (to verify 100% facial preservation)
crop_face = shot1440.crop((600, 320, 840, 560))
zoom_face = crop_face.resize((crop_face.width * 2, crop_face.height * 2), Image.Resampling.NEAREST)
zoom_face.save('docs/screenshots/verify_face_200.png')

print("Saved verification crops at 200% zoom.")
