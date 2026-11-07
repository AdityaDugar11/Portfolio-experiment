const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testTransition() {
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9445',
    '--no-sandbox',
    '--window-size=1440,900',
    'http://localhost:4173/',
  ]);

  try {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch('http://localhost:9445/json/list');
    const pages = await res.json();
    const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));

    let id = 1;
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const curId = id++;
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });

    await send('Runtime.enable');
    await send('Page.enable');

    // Scroll to Page 3 deck
    await send('Runtime.evaluate', {
      expression: 'document.getElementById("page-03-section").scrollIntoView({ behavior: "instant" })',
    });
    await new Promise((r) => setTimeout(r, 600));

    // Dispatch click on card 0
    await send('Runtime.evaluate', {
      expression: `
        const cards = document.querySelectorAll('#page-03-deck-container [role="button"]');
        if (cards[0]) cards[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      `,
    });
    await new Promise((r) => setTimeout(r, 600));

    // Click Next button or dispatch transition
    const transResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const reader = document.getElementById('chapter-reader-view');
          const nextBtn = reader?.querySelector('header button:last-child');
          if (nextBtn) {
            nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return { clickedNext: true };
          }
          return { clickedNext: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('Transition trigger result:', transResult.result.value);

    // Wait for transition animation to complete
    await new Promise((r) => setTimeout(r, 700));

    // Verify Chapter 02 content
    const ch2Info = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const reader = document.getElementById('chapter-reader-view');
          return {
            h1: reader?.querySelector('h1')?.textContent,
            quote: reader?.querySelector('blockquote')?.textContent,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Chapter 2 Info after transition:', ch2Info.result.value);

    // Capture screenshot of Chapter 02
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    const ssPath = path.join(__dirname, '../docs/screenshots/final-implementation/09-chapter-02-transitioned.png');
    fs.writeFileSync(ssPath, Buffer.from(ss.data, 'base64'));
    console.log('Chapter 2 Screenshot written to:', ssPath, 'Bytes:', fs.statSync(ssPath).size);

    ws.close();
  } finally {
    chrome.kill();
  }
}

testTransition().catch(console.error);
