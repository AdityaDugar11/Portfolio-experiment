"""Prepare private preview WebPs from owner-supplied reference 02."""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, gaussian_filter1d
import torch
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

MODEL = 'depth-anything/Depth-Anything-V2-Small-hf'
REVISION = '5426e4f0f36572d16453bbda7a8389317b1bef99'
PAD = 96
FLOOR = np.array([61, 42, 34])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path)
    args = parser.parse_args()
    image = Image.open(args.reference).convert('RGB')
    assert image.size == (1536, 1024), 'The camera is calibrated to the 1536 × 1024 reference.'
    output = Path(__file__).parent / 'private' / 'assets'
    output.mkdir(parents=True, exist_ok=True)

    # Extend the photographed floor and feather only the extra margin into the stage color.
    width, height = image.size
    y, x = np.ogrid[-PAD:height + PAD, -PAD:width + PAD]
    distance = np.maximum(np.maximum(-x, x - width + 1), np.maximum(-y, y - height + 1))
    margin = np.clip(distance / (PAD - 8), 0, 1)
    opacity = (0.5 + 0.5 * np.cos(np.pi * margin))[..., None]
    pixels = np.asarray(image)
    padded = np.pad(pixels, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='edge').astype('float32')
    for offset, edge in [(0, pixels[0]), (PAD + height, pixels[-1])]:
        padded[offset:offset + PAD] = gaussian_filter1d(
            np.pad(edge, ((PAD, PAD), (0, 0)), mode='edge').astype('float32'),
            sigma=20, axis=0,
        )
    top_bottom_blend = np.clip((np.maximum(-y, y - height + 1) - 1) / 16, 0, 1)[..., None]
    original_extension = np.pad(pixels, ((PAD, PAD), (PAD, PAD), (0, 0)), mode='edge')
    padded = original_extension * (1 - top_bottom_blend) + padded * top_bottom_blend
    extended = Image.fromarray(np.rint(padded * opacity + FLOOR * (1 - opacity)).astype('uint8'))
    for name, size, quality in [('poster', 720, 77), ('mobile', 1200, 89), ('desktop', 1728, 93)]:
        color = extended.resize((size, round(extended.height * size / extended.width)), Image.Resampling.LANCZOS)
        color.save(output / f'{name}.webp', quality=quality, method=6)

    processor = AutoImageProcessor.from_pretrained(MODEL, revision=REVISION)
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = AutoModelForDepthEstimation.from_pretrained(MODEL, revision=REVISION).to(device).eval()
    with torch.inference_mode():
        prediction = model(**processor(images=image, return_tensors='pt').to(device))
    depth = processor.post_process_depth_estimation(prediction, target_sizes=[image.size[::-1]])[0]['predicted_depth']
    depth = depth.cpu().numpy()
    low, high = np.percentile(depth, [1, 99])
    depth = np.clip((depth - low) / (high - low), 0, 1)
    # Keep terrain-scale relief while softening estimated depth steps along roofs and ridges.
    depth = gaussian_filter(depth, sigma=12)
    depth = np.pad(depth, PAD, mode='edge')
    depth_image = Image.fromarray(depth.astype('float32')).resize((432, 304), Image.Resampling.BILINEAR)
    depth_image = Image.fromarray(np.rint(np.clip(np.asarray(depth_image), 0, 1) * 255).astype('uint8'))
    depth_image.save(output / 'depth.webp', lossless=True, method=6)
    for asset in sorted(output.glob('*.webp')):
        print(f'{asset.name}: {Image.open(asset).size}, {asset.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
