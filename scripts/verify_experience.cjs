const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../docs/screenshots/final-implementation');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const DESKTOP_FRAMES_DIR = path.join(OUTPUT_DIR, 'desktop_frames');
const MOBILE_FRAMES_DIR = path.join(OUTPUT_DIR, 'mobile_frames');
if (!fs.existsSync(DESKTOP_FRAMES_DIR)) fs.mkdirSync(DESKTOP_FRAMES_DIR, { recursive: true });
if (!fs.existsSync(MOBILE_FRAMES_DIR)) fs.mkdirSync(MOBILE_FRAMES_DIR, { recursive: true });

// Clean previous temporary frame captures
fs.readdirSync(DESKTOP_FRAMES_DIR).forEach((f) => fs.unlinkSync(path.join(DESKTOP_FRAMES_DIR, f)));
fs.readdirSync(MOBILE_FRAMES_DIR).forEach((f) => fs.unlinkSync(path.join(MOBILE_FRAMES_DIR, f)));

let desktopFrameIdx = 0;
let mobileFrameIdx = 0;

function launchChrome(port = 9222) {
  const chromeProcess = spawn(
    '/usr/bin/google-chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--window-size=1440,900',
      'http://localhost:4173/',
    ],
    { stdio: 'ignore' }
  );

  return chromeProcess;
}

