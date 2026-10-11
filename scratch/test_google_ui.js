const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3988;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, '..', reqPath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
});

async function main() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Server started on http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.error('ERR:', err.message));

  console.log('Opening dashboard...');
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  // 1. Capture main Google Store white view
  await page.screenshot({ path: path.join(__dirname, '..', 'google_store_ui_main.png') });
  console.log('Captured google_store_ui_main.png');

  // 2. Select a story (e.g. Scams) to view Google Store Story banner
  await page.select('#preset-select', 'scam_epidemic');
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(__dirname, '..', 'google_store_ui_story.png') });
  console.log('Captured google_store_ui_story.png');

  // 3. Open Story Hub modal to view Google Store product showcase grid
  await page.click('#story-hub-btn');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(__dirname, '..', 'google_store_ui_modal.png') });
  console.log('Captured google_store_ui_modal.png');

  await browser.close();
  server.close();
  console.log('Finished testing UI revamp.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
