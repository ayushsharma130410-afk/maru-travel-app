const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getWebSocketUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          if (list.length > 0 && list[0].webSocketDebuggerUrl) {
            resolve(list[0].webSocketDebuggerUrl);
          } else {
            reject(new Error('No active targets found in chrome'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log("Starting Chrome in headless mode...");
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  chromeProcess.on('error', (err) => {
    console.error("Failed to start Chrome:", err);
    process.exit(1);
  });

  await sleep(4000);

  try {
    const wsUrl = await getWebSocketUrl();
    console.log("Connecting to Chrome target via WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
      console.log("Console, Runtime and Page enabled.");

      // Navigate to the preview server
      ws.send(JSON.stringify({
        id: 4,
        method: 'Page.navigate',
        params: { url: 'http://localhost:4173' }
      }));
      console.log("Navigation command sent to http://localhost:4173");
    });

    ws.on('message', (message) => {
      const data = JSON.parse(message);
      if (data.method === 'Runtime.consoleAPICalled') {
        const type = data.params.type;
        const args = data.params.args.map(arg => arg.value || arg.description || JSON.stringify(arg)).join(' ');
        console.log(`[BROWSER CONSOLE - ${type.toUpperCase()}] ${args}`);
      } else if (data.method === 'Runtime.exceptionThrown') {
        const details = data.params.exceptionDetails;
        console.log(`[BROWSER EXCEPTION] ${details.text} - ${details.exception.description}`);
      } else if (data.id === 5) {
        console.log("[ROOT HTML CONTENT]:", data.result?.result?.value);
      }
    });

    // Wait 12 seconds to let fallback timer finish and load login page (or crash)
    await sleep(12000);
    console.log("Evaluating body HTML...");
    ws.send(JSON.stringify({
      id: 5,
      method: 'Runtime.evaluate',
      params: { expression: 'document.getElementById("root") ? document.getElementById("root").innerHTML : "No root found"' }
    }));

    await sleep(3000);
    ws.close();

  } catch (err) {
    console.error("Error executing target inspection:", err);
  }

  console.log("Killing Chrome...");
  chromeProcess.kill();
  console.log("Done.");
}

main();
