#!/usr/bin/env node

/**
 * Simple focused test for Deeper Bible OpenAI integration
 * Uses proper mouse events for verse selection
 */

const puppeteer = require('puppeteer');

async function simpleTest() {
  console.log('🚀 Starting Simple Deeper Bible Test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 500,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  try {
    console.log('\n📖 Loading John 1...');
    await page.goto('http://localhost:3003/bible/john/1', { waitUntil: 'networkidle0', timeout: 60000 });
    
    console.log('\n🎯 Looking for verse elements...');
    await page.waitForSelector('div[class*="cursor-pointer"]', { timeout: 10000 });
    
    // Find verse elements using the correct selector from VerseSelection component
    const verseElements = await page.$$('div[class*="cursor-pointer"]');
    console.log(`📜 Found ${verseElements.length} verse elements`);
    
    if (verseElements.length > 0) {
      console.log('\n✋ Selecting verses using mousedown...');
      
      // Select first 2 verses using mousedown events
      for (let i = 0; i < Math.min(2, verseElements.length); i++) {
        console.log(`🎯 Selecting verse ${i + 1}...`);
        
        // Trigger mousedown event specifically
        await verseElements[i].evaluate(el => {
          el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('\n🔍 Waiting for Go Deeper button...');
      
      // Wait for the Go Deeper button to appear
      let foundButton = false;
      for (let attempt = 1; attempt <= 10; attempt++) {
        console.log(`   Attempt ${attempt}...`);
        
        const goDeeperButton = await page.$('a[href*="/deeper/"]');
        
        if (goDeeperButton) {
          const isVisible = await goDeeperButton.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          
          if (isVisible) {
            console.log('✅ Found visible Go Deeper button!');
            
            const href = await page.evaluate(el => el.href, goDeeperButton);
            console.log(`🔗 Button href: ${href}`);
            
            console.log('\n🚀 Clicking Go Deeper...');
            await goDeeperButton.click();
            
            console.log('\n⏳ Waiting for navigation...');
            await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
            
            const currentUrl = page.url();
            console.log(`🔗 Navigated to: ${currentUrl}`);
            
            if (currentUrl.includes('/deeper/')) {
              console.log('✅ Successfully reached deeper analysis page!');
              
              console.log('\n⏳ Waiting for AI content...');
              let contentLoaded = false;
              const maxWait = 90000; // 90 seconds
              const start = Date.now();
              
              while (Date.now() - start < maxWait && !contentLoaded) {
                const bodyText = await page.$eval('body', el => el.textContent);
                const elapsed = Math.floor((Date.now() - start) / 1000);
                
                if (bodyText.length > 2000 || 
                    bodyText.toLowerCase().includes('analysis') ||
                    bodyText.toLowerCase().includes('commentary')) {
                  contentLoaded = true;
                  console.log(`✅ AI content loaded! (${elapsed}s, ${bodyText.length} chars)`);
                  
                  // Test caching
                  console.log('\n🔄 Testing cache with reload...');
                  const reloadStart = Date.now();
                  await page.reload({ waitUntil: 'networkidle0' });
                  const reloadTime = Date.now() - reloadStart;
                  
                  console.log(`⏱️  Reload time: ${reloadTime}ms`);
                  if (reloadTime < 5000) {
                    console.log('✅ Fast reload - caching working!');
                  } else {
                    console.log('⚠️  Slow reload - caching may need work');
                  }
                  
                  console.log('\n🎉 OPENAI INTEGRATION TEST PASSED!');
                  console.log('✅ Verse selection works');
                  console.log('✅ Go Deeper button works');
                  console.log('✅ Navigation to analysis page works');
                  console.log('✅ AI content generation works');
                  console.log('✅ Caching test completed');
                  
                } else {
                  console.log(`⏳ Waiting... (${elapsed}s)`);
                  await new Promise(resolve => setTimeout(resolve, 5000));
                }
              }
              
              if (!contentLoaded) {
                console.log('❌ AI content did not load in time');
              }
              
            } else {
              console.log(`❌ Did not navigate to deeper page: ${currentUrl}`);
            }
            
            foundButton = true;
            break;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      if (!foundButton) {
        console.log('❌ Go Deeper button never appeared');
        
        // Debug info
        const selectedElements = await page.$$('[class*="bg-blue-100"]');
        console.log(`🔍 Found ${selectedElements.length} selected elements`);
        
        const allButtons = await page.$$('a, button');
        console.log(`🔍 Found ${allButtons.length} total clickable elements`);
      }
      
    } else {
      console.log('❌ No verse elements found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Test completed');
  }
}

simpleTest().catch(console.error);