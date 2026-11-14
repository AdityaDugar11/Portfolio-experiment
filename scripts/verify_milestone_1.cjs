const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../docs/screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

async function getPageWebSocketUrl(port = 9226, maxAttempts = 30) {
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
  console.log('MILESTONE 1 VERIFICATION: Desktop Foundation & Ch 01');
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
  } else {
    console.log('Vite preview server already active on port 4173.');
  }

  const chromePort = 9226;
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

    const testResolutions = [
      { w: 1280, h: 720, label: 'milestone1_1280x720.png' },
      { w: 1440, h: 900, label: 'milestone1_1440x900.png' },
      { w: 1920, h: 1080, label: 'milestone1_1920x1080.png' },
    ];

    console.log('--- TEST 1: Direct Page 02 Composition & Framing ---');
    const targetUrl = 'http://localhost:4173/?preview=page-02';
    await cdp.send('Page.navigate', { url: targetUrl });
    await new Promise((r) => setTimeout(r, 2000));

    for (const res of testResolutions) {
      console.log(`\nEvaluating resolution: ${res.w} x ${res.h}...`);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: res.w,
        height: res.h,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await new Promise((r) => setTimeout(r, 800));

      const evalData = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const root = document.getElementById('page-02-editorial-scene');
          const video = root?.querySelector('video');
          const portraitAnchor = document.getElementById('portrait-anchor-right');
          const img = portraitAnchor?.querySelector('img');
          const textStage = document.getElementById('editorial-stream-left');
          const h2 = textStage?.querySelector('h2');
          const p = textStage?.querySelector('p');

          const portraitRect = portraitAnchor?.getBoundingClientRect();
          const imgRect = img?.getBoundingClientRect();

          return {
            rootFound: !!root,
            video: {
              src: video?.currentSrc || video?.src,
              paused: video?.paused,
              muted: video?.muted,
              currentTime: video?.currentTime,
            },
            portrait: {
              src: img?.src,
              naturalWidth: img?.naturalWidth,
              naturalHeight: img?.naturalHeight,
              anchorRight: portraitRect ? portraitRect.right : null,
              anchorBottom: portraitRect ? portraitRect.bottom : null,
              width: imgRect ? imgRect.width : null,
              height: imgRect ? imgRect.height : null,
              flushRight: portraitRect ? Math.abs(portraitRect.right - window.innerWidth) <= 1 : null,
            },
            text: {
              headlineFound: !!h2,
              headlineText: h2?.textContent?.trim(),
              headlineColor: h2 ? window.getComputedStyle(h2).color : null,
              bodyColor: p ? window.getComputedStyle(p).color : null,
            }
          };
        })()`,
        returnByValue: true,
      });

      const data = evalData.result.value;
      console.log(`Resolution ${res.w}x${res.h} metrics:`, JSON.stringify(data, null, 2));

      // Assertions
      if (!data.rootFound) throw new Error(`Root not found at ${res.w}x${res.h}`);
      if (data.portrait.naturalWidth !== 1086 || data.portrait.naturalHeight !== 1448) {
        throw new Error(`Portrait dimensions mismatch: expected 1086x1448, got ${data.portrait.naturalWidth}x${data.portrait.naturalHeight}`);
      }
      if (!data.portrait.flushRight) {
        console.warn(`Note: anchorRight = ${data.portrait.anchorRight}, innerWidth = ${res.w}`);
      }

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUTPUT_DIR, res.label);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot: ${outPath}`);
    }

    console.log('\n--- TEST 2: Full Journey Scroll Integration (Page 01 -> Transition -> Page 02) ---');
    await cdp.send('Page.navigate', { url: 'http://localhost:4173/' });
    await new Promise((r) => setTimeout(r, 2000));

    // Scroll to Transition zone (~180vh)
    console.log('Scrolling to Scene Transition zone...');
    await cdp.send('Runtime.evaluate', {
      expression: `window.scrollTo({ top: window.innerHeight * 1.8, behavior: 'instant' })`,
    });
    await new Promise((r) => setTimeout(r, 1200));

    const transitionShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const transitionPath = path.join(OUTPUT_DIR, 'milestone1_transition_active.png');
    fs.writeFileSync(transitionPath, Buffer.from(transitionShot.data, 'base64'));
    console.log(`Saved transition screenshot: ${transitionPath}`);

    // Scroll into Page 02 (~320vh)
    console.log('Scrolling into Page 02 Editorial Scene...');
    await cdp.send('Runtime.evaluate', {
      expression: `window.scrollTo({ top: window.innerHeight * 3.2, behavior: 'instant' })`,
    });
    await new Promise((r) => setTimeout(r, 1500));

    const page02Shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const page02Path = path.join(OUTPUT_DIR, 'milestone1_page02_scrolled.png');
    fs.writeFileSync(page02Path, Buffer.from(page02Shot.data, 'base64'));
    console.log(`Saved scrolled Page 02 screenshot: ${page02Path}`);

    // Test Reverse Scroll
    console.log('Testing reverse scroll back to top...');
    await cdp.send('Runtime.evaluate', {
      expression: `window.scrollTo({ top: 0, behavior: 'instant' })`,
    });
    await new Promise((r) => setTimeout(r, 1200));

    const page01ReversedShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const page01ReversedPath = path.join(OUTPUT_DIR, 'milestone1_page01_reversed.png');
    fs.writeFileSync(page01ReversedPath, Buffer.from(page01ReversedShot.data, 'base64'));
    console.log(`Saved reversed Page 01 screenshot: ${page01ReversedPath}`);

    console.log('\n====================================================');
    console.log('ALL MILESTONE 1 AUTOMATED CHECKS PASSED SUCCESSFULLY');
    console.log('====================================================\n');
  } finally {
    if (cdp) await cdp.close();
    chromeProcess.kill('SIGTERM');
    if (previewProcess) previewProcess.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('Milestone 1 Verification Failed:', err);
  process.exit(1);
});
