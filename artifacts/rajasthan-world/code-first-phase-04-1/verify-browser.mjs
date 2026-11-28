import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const origin = 'http://127.0.0.1:4071/';
const files = new URL('./review/', import.meta.url);
await mkdir(files, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.setViewport({ width: 1440, height: 850, deviceScaleFactor: 1 });
  await page.goto(origin);
  await page.waitForSelector('#tools:not([hidden])');
  const canvas = await page.$('canvas');
  const screenshot = () => canvas.screenshot();
  const choose = (view) => page.click(`[data-view="${view}"]`);
  const save = async (name) => {
    await page.$eval('#tools', (element) => { element.style.opacity = '0'; });
    await canvas.screenshot({ path: fileURLToPath(new URL(`${name}.png`, files)) });
    await page.$eval('#tools', (element) => { element.style.opacity = '1'; });
  };

  await save('01-elevated');
  const beforeOrbit = await screenshot();
  await page.mouse.move(720, 420);
  await page.mouse.down();
  await page.mouse.move(822, 386, { steps: 6 });
  await page.mouse.up();
  assert.notDeepEqual(await screenshot(), beforeOrbit, 'Orbit should redraw the architecture');
  const beforeZoom = await screenshot();
  await page.mouse.wheel({ deltaY: -162 });
  assert.notDeepEqual(await screenshot(), beforeZoom, 'Wheel should zoom the live view');

  await choose('ground');
  await save('02-ground');
  await choose('detail');
  await save('03-sandstone');
  const closed = await screenshot();
  await page.click('#doors');
  await page.waitForFunction(() => document.querySelector('#doors').textContent === 'Close doors');
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.notDeepEqual(await screenshot(), closed, 'Opening both leaves should reveal the vault');

  await choose('passage');
  const slider = await page.$('#passage input');
  await slider.focus();
  await page.keyboard.press('End');
  assert.equal(await slider.evaluate((element) => element.value), '100');
  const farEnd = await screenshot();
  await page.keyboard.press('Home');
  assert.equal(await slider.evaluate((element) => element.value), '0');
  assert.notDeepEqual(await screenshot(), farEnd, 'Passage position should be reversible');
  await page.click('#doors');
  assert.equal(await page.$eval('#doors', (element) => element.getAttribute('aria-pressed')), 'false');

  const clearance = await page.evaluate(async () => {
    const source = await fetch('/junagarh.ts').then((response) => response.text());
    const threeUrl = source.match(/import \* as T from "([^"]+)"/)?.[1];
    if (!threeUrl) throw new Error('Could not resolve the model’s Three.js module');
    const [{ buildJunagarh }, T] = await Promise.all([import('/junagarh.ts'), import(threeUrl)]);
    const material = new T.MeshStandardMaterial();
    const palette = new Proxy({}, { get: () => material });
    const fort = buildJunagarh(palette);
    const rays = [];
    for (const y of [0.55, 1.7, 2.6]) {
      for (const x of [-0.72, 0.28, 0.72]) {
        rays.push(new T.Raycaster(new T.Vector3(x, y, 3.4), new T.Vector3(0, 0, -1), 0, 10));
      }
    }
    function blocked(left, right) {
      fort.setDoors(left, right);
      fort.group.updateMatrixWorld(true);
      return rays.filter((ray) => ray.intersectObject(fort.group, true).length > 0).length;
    }
    return [blocked(0, 0), blocked(1, 0), blocked(0, 1), blocked(1, 1)];
  });
  assert.deepEqual(clearance, [9, 6, 3, 0], 'Closed, independently opened and open door aperture checks');

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.reload();
  await page.waitForSelector('#tools:not([hidden])');
  await choose('ground');
  await page.tap('#doors');
  assert.equal(await page.$eval('#doors', (element) => element.textContent), 'Close doors');
  const layout = await page.$eval('#tools', (element) => {
    const r = element.getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  });
  assert(layout, 'Preview controls should fit the mobile viewport');
  assert.deepEqual(errors, [], 'Browser errors');
  console.log('Chrome passed orbit, zoom, 3 camera presets, door toggles, forward/reverse passage, 9 clearance rays, and the 390×844 touch layout.');
} finally {
  await browser.close();
}
