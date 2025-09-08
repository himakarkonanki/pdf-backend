

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const loginController = require('./controllers/loginController');

// Dynamically choose puppeteer variant
const isRender = process.env.RENDER === 'true';
const puppeteer = isRender ? require('puppeteer-core') : require('puppeteer');
const chromium = isRender ? require('@sparticuz/chromium') : null;


const app = express();
const PORT = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '250mb' }));

// Session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 3600000 }
}));

// Login route (must be after app is initialized and middleware is set up)
app.post('/api/login', loginController.login);

// Logout route
app.post('/api/logout', loginController.logout);

// Root health check
app.get('/', (req, res) => {
  res.send('Server is live!');
});

app.post('/api/generate-pdf', async (req, res) => {
  const { html, options = {} } = req.body;

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid HTML content in request body' });
  }

  let browser;

  try {
    // Launch browser depending on environment
    browser = await puppeteer.launch(
      isRender
        ? {
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
          }
        : {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          }
    );

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
      timeout: 100000,
    });

    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      margin: options.margin || { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });

    await browser.close();
    browser = null;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="itinerary.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    return res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF Generation Error:', error);

    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.warn('Error closing browser:', closeErr);
      }
    }

    return res.status(500).json({
      message: error.message || 'PDF generation failed.',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF server running at http://localhost:${PORT}`);
});
