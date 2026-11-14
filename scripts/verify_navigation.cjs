const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

async function getPageWebSocketUrl(port = 9224) {
  for (let attempt = 1; attempt <= 30; attempt++) {
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
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1000));

  const chromeProcess = spawn(
    '/usr/bin/google-chrome',
    [
      '--headless=new',
      '--remote-debugging-port=9224',
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp = null;
  try {
    const wsUrl = await getPageWebSocketUrl(9224);
    cdp = new CDPClient(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 1. Visit main site
    console.log('Testing main site visit: http://localhost:4173/');
    await cdp.send('Page.navigate', { url: 'http://localhost:4173/' });
    await new Promise((r) => setTimeout(r, 1500));

    const mainState = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          hasMainApp: !!document.getElementById('page-01-scene'),
          hasPrototypeButton: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Preview Page 02 Prototype')),
          isPrototypeVisible: !!document.getElementById('page-02-portrait-prototype')
        };
      })()`,
      returnByValue: true,
    });
    console.log('Main app check:', mainState.result.value);

    // 2. Click prototype preview button
    console.log('Clicking prototype preview button...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Preview Page 02 Prototype'));
        if (btn) btn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1000));

    const prototypeState = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          isPrototypeVisible: !!document.getElementById('page-02-portrait-prototype'),
          hasMainApp: !!document.getElementById('page-01-scene')
        };
      })()`,
      returnByValue: true,
    });
    console.log('Prototype after button click:', prototypeState.result.value);

    // 3. Click Exit button
    console.log('Clicking exit prototype button...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Exit Prototype'));
        if (btn) btn.click();
      })()`,
    });
    await new Promise((r) => setTimeout(r, 1000));

    const backToMainState = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        return {
          hasMainApp: !!document.getElementById('page-01-scene'),
          isPrototypeVisible: !!document.getElementById('page-02-portrait-prototype')
        };
      })()`,
      returnByValue: true,
    });
    console.log('Back to main site check:', backToMainState.result.value);

    console.log('Navigation test verified successfully!');
  } finally {
    if (cdp) await cdp.close();
    chromeProcess.kill('SIGTERM');
    previewProcess.kill('SIGTERM');
  }
}

main().catch(console.error);
