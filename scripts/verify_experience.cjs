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
  console.log('=== The Living Signal: Scroll & Card Reveal Verification ===');

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

    // =========================================================================
    // PART 1: DESKTOP VALIDATION (1440x900)
    // =========================================================================
    console.log('\n--- Part 1: Desktop Validation (1440x900) ---');
    await cdp.setViewport(1440, 900, false);
    await cdp.scrollTo(0);
    await cdp.sleep(1200);

    // Initial View
    console.log('1. Page 1 Initial View');
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '01-desktop-page-01-initial.png'));
    for (let i = 0; i < 4; i++) await cdp.captureDesktopVideoFrame();

    // Scroll through Page 1 to WebGL transition
    console.log('2. WebGL Transition Zone');
    await cdp.scrollTo(900 * 2.6);
    await cdp.sleep(600);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '02-desktop-webgl-transition.png'));
    for (let i = 0; i < 4; i++) await cdp.captureDesktopVideoFrame();

    // Page 2 Arrival (Frame 1/240)
    console.log('3. Page 2 First Frame (Frame 1/240)');
    await cdp.scrollTo(900 * 3.4);
    await cdp.sleep(600);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '03-desktop-page-02-frame-001.png'));
    for (let i = 0; i < 4; i++) await cdp.captureDesktopVideoFrame();

    // Scroll through the 5 pairs sequentially
    console.log('4. Card Pair 1 Reveal (Chapters 01 & 06)');
    await cdp.scrollTo(900 * 4.4);
    await cdp.sleep(500);
    for (let i = 0; i < 4; i++) await cdp.captureDesktopVideoFrame();

    console.log('5. Card Pair 2 & 3 Reveal (Chapters 02, 07, 03, 08)');
    await cdp.scrollTo(900 * 5.0);
    await cdp.sleep(600);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '04-desktop-page-02-midpoint.png'));
    for (let i = 0; i < 5; i++) await cdp.captureDesktopVideoFrame();

    console.log('6. Card Pair 4 & 5 Reveal (Chapters 04, 09, 05, 10)');
    await cdp.scrollTo(900 * 5.7);
    await cdp.sleep(600);
    for (let i = 0; i < 5; i++) await cdp.captureDesktopVideoFrame();

    // Reach 100% Page 02 Progress (Absolute document scroll bottom)
    const maxScrollY = await cdp.evaluate('document.documentElement.scrollHeight - window.innerHeight');
    console.log(`7. Scrolling to absolute document bottom: ${maxScrollY}px`);
    await cdp.scrollTo(maxScrollY);
    await cdp.sleep(800);

    // Assert progress and cards visibility
    const finalMetrics = await cdp.evaluate(`
      (() => {
        const leftArticles = Array.from(document.querySelectorAll('#desktop-chapter-cards-layer > div')).slice(0, 5);
        const rightArticles = Array.from(document.querySelectorAll('#desktop-chapter-cards-layer > div')).slice(5, 10);
        
        const cardDetails = Array.from(document.querySelectorAll('#desktop-chapter-cards-layer [role="article"]')).map(el => ({
          label: el.getAttribute('aria-label'),
          opacity: window.getComputedStyle(el).opacity,
          transform: window.getComputedStyle(el).transform,
          rect: el.getBoundingClientRect(),
        }));

        return {
          scrollY: window.scrollY,
          maxScrollY: document.documentElement.scrollHeight - window.innerHeight,
          totalCardsRendered: cardDetails.length,
          allOpacities: cardDetails.map(c => ({ label: c.label, opacity: c.opacity })),
          card05: cardDetails.find(c => c.label && c.label.includes('05')),
          card10: cardDetails.find(c => c.label && c.label.includes('10')),
        };
      })()
    `);

    console.log('Final Desktop Metrics:', JSON.stringify(finalMetrics, null, 2));

    if (finalMetrics.totalCardsRendered !== 10) {
      throw new Error(`Expected 10 desktop cards rendered, found ${finalMetrics.totalCardsRendered}`);
    }

    if (!finalMetrics.card05 || parseFloat(finalMetrics.card05.opacity) < 0.95) {
      throw new Error(`CRITICAL: Card 05 not fully visible! Opacity: ${finalMetrics.card05 ? finalMetrics.card05.opacity : 'missing'}`);
    }

    if (!finalMetrics.card10 || parseFloat(finalMetrics.card10.opacity) < 0.95) {
      throw new Error(`CRITICAL: Card 10 not fully visible! Opacity: ${finalMetrics.card10 ? finalMetrics.card10.opacity : 'missing'}`);
    }

    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '05-desktop-page-02-final-state.png'));
    for (let i = 0; i < 8; i++) await cdp.captureDesktopVideoFrame();

    // Reverse scroll validation
    console.log('8. Validating Natural Reverse Scroll to Page 1');
    await cdp.scrollTo(900 * 4.5);
    await cdp.sleep(400);
    for (let i = 0; i < 3; i++) await cdp.captureDesktopVideoFrame();
    await cdp.scrollTo(900 * 3.4);
    await cdp.sleep(400);
    for (let i = 0; i < 3; i++) await cdp.captureDesktopVideoFrame();
    await cdp.scrollTo(0);
    await cdp.sleep(500);
    for (let i = 0; i < 3; i++) await cdp.captureDesktopVideoFrame();

    // =========================================================================
    // PART 2: MOBILE VALIDATION (390x844)
    // =========================================================================
    console.log('\n--- Part 2: Mobile Validation (390x844) ---');
    await cdp.setViewport(390, 844, true);
    await cdp.scrollTo(0);
    await cdp.sleep(1000);

    // Initial Mobile
    console.log('1. Mobile Initial');
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '06-mobile-390-page-01.png'));
    for (let i = 0; i < 4; i++) await cdp.captureMobileVideoFrame();

    // Mobile Page 2 Early Frame
    console.log('2. Mobile Early Page 2 (Sharp 16:9 + Blurred atmosphere)');
    await cdp.scrollTo(844 * 3.6);
    await cdp.sleep(600);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '07-mobile-390-page-02-early.png'));
    for (let i = 0; i < 5; i++) await cdp.captureMobileVideoFrame();

    // Scroll to Mobile Document Bottom
    const mobileMaxScrollY = await cdp.evaluate('document.documentElement.scrollHeight - window.innerHeight');
    console.log(`3. Mobile Final Scroll to bottom: ${mobileMaxScrollY}px`);
    await cdp.scrollTo(mobileMaxScrollY);
    await cdp.sleep(800);

    const mobileMetrics = await cdp.evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('#mobile-chapter-cards-container [role="article"]')).map(el => ({
          label: el.getAttribute('aria-label'),
          opacity: window.getComputedStyle(el).opacity,
          rect: el.getBoundingClientRect(),
        }));

        const container = document.getElementById('mobile-chapter-cards-container');
        const containerStyle = container ? window.getComputedStyle(container) : null;

        return {
          cardsCount: cards.length,
          card05: cards.find(c => c.label && c.label.includes('05')),
          card10: cards.find(c => c.label && c.label.includes('10')),
          hasNestedOverflow: container ? container.style.overflowY === 'auto' : false,
        };
      })()
    `);

    console.log('Mobile Final Metrics:', JSON.stringify(mobileMetrics, null, 2));

    if (mobileMetrics.cardsCount !== 10) {
      throw new Error(`Expected 10 mobile cards, found ${mobileMetrics.cardsCount}`);
    }

    if (!mobileMetrics.card05 || parseFloat(mobileMetrics.card05.opacity) < 0.95) {
      throw new Error(`CRITICAL: Mobile Card 05 opacity: ${mobileMetrics.card05 ? mobileMetrics.card05.opacity : 'missing'}`);
    }

    if (!mobileMetrics.card10 || parseFloat(mobileMetrics.card10.opacity) < 0.95) {
      throw new Error(`CRITICAL: Mobile Card 10 opacity: ${mobileMetrics.card10 ? mobileMetrics.card10.opacity : 'missing'}`);
    }

    if (mobileMetrics.hasNestedOverflow) {
      throw new Error('CRITICAL: Mobile cards container still has separate overflow-y: auto scroll area!');
    }

    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '08-mobile-390-page-02-final.png'));
    for (let i = 0; i < 8; i++) await cdp.captureMobileVideoFrame();

    // =========================================================================
    // PART 3: ADDITIONAL RESPONSIVE VIEWPORTS
    // =========================================================================
    console.log('\n--- Part 3: Viewport Matrix Captures ---');
    const viewports = [
      { name: '09-mobile-360x800', w: 360, h: 800, mobile: true },
      { name: '10-mobile-430x932', w: 430, h: 932, mobile: true },
      { name: '11-tablet-768x1024', w: 768, h: 1024, mobile: false },
      { name: '12-laptop-1366x768', w: 1366, h: 768, mobile: false },
      { name: '13-desktop-1920x1080', w: 1920, h: 1080, mobile: false },
    ];

    for (const vp of viewports) {
      console.log(`Capturing viewport: ${vp.name} (${vp.w}x${vp.h})`);
      await cdp.setViewport(vp.w, vp.h, vp.mobile);
      const scrollY = await cdp.evaluate('document.documentElement.scrollHeight - window.innerHeight');
      await cdp.scrollTo(scrollY);
      await cdp.sleep(600);
      await cdp.captureScreenshot(path.join(OUTPUT_DIR, `${vp.name}-final.png`));
    }

    // =========================================================================
    // PART 4: ASSEMBLE DEMO VIDEOS (FFMPEG)
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

    console.log('\n=== ALL VERIFICATION CAPTURES AND ASSERTIONS PASSED! ===');
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill();
  }
}

run().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
