const { chromium } = require('playwright');

async function exploreBiblicalAnalysisPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Set up comprehensive monitoring
  const consoleMessages = [];
  const networkErrors = [];
  
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    });
  });

  page.on('pageerror', error => {
    consoleMessages.push({
      type: 'pageerror',
      text: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      });
    }
  });

  try {
    console.log('Navigating to biblical analysis page...');
    await page.goto('http://localhost:3004/deeper/matthew/5/14', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Take full page screenshot
    console.log('Capturing full page screenshot...');
    await page.screenshot({ 
      path: 'biblical-analysis-full.png', 
      fullPage: true 
    });

    // Try to capture header section
    console.log('Capturing header section...');
    const headerSelectors = [
      'header',
      '.header',
      '[class*="header"]',
      'nav',
      '.navbar',
      '[role="banner"]',
      'main > div:first-child',
      '.container:first-child',
      'body > div:first-child > div:first-child'
    ];

    let headerCaptured = false;
    for (const selector of headerSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.screenshot({ 
            path: 'biblical-analysis-header.png' 
          });
          console.log(`Header captured using selector: ${selector}`);
          headerCaptured = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!headerCaptured) {
      // Capture top portion of page as fallback
      await page.screenshot({ 
        path: 'biblical-analysis-header.png',
        clip: { x: 0, y: 0, width: 1440, height: 300 }
      });
      console.log('Header captured as top 300px of page');
    }

    // Analyze page structure
    const pageTitle = await page.title();
    const url = page.url();
    
    // Check for specific layout elements
    const layoutInfo = await page.evaluate(() => {
      const body = document.body;
      const main = document.querySelector('main');
      const header = document.querySelector('header');
      
      return {
        bodyClasses: body.className,
        hasMain: !!main,
        hasHeader: !!header,
        mainChildren: main ? main.children.length : 0,
        bodyChildren: body.children.length,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight
      };
    });

    // Report findings
    console.log('\n=== BIBLICAL ANALYSIS PAGE EXPLORATION REPORT ===');
    console.log(`Page Title: ${pageTitle}`);
    console.log(`URL: ${url}`);
    console.log(`Layout Info:`, layoutInfo);
    
    console.log('\n=== CONSOLE MESSAGES ===');
    if (consoleMessages.length === 0) {
      console.log('No console messages detected ✓');
    } else {
      consoleMessages.forEach(msg => {
        console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
        if (msg.location) {
          console.log(`  Location: ${msg.location.url}:${msg.location.lineNumber}`);
        }
      });
    }

    console.log('\n=== NETWORK ERRORS ===');
    if (networkErrors.length === 0) {
      console.log('No network errors detected ✓');
    } else {
      networkErrors.forEach(error => {
        console.log(`[${error.status}] ${error.url} - ${error.statusText}`);
      });
    }

    console.log('\n=== SCREENSHOTS CAPTURED ===');
    console.log('Full page: biblical-analysis-full.png');
    console.log('Header section: biblical-analysis-header.png');

  } catch (error) {
    console.error('Error during exploration:', error);
    
    // Try to capture error state
    try {
      await page.screenshot({ 
        path: 'biblical-analysis-error.png' 
      });
      console.log('Error state screenshot captured');
    } catch (screenshotError) {
      console.error('Could not capture error screenshot:', screenshotError);
    }
  } finally {
    await browser.close();
  }
}

// Execute the exploration
exploreBiblicalAnalysisPage().catch(console.error);