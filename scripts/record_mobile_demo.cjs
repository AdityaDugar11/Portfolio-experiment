const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../test-results/mobile-vertical');
const RECORDING_FRAMES_DIR = path.join(OUTPUT_DIR, 'recording_frames');

if (!fs.existsSync(RECORDING_FRAMES_DIR)) {
  fs.mkdirSync(RECORDING_FRAMES_DIR, { recursive: true });
}

// Clean previous temporary frame captures
fs.readdirSync(RECORDING_FRAMES_DIR).forEach((f) => fs.unlinkSync(path.join(RECORDING_FRAMES_DIR, f)));

let frameIdx = 0;
const PORT = 4174;
const CDP_PORT = 9224;

function launchViteServer() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT)], {
    stdio: 'ignore',
  });
  return proc;
}

function launchChrome() {
  const chromeProcess = spawn(
    '/usr/bin/google-chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--window-size=390,844',
      `http://localhost:${PORT}/`,
    ],
    { stdio: 'ignore' }
  );

  return chromeProcess;
}

async function getPageWebSocketUrl(maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page' && p.url.includes(`localhost:${PORT}`));
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome starting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Could not connect to Chrome CDP after maximum attempts');
}

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
          const { resolve, reject, timer } = this.callbacks.get(msg.id);
          clearTimeout(timer);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      const timer = setTimeout(() => {
        if (this.callbacks.has(msgId)) {
          this.callbacks.delete(msgId);
          reject(new Error(`CDP command ${method} timed out after 15000ms`));
        }
      }, 15000);
      this.callbacks.set(msgId, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async setViewport(width, height, isMobile = true) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await this.send('Emulation.setVisibleSize', { width, height });
    await this.sleep(150);
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result ? res.result.value : null;
  }

  async captureScreenshot(filepath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filepath, buffer);
    await this.sleep(60);
    return filepath;
  }

  async captureFrame() {
    const padded = String(frameIdx++).padStart(5, '0');
    const filepath = path.join(RECORDING_FRAMES_DIR, `frame_${padded}.png`);
    await this.captureScreenshot(filepath);
  }

  async scrollTo(y) {
    await this.evaluate(`
      try {
        if (window.__lenis) {
          window.__lenis.scrollTo(${y}, { immediate: true });
        } else {
          window.scrollTo(0, ${y});
        }
      } catch (err) {
        window.scrollTo(0, ${y});
      }
    `);
    await this.sleep(60);
  }

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('=== Capturing Smooth Demonstration Video (Mobile Vertical Scrollytelling) ===');

  let viteProc = launchViteServer();
  await new Promise((r) => setTimeout(r, 1500));

  let chromeProc = launchChrome();
  let cdp;

  try {
    const wsUrl = await getPageWebSocketUrl();
    cdp = new CDPClient(wsUrl);
    await cdp.connect();
    console.log('Connected to Chrome CDP on port ' + CDP_PORT);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    await cdp.setViewport(390, 844, true);
    await cdp.scrollTo(0);
    await cdp.sleep(1200);

    const runwayMetrics = await cdp.evaluate(`
      (() => {
        const rMob = document.getElementById('page-02-mobile-runway');
        return {
          mobY: rMob ? rMob.offsetTop : 2870,
          maxScroll: document.documentElement.scrollHeight - window.innerHeight,
        };
      })()
    `);

    const mobStartY = runwayMetrics.mobY;
    const mobMaxScroll = runwayMetrics.maxScroll;
    const mobScrollDist = mobMaxScroll - mobStartY;

    console.log('Runway bounds:', { mobStartY, mobMaxScroll, mobScrollDist });

    // Helper to calculate exact scroll position
    const getMobileScrollY = (p) => Math.round(mobStartY + mobScrollDist * p);

    // =========================================================================
    // 1. PAGE 01 HERO (Frames 0..4)
    // =========================================================================
    console.log('Capturing: Page 01 Hero...');
    await cdp.scrollTo(0);
    for (let i = 0; i < 4; i++) await cdp.captureFrame();

    // =========================================================================
    // 2. PAGE 01 -> PAGE 02 TRANSITION (Frames 5..14)
    // =========================================================================
    console.log('Capturing: Page 01 -> Page 02 Shader Transition...');
    const transSteps = [0.2, 0.4, 0.6, 0.8, 1.0];
    for (const t of transSteps) {
      await cdp.scrollTo(Math.round(844 * 1.5 * t));
      await cdp.captureFrame();
      await cdp.captureFrame();
    }

    // =========================================================================
    // 3. STAGE 1: CHARACTER INTRODUCTION (Frames 15..24)
    // =========================================================================
    console.log('Capturing: Stage 1 Character Introduction...');
    const stage1Steps = [0.02, 0.06, 0.10, 0.15, 0.18];
    for (const p of stage1Steps) {
      await cdp.scrollTo(getMobileScrollY(p));
      await cdp.captureFrame();
      await cdp.captureFrame();
    }

    // =========================================================================
    // 4. STAGE 2: 3 ORBITAL RINGS FORMATION (Frames 25..36)
    // =========================================================================
    console.log('Capturing: Stage 2 Orbital Formation...');
    const stage2Steps = [0.22, 0.26, 0.30, 0.34, 0.38];
    for (const p of stage2Steps) {
      await cdp.scrollTo(getMobileScrollY(p));
      await cdp.captureFrame();
      await cdp.captureFrame();
    }

    // =========================================================================
    // 5. STAGE 3: VERTICAL CAMERA MOVEMENT & 10 CHAPTERS REVEAL (Frames 37..66)
    // =========================================================================
    console.log('Capturing: Stage 3 Vertical Camera Movement & Chapters Reveal...');
    const stage3Steps = [
      0.40, 0.44, 0.48, // Chapters 01 & 02
      0.52, 0.56, 0.60, // Chapters 03 & 04
      0.64, 0.68, 0.72, // Chapters 05 & 06 (The Work)
      0.76, 0.80, 0.84, // Chapters 07 & 08
      0.88, 0.92,       // Chapters 09 & 10
    ];
    for (const p of stage3Steps) {
      await cdp.scrollTo(getMobileScrollY(p));
      await cdp.captureFrame();
      await cdp.captureFrame();
    }

    // =========================================================================
    // 6. STAGE 4: COMPLETE DISCOVERY STATE (Frames 67..74)
    // =========================================================================
    console.log('Capturing: Stage 4 Complete Discovery State...');
    await cdp.scrollTo(getMobileScrollY(0.98));
    for (let i = 0; i < 6; i++) await cdp.captureFrame();

    // =========================================================================
    // 7. INTERACTIVE CHAPTER PREVIEW (Tap Chapter 06) (Frames 75..84)
    // =========================================================================
    console.log('Capturing: Interactive Chapter Preview...');
    await cdp.scrollTo(getMobileScrollY(0.66));
    await cdp.sleep(200);

    await cdp.evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('#mobile-vertical-world-container button'));
        const ch06Btn = buttons.find(b => b.innerText.includes('CHAPTER 06') || b.innerText.includes('The Work'));
        if (ch06Btn) ch06Btn.click();
      })()
    `);
    await cdp.sleep(300);

    for (let i = 0; i < 5; i++) await cdp.captureFrame();

    // Close preview
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('[role="dialog"] button[aria-label*="Close"]') ||
                         Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.innerText.includes('Close'));
        if (closeBtn) closeBtn.click();
      })()
    `);
    await cdp.sleep(200);
    for (let i = 0; i < 2; i++) await cdp.captureFrame();

    // =========================================================================
    // 8. REVERSE SCROLLING (Frames 85..105)
    // =========================================================================
    console.log('Capturing: Reverse Scrolling...');
    const reverseSteps = [0.90, 0.78, 0.65, 0.52, 0.38, 0.25, 0.12, 0.0];
    for (const p of reverseSteps) {
      await cdp.scrollTo(getMobileScrollY(p));
      await cdp.captureFrame();
      await cdp.captureFrame();
    }
    // Return all the way to Page 01
    await cdp.scrollTo(0);
    await cdp.sleep(200);
    for (let i = 0; i < 4; i++) await cdp.captureFrame();

    // =========================================================================
    // COMPILE FINAL MP4 DEMO VIDEO
    // =========================================================================
    console.log('\n--- Compiling Final Demo Video with ffmpeg ---');
    const finalMp4 = path.join(OUTPUT_DIR, 'mobile-vertical-cinematic-scrollytelling.mp4');

    execSync(
      `ffmpeg -y -framerate 10 -i "${path.join(RECORDING_FRAMES_DIR, 'frame_%05d.png')}" -c:v libx264 -pix_fmt yuv420p -vf "scale=390:844" -crf 19 "${finalMp4}"`,
      { stdio: 'inherit' }
    );
    console.log('Final HD Demo MP4 generated:', finalMp4);

    // Also copy to test-results/mobile-vertical/mobile-vertical-scrollytelling.mp4
    fs.copyFileSync(finalMp4, path.join(OUTPUT_DIR, 'mobile-vertical-scrollytelling.mp4'));

  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill();
    if (viteProc) viteProc.kill();
  }
}

run().catch((err) => {
  console.error('Recording script failed:', err);
  process.exit(1);
});
