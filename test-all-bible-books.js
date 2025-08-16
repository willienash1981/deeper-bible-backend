#!/usr/bin/env node

/**
 * Comprehensive Playwright test to validate all Bible books are properly loaded
 * Tests each book for content availability and proper verse display
 */

const { chromium } = require('playwright');

// All 66 books of the Bible with their expected chapter counts
const BIBLE_BOOKS = [
  // Old Testament
  { id: 'genesis', name: 'Genesis', chapters: 50, testament: 'OT' },
  { id: 'exodus', name: 'Exodus', chapters: 40, testament: 'OT' },
  { id: 'leviticus', name: 'Leviticus', chapters: 27, testament: 'OT' },
  { id: 'numbers', name: 'Numbers', chapters: 36, testament: 'OT' },
  { id: 'deuteronomy', name: 'Deuteronomy', chapters: 34, testament: 'OT' },
  { id: 'joshua', name: 'Joshua', chapters: 24, testament: 'OT' },
  { id: 'judges', name: 'Judges', chapters: 21, testament: 'OT' },
  { id: 'ruth', name: 'Ruth', chapters: 4, testament: 'OT' },
  { id: '1samuel', name: '1 Samuel', chapters: 31, testament: 'OT' },
  { id: '2samuel', name: '2 Samuel', chapters: 24, testament: 'OT' },
  { id: '1kings', name: '1 Kings', chapters: 22, testament: 'OT' },
  { id: '2kings', name: '2 Kings', chapters: 25, testament: 'OT' },
  { id: '1chronicles', name: '1 Chronicles', chapters: 29, testament: 'OT' },
  { id: '2chronicles', name: '2 Chronicles', chapters: 36, testament: 'OT' },
  { id: 'ezra', name: 'Ezra', chapters: 10, testament: 'OT' },
  { id: 'nehemiah', name: 'Nehemiah', chapters: 13, testament: 'OT' },
  { id: 'esther', name: 'Esther', chapters: 10, testament: 'OT' },
  { id: 'job', name: 'Job', chapters: 42, testament: 'OT' },
  { id: 'psalms', name: 'Psalms', chapters: 150, testament: 'OT' },
  { id: 'proverbs', name: 'Proverbs', chapters: 31, testament: 'OT' },
  { id: 'ecclesiastes', name: 'Ecclesiastes', chapters: 12, testament: 'OT' },
  { id: 'song', name: 'Song of Songs', chapters: 8, testament: 'OT' },
  { id: 'isaiah', name: 'Isaiah', chapters: 66, testament: 'OT' },
  { id: 'jeremiah', name: 'Jeremiah', chapters: 52, testament: 'OT' },
  { id: 'lamentations', name: 'Lamentations', chapters: 5, testament: 'OT' },
  { id: 'ezekiel', name: 'Ezekiel', chapters: 48, testament: 'OT' },
  { id: 'daniel', name: 'Daniel', chapters: 12, testament: 'OT' },
  { id: 'hosea', name: 'Hosea', chapters: 14, testament: 'OT' },
  { id: 'joel', name: 'Joel', chapters: 3, testament: 'OT' },
  { id: 'amos', name: 'Amos', chapters: 9, testament: 'OT' },
  { id: 'obadiah', name: 'Obadiah', chapters: 1, testament: 'OT' },
  { id: 'jonah', name: 'Jonah', chapters: 4, testament: 'OT' },
  { id: 'micah', name: 'Micah', chapters: 7, testament: 'OT' },
  { id: 'nahum', name: 'Nahum', chapters: 3, testament: 'OT' },
  { id: 'habakkuk', name: 'Habakkuk', chapters: 3, testament: 'OT' },
  { id: 'zephaniah', name: 'Zephaniah', chapters: 3, testament: 'OT' },
  { id: 'haggai', name: 'Haggai', chapters: 2, testament: 'OT' },
  { id: 'zechariah', name: 'Zechariah', chapters: 14, testament: 'OT' },
  { id: 'malachi', name: 'Malachi', chapters: 4, testament: 'OT' },
  
  // New Testament
  { id: 'matthew', name: 'Matthew', chapters: 28, testament: 'NT' },
  { id: 'mark', name: 'Mark', chapters: 16, testament: 'NT' },
  { id: 'luke', name: 'Luke', chapters: 24, testament: 'NT' },
  { id: 'john', name: 'John', chapters: 21, testament: 'NT' },
  { id: 'acts', name: 'Acts', chapters: 28, testament: 'NT' },
  { id: 'romans', name: 'Romans', chapters: 16, testament: 'NT' },
  { id: '1corinthians', name: '1 Corinthians', chapters: 16, testament: 'NT' },
  { id: '2corinthians', name: '2 Corinthians', chapters: 13, testament: 'NT' },
  { id: 'galatians', name: 'Galatians', chapters: 6, testament: 'NT' },
  { id: 'ephesians', name: 'Ephesians', chapters: 6, testament: 'NT' },
  { id: 'philippians', name: 'Philippians', chapters: 4, testament: 'NT' },
  { id: 'colossians', name: 'Colossians', chapters: 4, testament: 'NT' },
  { id: '1thessalonians', name: '1 Thessalonians', chapters: 5, testament: 'NT' },
  { id: '2thessalonians', name: '2 Thessalonians', chapters: 3, testament: 'NT' },
  { id: '1timothy', name: '1 Timothy', chapters: 6, testament: 'NT' },
  { id: '2timothy', name: '2 Timothy', chapters: 4, testament: 'NT' },
  { id: 'titus', name: 'Titus', chapters: 3, testament: 'NT' },
  { id: 'philemon', name: 'Philemon', chapters: 1, testament: 'NT' },
  { id: 'hebrews', name: 'Hebrews', chapters: 13, testament: 'NT' },
  { id: 'james', name: 'James', chapters: 5, testament: 'NT' },
  { id: '1peter', name: '1 Peter', chapters: 5, testament: 'NT' },
  { id: '2peter', name: '2 Peter', chapters: 3, testament: 'NT' },
  { id: '1john', name: '1 John', chapters: 5, testament: 'NT' },
  { id: '2john', name: '2 John', chapters: 1, testament: 'NT' },
  { id: '3john', name: '3 John', chapters: 1, testament: 'NT' },
  { id: 'jude', name: 'Jude', chapters: 1, testament: 'NT' },
  { id: 'revelation', name: 'Revelation', chapters: 22, testament: 'NT' }
];

