"""Capture private browser evidence. Run with the development preview up."""

import argparse
import io
import json
import os
from pathlib import Path
import re
import subprocess

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

OUTPUT = Path(__file__).parent / 'private'
DESKTOP = (1440, 900)
MOBILE = (390, 844)
SCENE_MODULE = re.compile(r'/src/components/rajasthanCinematicScene\.ts(?:\?.*)?$')
STAGE = '.rc-stage'
MARKER = '.rc-marker'

AUDIT_GL = """() => {
  const prototype = WebGL2RenderingContext.prototype;
  window.cinematicAudit = {draws: 0, triangles: 0, textures: []};
  const draw = prototype.drawElements;
  prototype.drawElements = function (mode, count, ...args) {
    cinematicAudit.draws += 1;
    cinematicAudit.triangles = count / 3;
    return draw.call(this, mode, count, ...args);
  };
  const allocate = prototype.texStorage2D;
  prototype.texStorage2D = function (target, levels, format, width, height) {
    cinematicAudit.textures.push({levels, format, width, height});
    return allocate.call(this, target, levels, format, width, height);
  };
}"""

BENCHMARK = """async () => {
  const run = 4000;
  const max = document.documentElement.scrollHeight - innerHeight;
  const frames = [];
  const firstDraw = cinematicAudit.draws;
  let previous;
  let start;
  const actualDuration = await new Promise(resolve => requestAnimationFrame(function frame(t) {
    start ??= t;
    if (previous !== undefined) frames.push(t - previous);
    previous = t;
    const fraction = Math.min(1, (t - start) / run);
    scrollTo(0, Math.round(max * (fraction <= .5 ? fraction * 2 : (1 - fraction) * 2)));
    if (fraction === 1) resolve(t - start);
    else requestAnimationFrame(frame);
  }));
  await new Promise(requestAnimationFrame);
  frames.sort((a, b) => a - b);
  const gl = document.querySelector('.rc-stage canvas').getContext('webgl2');
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    canvas: [gl.drawingBufferWidth, gl.drawingBufferHeight],
    renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
    drawCount: cinematicAudit.draws - firstDraw,
    drawsPerSecond: (cinematicAudit.draws - firstDraw) / (actualDuration / 1000),
    p50FrameMs: frames[Math.floor(frames.length * .50)],
    p95FrameMs: frames[Math.floor(frames.length * .95)],
    trianglesPerDraw: cinematicAudit.triangles,
    textureAllocations: cinematicAudit.textures,
  };
}"""

TRANSFER = """() => {
  const entries = performance.getEntriesByType('resource');
  return {
    scene: entries.filter(e => e.name.includes('/__rajasthan-cinematic/')).map(e => ({
      name: e.name.split('/').at(-1), body: e.encodedBodySize, transfer: e.transferSize,
      startMs: e.startTime, endMs: e.responseEnd
    })),
    resourceTransfer: entries.reduce((sum, e) => sum + e.transferSize, 0)
      + performance.getEntriesByType('navigation')[0].transferSize
  };
}"""


def context(browser, size, mobile=False, **options):
    width, height = size
    return browser.new_context(
        viewport={'width': width, 'height': height}, is_mobile=mobile, has_touch=mobile,
        device_scale_factor=2 if mobile else 1, **options,
    )


def open_ready(page, url, mode='depth'):
    page.goto(url, wait_until='domcontentloaded')
    page.locator(f'{STAGE}[data-mode={mode}] {MARKER}').wait_for(timeout=20000)
    page.wait_for_function("document.querySelectorAll('.rc-image')[1]?.naturalWidth > 0")


def at(page, progress):
    page.evaluate('p => scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * p))', progress)
    page.evaluate('() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))))')


def check_marker(page):
    result = page.locator(MARKER).evaluate("""node => {
      const {left, top, right, bottom, width, height} = node.getBoundingClientRect();
      return [left >= 0, top >= 0, right <= innerWidth, bottom <= innerHeight,
        width >= 47.99, height >= 47.99, document.documentElement.scrollWidth === document.documentElement.clientWidth,
        node.textContent === '01'];
    }""")
    assert all(result), result


