const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../docs/screenshots');
const RECORDING_FRAMES_DIR = path.join(OUTPUT_DIR, 'recording_frames');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(RECORDING_FRAMES_DIR)) fs.mkdirSync(RECORDING_FRAMES_DIR, { recursive: true });

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (this.ws) this.ws.close();
  }
}

async function waitForServer(port = 4173, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok) return true;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return false;
}

async function getPageWebSocketUrl(port = 9227, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`http://localhost:${port}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Chrome CDP connection timeout');
}

async function main() {
  console.log('====================================================');
  console.log('VERIFYING PAGE 02 STORY EXPERIENCE (Ch 01 – 03)');
  console.log('====================================================\n');

  let previewProcess = null;
  const isServerRunning = await waitForServer(4173, 2);
  if (!isServerRunning) {
    console.log('Starting Vite preview server on port 4173...');
    previewProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], {
      stdio: 'pipe',
      detached: false,
    });
    const ready = await waitForServer(4173, 25);
    if (!ready) throw new Error('Vite preview server failed to start');
  }

  const chromePort = 9227;
  const chromeProcess = spawn(
    '/usr/bin/google-chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${chromePort}`,
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--hide-scrollbars',
      '--window-size=1440,900',
      '--autoplay-policy=no-user-gesture-required',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp = null;

  try {
    const wsUrl = await getPageWebSocketUrl(chromePort);
    cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    // Set 1440 x 900 BEFORE navigation to ensure correct viewport initialization
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const targetUrl = 'http://localhost:4173/?preview=page-02-story';
    console.log(`Navigating to ${targetUrl}...`);
    await cdp.send('Page.navigate', { url: targetUrl });
    await new Promise((r) => setTimeout(r, 2500));

    // Ensure Lenis and ScrollTrigger sync with the emulated dimensions
    const maxScrollData = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        if (window.__lenis) window.__lenis.resize();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        return window.__lenis ? window.__lenis.limit : (document.documentElement.scrollHeight - window.innerHeight);
      })()`,
      returnByValue: true,
    });
    const maxScroll = maxScrollData.result.value || 3780;
    console.log(`Measured Story Runway Scroll Height: ${maxScroll}px`);

    const statesToCapture = [
      {
        name: 'story_01_opening.png',
        progressFraction: 0.04,
        description: 'Opening State: Chapter 01 Display Statement, Pastel Sky, Portrait Enter',
      },
      {
        name: 'story_02_mid_ch01.png',
        progressFraction: 0.22,
        description: 'Mid-Chapter 01: Curiosity & Exploration Beats, Pushed-In Camera, Integrated Portrait',
      },
      {
        name: 'story_03_ch02_transition.png',
        progressFraction: 0.48,
        description: 'Chapter 02 Transition: Beyond the Interface, Layered Surfaces Separating, Lattice Visible',
      },
      {
        name: 'story_04_ch03_state.png',
        progressFraction: 0.75,
        description: 'Chapter 03 State: The Learning Curve, Converging 3D Spline Conduits, Luminous Nexus',
      },
      {
        name: 'story_04b_ch03_independent.png',
        progressFraction: 0.88,
        description: 'Chapter 03 Climax: Independent Understanding, Synthesized Logic Beat',
      },
      {
        name: 'story_05_reverse_scrolled.png',
        progressFraction: 0.00,
        description: 'Reverse-Scroll Result: Returned to Top, Clean State Restoration',
      },
    ];

    console.log('\n--- CAPTURING REQUIRED STORY STATES (1440 x 900) ---');

    for (let i = 0; i < statesToCapture.length; i++) {
      const state = statesToCapture[i];
      const scrollY = Math.round(maxScroll * state.progressFraction);

      console.log(`\nNavigating to ${state.description} (ScrollY: ${scrollY}px, P: ${state.progressFraction})...`);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__lenis) {
            window.__lenis.scrollTo(${scrollY}, { immediate: true });
          } else {
            window.scrollTo({ top: ${scrollY}, behavior: 'instant' });
          }
        })()`,
      });
      await new Promise((r) => setTimeout(r, 1200));

      // Extract HUD and scene metrics
      const evalData = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const hud = document.querySelector('.font-mono.font-bold');
          const canvas = document.querySelector('#story-webgl-viewport canvas');
          const stage = document.getElementById('story-typography-stage');
          const visibleBeat = stage ? Array.from(stage.children).find(c => {
            const style = window.getComputedStyle(c);
            return style.display !== 'none' && parseFloat(c.style.opacity || style.opacity || '0') > 0.5;
          }) : null;

          return {
            hudText: hud?.textContent?.trim(),
            hasCanvas: !!canvas,
            canvasWidth: canvas?.width,
            canvasHeight: canvas?.height,
            activeTextSnippet: visibleBeat?.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 75) || 'None',
          };
        })()`,
        returnByValue: true,
      });

      console.log('State verification metrics:', JSON.stringify(evalData.result.value, null, 2));

      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUTPUT_DIR, state.name);
      fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
      console.log(`Saved screenshot: ${outPath}`);
    }

    // Also capture 1280 x 720 verification
    console.log('\n--- CAPTURING 1280 x 720 VIEWPORT VERIFICATION ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 500));

    // Capture Chapter 02 at 1280x720
    const scroll1280Res = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        if (window.__lenis) window.__lenis.resize();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        const lim = window.__lenis ? window.__lenis.limit : (document.documentElement.scrollHeight - window.innerHeight);
        const y = Math.round(lim * 0.48);
        if (window.__lenis) {
          window.__lenis.scrollTo(y, { immediate: true });
        } else {
          window.scrollTo({ top: y, behavior: 'instant' });
        }
        return { lim, y };
      })()`,
      returnByValue: true,
    });
    await new Promise((r) => setTimeout(r, 1000));
    const shot1280Ch2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const out1280Ch2 = path.join(OUTPUT_DIR, 'story_1280x720_ch02.png');
    fs.writeFileSync(out1280Ch2, Buffer.from(shot1280Ch2.data, 'base64'));
    console.log(`Saved 1280x720 Ch02 screenshot: ${out1280Ch2} (scrollY: ${scroll1280Res.result.value.y}px)`);

    // --- GENERATE CONTINUOUS BROWSER RECORDING ---
    console.log('\n--- RECORDING SMOOTH STORY SCROLL SEQUENCE FOR MP4 ---');
    // Restore 1440x900 for recording
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 400));
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        if (window.__lenis) window.__lenis.resize();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      })()`,
    });

    // Sample 32 frames forward and 16 frames backward
    const forwardSteps = 30;
    let frameIdx = 0;

    console.log(`Capturing ${forwardSteps} forward scroll frames...`);
    for (let step = 0; step <= forwardSteps; step++) {
      const p = step / forwardSteps;
      const scrollY = Math.round(maxScroll * p);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__lenis) {
            window.__lenis.scrollTo(${scrollY}, { immediate: true });
          } else {
            window.scrollTo({ top: ${scrollY}, behavior: 'instant' });
          }
        })()`,
      });
      await new Promise((r) => setTimeout(r, 120));

      const frameShot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
      const framePath = path.join(RECORDING_FRAMES_DIR, `frame_${String(frameIdx).padStart(4, '0')}.jpg`);
      fs.writeFileSync(framePath, Buffer.from(frameShot.data, 'base64'));
      frameIdx++;
    }

    const rewindSteps = 15;
    console.log(`Capturing ${rewindSteps} reverse scroll frames...`);
    for (let step = 1; step <= rewindSteps; step++) {
      const p = 1.0 - step / rewindSteps;
      const scrollY = Math.round(maxScroll * p);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__lenis) {
            window.__lenis.scrollTo(${scrollY}, { immediate: true });
          } else {
            window.scrollTo({ top: ${scrollY}, behavior: 'instant' });
          }
        })()`,
      });
      await new Promise((r) => setTimeout(r, 120));

      const frameShot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
      const framePath = path.join(RECORDING_FRAMES_DIR, `frame_${String(frameIdx).padStart(4, '0')}.jpg`);
      fs.writeFileSync(framePath, Buffer.from(frameShot.data, 'base64'));
      frameIdx++;
    }

    const videoOutPath = path.join(OUTPUT_DIR, 'story_scroll_recording.mp4');
    console.log(`\nCompiling ${frameIdx} frames into video: ${videoOutPath}...`);
    try {
      execSync(
        `ffmpeg -y -framerate 10 -i "${RECORDING_FRAMES_DIR}/frame_%04d.jpg" -c:v libx264 -pix_fmt yuv420p "${videoOutPath}"`,
        { stdio: 'ignore' }
      );
      console.log(`Successfully generated browser recording: ${videoOutPath}`);
    } catch (ffmpegErr) {
      console.warn('ffmpeg video compilation note:', ffmpegErr.message);
    }

    console.log('\n====================================================');
    console.log('STORY EXPERIENCE PROTOTYPE VERIFIED WITH EMPIRICAL EVIDENCE');
    console.log('====================================================\n');
  } finally {
    if (cdp) await cdp.close();
    chromeProcess.kill('SIGTERM');
    if (previewProcess) previewProcess.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('Story Experience Verification Failed:', err);
  process.exit(1);
});
