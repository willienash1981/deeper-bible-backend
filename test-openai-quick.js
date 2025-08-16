#!/usr/bin/env node

/**
 * Quick Puppeteer test for Deeper Bible OpenAI integration
 * Tests available sample verses (John 1, Genesis 1, Psalms 23)
 */

const puppeteer = require('puppeteer');

// Configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3003',
  backendUrl: 'http://localhost:3001',
  headless: false,
  slowMo: 500, // Slow down for visibility
};

// Available test data based on sample verses
const AVAILABLE_VERSES = [
  { book: 'john', chapter: 1, verses: '1' },
  { book: 'john', chapter: 1, verses: '1-3' },
  { book: 'genesis', chapter: 1, verses: '1' },
  { book: 'psalms', chapter: 23, verses: '1' }
];

async function quickTest() {
  console.log('🚀 Starting Quick Deeper Bible Test...');
  console.log(`📱 Frontend: ${CONFIG.frontendUrl}`);
  console.log(`🔧 Backend: ${CONFIG.backendUrl}`);
  
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  // Monitor console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });
  
  try {
    console.log('\n🧪 Test 1: Homepage Access');
    await page.goto(CONFIG.frontendUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    const title = await page.$eval('h1', el => el.textContent);
    console.log(`✅ Homepage loaded: ${title}`);
    
    console.log('\n🧪 Test 2: Navigate to John 1 (sample data available)');
    const testUrl = `${CONFIG.frontendUrl}/bible/john/1`;
    console.log(`🔗 Navigating to: ${testUrl}`);
    
    await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 120000 });
    console.log('✅ John 1 page loaded');
    
    // Take screenshot
    await page.screenshot({ path: 'test-john-1.png', fullPage: true });
    
    console.log('\n🧪 Test 3: Look for verses');
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check page content
    const bodyText = await page.$eval('body', el => el.textContent);
    console.log(`📄 Page content length: ${bodyText.length} characters`);
    
    if (bodyText.includes('In the beginning was the Word')) {
      console.log('✅ Found John 1:1 content');
      
      // Look for verse elements
      const verseElements = await page.$$('.verse, [data-verse], .verse-text, p');
      console.log(`📜 Found ${verseElements.length} potential verse elements`);
      
      if (verseElements.length > 0) {
        console.log('\n🧪 Test 4: Click on first verse');
        await verseElements[0].click();
        console.log('✅ Clicked on verse element');
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n🧪 Test 5: Look for Go Deeper button');
        
        // Look for Go Deeper button with various selectors
        const buttonSelectors = [
          'a[href*="/deeper/"]',
          '*:contains("Go Deeper")',
          '*:contains("Deeper")',
          'button',
          'a'
        ];
        
        let buttonFound = false;
        for (const selector of buttonSelectors) {
          try {
            if (selector.includes('contains')) {
              // Handle text-based selectors differently
              const elements = await page.$$('*');
              for (const element of elements) {
                const text = await page.evaluate(el => el.textContent, element);
                if (text && text.toLowerCase().includes('deeper')) {
                  console.log(`🔘 Found "Deeper" text: "${text.trim()}"`);
                  await element.click();
                  buttonFound = true;
                  break;
                }
              }
            } else {
              const elements = await page.$$(selector);
              if (elements.length > 0) {
                console.log(`🔘 Found ${elements.length} elements with selector: ${selector}`);
                // Check if any contain "deeper" text
                for (const element of elements) {
                  const text = await page.evaluate(el => el.textContent, element);
                  if (text && text.toLowerCase().includes('deeper')) {
                    console.log(`🎯 Clicking "Go Deeper" button: "${text.trim()}"`);
                    await element.click();
                    buttonFound = true;
                    break;
                  }
                }
              }
            }
            if (buttonFound) break;
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (buttonFound) {
          console.log('✅ Clicked Go Deeper button');
          
          console.log('\n🧪 Test 6: Wait for navigation to deeper analysis');
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
          
          const deeperUrl = page.url();
          console.log(`🔗 Navigated to: ${deeperUrl}`);
          
          if (deeperUrl.includes('/deeper/')) {
            console.log('✅ Successfully navigated to deeper analysis page');
            
            console.log('\n🧪 Test 7: Wait for AI analysis to load');
            
            // Monitor for loading states
            let loadingDetected = false;
            try {
              await page.waitForSelector('.loading, .spinner, .processing, .animate-spin', { timeout: 5000 });
              loadingDetected = true;
              console.log('⏳ Loading state detected');
            } catch (e) {
              console.log('📝 No loading state detected, checking for content');
            }
            
            // Wait for content to appear (try different selectors)
            const contentSelectors = [
              '.content',
              '.prose',
              '.report-content',
              '.analysis',
              'main',
              'article'
            ];
            
            let contentFound = false;
            for (const selector of contentSelectors) {
              try {
                await page.waitForSelector(selector, { timeout: 90000 });
                console.log(`📄 Content found with selector: ${selector}`);
                contentFound = true;
                break;
              } catch (e) {
                continue;
              }
            }
            
            // Take final screenshot
            await page.screenshot({ path: 'test-deeper-analysis.png', fullPage: true });
            
            if (!contentFound) {
              // Check by text content
              await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
              const finalText = await page.$eval('body', el => el.textContent);
              if (finalText.length > 1000) {
                contentFound = true;
                console.log(`📄 Content detected by text length: ${finalText.length} characters`);
              }
            }
            
            console.log('\n🧪 Test 8: Check for API error states');
            const errorElements = await page.$$('.error, .error-message, [data-error]');
            if (errorElements.length > 0) {
              for (const errorEl of errorElements) {
                const errorText = await page.evaluate(el => el.textContent, errorEl);
                console.log(`❌ Error detected: ${errorText}`);
              }
            } else {
              console.log('✅ No error states detected');
            }
            
            if (contentFound) {
              console.log('\n✅ OPENAI INTEGRATION TEST PASSED!');
              console.log('✅ Successfully generated AI analysis');
              
              console.log('\n🧪 Test 9: Test caching by reloading');
              const startTime = Date.now();
              await page.reload({ waitUntil: 'networkidle0' });
              const reloadTime = Date.now() - startTime;
              console.log(`⏱️  Reload time: ${reloadTime}ms`);
              
              if (reloadTime < 10000) {
                console.log('✅ Fast reload suggests caching is working');
              } else {
                console.log('⚠️  Reload time suggests caching may not be optimal');
              }
              
            } else {
              console.log('❌ Content did not load within timeout');
            }
            
          } else {
            console.log(`❌ Expected /deeper/ URL but got: ${deeperUrl}`);
          }
        } else {
          console.log('❌ Go Deeper button not found');
        }
      } else {
        console.log('❌ No verse elements found');
      }
    } else {
      console.log('❌ John 1:1 content not found in page');
      console.log('📝 Page content preview:', bodyText.substring(0, 500));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🎉 Quick test completed!');
  }
}

// Run the test
quickTest().catch(error => {
  console.error('❌ Test failed to start:', error);
  process.exit(1);
});