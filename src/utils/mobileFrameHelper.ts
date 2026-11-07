/**
 * Unified Mobile Portrait Frame Renderer for The Living Signal
 * Shared between SceneTransitionCanvas (incoming texture B) and Page02MobileExperience.
 * Ensures 100% pixel-perfect alignment, exact 9:16 crop, matching background gradient,
 * and zero jump / seam during transition handoff.
 */

export const CROP_X = 438;
export const CROP_Y = 0;
export const CROP_W = 405;
export const CROP_H = 720;
export const TARGET_ASPECT = 9 / 16;

export interface FrameDimensions {
  drawW: number;
  drawH: number;
  drawX: number;
  drawY: number;
}

export const getMobileDrawDimensions = (windowW: number, windowH: number): FrameDimensions => {
  const screenAspect = windowW / windowH;
  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  if (screenAspect < TARGET_ASPECT) {
    // Screen is narrower/taller than 9:16 (standard mobile portrait, e.g. 390x844)
    drawW = windowW;
    drawH = Math.round(windowW / TARGET_ASPECT);
    drawX = 0;
    drawY = Math.round((windowH - drawH) / 2);
  } else {
    // Screen is wider than 9:16
    drawH = windowH;
    drawW = Math.round(windowH * TARGET_ASPECT);
    drawX = Math.round((windowW - drawW) / 2);
    drawY = 0;
  }

  return { drawW, drawH, drawX, drawY };
};

export const renderMobileFrameToContext = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  windowW: number,
  windowH: number,
  dpr: number = 1.0
): void => {
  ctx.save();
  ctx.scale(dpr, dpr);

  // 1. Draw restrained peach / sky-blue background gradient drawn from scene tones
  const bgGrad = ctx.createLinearGradient(0, 0, 0, windowH);
  bgGrad.addColorStop(0, '#8FA9C4'); // Soft sky-blue
  bgGrad.addColorStop(0.28, '#E8A588'); // Soft warm peach
  bgGrad.addColorStop(0.55, '#F4B896'); // Sunset peach
  bgGrad.addColorStop(0.80, '#D48870'); // Warm terracotta
  bgGrad.addColorStop(1, '#1E1412'); // Dark warm sandstone
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, windowW, windowH);

  // 2. Draw Sharp 9:16 Portrait-Framed Character Scene
  const { drawW, drawH, drawX, drawY } = getMobileDrawDimensions(windowW, windowH);
  ctx.drawImage(img, CROP_X, CROP_Y, CROP_W, CROP_H, drawX, drawY, drawW, drawH);

  // 3. Subtle edge feathering for seamless blending with background
  if (drawY > 0) {
    const topGrad = ctx.createLinearGradient(0, drawY, 0, drawY + 24);
    topGrad.addColorStop(0, 'rgba(143, 169, 196, 0.95)');
    topGrad.addColorStop(1, 'rgba(143, 169, 196, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(drawX, drawY, drawW, 24);
  }
  if (drawY + drawH < windowH) {
    const btmGrad = ctx.createLinearGradient(0, drawY + drawH - 28, 0, drawY + drawH);
    btmGrad.addColorStop(0, 'rgba(30, 20, 18, 0)');
    btmGrad.addColorStop(1, 'rgba(30, 20, 18, 0.95)');
    ctx.fillStyle = btmGrad;
    ctx.fillRect(drawX, drawY + drawH - 28, drawW, 28);
  }

  ctx.restore();
};
