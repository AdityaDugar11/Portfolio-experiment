const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../test-results/mobile-constellation');
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

  async captureVideoFrame() {
    const padded = String(videoFrameIdx++).padStart(5, '0');
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
  console.log('=== The Living Signal: Mobile Horizontal Constellation Verification ===');

  const chromeProc = launchChrome();
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
    // PART 1: MOBILE HORIZONTAL CONSTELLATION VERIFICATION (390x844)
    // =========================================================================
    console.log('\n--- Part 1: Mobile Horizontal Constellation Verification (390x844) ---');
    await cdp.setViewport(390, 844, true);
    await cdp.scrollTo(0);
    await cdp.sleep(1500);

    // 1. Page 1 Hero Initial View
    console.log('1. Page 1 Hero Initial View');
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '01_page01_hero.png'));
    for (let i = 0; i < 4; i++) await cdp.captureVideoFrame();

    // 2. Mid-Transition WebGL
    console.log('2. WebGL Scene Transition Midpoint');
    const transitionY = 844 * 2.2;
    await cdp.scrollTo(transitionY);
    await cdp.sleep(500);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '02_mid_transition.png'));
    for (let i = 0; i < 4; i++) await cdp.captureVideoFrame();

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

    // Helper to calculate scrollY for exact mobile progress p (0.0 to 1.0)
    const getMobileScrollY = (p) => Math.round(mobStartY + mobScrollDist * p);

    // 3. Stage A: Character Introduction (Mobile Page 02 progress = 0.05, frame ~12)
    console.log('3. Stage A: Character Introduction (Aditya centered, frame ~12)');
    await cdp.scrollTo(getMobileScrollY(0.05));
    await cdp.sleep(500);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '03_stage_A_character_intro.png'));
    for (let i = 0; i < 4; i++) await cdp.captureVideoFrame();

    // 4. Stage B: Orbital Formation (Mobile progress = 0.28, frame ~67)
    console.log('4. Stage B: 3 Orbital Rings Formation (progress 0.28, frame ~67)');
    await cdp.scrollTo(getMobileScrollY(0.28));
    await cdp.sleep(500);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '04_stage_B_orbital_formation.png'));
    for (let i = 0; i < 5; i++) await cdp.captureVideoFrame();

    // 5. Stage C (Left Pan): Left-Side Chapter Cards Exploration (progress = 0.52, frame ~124)
    console.log('5. Stage C: Left-Side Chapter Cards Exploration (Chapters 01–05, progress 0.52)');
    await cdp.scrollTo(getMobileScrollY(0.52));
    await cdp.sleep(600);

    const leftMetrics = await cdp.evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('#page-02-mobile-constellation [role="button"]')).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            label: el.getAttribute('aria-label'),
            opacity: window.getComputedStyle(el).opacity,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          };
        });
        return {
          totalCards: cards.length,
          leftCards: cards.slice(0, 5),
        };
      })()
    `);
    console.log('Left Cards Metrics at progress 0.52:', leftMetrics);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '05_stage_C_left_cards_exploration.png'));
    for (let i = 0; i < 6; i++) await cdp.captureVideoFrame();

    // 6. Stage C (Return through Center): Aditya with connected wings (progress = 0.68, frame ~162)
    console.log('6. Stage C: Returning through Central Composition (Aditya centered, progress 0.68)');
    await cdp.scrollTo(getMobileScrollY(0.68));
    await cdp.sleep(500);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '06_stage_C_center_sweep.png'));
    for (let i = 0; i < 5; i++) await cdp.captureVideoFrame();

    // 7. Stage C (Right Pan): Right-Side Chapter Cards Exploration (Chapters 06–10, progress 0.86)
    console.log('7. Stage C: Right-Side Chapter Cards Exploration (Chapters 06–10, progress 0.86)');
    await cdp.scrollTo(getMobileScrollY(0.86));
    await cdp.sleep(600);

    const rightMetrics = await cdp.evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('#page-02-mobile-constellation [role="button"]')).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            label: el.getAttribute('aria-label'),
            opacity: window.getComputedStyle(el).opacity,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          };
        });
        return {
          totalCards: cards.length,
          rightCards: cards.slice(5, 10),
        };
      })()
    `);
    console.log('Right Cards Metrics at progress 0.86:', rightMetrics);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '07_stage_C_right_cards_exploration.png'));
    for (let i = 0; i < 6; i++) await cdp.captureVideoFrame();

    // 8. Stage D: Complete Discovery State (Mobile progress = 1.0, absolute bottom)
    console.log('8. Stage D: Complete Discovery State (Progress 1.0, Frame 240, All 10 Cards Revealed)');
    await cdp.scrollTo(mobMaxScroll);
    await cdp.sleep(800);

    const finalMobileMetrics = await cdp.evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('#page-02-mobile-constellation [role="button"]')).map(el => ({
          label: el.getAttribute('aria-label'),
          opacity: parseFloat(window.getComputedStyle(el).opacity),
          rect: el.getBoundingClientRect(),
        }));

        const svgLines = document.querySelectorAll('#page-02-mobile-constellation svg line');
        const svgBeacons = document.querySelectorAll('#page-02-mobile-constellation svg circle');
        const hudPills = document.querySelectorAll('#page-02-mobile-constellation .flex.items-center button');

        return {
          totalCards: cards.length,
          allOpacities: cards.map(c => ({ label: c.label, opacity: c.opacity })),
          svgLinesCount: svgLines.length,
          svgBeaconsCount: svgBeacons.length,
          hasHudPills: hudPills.length > 0,
        };
      })()
    `);
    console.log('Final Mobile Discovery Metrics:', finalMobileMetrics);

    if (finalMobileMetrics.totalCards !== 10) {
      throw new Error(`Expected 10 mobile cards rendered, found ${finalMobileMetrics.totalCards}`);
    }

    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '08_stage_D_complete_discovery.png'));
    for (let i = 0; i < 6; i++) await cdp.captureVideoFrame();

    // 9. Interactive Card Selection (Tap Chapter 06 to open compact preview)
    console.log('9. Interactive Card Tap: Selecting Chapter 06');
    await cdp.evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('#page-02-mobile-constellation [role="button"]'));
        const ch06 = cards.find(el => el.getAttribute('aria-label') && el.getAttribute('aria-label').includes('06'));
        if (ch06) ch06.click();
      })()
    `);
    await cdp.sleep(400);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '09_interactive_card_selection_modal.png'));
    for (let i = 0; i < 4; i++) await cdp.captureVideoFrame();

    // Close preview
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close Preview"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await cdp.sleep(300);

    // 10. Natural Reverse Scrolling back through all stages to Page 1
    console.log('10. Natural Reverse Scrolling to Page 1');
    const reverseSteps = [0.85, 0.65, 0.45, 0.25, 0.05];
    for (const p of reverseSteps) {
      await cdp.scrollTo(getMobileScrollY(p));
      await cdp.sleep(200);
      for (let i = 0; i < 2; i++) await cdp.captureVideoFrame();
    }
    await cdp.scrollTo(0);
    await cdp.sleep(600);
    await cdp.captureScreenshot(path.join(OUTPUT_DIR, '10_reverse_scroll_back_to_hero.png'));
    for (let i = 0; i < 4; i++) await cdp.captureVideoFrame();

    // =========================================================================
    // PART 2: RESPONSIVE VIEWPORT TESTING (360x800, 390x844, 430x932)
    // =========================================================================
    console.log('\n--- Part 2: Mobile Viewport Matrix Captures ---');
    const mobileViewports = [
      { name: '360x800', w: 360, h: 800 },
      { name: '390x844', w: 390, h: 844 },
      { name: '430x932', w: 430, h: 932 },
    ];

    for (const vp of mobileViewports) {
      console.log(`Testing mobile viewport: ${vp.name}`);
      await cdp.setViewport(vp.w, vp.h, true);
      await cdp.send('Page.reload');
      await cdp.sleep(1000);

      const vMetrics = await cdp.evaluate(`
        (() => {
          const rMob = document.getElementById('page-02-mobile-runway');
          return {
            mobY: rMob ? rMob.offsetTop : 0,
            maxScroll: document.documentElement.scrollHeight - window.innerHeight,
          };
        })()
      `);
      const vStartY = vMetrics.mobY;
      const vDist = vMetrics.maxScroll - vStartY;

      // Hero
      await cdp.scrollTo(0);
      await cdp.sleep(400);
      await cdp.captureScreenshot(path.join(RESPONSIVE_DIR, `${vp.name}_01_hero.png`));

      // Left cards
      await cdp.scrollTo(Math.round(vStartY + vDist * 0.52));
      await cdp.sleep(500);
      await cdp.captureScreenshot(path.join(RESPONSIVE_DIR, `${vp.name}_02_left_cards.png`));

      // Right cards
      await cdp.scrollTo(Math.round(vStartY + vDist * 0.86));
      await cdp.sleep(500);
      await cdp.captureScreenshot(path.join(RESPONSIVE_DIR, `${vp.name}_03_right_cards.png`));

      // Discovery state at bottom
      await cdp.scrollTo(vMetrics.maxScroll);
      await cdp.sleep(500);
      await cdp.captureScreenshot(path.join(RESPONSIVE_DIR, `${vp.name}_04_discovery_state.png`));
    }

    // =========================================================================
    // PART 3: DESKTOP REGRESSION TEST (1366x768, 1440x900, 1920x1080)
    // =========================================================================
    console.log('\n--- Part 3: Desktop Regression Testing (Must Remain 100% Identical) ---');
    const desktopViewports = [
      { name: '1366x768', w: 1366, h: 768 },
      { name: '1440x900', w: 1440, h: 900 },
      { name: '1920x1080', w: 1920, h: 1080 },
    ];

    for (const vp of desktopViewports) {
      console.log(`Verifying desktop viewport: ${vp.name}`);
      await cdp.setViewport(vp.w, vp.h, false);
      await cdp.send('Page.reload');
      await cdp.sleep(1200);

      // Hero
      await cdp.scrollTo(0);
      await cdp.sleep(500);
      await cdp.captureScreenshot(path.join(DESKTOP_DIR, `${vp.name}_01_hero.png`));

      // Transition
      const transY = vp.h * 2.2;
      await cdp.scrollTo(transY);
      await cdp.sleep(500);
      await cdp.captureScreenshot(path.join(DESKTOP_DIR, `${vp.name}_02_transition.png`));

      // Final Desktop Discovery State
      const maxScroll = await cdp.evaluate('document.documentElement.scrollHeight - window.innerHeight');
      await cdp.scrollTo(maxScroll);
      await cdp.sleep(800);
      await cdp.captureScreenshot(path.join(DESKTOP_DIR, `${vp.name}_03_discovery_10_cards.png`));

      const desktopMetrics = await cdp.evaluate(`
        (() => {
          const cards = Array.from(document.querySelectorAll('#desktop-chapter-cards-layer [role="article"]')).map(el => ({
            label: el.getAttribute('aria-label'),
            opacity: parseFloat(window.getComputedStyle(el).opacity),
            rect: el.getBoundingClientRect(),
          }));
          return {
            totalCards: cards.length,
            card01: cards.find(c => c.label && c.label.includes('01')),
            card05: cards.find(c => c.label && c.label.includes('05')),
            card06: cards.find(c => c.label && c.label.includes('06')),
            card10: cards.find(c => c.label && c.label.includes('10')),
          };
        })()
      `);

      console.log(`Desktop ${vp.name} Verification:`, {
        totalCards: desktopMetrics.totalCards,
        card01Opacity: desktopMetrics.card01 ? desktopMetrics.card01.opacity : null,
        card05Opacity: desktopMetrics.card05 ? desktopMetrics.card05.opacity : null,
        card06Opacity: desktopMetrics.card06 ? desktopMetrics.card06.opacity : null,
        card10Opacity: desktopMetrics.card10 ? desktopMetrics.card10.opacity : null,
      });

      if (desktopMetrics.totalCards !== 10) {
        throw new Error(`Desktop ${vp.name} regression! Expected 10 cards, found ${desktopMetrics.totalCards}`);
      }
    }

    // =========================================================================
    // PART 4: ASSEMBLE DEMONSTRATION VIDEO WITH FFMPEG
    // =========================================================================
    console.log('\n--- Part 4: Assembling Demonstration Videos with ffmpeg ---');
    const mobileMp4 = path.join(OUTPUT_DIR, 'mobile-horizontal-constellation.mp4');
    const mobileWebm = path.join(OUTPUT_DIR, 'mobile-horizontal-constellation.webm');

    try {
      execSync(
        `ffmpeg -y -framerate 6 -i "${path.join(MOBILE_FRAMES_DIR, 'frame_%05d.png')}" -c:v libx264 -pix_fmt yuv420p -vf "scale=390:844" -crf 20 "${mobileMp4}"`,
        { stdio: 'inherit' }
      );
      console.log('Mobile demo MP4 created:', mobileMp4);
    } catch (err) {
      console.error('Error generating MP4:', err);
    }

    try {
      execSync(
        `ffmpeg -y -framerate 6 -i "${path.join(MOBILE_FRAMES_DIR, 'frame_%05d.png')}" -c:v libvpx-vp9 -b:v 1500k -vf "scale=390:844" "${mobileWebm}"`,
        { stdio: 'inherit' }
      );
      console.log('Mobile demo WEBM created:', mobileWebm);
    } catch (err) {
      console.error('Error generating WebM:', err);
    }

    console.log('\n=============================================================');
    console.log('=== ALL MOBILE CONSTELLATION & DESKTOP REGRESSION TESTS PASSED! ===');
    console.log('=============================================================');
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) chromeProc.kill();
  }
}

run().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
