const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../docs/screenshots');
const FRAMES_DIR = path.join(OUTPUT_DIR, 'living_trace_frames');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

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

async function runVerification() {
  console.log('====================================================');
  console.log('LIVING TRACE FIRST PROTOTYPE VERIFICATION');
  console.log('Chapter 01 -> Chapter 02 (Laptop 1440x900 & Mobile 390x844)');
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
    console.log('Vite preview server ready on port 4173.');
  } else {
    console.log('Vite preview server already active on port 4173.');
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

    // -------------------------------------------------------------
    // PART 1: LAPTOP VERIFICATION (1440 x 900)
    // -------------------------------------------------------------
    console.log('\n>>> STARTING LAPTOP VERIFICATION (1440 x 900) <<<');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const targetUrl = 'http://localhost:4173/';
    console.log(`Navigating to ${targetUrl}...`);
    await cdp.send('Page.navigate', { url: targetUrl });
    await new Promise((r) => setTimeout(r, 2000));

    // Skip first-load intro cleanly for scroll testing
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        sessionStorage.setItem('the-living-signal-intro-seen', '1');
        if (window.__lenis) window.__lenis.resize();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Find scroll positions for key milestones
    // Runway 1: Page 01 (180vh) -> ~1620px
    // Runway 2: Transition (160vh) -> ~1440px (cum 3060px)
    // Runway 3: Page 02 (380vh) -> ~3420px (cum 6480px)
    const laptopScrollLimits = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const p1Runway = document.getElementById('page-01-runway');
        const transRunway = document.getElementById('page-01-to-02-transition-runway');
        const p2Runway = document.getElementById('page-02-runway');

        const p1Height = p1Runway ? p1Runway.offsetHeight : 1620;
        const transHeight = transRunway ? transRunway.offsetHeight : 1440;
        const p2Height = p2Runway ? p2Runway.offsetHeight : 3420;

        const p2Start = p1Height + transHeight;
        const totalHeight = p2Start + p2Height;

        return { p1Height, transHeight, p2Height, p2Start, totalHeight };
      })()`,
      returnByValue: true,
    });

    const { p2Start, p2Height } = laptopScrollLimits.result.value;
    console.log(`Laptop Page 02 starts at: ${p2Start}px, total runway: ${p2Height}px`);

    const laptopStates = [
      {
        name: 'laptop_01_ch01_opening.png',
        scrollTarget: p2Start + p2Height * 0.08,
        label: 'Chapter 01 Opening: Authentic Portrait, Statement, Observation Trace',
      },
      {
        name: 'laptop_02_ch01_progression.png',
        scrollTarget: p2Start + p2Height * 0.25,
        label: 'Chapter 01 Progression: Full Narrative Stanzas, Deepening Trace',
      },
      {
        name: 'laptop_03_ch01_to_02_transformation.png',
        scrollTarget: p2Start + p2Height * 0.50,
        label: 'Ch 01 -> Ch 02 Transformation: Camera Pushes Forward, Portrait Recedes, Trace Penetrates',
      },
      {
        name: 'laptop_04_ch02_investigation_state.png',
        scrollTarget: p2Start + p2Height * 0.82,
        label: 'Chapter 02 Investigation: Subsurface Systems Topology & POSIX Telemetry',
      },
      {
        name: 'laptop_05_reverse_scrolled_to_ch01.png',
        scrollTarget: p2Start + p2Height * 0.08,
        label: 'Reverse Scroll: Clean Rewind to Chapter 01 (Zero Ghosting)',
      },
    ];

    for (const state of laptopStates) {
      console.log(`\nScrolling to ${state.label} (Y = ${Math.round(state.scrollTarget)}px)...`);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__lenis) {
            window.__lenis.scrollTo(${state.scrollTarget}, { immediate: true });
          } else {
            window.scrollTo({ top: ${state.scrollTarget}, behavior: 'instant' });
          }
          if (window.ScrollTrigger) window.ScrollTrigger.update();
        })()`,
      });
      await new Promise((r) => setTimeout(r, 800));

      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUTPUT_DIR, state.name);
      fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
      console.log(`✓ Saved: ${state.name}`);
    }

    // -------------------------------------------------------------
    // PART 2: MOBILE VERIFICATION (390 x 844)
    // -------------------------------------------------------------
    console.log('\n>>> STARTING MOBILE VERIFICATION (390 x 844) <<<');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      hasTouch: true,
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Refresh layout for mobile
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        if (window.__lenis) window.__lenis.resize();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 500));

    const mobileScrollLimits = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const p1Runway = document.getElementById('page-01-runway');
        const transRunway = document.getElementById('page-01-to-02-transition-runway');
        const p2MobileRunway = document.getElementById('page-02-mobile-runway');

        const p1Height = p1Runway ? p1Runway.offsetHeight : 1519;
        const transHeight = transRunway ? transRunway.offsetHeight : 1350;
        const p2Height = p2MobileRunway ? p2MobileRunway.offsetHeight : 4051;

        const p2Start = p1Height + transHeight;
        return { p2Start, p2Height };
      })()`,
      returnByValue: true,
    });

    const mStart = mobileScrollLimits.result.value.p2Start;
    const mHeight = mobileScrollLimits.result.value.p2Height;
    console.log(`Mobile Page 02 starts at: ${mStart}px, mobile runway: ${mHeight}px`);

    const mobileStates = [
      {
        name: 'mobile_01_ch01_opening.png',
        scrollTarget: mStart + mHeight * 0.08,
        label: 'Mobile Chapter 01: Continuous Vertical World, Portrait Framed with Narrative',
      },
      {
        name: 'mobile_02_ch01_progression.png',
        scrollTarget: mStart + mHeight * 0.25,
        label: 'Mobile Chapter 01: Narrative Stanzas, Vertical Observation Trace',
      },
      {
        name: 'mobile_03_ch01_to_02_transformation.png',
        scrollTarget: mStart + mHeight * 0.50,
        label: 'Mobile Ch 01 -> Ch 02: Portrait Dissolves, Vertical Trace Plunges',
      },
      {
        name: 'mobile_04_ch02_investigation_state.png',
        scrollTarget: mStart + mHeight * 0.82,
        label: 'Mobile Chapter 02: Vertical Subsurface System Telemetry',
      },
      {
        name: 'mobile_05_reverse_scrolled_to_ch01.png',
        scrollTarget: mStart + mHeight * 0.08,
        label: 'Mobile Reverse Scroll: Deterministic Return to Chapter 01',
      },
    ];

    for (const state of mobileStates) {
      console.log(`\nScrolling Mobile to ${state.label} (Y = ${Math.round(state.scrollTarget)}px)...`);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__lenis) {
            window.__lenis.scrollTo(${state.scrollTarget}, { immediate: true });
          } else {
            window.scrollTo({ top: ${state.scrollTarget}, behavior: 'instant' });
          }
          if (window.ScrollTrigger) window.ScrollTrigger.update();
        })()`,
      });
      await new Promise((r) => setTimeout(r, 800));

      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUTPUT_DIR, state.name);
      fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
      console.log(`✓ Saved: ${state.name}`);
    }

    // -------------------------------------------------------------
    // PART 3: RECORD SCROLL DEMO VIDEO (LAPTOP 1440x900)
    // -------------------------------------------------------------
    console.log('\n>>> RECORDING SCROLL DEMO VIDEO (1440 x 900) <<<');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 500));

    // Clear frames dir
    const existingFrames = fs.readdirSync(FRAMES_DIR);
    for (const f of existingFrames) {
      fs.unlinkSync(path.join(FRAMES_DIR, f));
    }

    const totalVideoFrames = 50;
    // Step forward from Chapter 01 (p2Start) to Chapter 02 (p2Start + p2Height * 0.9)
    // Then step backwards to demonstrate reverse scroll!
    const forwardSteps = 30;
    const reverseSteps = 20;

    let frameIndex = 0;
    for (let i = 0; i < forwardSteps; i++) {
      const frac = i / (forwardSteps - 1);
      const targetY = p2Start + p2Height * 0.05 + (p2Height * 0.85) * frac;
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__lenis) window.__lenis.scrollTo(${targetY}, { immediate: true });
          else window.scrollTo({ top: ${targetY}, behavior: 'instant' });
          if (window.ScrollTrigger) window.ScrollTrigger.update();
        })()`,
      });
      await new Promise((r) => setTimeout(r, 60));

      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
      const frameName = `frame_${String(frameIndex++).padStart(4, '0')}.jpg`;
      fs.writeFileSync(path.join(FRAMES_DIR, frameName), Buffer.from(screenshot.data, 'base64'));
    }

    for (let i = 0; i < reverseSteps; i++) {
      const frac = 1.0 - i / (reverseSteps - 1);
      const targetY = p2Start + p2Height * 0.05 + (p2Height * 0.85) * frac;
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__lenis) window.__lenis.scrollTo(${targetY}, { immediate: true });
          else window.scrollTo({ top: ${targetY}, behavior: 'instant' });
          if (window.ScrollTrigger) window.ScrollTrigger.update();
        })()`,
      });
      await new Promise((r) => setTimeout(r, 60));

      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
      const frameName = `frame_${String(frameIndex++).padStart(4, '0')}.jpg`;
      fs.writeFileSync(path.join(FRAMES_DIR, frameName), Buffer.from(screenshot.data, 'base64'));
    }

    console.log(`Captured ${frameIndex} frames. Stitching with ffmpeg...`);
    const videoOutPath = path.join(OUTPUT_DIR, 'living_trace_scroll_recording.mp4');
    try {
      execSync(
        `ffmpeg -y -framerate 15 -i "${FRAMES_DIR}/frame_%04d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 22 "${videoOutPath}"`,
        { stdio: 'pipe' }
      );
      console.log(`✓ Generated demo video: ${videoOutPath}`);
    } catch (err) {
      console.warn('ffmpeg stitching error:', err.message);
    }

    // -------------------------------------------------------------
    // PART 4: PERFORMANCE & ACCESSIBILITY AUDIT
    // -------------------------------------------------------------
    console.log('\n>>> PERFORMANCE & ACCESSIBILITY MEASUREMENTS <<<');
    const perfData = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const domCount = document.querySelectorAll('*').length;
        const memory = window.performance && window.performance.memory ? {
          usedJSHeapSizeMB: (window.performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
          totalJSHeapSizeMB: (window.performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
        } : { note: 'performance.memory not exposed in standard context' };

        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
          tag: h.tagName,
          text: h.textContent.replace(/\\s+/g, ' ').trim().slice(0, 60)
        }));

        return { domCount, memory, headings };
      })()`,
      returnByValue: true,
    });

    console.log('Performance audit metrics:', JSON.stringify(perfData.result.value, null, 2));

  } finally {
    if (cdp) await cdp.close();
    chromeProcess.kill();
    if (previewProcess) previewProcess.kill();
  }
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