const CONFIG = {
  frontendUrl: 'http://localhost:3003',
  headless: false,
  timeout: 30000
};

class BibleBookValidator {
  constructor() {
    this.results = {
      working: [],
      broken: [],
      placeholder: [],
      errors: []
    };
  }

  async validateAllBooks() {
    console.log('🚀 Starting comprehensive Bible book validation...');
    console.log(`📚 Testing ${BIBLE_BOOKS.length} books of the Bible`);
    
    const browser = await chromium.launch({
      headless: CONFIG.headless,
      slowMo: 100
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Set longer timeout for API calls
    page.setDefaultTimeout(CONFIG.timeout);
    
    try {
      // Test a sample of books from different categories
      const testBooks = [
        ...BIBLE_BOOKS.filter(b => ['john', 'matthew', 'genesis', 'psalms'].includes(b.id)), // Books we populated
        ...BIBLE_BOOKS.filter(b => ['romans', 'exodus', 'daniel', 'revelation'].includes(b.id)), // Books not populated
        ...BIBLE_BOOKS.filter(b => ['ruth', 'jonah', 'jude', 'philemon'].includes(b.id)) // Small books
      ];
      
      console.log(`\n📋 Testing ${testBooks.length} representative books:`);
      testBooks.forEach(book => console.log(`   - ${book.name} (${book.id})`));
      
      for (const book of testBooks) {
        await this.validateBook(page, book);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
    } finally {
      await browser.close();
    }
  }

  async validateBook(page, book) {
    const testChapter = 1; // Always test chapter 1
    const url = `${CONFIG.frontendUrl}/bible/${book.id}/${testChapter}`;
    
    console.log(`\n📖 Testing ${book.name} chapter ${testChapter}...`);
    console.log(`🔗 URL: ${url}`);
    
    try {
      // Navigate to the book chapter
      await page.goto(url, { waitUntil: 'networkidle', timeout: CONFIG.timeout });
      
      // Wait for page to load
      await page.waitForSelector('body', { timeout: 5000 });
      
      // Check for error states
      const hasError = await page.locator('text="Oops! Something went wrong"').isVisible();
      const hasAPIError = await page.locator('text="API request failed"').isVisible();
      
      if (hasError || hasAPIError) {
        console.log(`❌ ${book.name}: Error page displayed`);
        this.results.broken.push(book);
        return;
      }
      
      // Check for verse content
      const verseElements = await page.locator('div[class*="cursor-pointer"]').count();
      console.log(`📜 Found ${verseElements} verse elements`);
      
      if (verseElements === 0) {
        console.log(`❌ ${book.name}: No verse elements found`);
        this.results.broken.push(book);
        return;
      }
      
      // Get the text content of the first few verses
      const firstVerseText = await page.locator('div[class*="cursor-pointer"]').first().textContent();
      
      if (!firstVerseText) {
        console.log(`❌ ${book.name}: No verse text found`);
        this.results.broken.push(book);
        return;
      }
      
      // Check if it's placeholder text
      if (firstVerseText.includes('Sample text - replace with actual Bible text') || 
          firstVerseText.includes('This is verse')) {
        console.log(`⚠️  ${book.name}: Placeholder text detected`);
        console.log(`   Text preview: "${firstVerseText.substring(0, 80)}..."`);
        this.results.placeholder.push(book);
        return;
      }
      
      // If we get here, it's working with real content
      console.log(`✅ ${book.name}: Real Bible content loaded`);
      console.log(`   First verse: "${firstVerseText.substring(0, 80)}..."`);
      this.results.working.push(book);
      
    } catch (error) {
      console.log(`❌ ${book.name}: Error during testing - ${error.message}`);
      this.results.errors.push({ book, error: error.message });
    }
  }

  printResults() {
    console.log('\n📊 BIBLE BOOK VALIDATION RESULTS');
    console.log('=====================================');
    
    console.log(`\n✅ WORKING BOOKS (${this.results.working.length}):`);
    this.results.working.forEach(book => {
      console.log(`   ✅ ${book.name} (${book.id})`);
    });
    
    console.log(`\n⚠️  PLACEHOLDER TEXT (${this.results.placeholder.length}):`);
    this.results.placeholder.forEach(book => {
      console.log(`   ⚠️  ${book.name} (${book.id}) - Needs real Bible data`);
    });
    
    console.log(`\n❌ BROKEN/ERROR (${this.results.broken.length}):`);
    this.results.broken.forEach(book => {
      console.log(`   ❌ ${book.name} (${book.id}) - Failed to load`);
    });
    
    console.log(`\n🔥 ERRORS (${this.results.errors.length}):`);
    this.results.errors.forEach(({ book, error }) => {
      console.log(`   🔥 ${book.name} (${book.id}) - ${error}`);
    });
    
    console.log('\n📈 SUMMARY:');
    console.log(`   Total tested: ${this.results.working.length + this.results.placeholder.length + this.results.broken.length + this.results.errors.length}`);
    console.log(`   Working: ${this.results.working.length}`);
    console.log(`   Placeholder: ${this.results.placeholder.length}`);
    console.log(`   Broken: ${this.results.broken.length}`);
    console.log(`   Errors: ${this.results.errors.length}`);
    
    const successRate = Math.round((this.results.working.length / (this.results.working.length + this.results.placeholder.length + this.results.broken.length + this.results.errors.length)) * 100);
    console.log(`   Success rate: ${successRate}%`);
    
    if (this.results.working.length === 0) {
      console.log('\n🚨 CRITICAL: No books are loading real Bible content!');
      console.log('🔧 This indicates a fundamental issue with the Bible data integration.');
    } else if (this.results.working.length < 4) {
      console.log('\n⚠️  WARNING: Very few books have real Bible content!');
      console.log('🔧 The Bolls API integration may not be working properly.');
    }
  }
}

// Run the validation
async function main() {
  const validator = new BibleBookValidator();
  await validator.validateAllBooks();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { BibleBookValidator, BIBLE_BOOKS };