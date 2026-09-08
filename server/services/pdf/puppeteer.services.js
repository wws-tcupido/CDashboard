const puppeteer = require('puppeteer');

async function generateSeoReportPdf({ token, baseUrl }) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.setCookie({
      name: 'token',
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax'
    });

    await page.goto(baseUrl, {
      waitUntil: 'networkidle0'
    });

    await page.goto(`${baseUrl}/account`, {
      waitUntil: 'networkidle0'
    });

    console.log('Puppeteer cwd:', process.cwd());

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateSeoReportPdf
};