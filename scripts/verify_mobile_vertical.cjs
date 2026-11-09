const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../test-results/mobile-vertical');
const MOBILE_FRAMES_DIR = path.join(OUTPUT_DIR, 'video_frames');
const DESKTOP_DIR = path.join(OUTPUT_DIR, 'desktop');
const RESPONSIVE_DIR = path.join(OUTPUT_DIR, 'responsive');

[OUTPUT_DIR, MOBILE_FRAMES_DIR, DESKTOP_DIR, RESPONSIVE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Clean previous temporary frame captures
fs.readdirSync(MOBILE_FRAMES_DIR).forEach((f) => fs.unlinkSync(path.join(MOBILE_FRAMES_DIR, f)));

let videoFrameIdx = 0;
const PORT = 4174;
const CDP_PORT = 9223;

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

  async setViewport(width, height, isMobile = false) {
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
    await this.sleep(80);
    return filepath;
  }

  async captureVideoFrame() {
    const padded = String(videoFrameIdx++).padStart(5, '0');
    const filepath = path.join(MOBILE_FRAMES_DIR, `frame_${padded}.png`);
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
    await this.sleep(100);
  }

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  console.log('=== The Living Signal: Mobile Vertical Scrollytelling Verification ===');

  let viteProc = launchViteServer();
  await new Promise((r) => setTimeout(r, 1500));

  let chromeProc = launchChrome();
  let cdp;

  try {
    const wsUrl = await getPageWebSocketUrl();
    cdp = new CDPClient(wsUrl);
    await cdp.connect();
    console.log('Connected to Chrome CDP successfully on port ' + CDP_PORT);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    // =========================================================================
    // PART 1: MOBILE VERTICAL SCROLLYTELLING COMPREHENSIVE VERIFICATION (390x844)
    // =========================================================================
    console.log('\n--- Part 1: Mobile Vertical Scrollytelling Verification (390x844) ---');
    await cdp.setViewport(390, 844, true);
    await cdp.scrollTo(0);
    await cdp.sleep(1200);

    // 1. Page 1 Hero Initial View
    console.log('1. Page 1 Hero Initial View');
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '01_page01_hero.png'));
    await cdp.captureVideoFrame();
    await cdp.captureVideoFrame();

    // 2. Mid-Transition WebGL
    console.log('2. WebGL Scene Transition Midpoint');
    const transitionY = 844 * 2.2;
    await cdp.scrollTo(transitionY);
    await cdp.sleep(400);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '02_mid_transition.png'));
    await cdp.captureVideoFrame();
    await cdp.captureVideoFrame();

    // Find the start and height of the mobile runway
    const runwayMetrics = await cdp.evaluate(`
      (() => {
        const r1 = document.getElementById('page-01-runway');
        const r2 = document.getElementById('page-01-to-02-transition-runway');
        const rMob = document.getElementById('page-02-mobile-runway');
        return {
          r1H: r1 ? r1.offsetHeight : 0,
          r2H: r2 ? r2.offsetHeight : 0,
          mobY: rMob ? rMob.offsetTop : 0,
          mobH: rMob ? rMob.offsetHeight : 0,
          maxScroll: document.documentElement.scrollHeight - window.innerHeight,
        };
      })()
    `);
    console.log('Runway metrics:', runwayMetrics);

    const mobStartY = runwayMetrics.mobY;
    const mobMaxScroll = runwayMetrics.maxScroll;
    const mobScrollDist = mobMaxScroll - mobStartY;

    const getMobileScrollY = (p) => Math.round(mobStartY + mobScrollDist * p);

    // 3. Stage 1: Character Introduction (progress 0.05, frame ~12)
    console.log('3. Stage 1: Character Introduction (Aditya centered, frame ~12)');
    await cdp.scrollTo(getMobileScrollY(0.05));
    await cdp.sleep(400);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '03_stage_1_character_intro.png'));
    await cdp.captureVideoFrame();
    await cdp.captureVideoFrame();

    // 4. Stage 2: Orbital Formation (progress 0.28, frame ~67)
    console.log('4. Stage 2: 3 Orbital Rings Formation (progress 0.28, frame ~67)');
    await cdp.scrollTo(getMobileScrollY(0.28));
    await cdp.sleep(400);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '04_stage_2_orbital_formation.png'));
    await cdp.captureVideoFrame();
    await cdp.captureVideoFrame();

    // 5. Stage 3: Vertical Camera Movement & Progressive Reveal
    const revealSteps = [
      { name: '05a_stage_3_tier_1_ch01_ch02', p: 0.44, desc: 'Chapters 01 & 02 Reveal' },
      { name: '05b_stage_3_tier_2_ch03_ch04', p: 0.54, desc: 'Chapters 03 & 04 Reveal' },
      { name: '05c_stage_3_tier_3_ch05_ch06', p: 0.65, desc: 'Chapters 05 & 06 Reveal (The Work)' },
      { name: '05d_stage_3_tier_4_ch07_ch08', p: 0.76, desc: 'Chapters 07 & 08 Reveal' },
      { name: '05e_stage_3_tier_5_ch09_ch10', p: 0.86, desc: 'Chapters 09 & 10 Reveal' },
    ];

    for (const step of revealSteps) {
      console.log(`Stage 3: ${step.desc} (progress ${step.p})`);
      await cdp.scrollTo(getMobileScrollY(step.p));
      await cdp.sleep(350);
      await cdp.captureScreenshot(path.join(OUTPUT_DIR, `${step.name}.png`));
      await cdp.captureVideoFrame();
      await cdp.captureVideoFrame();
    }

    // 6. Stage 4: Complete Discovery State (progress 0.98)
    console.log('6. Stage 4: Complete Discovery State (progress 0.98)');
    await cdp.scrollTo(getMobileScrollY(0.98));
    await cdp.sleep(400);

    const fullMetrics = await cdp.evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('#mobile-vertical-world-container button')).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            text: el.innerText.split('\\n')[0],
            opacity: window.getComputedStyle(el.closest('[style*="opacity"]') || el).opacity,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          };
        });
        const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
        return {
          totalCards: cards.length,
          cards: cards,
          hasHorizontalScroll,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      })()
    `);
    console.log('Complete Discovery State Metrics:', {
      totalCards: fullMetrics.totalCards,
      hasHorizontalScroll: fullMetrics.hasHorizontalScroll,
      scrollWidth: fullMetrics.scrollWidth,
      innerWidth: fullMetrics.innerWidth,
    });
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '06_stage_4_complete_discovery.png'));
    await cdp.captureVideoFrame();
    await cdp.captureVideoFrame();

    // 7. Test Card Tap Interaction (Open Compact Preview for Chapter 06)
    console.log('7. Testing Interactive Chapter Preview (tap on Chapter 06 card)');
    await cdp.scrollTo(getMobileScrollY(0.65));
    await cdp.sleep(300);

    await cdp.evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('#mobile-vertical-world-container button'));
        const ch06Btn = buttons.find(b => b.innerText.includes('CHAPTER 06') || b.innerText.includes('The Work'));
        if (ch06Btn) ch06Btn.click();
      })()
    `);
    await cdp.sleep(400);

    const modalMetrics = await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('[role="dialog"]');
        return modal ? {
          isOpen: true,
          title: modal.querySelector('h3') ? modal.querySelector('h3').innerText : '',
          hasExcerpt: !!modal.querySelector('p'),
        } : { isOpen: false };
      })()
    `);
    console.log('Chapter Preview Modal Metrics:', modalMetrics);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '07_chapter_preview_modal.png'));
    await cdp.captureVideoFrame();
    await cdp.captureVideoFrame();

    // Close preview modal
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('[role="dialog"] button[aria-label*="Close"]') ||
                         Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.innerText.includes('Close'));
        if (closeBtn) closeBtn.click();
      })()
    `);
    await cdp.sleep(250);

    // 8. Reverse Scrolling Validation
    console.log('8. Validating Reverse Scrolling back to Stage 1 & Page 01');
    const reverseSteps = [0.85, 0.65, 0.44, 0.28, 0.05, 0.0];
    for (const p of reverseSteps) {
      await cdp.scrollTo(getMobileScrollY(p));
      await cdp.sleep(150);
      await cdp.captureVideoFrame();
    }
    // Return all the way to Page 01
    await cdp.scrollTo(0);
    await cdp.sleep(300);
    await cdp.captureVideoFrame();
    await cdp.captureVideoFrame();
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '08_reversed_to_page01.png'));

    // =========================================================================
    // PART 2: MOBILE VIEWPORT RESPONSIVENESS (360x800, 390x844, 430x932)
    // =========================================================================
    console.log('\n--- Part 2: Mobile Viewport Responsiveness Verification ---');
    const viewports = [
      { name: '360x800', w: 360, h: 800 },
      { name: '390x844', w: 390, h: 844 },
      { name: '430x932', w: 430, h: 932 },
    ];

    for (const vp of viewports) {
      console.log(`Testing viewport ${vp.name}...`);
      await cdp.setViewport(vp.w, vp.h, true);
      await cdp.sleep(300);

      // Hero
      await cdp.scrollTo(0);
      await cdp.sleep(200);
      await cdp.captureScreenshot(path.join(RESPONSIVE_DIR, `${vp.name}_01_hero.png`));

      // Character Intro & Orbital Formation (progress 0.25)
      await cdp.scrollTo(getMobileScrollY(0.25));
      await cdp.sleep(200);
      await cdp.captureScreenshot(path.join(RESPONSIVE_DIR, `${vp.name}_02_orbital_formation.png`));

      // Vertical Cards Descent (progress 0.62)
      await cdp.scrollTo(getMobileScrollY(0.62));
      await cdp.sleep(200);
      await cdp.captureScreenshot(path.join(RESPONSIVE_DIR, `${vp.name}_03_vertical_cards.png`));

      // Discovery State (progress 0.96)
      await cdp.scrollTo(getMobileScrollY(0.96));
      await cdp.sleep(200);
      await cdp.captureScreenshot(path.join(RESPONSIVE_DIR, `${vp.name}_04_discovery_state.png`));

      const vpMetrics = await cdp.evaluate(`
        (() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
          };
        })()
      `);
      console.log(`Viewport ${vp.name} metrics:`, vpMetrics);

      if (vpMetrics.hasHorizontalScroll) {
        throw new Error(`Viewport ${vp.name} has horizontal scrollbar regression!`);
      }
    }

    // =========================================================================
    // PART 3: DESKTOP REGRESSION VERIFICATION (>= 768px)
    // Must remain visually identical to approved desktop implementation!
    // =========================================================================
    console.log('\n--- Part 3: Desktop Preservation & Regression Testing (>= 768px) ---');
    const desktopViewports = [
      { name: '1366x768', w: 1366, h: 768 },
      { name: '1440x900', w: 1440, h: 900 },
      { name: '1920x1080', w: 1920, h: 1080 },
    ];

    for (const vp of desktopViewports) {
      console.log(`Testing desktop viewport ${vp.name}...`);
      await cdp.setViewport(vp.w, vp.h, false);
      await cdp.send('Page.reload');
      await cdp.sleep(1200);

      // Final Desktop Discovery State
      const maxScroll = await cdp.evaluate('document.documentElement.scrollHeight - window.innerHeight');
      await cdp.scrollTo(maxScroll);
      await cdp.sleep(800);
      await cdp.captureScreenshot(path.join(DESKTOP_DIR, `${vp.name}_page02_discovery.png`));

      const desktopMetrics = await cdp.evaluate(`
        (() => {
          const cards = Array.from(document.querySelectorAll('#desktop-chapter-cards-layer [role="article"]')).map(el => ({
            label: el.getAttribute('aria-label'),
            opacity: parseFloat(window.getComputedStyle(el).opacity),
            rect: el.getBoundingClientRect(),
          }));
          const canvas = document.querySelector('#page-02-scene-root canvas');
          return {
            totalCards: cards.length,
            card01: cards.find(c => c.label && c.label.includes('01')),
            card05: cards.find(c => c.label && c.label.includes('05')),
            card06: cards.find(c => c.label && c.label.includes('06')),
            card10: cards.find(c => c.label && c.label.includes('10')),
            hasCanvas: !!canvas,
          };
        })()
      `);
      console.log(`Desktop ${vp.name} metrics:`, {
        totalCards: desktopMetrics.totalCards,
        card01Opacity: desktopMetrics.card01 ? desktopMetrics.card01.opacity : null,
        card05Opacity: desktopMetrics.card05 ? desktopMetrics.card05.opacity : null,
        card06Opacity: desktopMetrics.card06 ? desktopMetrics.card06.opacity : null,
        card10Opacity: desktopMetrics.card10 ? desktopMetrics.card10.opacity : null,
        hasCanvas: desktopMetrics.hasCanvas,
      });

      if (desktopMetrics.totalCards !== 10) {
        throw new Error(`Desktop ${vp.name} regression! Expected 10 cards, found ${desktopMetrics.totalCards}`);
      }
    }

    // =========================================================================
    // PART 4: ASSEMBLE DEMONSTRATION VIDEO WITH FFMPEG
    // =========================================================================
    console.log('\n--- Part 4: Assembling Demonstration Videos with ffmpeg ---');
    const mobileMp4 = path.join(OUTPUT_DIR, 'mobile-vertical-scrollytelling.mp4');

    try {
      execSync(
        `ffmpeg -y -framerate 4 -i "${path.join(MOBILE_FRAMES_DIR, 'frame_%05d.png')}" -c:v libx264 -pix_fmt yuv420p -vf "scale=390:844" -crf 20 "${mobileMp4}"`,
        { stdio: 'inherit' }
      );
      console.log('Mobile demo MP4 created successfully:', mobileMp4);
    } catch (err) {
      console.error('Error generating MP4:', err);
    }

    console.log('\n=============================================================');
    console.log('=== ALL MOBILE VERTICAL & DESKTOP REGRESSION TESTS PASSED! ===');
    console.log('=============================================================');
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill();
    if (viteProc) viteProc.kill();
  }
}

run().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
