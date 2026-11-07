const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../docs/screenshots/final-implementation');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const FRAMES_DIR = path.join(OUTPUT_DIR, 'frames');
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

let frameIndex = 0;

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

async function getPageWebSocketUrl(port = 9222, maxAttempts = 15) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`http://localhost:${port}/json/list`);
      const pages = await res.json();
      const page = pages.find((p) => p.type === 'page' && p.url.includes('localhost:4173'));
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome starting up
    }
    await new Promise((r) => setTimeout(r, 400));
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

  async captureFrame() {
    const padded = String(frameIndex++).padStart(5, '0');
    const filepath = path.join(FRAMES_DIR, `frame_${padded}.png`);
    await this.captureScreenshot(filepath);
  }

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('--- Starting Living Signal Final Validation ---');
  const chromeProc = launchChrome(9222);
  let cdp;

  try {
    const wsUrl = await getPageWebSocketUrl(9222);
    cdp = new CDPClient(wsUrl);
    await cdp.connect();
    console.log('Connected to CDP at:', wsUrl);

  // Enable domains
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  // Check for any runtime errors
  const pageTitle = await cdp.evaluate('document.title');
  console.log('Verified Page Title:', pageTitle);

  // Set Desktop 1440x900 Viewport
  await cdp.setViewport(1440, 900, false);
  await cdp.evaluate('window.scrollTo(0, 0)');
  await cdp.sleep(1200);

  // 1. Stage 1: Page 01 Initial Hero View
  console.log('Capturing Stage 1: Page 01 Initial View...');
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '01-page-01-initial-hero.png'));
  for (let i = 0; i < 8; i++) await cdp.captureFrame();

  // Scroll to exit text
  await cdp.evaluate('window.scrollTo({ top: window.innerHeight * 0.9, behavior: "instant" })');
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '02-page-01-editorial-exit.png'));
  for (let i = 0; i < 6; i++) await cdp.captureFrame();

  // 2. Stage 2: WebGL Scene Transformation
  console.log('Capturing Stage 2: WebGL Scene Transformation Zone...');
  // Runway 1 is 180vh, Runway 2 is 160vh (midpoint at 2.6 * innerHeight)
  await cdp.evaluate('window.scrollTo({ top: window.innerHeight * 2.6, behavior: "instant" })');
  await cdp.sleep(800);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '03-webgl-shader-transition.png'));
  for (let i = 0; i < 8; i++) await cdp.captureFrame();

  // 3. Stage 3: Page 02 The Living Signal (Orbital Constellation)
  console.log('Capturing Stage 3: Page 02 The Living Signal (Portrait + 3 Rings + 10 Connections)...');
  // Runway 3 runs from 3.4 to 6.2 * innerHeight (active constellation at 5.4 * innerHeight)
  await cdp.evaluate('window.scrollTo({ top: window.innerHeight * 5.4, behavior: "instant" })');
  await cdp.sleep(800);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '04-page-02-orbital-constellation.png'));
  for (let i = 0; i < 10; i++) await cdp.captureFrame();

  // 4. Stage 4: Page 02 -> Page 03 Card Collection Zone
  console.log('Capturing Stage 4: Card Collection Transition (Cards fly to stack)...');
  // Runway 4 runs from 6.2 to 8.0 * innerHeight (collection midpoint at 7.1 * innerHeight)
  await cdp.evaluate('window.scrollTo({ top: window.innerHeight * 7.1, behavior: "instant" })');
  await cdp.sleep(800);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '05-card-collection-transition.png'));
  for (let i = 0; i < 8; i++) await cdp.captureFrame();

  // 5. Stage 5: Page 03 Layered Chapter Card Deck
  console.log('Capturing Stage 5: Page 03 Single Overlapping Card Deck...');
  await cdp.evaluate('document.getElementById("page-03-section")?.scrollIntoView({ behavior: "instant" })');
  await cdp.sleep(800);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '06-page-03-card-deck-stack.png'));
  for (let i = 0; i < 10; i++) await cdp.captureFrame();

  // 6. Stage 6: Desktop Hover Separation
  console.log('Capturing Stage 6: Desktop Hover separation on Card 03...');
  await cdp.evaluate(`
    const cards = document.querySelectorAll('#page-03-deck-container [role="button"]');
    if (cards[2]) {
      cards[2].dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    }
  `);
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '07-page-03-card-hover.png'));
  for (let i = 0; i < 6; i++) await cdp.captureFrame();

  // 7. Stage 7: Chapter Reading Scene (Chapter 01)
  console.log('Capturing Stage 7: Chapter Reading Experience (Chapter 01)...');
  await cdp.evaluate(`
    const cards = document.querySelectorAll('#page-03-deck-container [role="button"]');
    if (cards[0]) {
      cards[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  `);
  await cdp.sleep(800);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '08-chapter-01-full-story.png'));
  for (let i = 0; i < 8; i++) await cdp.captureFrame();

  // 8. Stage 8: Transition to Chapter 02
  console.log('Capturing Stage 8: Transition into Chapter 02 (Beyond the Interface)...');
  await cdp.evaluate(`
    const reader = document.getElementById('chapter-reader-view');
    const nextBtn = reader ? Array.from(reader.querySelectorAll('button')).find(b => b.textContent.includes('Next')) : null;
    if (nextBtn) {
      nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  `);
  await cdp.sleep(800);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '09-chapter-02-transitioned.png'));
  for (let i = 0; i < 8; i++) await cdp.captureFrame();

  // Return to Deck
  console.log('Returning to deck...');
  await cdp.evaluate(`
    const reader = document.getElementById('chapter-reader-view');
    const returnBtn = reader ? Array.from(reader.querySelectorAll('button')).find(b => b.textContent.includes('Card Deck') || b.textContent.includes('All 10 Cards')) : null;
    if (returnBtn) returnBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  `);
  await cdp.sleep(600);

  // 9. Responsive Breakpoints Validation
  console.log('Capturing Responsive Breakpoints...');
  // Tablet: 768x1024
  await cdp.setViewport(768, 1024, false);
  await cdp.evaluate('window.scrollTo(0, 0)');
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '10-tablet-768-page-01.png'));

  await cdp.evaluate('window.scrollTo({ top: window.innerHeight * 4.6, behavior: "instant" })');
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '11-tablet-768-page-02.png'));

  await cdp.evaluate('document.getElementById("page-03-section")?.scrollIntoView({ behavior: "instant" })');
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '12-tablet-768-page-03-deck.png'));

  // Mobile: 390x844 (iPhone 14 standard)
  await cdp.setViewport(390, 844, true);
  await cdp.evaluate('window.scrollTo(0, 0)');
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '13-mobile-390-page-01.png'));

  await cdp.evaluate('window.scrollTo({ top: window.innerHeight * 4.6, behavior: "instant" })');
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '14-mobile-390-page-02.png'));

  await cdp.evaluate('document.getElementById("page-03-section")?.scrollIntoView({ behavior: "instant" })');
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '15-mobile-390-page-03-deck.png'));

  // Open chapter on mobile
  await cdp.evaluate(`
    const openBtn = document.querySelector('#page-03-deck-container button');
    if (openBtn) openBtn.click();
  `);
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '16-mobile-390-chapter-reader.png'));

  // Large Desktop: 1920x1080
  await cdp.setViewport(1920, 1080, false);
  await cdp.evaluate(`
    const returnBtn = document.querySelector('#chapter-reader-view button');
    if (returnBtn) returnBtn.click();
  `);
  await cdp.sleep(400);
  await cdp.evaluate('window.scrollTo({ top: window.innerHeight * 4.6, behavior: "instant" })');
  await cdp.sleep(600);
  await cdp.captureScreenshot(path.join(OUTPUT_DIR, '17-desktop-1920-page-02.png'));

  // 10. Assemble Demonstration MP4 Video using ffmpeg
  console.log('Assembling final demonstration mp4 video...');
  const videoPath = path.join(OUTPUT_DIR, 'the-living-signal-final-demo.mp4');
  try {
    execSync(
      `ffmpeg -y -framerate 10 -i "${path.join(FRAMES_DIR, 'frame_%05d.png')}" -c:v libx264 -pix_fmt yuv420p -vf "scale=1440:900" -crf 22 "${videoPath}"`,
      { stdio: 'inherit' }
    );
    console.log('Video generated successfully at:', videoPath);
  } catch (err) {
    console.error('Error generating ffmpeg video:', err);
  }

  console.log('--- All Validation Captures Complete! ---');
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill();
  }
}

run().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
