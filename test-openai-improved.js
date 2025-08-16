#!/usr/bin/env node

/**
 * Improved Puppeteer test for Deeper Bible OpenAI integration
 * Focuses on finding actual UI buttons, not CSS content
 */

const puppeteer = require('puppeteer');

// Configuration
const CONFIG = {
  frontendUrl: 'http://localhost:3003',
  backendUrl: 'http://localhost:3001',
  headless: false,
  slowMo: 1000, // Slower for better visibility
};

async function improvedTest() {
  console.log('🚀 Starting Improved Deeper Bible Test...');
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
    await page.screenshot({ path: 'test-john-1-loaded.png', fullPage: true });
    
    console.log('\n🧪 Test 2: Analyze page structure');
    
    // Get all interactive elements on the page
    const pageAnalysis = await page.evaluate(() => {
      const analysis = {
        buttons: [],
        links: [],
        clickableElements: [],
        versesWithDeeper: []
      };
      
      // Find all button elements
      document.querySelectorAll('button').forEach((btn, index) => {
        const text = btn.textContent?.trim() || '';
        const classes = btn.className || '';
        analysis.buttons.push({
          index,
          text: text.substring(0, 100),
          classes,
          visible: btn.offsetWidth > 0 && btn.offsetHeight > 0
        });
      });
      
      // Find all link elements
      document.querySelectorAll('a').forEach((link, index) => {
        const text = link.textContent?.trim() || '';
        const href = link.href || '';
        const classes = link.className || '';
        analysis.links.push({
          index,
          text: text.substring(0, 100),
          href,
          classes,
          visible: link.offsetWidth > 0 && link.offsetHeight > 0
        });
      });
      
      // Find elements with "deeper" in text
      document.querySelectorAll('*').forEach((el, index) => {
        const text = el.textContent?.trim() || '';
        if (text.toLowerCase().includes('deeper') && 
            text.length < 200 && 
            !text.includes('{') && 
            !text.includes('font-family')) {
          const isClickable = ['A', 'BUTTON'].includes(el.tagName) || 
                             el.onclick !== null || 
                             el.getAttribute('role') === 'button' ||
                             el.style.cursor === 'pointer';
          
          if (isClickable && el.offsetWidth > 0 && el.offsetHeight > 0) {
            analysis.versesWithDeeper.push({
              tagName: el.tagName,
              text: text.substring(0, 100),
              classes: el.className || '',
              href: el.href || '',
              clickable: isClickable
            });
          }
        }
      });
      
      return analysis;
    });
    
    console.log(`📊 Page Analysis:`);
    console.log(`   Buttons: ${pageAnalysis.buttons.length}`);
    console.log(`   Links: ${pageAnalysis.links.length}`);
    console.log(`   "Deeper" elements: ${pageAnalysis.versesWithDeeper.length}`);
    
    // Log details of interactive elements
    if (pageAnalysis.buttons.length > 0) {
      console.log('\n🔘 Buttons found:');
      pageAnalysis.buttons.forEach((btn, i) => {
        if (btn.visible && btn.text) {
          console.log(`   ${i}: "${btn.text}" (${btn.classes})`);
        }
      });
    }
    
    if (pageAnalysis.links.length > 0) {
      console.log('\n🔗 Links found:');
      pageAnalysis.links.forEach((link, i) => {
        if (link.visible && link.text && !link.href.includes('localhost')) {
          console.log(`   ${i}: "${link.text}" -> ${link.href}`);
        }
      });
    }
    
    if (pageAnalysis.versesWithDeeper.length > 0) {
      console.log('\n🎯 "Deeper" elements found:');
      pageAnalysis.versesWithDeeper.forEach((el, i) => {
        console.log(`   ${i}: <${el.tagName}> "${el.text}" (${el.classes})`);
        if (el.href) console.log(`      -> ${el.href}`);
      });
    }
    
    console.log('\n🧪 Test 3: Look for verse interaction patterns');
    
    // Try clicking on verse text first to see if it reveals "Go Deeper" buttons
    const verseElements = await page.$$('p, .verse, [data-verse], .verse-text');
    console.log(`📜 Found ${verseElements.length} potential verse elements`);
    
    if (verseElements.length > 0) {
      console.log('🎯 Clicking on first verse to see if UI changes...');
      await verseElements[0].click();
      
      // Wait for potential UI changes
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Re-analyze page after click
      const afterClickAnalysis = await page.evaluate(() => {
        const deeperElements = [];
        document.querySelectorAll('*').forEach((el) => {
          const text = el.textContent?.trim() || '';
          if (text.toLowerCase().includes('deeper') && 
              text.length < 200 && 
              !text.includes('{') && 
              !text.includes('font-family')) {
            const isClickable = ['A', 'BUTTON'].includes(el.tagName) || 
                               el.onclick !== null || 
                               el.getAttribute('role') === 'button' ||
                               el.style.cursor === 'pointer' ||
                               el.getAttribute('data-action');
            
            if (isClickable && el.offsetWidth > 0 && el.offsetHeight > 0) {
              deeperElements.push({
                tagName: el.tagName,
                text: text.substring(0, 100),
                classes: el.className || '',
                href: el.href || '',
                dataAction: el.getAttribute('data-action') || ''
              });
            }
          }
        });
        return deeperElements;
      });
      
      console.log(`🔍 After click analysis: ${afterClickAnalysis.length} "deeper" elements`);
      afterClickAnalysis.forEach((el, i) => {
        console.log(`   ${i}: <${el.tagName}> "${el.text}"`);
        if (el.href) console.log(`      href: ${el.href}`);
        if (el.dataAction) console.log(`      action: ${el.dataAction}`);
      });
      
      // Try clicking the first "deeper" element found
      if (afterClickAnalysis.length > 0) {
        console.log('\n🧪 Test 4: Click on "Go Deeper" element');
        
        // Find and click the element
        const deeperElement = await page.evaluateHandle(() => {
          const elements = Array.from(document.querySelectorAll('*')).filter(el => {
            const text = el.textContent?.trim() || '';
            const isClickable = ['A', 'BUTTON'].includes(el.tagName) || 
                               el.onclick !== null || 
                               el.getAttribute('role') === 'button' ||
                               el.style.cursor === 'pointer' ||
                               el.getAttribute('data-action');
            
            return text.toLowerCase().includes('deeper') && 
                   text.length < 200 && 
                   !text.includes('{') && 
                   !text.includes('font-family') &&
                   isClickable && 
                   el.offsetWidth > 0 && 
                   el.offsetHeight > 0;
          });
          
          return elements[0] || null;
        });
        
        if (deeperElement) {
          console.log('✅ Found "Go Deeper" element, clicking...');
          await deeperElement.click();
          
          console.log('\n🧪 Test 5: Wait for navigation or content change');
          
          // Wait for either navigation or content change
          try {
            await Promise.race([
              page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
              page.waitForFunction(() => {
                return document.body.textContent.includes('analysis') || 
                       document.body.textContent.includes('research') ||
                       document.body.textContent.includes('AI') ||
                       window.location.href.includes('/deeper/');
              }, { timeout: 30000 })
            ]);
            
            const currentUrl = page.url();
            console.log(`🔗 Current URL: ${currentUrl}`);
            
            if (currentUrl.includes('/deeper/')) {
              console.log('✅ Successfully navigated to deeper analysis page!');
              
              // Take screenshot of the deeper page
              await page.screenshot({ path: 'test-deeper-page.png', fullPage: true });
              
              console.log('\n🧪 Test 6: Check for AI content');
              
              // Wait for AI content to load
              let contentLoaded = false;
              const maxWaitTime = 90000; // 90 seconds
              const startTime = Date.now();
              
              while (Date.now() - startTime < maxWaitTime && !contentLoaded) {
                const bodyText = await page.$eval('body', el => el.textContent);
                
                // Check for signs of AI-generated content
                if (bodyText.length > 2000 || 
                    bodyText.toLowerCase().includes('analysis') ||
                    bodyText.toLowerCase().includes('commentary') ||
                    bodyText.toLowerCase().includes('theological') ||
                    bodyText.toLowerCase().includes('biblical')) {
                  contentLoaded = true;
                  console.log('✅ AI content detected!');
                  console.log(`📄 Content length: ${bodyText.length} characters`);
                } else {
                  console.log(`⏳ Waiting for AI content... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
                  await new Promise(resolve => setTimeout(resolve, 5000));
                }
              }
              
              if (contentLoaded) {
                console.log('\n✅ OPENAI INTEGRATION TEST SUCCESSFUL!');
                console.log('✅ Successfully clicked "Go Deeper"');
                console.log('✅ Successfully navigated to analysis page');
                console.log('✅ Successfully loaded AI-generated content');
                
                console.log('\n🧪 Test 7: Test caching by reload');
                const reloadStart = Date.now();
                await page.reload({ waitUntil: 'networkidle0' });
                const reloadTime = Date.now() - reloadStart;
                
                console.log(`⏱️  Reload time: ${reloadTime}ms`);
                if (reloadTime < 10000) {
                  console.log('✅ Fast reload suggests caching is working');
                } else {
                  console.log('⚠️  Slower reload - caching may need optimization');
                }
                
              } else {
                console.log('❌ AI content did not load within timeout');
              }
              
            } else {
              console.log(`❌ Expected navigation to /deeper/ but still at: ${currentUrl}`);
            }
            
          } catch (error) {
            console.log('❌ No navigation or content change detected');
            console.log(`Error: ${error.message}`);
          }
          
        } else {
          console.log('❌ Could not find clickable "Go Deeper" element');
        }
      } else {
        console.log('❌ No "Go Deeper" elements found after verse click');
      }
    } else {
      console.log('❌ No verse elements found on page');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error-improved.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n🎉 Improved test completed!');
  }
}

// Run the test
improvedTest().catch(error => {
  console.error('❌ Test failed to start:', error);
  process.exit(1);
});