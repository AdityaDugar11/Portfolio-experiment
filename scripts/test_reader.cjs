const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function testReader() {
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new',
    '--remote-debugging-port=9444',
    '--no-sandbox',
    '--window-size=1440,900',
    'http://localhost:4173/',
  ]);

  try {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch('http://localhost:9444/json/list');
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
    await new Promise((r) => setTimeout(r, 800));

    // Dispatch click on card 0
    const clickResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = document.querySelectorAll('#page-03-deck-container [role="button"]');
          if (cards.length > 0) {
            cards[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return { clicked: true, totalCards: cards.length };
          }
          return { clicked: false, totalCards: 0 };
        })()
      `,
      returnByValue: true,
    });
    console.log('Click result:', clickResult.result.value);

    await new Promise((r) => setTimeout(r, 800));

    // Verify Reader element
    const readerInfo = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const reader = document.getElementById('chapter-reader-view');
          if (!reader) return { found: false };
          const h1 = reader.querySelector('h1')?.textContent;
          const quote = reader.querySelector('blockquote')?.textContent;
          const pCount = reader.querySelectorAll('main p, section p').length;
          return { found: true, h1, quote, pCount };
        })()
      `,
      returnByValue: true,
    });
    console.log('Reader Info:', readerInfo.result.value);

    // Capture screenshot of reader
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    const ssPath = path.join(__dirname, '../docs/screenshots/final-implementation/08-chapter-01-full-story.png');
    fs.writeFileSync(ssPath, Buffer.from(ss.data, 'base64'));
    console.log('Screenshot written to:', ssPath, 'Bytes:', fs.statSync(ssPath).size);

    ws.close();
  } finally {
    chrome.kill();
  }
}

testReader().catch(console.error);