def capture(page, name):
    return page.screenshot(path=OUTPUT / 'screens' / f'{name}.png', scale='css')


def equal_pixels(first, second):
    first, second = [Image.open(io.BytesIO(value)).convert('RGB') for value in (first, second)]
    return ImageChops.difference(first, second).getbbox() is None


def touch_swipe(page, delta):
    session = page.context.new_cdp_session(page)
    height = page.viewport_size['height']
    start = height * (.79 if delta > 0 else .21)
    x = page.viewport_size['width'] / 2
    session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': start}]})
    for step in range(1, 13):
        session.send('Input.dispatchTouchEvent', {
            'type': 'touchMove', 'touchPoints': [{'x': x, 'y': start - delta * step / 12}],
        })
        page.wait_for_timeout(20)
    page.wait_for_timeout(100)
    session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    session.detach()


def record(browser, url, label, size, mobile):
    width, height = size
    video_context = context(
        browser, size, mobile, record_video_dir=OUTPUT / 'video',
        record_video_size={'width': width, 'height': height},
    )
    page = video_context.new_page()
    open_ready(page, url)
    page.wait_for_timeout(450)
    for direction, pressed in [(1, 'true'), (-1, 'false')]:
        if mobile:
            for _ in range(3):
                touch_swipe(page, direction * 455)
                page.wait_for_timeout(150)
        else:
            page.mouse.move(width - 100, height / 2)
            for _ in range(15):
                page.mouse.wheel(0, direction * 90)
                page.wait_for_timeout(95)
        page.wait_for_function("(forward) => forward ? scrollY === document.documentElement.scrollHeight - innerHeight : scrollY === 0",
                               arg=direction == 1)
        assert page.locator(MARKER).get_attribute('aria-pressed') == pressed
        page.wait_for_timeout(500)
    video_context.close()
    source = Path(page.video.path())
    destination = OUTPUT / f'{label}-forward-reverse.mp4'
    subprocess.run([
        'ffmpeg', '-loglevel', 'error', '-y', '-i', str(source), '-an',
        '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(destination),
    ], check=True)
    source.unlink()


def verify_viewport(browser, url, label, size, mobile):
    world = context(browser, size, mobile)
    page = world.new_page()
    page.add_init_script(f'({AUDIT_GL})()')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: errors.append(message.text) if message.type in ('error', 'warning') else None)
    open_ready(page, url)
    page.wait_for_function('width => cinematicAudit.textures.some(texture => texture.width === width)',
                           arg=1200 if mobile else 1728)
    opening = capture(page, f'{label}-opening')
    check_marker(page)
    at(page, .55)
    middle = capture(page, f'{label}-approach')
    check_marker(page)
    at(page, 1)
    capture(page, f'{label}-junagarh')
    check_marker(page)
    assert page.locator(MARKER).get_attribute('aria-pressed') == 'true'
    at(page, .55)
    assert equal_pixels(middle, page.screenshot(scale='css')), 'Midpoint changed on reverse'
    at(page, 0)
    assert equal_pixels(opening, capture(page, f'{label}-return')), 'Overview changed on reverse'
    metrics = page.evaluate(BENCHMARK)
    metrics.update(page.evaluate(TRANSFER))
    devtools = world.new_cdp_session(page)
    devtools.send('HeapProfiler.collectGarbage')
    metrics['heapAfterGC'] = devtools.send('Runtime.getHeapUsage')
    metrics['forwardReversePixelsEqual'] = True
    assert not errors, errors
    world.close()
    return metrics


