#!/usr/bin/env node

/**
 * Comprehensive Puppeteer test script for Deeper Bible OpenAI integration
 * Tests navigation to random Bible verses, "Go Deeper" functionality, API integration, and caching
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3003',
  backendUrl: 'http://localhost:3001',
  testTimeout: 300000, // 5 minutes per test
  headless: false, // Set to true for CI/CD
  slowMo: 100, // Slow down actions for visibility
};

// Test data - Random Bible verses to test
const RANDOM_VERSES = [
  { book: 'genesis', chapter: 1, verses: '1' },
  { book: 'psalm', chapter: 23, verses: '1-3' },
  { book: 'john', chapter: 3, verses: '16' },
  { book: 'romans', chapter: 8, verses: '28' },
  { book: 'proverbs', chapter: 3, verses: '5-6' },
  { book: 'matthew', chapter: 5, verses: '3-5' },
  { book: 'philippians', chapter: 4, verses: '13' },
  { book: 'corinthians', chapter: 13, verses: '4-7' }
];

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  frontend: { url: CONFIG.frontendUrl },
  backend: { url: CONFIG.backendUrl },
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

class DeeperBibleTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.startTime = Date.now();
  }

  async setup() {
    console.log('🚀 Starting Deeper Bible OpenAI Integration Test...');
    console.log(`📱 Frontend: ${CONFIG.frontendUrl}`);
    console.log(`🔧 Backend: ${CONFIG.backendUrl}`);
    
    try {
      this.browser = await puppeteer.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 720 });
      
      // Monitor console logs and network requests
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`❌ Console Error: ${msg.text()}`);
        }
      });
      
      this.page.on('response', response => {
        if (response.url().includes('/api/') && response.status() >= 400) {
          console.log(`🔥 API Error: ${response.status()} ${response.url()}`);
        }
      });
      
      console.log('✅ Browser setup complete');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }

  async testFrontendAccess() {
    const testName = 'Frontend Access';
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
      await this.page.goto(CONFIG.frontendUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Check if homepage loads
      await this.page.waitForSelector('h1', { timeout: 10000 });
      const title = await this.page.$eval('h1', el => el.textContent);
      
      console.log(`📄 Page title: ${title}`);
      
      // Take screenshot
      await this.page.screenshot({ 
        path: 'test-homepage.png',
        fullPage: true
      });
      
      this.addTestResult(testName, true, `Homepage loaded successfully: ${title}`);
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error.message);
      this.addTestResult(testName, false, error.message);
    }
  }

  async testBibleNavigation() {
    const testName = 'Bible Navigation';
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
      // Navigate to Bible page
      await this.page.goto(`${CONFIG.frontendUrl}/bible`, { waitUntil: 'networkidle0' });
      
      // Look for book grid
      await this.page.waitForSelector('[data-testid="book-grid"], .book-grid, .grid', { timeout: 15000 });
      
      // Try to find and click a book (Genesis or first available book)
      const bookSelector = 'a[href*="/bible/genesis"], a[href*="/bible/"], .book-card a, .grid a';
      await this.page.waitForSelector(bookSelector, { timeout: 10000 });
      
      const books = await this.page.$$(bookSelector);
      if (books.length > 0) {
        await books[0].click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        console.log(`📖 Successfully navigated to a Bible book`);
        this.addTestResult(testName, true, `Navigation to Bible book successful`);
      } else {
        throw new Error('No Bible books found');
      }
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error.message);
      await this.page.screenshot({ path: 'test-bible-navigation-error.png' });
      this.addTestResult(testName, false, error.message);
    }
  }

  async testRandomVerse(verseData) {
    const testName = `Random Verse Test: ${verseData.book} ${verseData.chapter}:${verseData.verses}`;
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
      // Navigate directly to the verse
      const url = `${CONFIG.frontendUrl}/bible/${verseData.book}/${verseData.chapter}`;
      console.log(`🔗 Navigating to: ${url}`);
      
      await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
      
      // Wait for verses to load
      await this.page.waitForSelector('.verse, [data-verse], .verse-text, .bible-verse', { timeout: 20000 });
      
      // Look for verse selection interface
      const verseSelectors = [
        '.verse-selection',
        '[data-testid="verse-selection"]',
        '.verse-text',
        '.verse',
        '[data-verse="1"]'
      ];
      
      let versesFound = false;
      for (const selector of verseSelectors) {
        const verses = await this.page.$$(selector);
        if (verses.length > 0) {
          console.log(`📜 Found ${verses.length} verses with selector: ${selector}`);
          
          // Try to select first verse
          await verses[0].click();
          versesFound = true;
          break;
        }
      }
      
      if (!versesFound) {
        throw new Error('No verses found on the page');
      }
      
      // Wait a moment for selection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take screenshot of verse page
      await this.page.screenshot({ 
        path: `test-verse-${verseData.book}-${verseData.chapter}.png`
      });
      
      this.addTestResult(testName, true, `Successfully loaded and selected verses`);
      return true;
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error.message);
      await this.page.screenshot({ 
        path: `test-verse-error-${verseData.book}-${verseData.chapter}.png` 
      });
      this.addTestResult(testName, false, error.message);
      return false;
    }
  }

  async testGoDeeperButton(verseData) {
    const testName = `Go Deeper Button: ${verseData.book} ${verseData.chapter}:${verseData.verses}`;
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
      // Look for "Go Deeper" button
      const buttonSelectors = [
        'a[href*="/deeper/"]',
        'button:contains("Go Deeper")',
        '.go-deeper',
        '[data-testid="go-deeper"]',
        'a:contains("Go Deeper")'
      ];
      
      let buttonFound = false;
      let goDeeperButton = null;
      
      for (const selector of buttonSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          goDeeperButton = await this.page.$(selector);
          if (goDeeperButton) {
            buttonFound = true;
            console.log(`🔘 Found "Go Deeper" button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!buttonFound) {
        // Try alternative approach - look for any element containing "deeper"
        const allElements = await this.page.$$('*');
        for (const element of allElements) {
          const text = await this.page.evaluate(el => el.textContent, element);
          if (text && text.toLowerCase().includes('deeper')) {
            goDeeperButton = element;
            buttonFound = true;
            console.log(`🔘 Found "Go Deeper" element by text content`);
            break;
          }
        }
      }
      
      if (!buttonFound) {
        throw new Error('Go Deeper button not found');
      }
      
      // Click the button
      await goDeeperButton.click();
      console.log(`✅ Clicked "Go Deeper" button`);
      
      // Wait for navigation to deeper analysis page
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      
      const currentUrl = this.page.url();
      console.log(`🔗 Navigated to: ${currentUrl}`);
      
      if (currentUrl.includes('/deeper/')) {
        this.addTestResult(testName, true, `Successfully navigated to deeper analysis page: ${currentUrl}`);
        return true;
      } else {
        throw new Error(`Expected /deeper/ URL but got: ${currentUrl}`);
      }
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error.message);
      await this.page.screenshot({ 
        path: `test-go-deeper-error-${verseData.book}-${verseData.chapter}.png` 
      });
      this.addTestResult(testName, false, error.message);
      return false;
    }
  }

  async testAPIIntegration(verseData) {
    const testName = `API Integration: ${verseData.book} ${verseData.chapter}:${verseData.verses}`;
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
      // Monitor network requests to API
      const apiRequests = [];
      this.page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiRequests.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          });
        }
      });
      
      // Monitor API responses
      const apiResponses = [];
      this.page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            timestamp: Date.now()
          });
        }
      });
      
      // Wait for loading state
      const loadingSelectors = [
        '.loading',
        '.spinner',
        '[data-testid="loading"]',
        '.animate-spin',
        '.processing'
      ];
      
      let loadingFound = false;
      for (const selector of loadingSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          console.log(`⏳ Found loading indicator: ${selector}`);
          loadingFound = true;
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      // Wait for content to load (either success or error)
      const contentSelectors = [
        '.report-content',
        '.analysis-content',
        '.content',
        '.prose',
        '.error-state',
        '[data-testid="report-content"]'
      ];
      
      let contentLoaded = false;
      for (const selector of contentSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 60000 });
          console.log(`📄 Content loaded with selector: ${selector}`);
          contentLoaded = true;
          break;
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!contentLoaded) {
        // Check for any text content indicating completion
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait up to 30 seconds
        const bodyText = await this.page.$eval('body', el => el.textContent);
        if (bodyText.length > 1000) { // Assume report is generated if there's substantial content
          contentLoaded = true;
          console.log(`📄 Content detected by text length: ${bodyText.length} characters`);
        }
      }
      
      // Take screenshot of final result
      await this.page.screenshot({ 
        path: `test-api-result-${verseData.book}-${verseData.chapter}.png`,
        fullPage: true
      });
      
      // Check for error states
      const errorText = await this.page.evaluate(() => {
        const errorElements = document.querySelectorAll('.error, .error-message, [data-testid="error"]');
        return Array.from(errorElements).map(el => el.textContent).join(' ');
      });
      
      if (errorText && errorText.trim()) {
        throw new Error(`API Error detected: ${errorText}`);
      }
      
      const resultData = {
        contentLoaded,
        apiRequests: apiRequests.length,
        apiResponses: apiResponses.length,
        loadingFound,
        url: this.page.url()
      };
      
      console.log(`📊 API Test Results:`, resultData);
      
      if (contentLoaded) {
        this.addTestResult(testName, true, `API integration successful`, resultData);
        return resultData;
      } else {
        throw new Error('Content did not load within timeout period');
      }
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error.message);
      this.addTestResult(testName, false, error.message);
      return null;
    }
  }

  async testCaching(verseData) {
    const testName = `Caching Test: ${verseData.book} ${verseData.chapter}:${verseData.verses}`;
    console.log(`\n🧪 Testing: ${testName}`);
    
    try {
      const url = `${CONFIG.frontendUrl}/deeper/${verseData.book}/${verseData.chapter}/${verseData.verses}`;
      
      // First request - measure load time
      const startTime1 = Date.now();
      await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
      
      // Wait for content
      await this.page.waitForSelector('.content, .prose, .report-content', { timeout: 60000 });
      const loadTime1 = Date.now() - startTime1;
      
      console.log(`⏱️  First load time: ${loadTime1}ms`);
      
      // Second request - should be faster due to caching
      const startTime2 = Date.now();
      await this.page.reload({ waitUntil: 'networkidle0' });
      
      // Wait for content again
      await this.page.waitForSelector('.content, .prose, .report-content', { timeout: 30000 });
      const loadTime2 = Date.now() - startTime2;
      
      console.log(`⏱️  Second load time: ${loadTime2}ms`);
      
      // Third request from different page
      await this.page.goto(`${CONFIG.frontendUrl}/bible`, { waitUntil: 'networkidle0' });
      const startTime3 = Date.now();
      await this.page.goto(url, { waitUntil: 'networkidle0' });
      
      await this.page.waitForSelector('.content, .prose, .report-content', { timeout: 30000 });
      const loadTime3 = Date.now() - startTime3;
      
      console.log(`⏱️  Third load time: ${loadTime3}ms`);
      
      const cachingData = {
        firstLoad: loadTime1,
        secondLoad: loadTime2,
        thirdLoad: loadTime3,
        improvementPercent: ((loadTime1 - loadTime2) / loadTime1 * 100).toFixed(1),
        cached: loadTime2 < loadTime1 * 0.8 // Consider cached if 20% faster
      };
      
      console.log(`📊 Caching Results:`, cachingData);
      
      if (cachingData.cached) {
        this.addTestResult(testName, true, `Caching working: ${cachingData.improvementPercent}% improvement`, cachingData);
      } else {
        this.addTestResult(testName, false, `Caching may not be working effectively`, cachingData);
      }
      
      return cachingData;
    } catch (error) {
      console.error(`❌ ${testName} failed:`, error.message);
      this.addTestResult(testName, false, error.message);
      return null;
    }
  }

  async runFullTest() {
    try {
      await this.setup();
      
      // Test 1: Frontend Access
      await this.testFrontendAccess();
      
      // Test 2: Bible Navigation
      await this.testBibleNavigation();
      
      // Test 3-5: Random verse tests
      const selectedVerses = RANDOM_VERSES.slice(0, 3); // Test 3 random verses
      
      for (const verseData of selectedVerses) {
        // Navigate to verse
        const verseLoaded = await this.testRandomVerse(verseData);
        
        if (verseLoaded) {
          // Test Go Deeper button
          const deeperNavigation = await this.testGoDeeperButton(verseData);
          
          if (deeperNavigation) {
            // Test API integration
            const apiResult = await this.testAPIIntegration(verseData);
            
            if (apiResult && apiResult.contentLoaded) {
              // Test caching
              await this.testCaching(verseData);
            }
          }
        }
        
        // Small pause between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      testResults.summary.errors.push(`Test suite error: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }

  addTestResult(name, passed, message, data = null) {
    const result = {
      name,
      passed,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    testResults.tests.push(result);
    testResults.summary.total++;
    
    if (passed) {
      testResults.summary.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      testResults.summary.failed++;
      testResults.summary.errors.push(`${name}: ${message}`);
      console.log(`❌ ${name}: ${message}`);
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    // Generate test report
    const duration = Date.now() - this.startTime;
    testResults.duration = duration;
    testResults.summary.duration = `${(duration / 1000).toFixed(2)}s`;
    
    // Save test results
    const reportFile = `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));
    
    // Generate HTML report
    await this.generateHTMLReport();
    
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${testResults.summary.total}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Duration: ${testResults.summary.duration}`);
    console.log(`Report saved: ${reportFile}`);
    
    if (testResults.summary.failed > 0) {
      console.log('\n❌ FAILURES:');
      testResults.summary.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Test suite completed!');
  }

  async generateHTMLReport() {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deeper Bible Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat.passed { background: #d4edda; color: #155724; }
        .stat.failed { background: #f8d7da; color: #721c24; }
        .test { border: 1px solid #ddd; margin-bottom: 20px; border-radius: 6px; overflow: hidden; }
        .test-header { padding: 15px; background: #f8f9fa; font-weight: bold; }
        .test-header.passed { background: #d4edda; }
        .test-header.failed { background: #f8d7da; }
        .test-body { padding: 15px; }
        .test-data { background: #f1f3f4; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 12px; }
        .timestamp { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Deeper Bible OpenAI Integration Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="stat">
                <h3>Total Tests</h3>
                <div style="font-size: 2em; font-weight: bold;">${testResults.summary.total}</div>
            </div>
            <div class="stat passed">
                <h3>Passed</h3>
                <div style="font-size: 2em; font-weight: bold;">${testResults.summary.passed}</div>
            </div>
            <div class="stat failed">
                <h3>Failed</h3>
                <div style="font-size: 2em; font-weight: bold;">${testResults.summary.failed}</div>
            </div>
            <div class="stat">
                <h3>Duration</h3>
                <div style="font-size: 2em; font-weight: bold;">${testResults.summary.duration}</div>
            </div>
        </div>
        
        <h2>Test Details</h2>
        ${testResults.tests.map(test => `
            <div class="test">
                <div class="test-header ${test.passed ? 'passed' : 'failed'}">
                    ${test.passed ? '✅' : '❌'} ${test.name}
                </div>
                <div class="test-body">
                    <p><strong>Result:</strong> ${test.message}</p>
                    <div class="timestamp">Timestamp: ${test.timestamp}</div>
                    ${test.data ? `<div class="test-data">${JSON.stringify(test.data, null, 2)}</div>` : ''}
                </div>
            </div>
        `).join('')}
        
        ${testResults.summary.errors.length > 0 ? `
            <h2>Error Summary</h2>
            <ul>
                ${testResults.summary.errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
        ` : ''}
    </div>
</body>
</html>
    `;
    
    const htmlFile = `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
    fs.writeFileSync(htmlFile, htmlContent);
    console.log(`📄 HTML report saved: ${htmlFile}`);
  }
}

// Run the test suite
async function main() {
  const tester = new DeeperBibleTester();
  await tester.runFullTest();
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite failed to start:', error);
    process.exit(1);
  });
}

module.exports = { DeeperBibleTester, CONFIG, RANDOM_VERSES };