#!/usr/bin/env npx ts-node

/**
 * Script to populate the database with complete NIV Bible text
 * from the Bolls Life Bible API
 */

import { BollsBibleService, BIBLE_BOOKS } from '../src/api/services/bolls-bible.service';
import { BibleVerse } from '../src/api/data/sample-verses';
import fs from 'fs/promises';
import path from 'path';

interface PopulateOptions {
  booksToFetch?: string[]; // Specific books to fetch, if empty fetches all
  outputFormat?: 'json' | 'typescript' | 'both';
  outputDir?: string;
  delay?: number; // Delay between API calls in ms
  testMode?: boolean; // If true, only fetch a few verses for testing
}

class NIVBiblePopulator {
  private bollsService: BollsBibleService;
  private allVerses: BibleVerse[] = [];

  constructor() {
    this.bollsService = new BollsBibleService();
  }

  /**
   * Populate Bible data with specified options
   */
  async populate(options: PopulateOptions = {}) {
    const {
      booksToFetch = [],
      outputFormat = 'both',
      outputDir = './src/api/data',
      delay = 200,
      testMode = false
    } = options;

    console.log('🚀 Starting NIV Bible population...');
    console.log(`📖 Mode: ${testMode ? 'TEST' : 'FULL'}`);
    
    const booksToProcess = booksToFetch.length > 0 
      ? BIBLE_BOOKS.filter(book => booksToFetch.includes(book.id))
      : BIBLE_BOOKS;

    if (testMode) {
      console.log('🧪 Test mode: Fetching limited data for testing...');
      // In test mode, only fetch first chapter of first 3 books
      const testBooks = booksToProcess.slice(0, 3);
      for (const book of testBooks) {
        console.log(`📖 Fetching ${book.name} chapter 1 (test mode)...`);
        try {
          const verses = await this.bollsService.fetchChapter(book.id, 1);
          this.allVerses.push(...verses);
          console.log(`✅ Got ${verses.length} verses from ${book.name} 1`);
          
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.error(`❌ Failed to fetch ${book.name} chapter 1:`, error);
        }
      }
    } else {
      console.log(`📚 Processing ${booksToProcess.length} books...`);
      
      for (const book of booksToProcess) {
        console.log(`\n📖 Processing ${book.name} (${book.chapters} chapters)...`);
        
        try {
          const verses = await this.bollsService.fetchBook(book.id);
          this.allVerses.push(...verses);
          console.log(`✅ Completed ${book.name}: ${verses.length} verses`);
          
          // Save progress periodically
          if (this.allVerses.length % 10000 === 0) {
            console.log(`💾 Progress save: ${this.allVerses.length} verses collected`);
            await this.saveProgress(outputDir, outputFormat);
          }
          
        } catch (error) {
          console.error(`❌ Failed to fetch ${book.name}:`, error);
        }

        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Final save
    await this.saveData(outputDir, outputFormat);
    
    console.log('\n🎉 Bible population completed!');
    console.log(`📊 Total verses collected: ${this.allVerses.length}`);
    console.log(`📖 Books processed: ${new Set(this.allVerses.map(v => v.book)).size}`);
  }

  /**
   * Save progress to temporary file
   */
  private async saveProgress(outputDir: string, format: string) {
    const progressFile = path.join(outputDir, 'niv-bible-progress.json');
    await fs.writeFile(progressFile, JSON.stringify(this.allVerses, null, 2));
  }

  /**
   * Save final data in specified format(s)
   */
  private async saveData(outputDir: string, format: 'json' | 'typescript' | 'both') {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    if (format === 'json' || format === 'both') {
      await this.saveAsJSON(outputDir);
    }

    if (format === 'typescript' || format === 'both') {
      await this.saveAsTypeScript(outputDir);
    }
  }

  /**
   * Save as JSON file
   */
  private async saveAsJSON(outputDir: string) {
    const jsonFile = path.join(outputDir, 'niv-bible-complete.json');
    const data = {
      metadata: {
        translation: 'NIV',
        source: 'Bolls Life Bible API',
        generatedAt: new Date().toISOString(),
        totalVerses: this.allVerses.length,
        totalBooks: new Set(this.allVerses.map(v => v.book)).size
      },
      verses: this.allVerses
    };
    
    await fs.writeFile(jsonFile, JSON.stringify(data, null, 2));
    console.log(`💾 Saved JSON file: ${jsonFile}`);
  }

  /**
   * Save as TypeScript file
   */
  private async saveAsTypeScript(outputDir: string) {
    const tsFile = path.join(outputDir, 'niv-bible-complete.ts');
    
    const content = `/**
 * Complete NIV Bible Text
 * Generated from Bolls Life Bible API
 * Generated at: ${new Date().toISOString()}
 * Total verses: ${this.allVerses.length}
 */

import { BibleVerse } from './sample-verses';

export const NIV_BIBLE_COMPLETE: BibleVerse[] = ${JSON.stringify(this.allVerses, null, 2)};

export const NIV_METADATA = {
  translation: 'NIV',
  source: 'Bolls Life Bible API',
  generatedAt: '${new Date().toISOString()}',
  totalVerses: ${this.allVerses.length},
  totalBooks: ${new Set(this.allVerses.map(v => v.book)).size}
};

/**
 * Get verses for a specific book and chapter
 */
export function getChapterVerses(book: string, chapter: number): BibleVerse[] {
  return NIV_BIBLE_COMPLETE.filter(v => 
    v.book.toLowerCase() === book.toLowerCase() && 
    v.chapter === chapter
  );
}

/**
 * Get a specific verse
 */
export function getVerse(book: string, chapter: number, verse: number): BibleVerse | undefined {
  return NIV_BIBLE_COMPLETE.find(v => 
    v.book.toLowerCase() === book.toLowerCase() && 
    v.chapter === chapter && 
    v.verse === verse
  );
}

/**
 * Get verse range
 */
export function getVerseRange(
  book: string, 
  chapter: number, 
  startVerse: number, 
  endVerse: number
): BibleVerse[] {
  return NIV_BIBLE_COMPLETE.filter(v => 
    v.book.toLowerCase() === book.toLowerCase() && 
    v.chapter === chapter && 
    v.verse >= startVerse && 
    v.verse <= endVerse
  );
}

/**
 * Search for verses containing specific text
 */
export function searchVerses(searchText: string, maxResults = 50): BibleVerse[] {
  const searchLower = searchText.toLowerCase();
  return NIV_BIBLE_COMPLETE
    .filter(v => v.text.toLowerCase().includes(searchLower))
    .slice(0, maxResults);
}
`;

    await fs.writeFile(tsFile, content);
    console.log(`💾 Saved TypeScript file: ${tsFile}`);
  }

  /**
   * Load existing progress if available
   */
  async loadProgress(outputDir: string): Promise<boolean> {
    try {
      const progressFile = path.join(outputDir, 'niv-bible-progress.json');
      const data = await fs.readFile(progressFile, 'utf8');
      this.allVerses = JSON.parse(data);
      console.log(`📂 Loaded ${this.allVerses.length} verses from progress file`);
      return true;
    } catch (error) {
      console.log('📂 No progress file found, starting fresh');
      return false;
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const options: PopulateOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--test':
        options.testMode = true;
        break;
      case '--books':
        options.booksToFetch = args[++i]?.split(',') || [];
        break;
      case '--format':
        options.outputFormat = args[++i] as 'json' | 'typescript' | 'both';
        break;
      case '--delay':
        options.delay = parseInt(args[++i]) || 200;
        break;
      case '--output':
        options.outputDir = args[++i];
        break;
      case '--help':
        console.log(`
NIV Bible Population Script

Usage: npm run populate-bible [options]

Options:
  --test                    Test mode (fetch limited data)
  --books <book1,book2>     Specific books to fetch (comma-separated)
  --format <json|ts|both>   Output format (default: both)
  --delay <ms>              Delay between API calls (default: 200)
  --output <dir>            Output directory (default: ./src/api/data)
  --help                    Show this help

Examples:
  npm run populate-bible --test
  npm run populate-bible --books john,matthew,genesis
  npm run populate-bible --format json --delay 100
        `);
        process.exit(0);
    }
  }

  const populator = new NIVBiblePopulator();
  
  try {
    await populator.populate(options);
  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { NIVBiblePopulator, PopulateOptions };