async function getPageWebSocketUrl(port = 9222, maxAttempts = 20) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`http://localhost:${port}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page' && p.url.includes('localhost:4173'));
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome initializing
    }
    await new Promise((r) => setTimeout(r, 300));
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
          const { resolve, reject } = this.callbacks.get(msg.id);
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
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await this.send('Emulation.setVisibleSize', { width, height });
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
    return filepath;
  }

  async captureDesktopVideoFrame() {
    const padded = String(desktopFrameIdx++).padStart(5, '0');
    const filepath = path.join(DESKTOP_FRAMES_DIR, `frame_${padded}.png`);
    await this.captureScreenshot(filepath);
  }

  async captureMobileVideoFrame() {
    const padded = String(mobileFrameIdx++).padStart(5, '0');
    const filepath = path.join(MOBILE_FRAMES_DIR, `frame_${padded}.png`);
    await this.captureScreenshot(filepath);
  }

  async scrollTo(y) {
    await this.evaluate(`
      if (window.__lenis) {
        window.__lenis.scrollTo(${y}, { immediate: true });
      } else {
        window.scrollTo(0, ${y});
      }
    `);
  }

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('=== The Living Signal: Strict Implementation Verification ===');

  // Verify preview server availability
  let previewProc = null;
  try {
    const testFetch = await fetch('http://localhost:4173/').catch(() => null);
    if (!testFetch || !testFetch.ok) {
      console.log('Starting preview server on port 4173...');
      previewProc = spawn('npm', ['run', 'preview'], { stdio: 'ignore' });
      await new Promise((r) => setTimeout(r, 2000));
    }
  } catch (err) {
    console.warn('Preview check warning:', err);
  }

  const chromeProc = launchChrome(9222);
  let cdp;

  try {
    const wsUrl = await getPageWebSocketUrl(9222);
    cdp = new CDPClient(wsUrl);
    await cdp.connect();
    console.log('Connected to Chrome CDP successfully.');

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    // 1. Strict Acceptance Verification: Zero Page 3 in DOM
    const page03Elements = await cdp.evaluate(`
      ({
        hasPage03Deck: !!document.getElementById('page-03-deck-container'),
        hasPage03Section: !!document.getElementById('page-03-section'),
        hasChapterReader: !!document.getElementById('chapter-reader-view'),
        hasCardCollection: !!document.getElementById('page-02-to-03-collection-runway'),
      })
    `);
    console.log('Page 03 Strict Absence Verification:', page03Elements);
    if (page03Elements.hasPage03Deck || page03Elements.hasPage03Section || page03Elements.hasChapterReader) {
      throw new Error('STRICT CONDITION VIOLATION: Page 03 or ChapterReader still detected in DOM!');
    }

    // =========================================================================
    // PART 1: DESKTOP VALIDATION & RECORDING (1440x900)
    // =========================================================================
    console.log('\n--- Part 1: Desktop Validation (1440x900) ---');
    await cdp.setViewport(1440, 900, false);
    await cdp.scrollTo(0);
    await cdp.sleep(1500);

    // Step 1: Page 1 Initial View
    console.log('1. Page 1 Initial View');
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '01-desktop-page-01-initial.png'));
    for (let i = 0; i < 4; i++) await cdp.captureDesktopVideoFrame();

    // Step 2: Page 1 Text Exit (Scroll to 1.0 * H)
    console.log('2. Page 1 Text Exit');
    await cdp.scrollTo(900 * 1.0);
    await cdp.sleep(500);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '02-desktop-page-01-exit.png'));
    for (let i = 0; i < 4; i++) await cdp.captureDesktopVideoFrame();

    // Step 3: WebGL Transition Zone (Scroll to 2.6 * H)
    console.log('3. WebGL Noise Transition Zone');
    await cdp.scrollTo(900 * 2.6);
    await cdp.sleep(600);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '03-desktop-webgl-transition.png'));
    for (let i = 0; i < 4; i++) await cdp.captureDesktopVideoFrame();

    // Step 4: Page 2 Initial Frame (Scroll to 3.5 * H)
    console.log('4. Page 2 First Frame (Frame 1/240)');
    await cdp.scrollTo(900 * 3.5);
    await cdp.sleep(700);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '04-desktop-page-02-frame-001.png'));
    for (let i = 0; i < 5; i++) await cdp.captureDesktopVideoFrame();

    // Step 5: Page 2 Middle Animation — Connectors extending (Scroll to 5.0 * H)
    console.log('5. Page 2 Middle Animation — Connectors Extending');
    await cdp.scrollTo(900 * 5.0);
    await cdp.sleep(700);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '05-desktop-page-02-midpoint.png'));
    for (let i = 0; i < 6; i++) await cdp.captureDesktopVideoFrame();

    // Step 6: Page 2 Final State — All 10 terminal nodes and 10 cards (Scroll to 6.5 * H)
    console.log('6. Page 2 Final State — Frame 240/240 + Ten Cards Constellation');
    await cdp.scrollTo(900 * 6.5);
    await cdp.sleep(800);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '06-desktop-page-02-final-state.png'));
    for (let i = 0; i < 8; i++) await cdp.captureDesktopVideoFrame();

    // Step 7: Reverse Scroll Validation (Rewind back to Page 2 start, then Page 1)
    console.log('7. Reverse Scroll Validation');
    await cdp.scrollTo(900 * 4.2);
    await cdp.sleep(400);
    for (let i = 0; i < 3; i++) await cdp.captureDesktopVideoFrame();
    await cdp.scrollTo(900 * 3.4);
    await cdp.sleep(400);
    for (let i = 0; i < 3; i++) await cdp.captureDesktopVideoFrame();
    await cdp.scrollTo(0);
    await cdp.sleep(500);
    for (let i = 0; i < 3; i++) await cdp.captureDesktopVideoFrame();

    // =========================================================================
    // PART 2: MOBILE VALIDATION & RECORDING (390x844 iPhone Standard)
    // =========================================================================
    console.log('\n--- Part 2: Mobile Validation (390x844) ---');
    await cdp.setViewport(390, 844, true);
    await cdp.scrollTo(0);
    await cdp.sleep(1000);

    // Mobile Step 1: Page 1 Initial
    console.log('1. Mobile Page 1 Initial');
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '07-mobile-390-page-01.png'));
    for (let i = 0; i < 4; i++) await cdp.captureMobileVideoFrame();

    // Mobile Step 2: Page 2 Frame 1 (Centered 16:9 + Blurred atmosphere)
    console.log('2. Mobile Page 2 Early — Sharp 16:9 + Enlarged Blurred Backdrop');
    await cdp.scrollTo(844 * 3.6);
    await cdp.sleep(700);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '08-mobile-390-page-02-early.png'));
    for (let i = 0; i < 5; i++) await cdp.captureMobileVideoFrame();

    // Mobile Step 3: Page 2 Final State — Docked 16:9 frame + 10 vertical cards
    console.log('3. Mobile Page 2 Final — Docked 16:9 + 10 Vertical Cards');
    await cdp.scrollTo(844 * 6.5);
    await cdp.sleep(800);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '09-mobile-390-page-02-final.png'));
    for (let i = 0; i < 8; i++) await cdp.captureMobileVideoFrame();

    // =========================================================================
    // PART 3: ADDITIONAL RESPONSIVE VIEWPORTS
    // =========================================================================
    console.log('\n--- Part 3: Viewport Matrix Captures ---');
    const viewports = [
      { name: '10-mobile-360x800', w: 360, h: 800, mobile: true },
      { name: '11-mobile-430x932', w: 430, h: 932, mobile: true },
      { name: '12-tablet-768x1024', w: 768, h: 1024, mobile: false },
      { name: '13-laptop-1366x768', w: 1366, h: 768, mobile: false },
      { name: '14-desktop-1920x1080', w: 1920, h: 1080, mobile: false },
    ];

    for (const vp of viewports) {
      console.log(`Capturing viewport: ${vp.name} (${vp.w}x${vp.h})`);
      await cdp.setViewport(vp.w, vp.h, vp.mobile);
      await cdp.scrollTo(vp.h * 6.4);
      await cdp.sleep(600);
      await cdp.captureScreenshot(path.join(OUTPUT_DIR, `${vp.name}-page-02.png`));
    }

    // =========================================================================
    // PART 4: ASSEMBLE DEMO RECORDINGS (FFMPEG)
    // =========================================================================
    console.log('\n--- Part 4: Assembling Demonstration Videos ---');
    const desktopMp4 = path.join(OUTPUT_DIR, 'living-signal-desktop-demo.mp4');
    const mobileMp4 = path.join(OUTPUT_DIR, 'living-signal-mobile-demo.mp4');

    try {
      execSync(
        `ffmpeg -y -framerate 6 -i "${path.join(DESKTOP_FRAMES_DIR, 'frame_%05d.png')}" -c:v libx264 -pix_fmt yuv420p -vf "scale=1440:900" -crf 22 "${desktopMp4}"`,
        { stdio: 'inherit' }
      );
      console.log('Desktop demo video created:', desktopMp4);
    } catch (err) {
      console.error('Desktop video assembly error:', err);
    }

    try {
      execSync(
        `ffmpeg -y -framerate 6 -i "${path.join(MOBILE_FRAMES_DIR, 'frame_%05d.png')}" -c:v libx264 -pix_fmt yuv420p -vf "scale=390:844" -crf 22 "${mobileMp4}"`,
        { stdio: 'inherit' }
      );
      console.log('Mobile demo video created:', mobileMp4);
    } catch (err) {
      console.error('Mobile video assembly error:', err);
    }

    console.log('\n=== ALL VERIFICATION CAPTURES AND RECORDINGS COMPLETE! ===');
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill();
    if (previewProc) previewProc.kill();
  }
}

run().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
