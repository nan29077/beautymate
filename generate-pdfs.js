const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const guides = [
  { html: 'guide-warehouse.html', pdf: '셀러브릭스_서비스소개서_창고지기용.pdf' },
  { html: 'guide-seller.html', pdf: '셀러브릭스_서비스소개서_셀러용.pdf' },
  { html: 'guide-brand.html', pdf: '셀러브릭스_서비스소개서_브랜드사용.pdf' },
];

const BASE_URL = process.argv[2] || 'http://localhost:3000';

async function generatePDFs() {
  console.log('Starting PDF generation...');
  console.log('Base URL:', BASE_URL);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const outputDir = path.join(__dirname, 'public', 'static', 'docs', 'pdf');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const guide of guides) {
    const url = `${BASE_URL}/static/docs/${guide.html}`;
    const outputPath = path.join(outputDir, guide.pdf);
    
    console.log(`\nGenerating: ${guide.pdf}`);
    console.log(`  URL: ${url}`);
    
    const page = await browser.newPage();
    
    await page.setViewport({ width: 794, height: 1123 });
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 2000));
    
    // Hide download bar
    await page.evaluate(() => {
      const bar = document.getElementById('downloadBar');
      if (bar) bar.style.display = 'none';
    });
    
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    
    await page.close();
    
    const stats = fs.statSync(outputPath);
    console.log(`  Output: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log('\nAll PDFs generated successfully!');
}

generatePDFs().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
