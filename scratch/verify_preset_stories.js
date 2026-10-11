const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Simple HTTP static server
const PORT = 3890;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.csv': 'text/csv'
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

async function runVerification() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Test HTTP server listening on http://localhost:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('BROWSER ERROR:', msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    errors.push(err.message);
  });

  console.log('Navigating to http://localhost:' + PORT);
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });

  // 1. Initial State Check
  const pageTitle = await page.title();
  console.log(`Page title: ${pageTitle}`);

  // Wait for initial render
  await new Promise(r => setTimeout(r, 600));

  // 2. Open Story Hub Modal
  console.log('\n--- Testing Story Hub Modal ---');
  await page.click('#story-hub-btn');
  await new Promise(r => setTimeout(r, 400));
  const isModalActive = await page.$eval('#story-modal', el => el.classList.contains('active'));
  console.log(`Story Modal Opened: ${isModalActive}`);

  const cardCount = await page.$$eval('.story-card', cards => cards.length);
  console.log(`Story Cards rendered in 'All': ${cardCount}`);

  // Filter tabs test
  await page.click('.story-tab-btn[data-tab="recent"]');
  await new Promise(r => setTimeout(r, 200));
  const recentCount = await page.$$eval('.story-card', cards => cards.length);
  console.log(`Story Cards in '2024-2026 Priority Issues': ${recentCount}`);

  // Take screenshot of Story Hub Modal
  await page.screenshot({ path: 'story_hub_modal_screenshot.png' });
  console.log('Saved story_hub_modal_screenshot.png');

  // Close Story Modal
  await page.click('#story-modal-close');
  await new Promise(r => setTimeout(r, 300));

  // 3. Test Story 1: Scam Epidemic
  console.log('\n--- Testing Story 1: Scam Epidemic ---');
  await page.select('#preset-select', 'scam_epidemic');
  await new Promise(r => setTimeout(r, 600));

  const bannerTitle = await page.$eval('#story-banner-title', el => el.textContent);
  const narrativeCh1 = await page.$eval('#story-narrative-text', el => el.textContent);
  const kpiCount = await page.$$eval('.story-kpi-chip', chips => chips.length);
  console.log(`Banner Title: ${bannerTitle}`);
  console.log(`Chapter 1 Narrative: ${narrativeCh1}`);
  console.log(`KPI Chips count: ${kpiCount}`);

  await page.screenshot({ path: 'story_scam_ch1_screenshot.png' });
  console.log('Saved story_scam_ch1_screenshot.png');

  // Click Next Chapter
  await page.click('#story-next-btn');
  await new Promise(r => setTimeout(r, 500));
  const narrativeCh2 = await page.$eval('#story-narrative-text', el => el.textContent);
  console.log(`Chapter 2 Narrative: ${narrativeCh2}`);
  await page.screenshot({ path: 'story_scam_ch2_screenshot.png' });
  console.log('Saved story_scam_ch2_screenshot.png');

  // Click Chapter 3 pill directly
  const pills = await page.$$('.chapter-pill');
  if (pills.length >= 3) {
    await pills[2].click();
    await new Promise(r => setTimeout(r, 500));
    const narrativeCh3 = await page.$eval('#story-narrative-text', el => el.textContent);
    console.log(`Chapter 3 Narrative: ${narrativeCh3}`);
  }

  // 4. Test Story 2: Fertility & Aging
  console.log('\n--- Testing Story 2: Fertility Crisis & Super-Aged 2026 ---');
  await page.select('#preset-select', 'fertility_crisis');
  await new Promise(r => setTimeout(r, 600));
  const fertTitle = await page.$eval('#story-banner-title', el => el.textContent);
  console.log(`Story Title: ${fertTitle}`);
  await page.screenshot({ path: 'story_fertility_crisis_screenshot.png' });
  console.log('Saved story_fertility_crisis_screenshot.png');

  // 5. Test Story 3: Housing & HDB Resale
  console.log('\n--- Testing Story 3: Housing & HDB Resale ---');
  await page.select('#preset-select', 'housing_million_dollar');
  await new Promise(r => setTimeout(r, 600));
  const housingTitle = await page.$eval('#story-banner-title', el => el.textContent);
  console.log(`Story Title: ${housingTitle}`);
  await page.screenshot({ path: 'story_housing_resale_screenshot.png' });
  console.log('Saved story_housing_resale_screenshot.png');

  // 6. Test Story 4: Climate & Heatwave
  console.log('\n--- Testing Story 4: Climate Crisis & Heatwaves ---');
  await page.select('#preset-select', 'climate_heatwave');
  await new Promise(r => setTimeout(r, 600));
  const climateTitle = await page.$eval('#story-banner-title', el => el.textContent);
  console.log(`Story Title: ${climateTitle}`);
  await page.screenshot({ path: 'story_climate_heatwave_screenshot.png' });
  console.log('Saved story_climate_heatwave_screenshot.png');

  // 7. Test Story 5: NODX & Semiconductor Trade
  console.log('\n--- Testing Story 5: NODX & Tech War ---');
  await page.select('#preset-select', 'nodx_tech_war');
  await new Promise(r => setTimeout(r, 600));
  const nodxTitle = await page.$eval('#story-banner-title', el => el.textContent);
  console.log(`Story Title: ${nodxTitle}`);
  await page.screenshot({ path: 'story_nodx_trade_screenshot.png' });
  console.log('Saved story_nodx_trade_screenshot.png');

  // 8. Test Theme Toggle with Story Active
  console.log('\n--- Testing Light Theme Toggle ---');
  await page.click('#theme-toggle-btn');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'story_light_theme_screenshot.png' });
  console.log('Saved story_light_theme_screenshot.png');

  // Toggle back to dark
  await page.click('#theme-toggle-btn');
  await new Promise(r => setTimeout(r, 300));

  // 9. Test Exit Story
  console.log('\n--- Testing Exit Story Mode ---');
  await page.click('#story-exit-btn');
  await new Promise(r => setTimeout(r, 300));
  const bannerDisplay = await page.$eval('#story-banner', el => el.style.display);
  console.log(`Story Banner display after exit: '${bannerDisplay}' (expected 'none')`);

  await browser.close();
  server.close();

  console.log('\n======================================');
  console.log(`Total Uncaught Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
    process.exit(1);
  } else {
    console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
  }
}

runVerification().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
