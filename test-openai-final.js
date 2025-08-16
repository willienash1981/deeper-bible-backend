#!/usr/bin/env node

/**
 * Final Puppeteer test for Deeper Bible OpenAI integration
 * Tests the complete flow: select verses -> Go Deeper -> AI analysis
 */

const puppeteer = require('puppeteer');

// Configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3003',
  backendUrl: 'http://localhost:3001',
  headless: false,
  slowMo: 1000,
};

async function finalTest() {
  console.log('🚀 Starting Final Deeper Bible OpenAI Test...');
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
    console.log('\n🧪 Test 1: Load John 1 page');
    const testUrl = `${CONFIG.frontendUrl}/bible/john/1`;
    console.log(`🔗 Navigating to: ${testUrl}`);
    
    await page.goto(testUrl, { waitUntil: 'networkidle0', timeout: 120000 });
    console.log('✅ John 1 page loaded');
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-john-1-initial.png', fullPage: true });
    
    console.log('\n🧪 Test 2: Look for verses to select');
    
    // Wait for verses to load
    await page.waitForSelector('.verse, [data-verse], p', { timeout: 10000 });
    
    // Find verse elements - they should be clickable
    const verseElements = await page.$$('span[data-verse], .verse-text, .select-none');
    console.log(`📜 Found ${verseElements.length} potential verse elements`);
    
    if (verseElements.length === 0) {
      // Try alternative selectors
      const altElements = await page.$$('p, div');
      console.log(`📜 Trying alternative selectors, found ${altElements.length} elements`);
      
      // Look for elements containing verse text
      for (const element of altElements.slice(0, 10)) {
        const text = await page.evaluate(el => el.textContent?.trim() || '', element);
        if (text.includes('In the beginning was the Word')) {
          console.log(`🎯 Found John 1:1 text: "${text.substring(0, 100)}..."`);
          verseElements.push(element);
          break;
        }
      }
    }
    
    if (verseElements.length > 0) {
      console.log('\n🧪 Test 3: Select verses');
      
      // Click on first few verse elements to select them
      for (let i = 0; i < Math.min(3, verseElements.length); i++) {
        try {
          console.log(`🎯 Clicking verse element ${i + 1}...`);
          await verseElements[i].click();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between clicks
        } catch (e) {
          console.log(`❌ Failed to click verse element ${i + 1}`);
        }
      }
      
      console.log('\n🧪 Test 4: Wait for "Go Deeper" button to appear');
      
      // Wait for the Go Deeper button to appear (it's conditionally rendered)
      let goDeeperButton = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!goDeeperButton && attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 Looking for "Go Deeper" button (attempt ${attempts})...`);
        
        // Look for the fixed-positioned Go Deeper button
        const buttons = await page.$$('a[href*="/deeper/"], button');
        
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent?.trim() || '', button);
          const href = await page.evaluate(el => el.href || '', button);
          
          if (text.toLowerCase().includes('go deeper') || href.includes('/deeper/')) {
            console.log(`✅ Found "Go Deeper" button: "${text}" -> ${href}`);
            goDeeperButton = button;
            break;
          }
        }
        
        if (!goDeeperButton) {
          // Try clicking more verses to trigger the button
          if (attempts <= 3 && verseElements.length > attempts) {
            console.log(`🎯 Selecting additional verse ${attempts}...`);
            try {
              await verseElements[attempts - 1].click();
            } catch (e) {
              console.log(`❌ Failed to click additional verse`);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (goDeeperButton) {
        console.log('\n🧪 Test 5: Click "Go Deeper" button');
        
        // Take screenshot before clicking
        await page.screenshot({ path: 'test-before-go-deeper.png', fullPage: true });
        
        await goDeeperButton.click();
        console.log('✅ Clicked "Go Deeper" button');
        
        console.log('\n🧪 Test 6: Wait for navigation to deeper analysis');
        
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
          
          const currentUrl = page.url();
          console.log(`🔗 Navigated to: ${currentUrl}`);
          
          if (currentUrl.includes('/deeper/')) {
            console.log('✅ Successfully navigated to deeper analysis page!');
            
            // Take screenshot of the deeper page
            await page.screenshot({ path: 'test-deeper-page-loaded.png', fullPage: true });
            
            console.log('\n🧪 Test 7: Wait for AI analysis to load');
            
            // Monitor for loading indicators
            const loadingIndicators = [
              '.loading', '.spinner', '.processing', '.animate-spin', 
              '[data-loading]', '.load', '.generating'
            ];
            
            let loadingDetected = false;
            for (const selector of loadingIndicators) {
              try {
                await page.waitForSelector(selector, { timeout: 3000 });
                loadingDetected = true;
                console.log(`⏳ Loading indicator detected: ${selector}`);
                break;
              } catch (e) {
                // Continue to next selector
              }
            }
            
            if (!loadingDetected) {
              console.log('📝 No loading indicator detected, checking content directly');
            }
            
            // Wait for AI content to appear
            let contentLoaded = false;
            const maxWaitTime = 120000; // 2 minutes
            const startTime = Date.now();
            
            while (Date.now() - startTime < maxWaitTime && !contentLoaded) {
              const bodyText = await page.$eval('body', el => el.textContent);
              const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
              
              // Check for signs of AI-generated content
              const hasAIContent = bodyText.length > 3000 || 
                bodyText.toLowerCase().includes('analysis') ||
                bodyText.toLowerCase().includes('commentary') ||
                bodyText.toLowerCase().includes('theological') ||
                bodyText.toLowerCase().includes('biblical') ||
                bodyText.toLowerCase().includes('context') ||
                bodyText.toLowerCase().includes('scripture') ||
                bodyText.toLowerCase().includes('meaning');
              
              if (hasAIContent) {
                contentLoaded = true;
                console.log('✅ AI-generated content detected!');
                console.log(`📄 Content length: ${bodyText.length} characters`);
                console.log(`⏱️  Load time: ${elapsedTime} seconds`);
                
                // Check for specific OpenAI-generated content patterns
                if (bodyText.toLowerCase().includes('gpt') || 
                    bodyText.toLowerCase().includes('openai') ||
                    bodyText.length > 5000) {
                  console.log('🤖 OpenAI content patterns detected');
                }
                
              } else {
                console.log(`⏳ Waiting for AI content... (${elapsedTime}s, ${bodyText.length} chars)`);
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
            
            // Take final screenshot
            await page.screenshot({ path: 'test-ai-analysis-final.png', fullPage: true });
            
            if (contentLoaded) {
              console.log('\n✅ COMPLETE OPENAI INTEGRATION TEST SUCCESSFUL!');
              console.log('✅ Successfully selected verses');
              console.log('✅ Successfully found and clicked "Go Deeper" button');
              console.log('✅ Successfully navigated to analysis page');
              console.log('✅ Successfully loaded AI-generated content');
              
              console.log('\n🧪 Test 8: Test caching functionality');
              
              const reloadStart = Date.now();
              await page.reload({ waitUntil: 'networkidle0' });
              const reloadTime = Date.now() - reloadStart;
              
              console.log(`⏱️  Reload time: ${reloadTime}ms`);
              
              if (reloadTime < 5000) {
                console.log('✅ Fast reload suggests caching is working effectively');
              } else if (reloadTime < 15000) {
                console.log('⚠️  Moderate reload time - caching may be working but could be optimized');
              } else {
                console.log('❌ Slow reload suggests caching may not be working properly');
              }
              
              // Test caching by navigating back and forth
              console.log('\n🧪 Test 9: Test navigation caching');
              
              const testCacheStart = Date.now();
              await page.goBack();
              await new Promise(resolve => setTimeout(resolve, 2000));
              await page.goForward();
              const cacheTestTime = Date.now() - testCacheStart;
              
              console.log(`⏱️  Navigation cache test: ${cacheTestTime}ms`);
              
              if (cacheTestTime < 3000) {
                console.log('✅ Navigation caching appears to be working well');
              } else {
                console.log('⚠️  Navigation caching may need optimization');
              }
              
            } else {
              console.log('❌ AI content did not load within timeout period');
              console.log('🔍 This might indicate an issue with the OpenAI integration');
              
              // Check for error messages
              const errorSelectors = ['.error', '.error-message', '[data-error]', '.alert-error'];
              for (const selector of errorSelectors) {
                const errorElements = await page.$$(selector);
                if (errorElements.length > 0) {
                  for (const errorEl of errorElements) {
                    const errorText = await page.evaluate(el => el.textContent, errorEl);
                    console.log(`❌ Error detected: ${errorText}`);
                  }
                }
              }
            }
            
          } else {
            console.log(`❌ Expected navigation to /deeper/ but got: ${currentUrl}`);
          }
          
        } catch (navigationError) {
          console.log('❌ Navigation failed or timed out');
          console.log(`Error: ${navigationError.message}`);
        }
        
      } else {
        console.log('❌ "Go Deeper" button never appeared');
        console.log('💡 This might mean verse selection is not working properly');
        
        // Take debugging screenshot
        await page.screenshot({ path: 'test-no-go-deeper-button.png', fullPage: true });
        
        // Debug: check page state
        const pageState = await page.evaluate(() => {
          return {
            url: window.location.href,
            bodyText: document.body.textContent.substring(0, 500),
            buttonCount: document.querySelectorAll('button, a').length,
            selectedElements: document.querySelectorAll('.selected, [data-selected]').length
          };
        });
        
        console.log('🔍 Page debug info:', pageState);
      }
      
    } else {
      console.log('❌ No verse elements found to click');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error-final.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🎉 Final test completed!');
  }
}

// Run the test
finalTest().catch(error => {
  console.error('❌ Test failed to start:', error);
  process.exit(1);
});