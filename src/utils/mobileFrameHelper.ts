/**
 * Unified Mobile Frame Renderer for The Living Signal
 * Shared between SceneTransitionCanvas (incoming texture B) and Page02MobileExperience.
 * Ensures 100% pixel-perfect alignment, exact horizontal framing centered on Aditya (CamX = 640),
 * matching ambient atmosphere, and zero jump / seam during transition handoff.
 */

export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
export const FRAME_ASPECT = FRAME_WIDTH / FRAME_HEIGHT;

export interface MobileFrameDimensions {
  scale: number;
  drawW: number;
  drawH: number;
  drawX: number;
  drawY: number;
}

export const getMobileDrawDimensions = (
  windowW: number,
  windowH: number,
  camX: number = 640
): MobileFrameDimensions => {
  const scale = windowH / FRAME_HEIGHT;
  const drawW = Math.round(FRAME_WIDTH * scale);
  const drawH = windowH;
  const drawX = Math.round(windowW / 2 - camX * scale);
  const drawY = 0;

  return { scale, drawW, drawH, drawX, drawY };
};

export const renderMobileFrameToContext = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  windowW: number,
  windowH: number,
  dpr: number = 1.0,
  camX: number = 640
): void => {
  ctx.save();
  ctx.scale(dpr, dpr);

  // 1. Draw atmospheric sky & lakeside sunset background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, windowH);
  bgGrad.addColorStop(0, '#7A96B2'); // Soft sky-blue
  bgGrad.addColorStop(0.28, '#E8A588'); // Soft warm peach
  bgGrad.addColorStop(0.55, '#F4B896'); // Sunset peach
  bgGrad.addColorStop(0.80, '#D48870'); // Warm terracotta
  bgGrad.addColorStop(1, '#181210'); // Dark warm sandstone
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, windowW, windowH);

  // 2. Draw enlarged ambient blurred frame for seamless outer extensions
  const ambientScale = Math.max(windowW / FRAME_WIDTH, windowH / FRAME_HEIGHT) * 1.15;
  const ambW = FRAME_WIDTH * ambientScale;
  const ambH = FRAME_HEIGHT * ambientScale;
  const ambX = (windowW - ambW) / 2;
  const ambY = (windowH - ambH) / 2;

  ctx.save();
  ctx.filter = 'blur(24px) brightness(0.88)';
  ctx.drawImage(img, ambX, ambY, ambW, ambH);
  ctx.restore();

  // 3. Draw Sharp 16:9 Foreground Character Scene at Horizontal Camera Position
  const { drawW, drawH, drawX, drawY } = getMobileDrawDimensions(windowW, windowH, camX);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  // 4. Soft ambient vignette blending outer edges into warm portfolio palette
  const vignette = ctx.createRadialGradient(
    windowW / 2,
    windowH / 2,
    windowW * 0.35,
    windowW / 2,
    windowH / 2,
    windowH * 0.75
  );
  vignette.addColorStop(0, 'rgba(24, 18, 16, 0)');
  vignette.addColorStop(1, 'rgba(24, 18, 16, 0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, windowW, windowH);

  ctx.restore();
};