def verify_inputs(browser, url):
    checks = []
    for size, mobile in [((1280, 720), False), ((1920, 1080), False), ((360, 800), True), ((430, 932), True), ((844, 390), True)]:
        with context(browser, size, mobile) as world:
            page = world.new_page()
            open_ready(page, url)
            for progress in [0, .25, .5, .75, 1]:
                at(page, progress)
                check_marker(page)
    checks.append('Five additional viewports, on-screen 48px marker and zero horizontal overflow')
    with context(browser, DESKTOP) as world:
        page = world.new_page()
        open_ready(page, url)
        page.keyboard.press('Tab')
        assert page.locator(MARKER).evaluate('node => document.activeElement === node')
        page.keyboard.press('Enter')
        page.wait_for_function("document.querySelector('.rc-marker').ariaPressed === 'true'")
        page.keyboard.press('Space')
        page.wait_for_function('scrollY === 0')
        page.keyboard.press('End')
        page.wait_for_function("document.querySelector('.rc-marker').ariaPressed === 'true'")
        page.mouse.move(1100, 500)
        page.mouse.wheel(0, -5000)
        page.wait_for_function('scrollY === 0')
        page.mouse.wheel(0, 5000)
        page.wait_for_function("document.querySelector('.rc-marker').ariaPressed === 'true'")
        page.keyboard.press('Home')
        page.wait_for_function('scrollY === 0')
        page.emulate_media(reduced_motion='reduce')
        page.locator('.rc-stage[data-mode=still]').wait_for()
        assert not page.locator('.rc-stage canvas').count()
        page.emulate_media(reduced_motion='no-preference')
        page.locator('.rc-stage[data-mode=depth]').wait_for()
    checks.append('Keyboard focus and marker toggle, End/Home, fast wheel in both directions, live motion preference')
    with context(browser, MOBILE, True, reduced_motion='reduce') as world:
        page = world.new_page()
        open_ready(page, url, 'still')
        assert not page.locator('.rc-stage canvas').count()
        assert 'depth.webp' not in json.dumps(page.evaluate(TRANSFER))
        assert page.locator(MARKER).get_attribute('aria-pressed') == 'false'
        page.locator(MARKER).tap()
        page.wait_for_function("document.querySelector('.rc-marker').ariaPressed === 'true'")
        page.locator(MARKER).tap()
        page.wait_for_function("document.querySelector('.rc-marker').ariaPressed === 'false'")
        capture(page, 'mobile-reduced-motion')
    checks.append('Reduced motion on first load, static views, touch marker, no depth request')
    with context(browser, MOBILE, True) as world:
        page = world.new_page()
        page.route('**/__rajasthan-cinematic/depth.webp', lambda route: route.abort())
        open_ready(page, url, 'still')
        touch_swipe(page, 410)
        assert page.evaluate('scrollY') > 0
    checks.append('Depth load failure falls back to stills with native touch scroll')
    with context(browser, DESKTOP) as world:
        page = world.new_page()
        open_ready(page, url)
        page.evaluate("document.querySelector('.rc-stage canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
        page.locator('.rc-stage[data-mode=still]').wait_for()
        assert not page.locator('.rc-stage canvas').count()
        check_marker(page)
    checks.append('WebGL context loss falls back to a still with the marker in place')
    return checks


def camera_sweep(browser, url):
    report = []
    for label, size, mobile in [('desktop', DESKTOP, False), ('mobile', MOBILE, True)]:
        for dolly in [0.53, 0.82, 1.05, 1.30, 1.55, 1.75, 1.95]:
            with context(browser, size, mobile) as world:
                page = world.new_page()

                def replace_scene(route):
                    response = route.fetch()
                    body = response.text()
                    assert 'const DOLLY_DISTANCE = 0.82;' in body
                    original = 'renderer.render(scene, camera);'
                    assert original in body
                    instrumented = original + """window.cameraAudit = {position: camera.position.toArray(), fov: camera.fov,
                      view: camera.view, anchor: anchor.toArray()};"""
                    body = body.replace('const DOLLY_DISTANCE = 0.82;', f'const DOLLY_DISTANCE = {dolly};')
                    body = body.replace(original, instrumented)
                    route.fulfill(response=response, body=body)

                page.route(SCENE_MODULE, replace_scene)
                open_ready(page, url)
                for phase in (.5, .75, 1):
                    at(page, phase)
                    row = page.evaluate('window.cameraAudit')
                    report.append({'viewport': label, 'dolly': dolly, 'progress': phase, **row})
                    if phase == 1:
                        capture(page, f'stress/{label}-{dolly:.2f}')
        with context(browser, size, mobile) as world:
            page = world.new_page()

            def remove_relief(route):
                response = route.fetch()
                body = response.text()
                assert 'const RELIEF = 0.84;' in body
                route.fulfill(response=response, body=body.replace('const RELIEF = 0.84;', 'const RELIEF = 0;'))

            page.route(SCENE_MODULE, remove_relief)
            open_ready(page, url)
            at(page, 1)
            capture(page, f'stress/{label}-flat')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://localhost:5173/?preview=rajasthan-cinematic')
    parser.add_argument('--production-url', default='http://127.0.0.1:5184/?preview=rajasthan-cinematic')
    parser.add_argument('--chrome', default='/usr/bin/google-chrome')
    parser.add_argument('--headless', action='store_true')
    args = parser.parse_args()
    for name in ['screens', 'screens/stress', 'video']:
        (OUTPUT / name).mkdir(parents=True, exist_ok=True)
    if not args.headless and Path(f'/run/user/{os.getuid()}/wayland-0').exists():
        os.environ.setdefault('XDG_RUNTIME_DIR', f'/run/user/{os.getuid()}')
        os.environ.setdefault('WAYLAND_DISPLAY', 'wayland-0')
    flags = ['--ozone-platform=wayland'] if not args.headless and 'WAYLAND_DISPLAY' in os.environ else []
    with sync_playwright() as playwright:
        launch = dict(executable_path=args.chrome, headless=args.headless)
        browser = playwright.chromium.launch(**launch, args=flags)
        results = {'browser': browser.version}
        for label, size, mobile in [('desktop', DESKTOP, False), ('mobile', MOBILE, True)]:
            results[label] = verify_viewport(browser, args.url, label, size, mobile)
            print(f'{label} captures and benchmark passed', flush=True)
        results['checks'] = verify_inputs(browser, args.url)
        print('Keyboard, wheel, failure and viewport checks passed', flush=True)
        results['cameraSweep'] = camera_sweep(browser, args.url)
        print('Camera sweep captured', flush=True)
        for label, size, mobile in [('desktop', DESKTOP, False), ('mobile', MOBILE, True)]:
            record(browser, args.url, label, size, mobile)
            results['checks'].append(f'{label} native forward and reverse scroll recording')
        with context(browser, DESKTOP) as world:
            page = world.new_page()
            page.goto(args.url.replace('rajasthan-cinematic', 'rajasthan-world'), wait_until='domcontentloaded')
            page.get_by_role('button', name='Go to chapter map').wait_for()
            assert not page.locator('.rc-runway').count()
            assert not page.evaluate(TRANSFER)['scene']
        results['checks'].append('Phase 02.2 still opens through its separate preview query')
        with context(browser, DESKTOP) as world:
            page = world.new_page()
            page.goto(args.production_url, wait_until='domcontentloaded')
            page.locator('h1').filter(has_text='Aditya Dugar').wait_for()
            assert not page.locator('.rc-runway').count()
            assert not page.evaluate(TRANSFER)['scene']
        results['checks'].append('Production query renders Page 01 with zero cinematic requests')
        browser.close()
        no_gpu = playwright.chromium.launch(**launch, args=flags + ['--disable-webgl'])
        with context(no_gpu, DESKTOP) as world:
            page = world.new_page()
            open_ready(page, args.url, 'still')
            assert not page.locator('.rc-stage canvas').count()
            check_marker(page)
            at(page, 1)
            check_marker(page)
        no_gpu.close()
        results['checks'].append('WebGL disabled: both still views and the marker work')
    (OUTPUT / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps({key: value for key, value in results.items() if key != 'cameraSweep'}, indent=2), flush=True)


if __name__ == '__main__':
    main()
