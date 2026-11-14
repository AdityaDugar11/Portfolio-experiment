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

async function getPageWebSocketUrl(port = 9225, maxAttempts = 30) {
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
  console.log('--- Starting Revised Prototype Verification ---');

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

  const chromePort = 9225;
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

    const targetUrl = 'http://localhost:4173/?preview=page-02';
    console.log(`Navigating to ${targetUrl}...`);
    await cdp.send('Page.navigate', { url: targetUrl });
    await new Promise((r) => setTimeout(r, 2200));

    // 1. Capture 1440 x 900 clean composition
    console.log('\n--- Capturing 1440 x 900 Clean Composition ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 600));

    const eval1440 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.getElementById('page-02-portrait-prototype');
        const video = root?.querySelector('video');
        const img = root?.querySelector('img');
        const hud = root?.querySelector('.absolute.top-4');
        return {
          rootExists: !!root,
          hasHUD: !!hud,
          video: {
            paused: video?.paused,
            muted: video?.muted,
            currentTime: video?.currentTime
          },
          image: {
            naturalWidth: img?.naturalWidth,
            naturalHeight: img?.naturalHeight,
            clientWidth: img?.clientWidth,
            clientHeight: img?.clientHeight,
            aspect: img ? (img.clientWidth / img.clientHeight).toFixed(3) : null
          }
        };
      })()`,
      returnByValue: true,
    });
    console.log('1440x900 Evaluation result:', JSON.stringify(eval1440.result.value, null, 2));

    const shot1440 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot1440CleanPath = path.join(OUTPUT_DIR, 'prototype_1440x900_clean.png');
    fs.writeFileSync(shot1440CleanPath, Buffer.from(shot1440.data, 'base64'));
    console.log(`Saved clean screenshot: ${shot1440CleanPath}`);

    // 2. Capture 1280 x 720 clean composition
    console.log('\n--- Capturing 1280 x 720 Clean Composition ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 600));

    const eval1280 = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.getElementById('page-02-portrait-prototype');
        const video = root?.querySelector('video');
        const img = root?.querySelector('img');
        return {
          rootExists: !!root,
          imageClientWidth: img?.clientWidth,
          imageClientHeight: img?.clientHeight,
          aspect: img ? (img.clientWidth / img.clientHeight).toFixed(3) : null,
          videoPaused: video?.paused,
          videoCurrentTime: video?.currentTime
        };
      })()`,
      returnByValue: true,
    });
    console.log('1280x720 Evaluation result:', JSON.stringify(eval1280.result.value, null, 2));

    const shot1280 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot1280Path = path.join(OUTPUT_DIR, 'prototype_1280x720.png');
    fs.writeFileSync(shot1280Path, Buffer.from(shot1280.data, 'base64'));
    console.log(`Saved screenshot: ${shot1280Path}`);

    console.log('\n--- Screenshots captured successfully ---');
  } finally {
    if (cdp) await cdp.close();
    chromeProcess.kill('SIGTERM');
    if (previewProcess) previewProcess.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
