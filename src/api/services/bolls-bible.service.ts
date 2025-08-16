/**
 * Bolls Bible API Service
 * Integrates with the Bolls Life Bible API to fetch complete NIV Bible text
 */

import axios from 'axios';
import { BibleVerse } from '../data/sample-verses';

export interface BollsVerse {
  pk: number;
  verse: number;
  text: string;
}

export interface BollsChapter {
  verses: BollsVerse[];
}

export interface BollsBook {
  name: string;
  chapters: number;
  testament: 'OT' | 'NT';
}

/**
 * Bible book mapping with Bolls API book numbers
 * Based on standard Protestant Bible order
 */
export const BIBLE_BOOKS = [
  // Old Testament
  { id: 'genesis', name: 'Genesis', number: 1, testament: 'OT', chapters: 50 },
  { id: 'exodus', name: 'Exodus', number: 2, testament: 'OT', chapters: 40 },
  { id: 'leviticus', name: 'Leviticus', number: 3, testament: 'OT', chapters: 27 },
  { id: 'numbers', name: 'Numbers', number: 4, testament: 'OT', chapters: 36 },
  { id: 'deuteronomy', name: 'Deuteronomy', number: 5, testament: 'OT', chapters: 34 },
  { id: 'joshua', name: 'Joshua', number: 6, testament: 'OT', chapters: 24 },
  { id: 'judges', name: 'Judges', number: 7, testament: 'OT', chapters: 21 },
  { id: 'ruth', name: 'Ruth', number: 8, testament: 'OT', chapters: 4 },
  { id: '1samuel', name: '1 Samuel', number: 9, testament: 'OT', chapters: 31 },
  { id: '2samuel', name: '2 Samuel', number: 10, testament: 'OT', chapters: 24 },
  { id: '1kings', name: '1 Kings', number: 11, testament: 'OT', chapters: 22 },
  { id: '2kings', name: '2 Kings', number: 12, testament: 'OT', chapters: 25 },
  { id: '1chronicles', name: '1 Chronicles', number: 13, testament: 'OT', chapters: 29 },
  { id: '2chronicles', name: '2 Chronicles', number: 14, testament: 'OT', chapters: 36 },
  { id: 'ezra', name: 'Ezra', number: 15, testament: 'OT', chapters: 10 },
  { id: 'nehemiah', name: 'Nehemiah', number: 16, testament: 'OT', chapters: 13 },
  { id: 'esther', name: 'Esther', number: 17, testament: 'OT', chapters: 10 },
  { id: 'job', name: 'Job', number: 18, testament: 'OT', chapters: 42 },
  { id: 'psalms', name: 'Psalms', number: 19, testament: 'OT', chapters: 150 },
  { id: 'proverbs', name: 'Proverbs', number: 20, testament: 'OT', chapters: 31 },
  { id: 'ecclesiastes', name: 'Ecclesiastes', number: 21, testament: 'OT', chapters: 12 },
  { id: 'song', name: 'Song of Songs', number: 22, testament: 'OT', chapters: 8 },
  { id: 'isaiah', name: 'Isaiah', number: 23, testament: 'OT', chapters: 66 },
  { id: 'jeremiah', name: 'Jeremiah', number: 24, testament: 'OT', chapters: 52 },
  { id: 'lamentations', name: 'Lamentations', number: 25, testament: 'OT', chapters: 5 },
  { id: 'ezekiel', name: 'Ezekiel', number: 26, testament: 'OT', chapters: 48 },
  { id: 'daniel', name: 'Daniel', number: 27, testament: 'OT', chapters: 12 },
  { id: 'hosea', name: 'Hosea', number: 28, testament: 'OT', chapters: 14 },
  { id: 'joel', name: 'Joel', number: 29, testament: 'OT', chapters: 3 },
  { id: 'amos', name: 'Amos', number: 30, testament: 'OT', chapters: 9 },
  { id: 'obadiah', name: 'Obadiah', number: 31, testament: 'OT', chapters: 1 },
  { id: 'jonah', name: 'Jonah', number: 32, testament: 'OT', chapters: 4 },
  { id: 'micah', name: 'Micah', number: 33, testament: 'OT', chapters: 7 },
  { id: 'nahum', name: 'Nahum', number: 34, testament: 'OT', chapters: 3 },
  { id: 'habakkuk', name: 'Habakkuk', number: 35, testament: 'OT', chapters: 3 },
  { id: 'zephaniah', name: 'Zephaniah', number: 36, testament: 'OT', chapters: 3 },
  { id: 'haggai', name: 'Haggai', number: 37, testament: 'OT', chapters: 2 },
  { id: 'zechariah', name: 'Zechariah', number: 38, testament: 'OT', chapters: 14 },
  { id: 'malachi', name: 'Malachi', number: 39, testament: 'OT', chapters: 4 },
  
  // New Testament
  { id: 'matthew', name: 'Matthew', number: 40, testament: 'NT', chapters: 28 },
  { id: 'mark', name: 'Mark', number: 41, testament: 'NT', chapters: 16 },
  { id: 'luke', name: 'Luke', number: 42, testament: 'NT', chapters: 24 },
  { id: 'john', name: 'John', number: 43, testament: 'NT', chapters: 21 },
  { id: 'acts', name: 'Acts', number: 44, testament: 'NT', chapters: 28 },
  { id: 'romans', name: 'Romans', number: 45, testament: 'NT', chapters: 16 },
  { id: '1corinthians', name: '1 Corinthians', number: 46, testament: 'NT', chapters: 16 },
  { id: '2corinthians', name: '2 Corinthians', number: 47, testament: 'NT', chapters: 13 },
  { id: 'galatians', name: 'Galatians', number: 48, testament: 'NT', chapters: 6 },
  { id: 'ephesians', name: 'Ephesians', number: 49, testament: 'NT', chapters: 6 },
  { id: 'philippians', name: 'Philippians', number: 50, testament: 'NT', chapters: 4 },
  { id: 'colossians', name: 'Colossians', number: 51, testament: 'NT', chapters: 4 },
  { id: '1thessalonians', name: '1 Thessalonians', number: 52, testament: 'NT', chapters: 5 },
  { id: '2thessalonians', name: '2 Thessalonians', number: 53, testament: 'NT', chapters: 3 },
  { id: '1timothy', name: '1 Timothy', number: 54, testament: 'NT', chapters: 6 },
  { id: '2timothy', name: '2 Timothy', number: 55, testament: 'NT', chapters: 4 },
  { id: 'titus', name: 'Titus', number: 56, testament: 'NT', chapters: 3 },
  { id: 'philemon', name: 'Philemon', number: 57, testament: 'NT', chapters: 1 },
  { id: 'hebrews', name: 'Hebrews', number: 58, testament: 'NT', chapters: 13 },
  { id: 'james', name: 'James', number: 59, testament: 'NT', chapters: 5 },
  { id: '1peter', name: '1 Peter', number: 60, testament: 'NT', chapters: 5 },
  { id: '2peter', name: '2 Peter', number: 61, testament: 'NT', chapters: 3 },
  { id: '1john', name: '1 John', number: 62, testament: 'NT', chapters: 5 },
  { id: '2john', name: '2 John', number: 63, testament: 'NT', chapters: 1 },
  { id: '3john', name: '3 John', number: 64, testament: 'NT', chapters: 1 },
  { id: 'jude', name: 'Jude', number: 65, testament: 'NT', chapters: 1 },
  { id: 'revelation', name: 'Revelation', number: 66, testament: 'NT', chapters: 22 }
];

export class BollsBibleService {
  private baseUrl = 'https://bolls.life';
  private axios = axios.create({
    timeout: 10000,
    headers: {
      'User-Agent': 'Deeper Bible App/1.0'
    }
  });

  /**
   * Get a chapter's verses from the Bolls API
   */
  async getChapterVerses(bookNumber: number, chapterNumber: number): Promise<BollsVerse[]> {
    try {
      const response = await this.axios.get<BollsVerse[]>(
        `${this.baseUrl}/get-text/NIV/${bookNumber}/${chapterNumber}/`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching chapter ${chapterNumber} of book ${bookNumber}:`, error);
      throw new Error(`Failed to fetch Bible chapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a single verse from the Bolls API
   */
  async getVerse(bookNumber: number, chapterNumber: number, verseNumber: number): Promise<BollsVerse | null> {
    try {
      const response = await this.axios.get<BollsVerse>(
        `${this.baseUrl}/get-verse/NIV/${bookNumber}/${chapterNumber}/${verseNumber}/`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching verse ${verseNumber}:`, error);
      return null;
    }
  }

  /**
   * Convert Bolls verse format to our internal format
   */
  convertToInternalFormat(
    bollsVerse: BollsVerse, 
    bookId: string, 
    chapterNumber: number
  ): BibleVerse {
    return {
      book: bookId,
      chapter: chapterNumber,
      verse: bollsVerse.verse,
      text: bollsVerse.text.replace(/<br\/?>/g, ' ').trim(), // Remove HTML breaks
      translation: 'NIV'
    };
  }

  /**
   * Get book info by book ID
   */
  getBookInfo(bookId: string) {
    return BIBLE_BOOKS.find(book => book.id === bookId);
  }

  /**
   * Get book info by book number
   */
  getBookInfoByNumber(bookNumber: number) {
    return BIBLE_BOOKS.find(book => book.number === bookNumber);
  }

  /**
   * Fetch and convert a complete chapter
   */
  async fetchChapter(bookId: string, chapterNumber: number): Promise<BibleVerse[]> {
    const bookInfo = this.getBookInfo(bookId);
    if (!bookInfo) {
      throw new Error(`Book ${bookId} not found`);
    }

    if (chapterNumber < 1 || chapterNumber > bookInfo.chapters) {
      throw new Error(`Chapter ${chapterNumber} is out of range for ${bookInfo.name}`);
    }

    const bollsVerses = await this.getChapterVerses(bookInfo.number, chapterNumber);
    return bollsVerses.map(verse => 
      this.convertToInternalFormat(verse, bookId, chapterNumber)
    );
  }

  /**
   * Fetch multiple chapters for a book
   */
  async fetchBook(bookId: string, startChapter = 1, endChapter?: number): Promise<BibleVerse[]> {
    const bookInfo = this.getBookInfo(bookId);
    if (!bookInfo) {
      throw new Error(`Book ${bookId} not found`);
    }

    const maxChapter = endChapter || bookInfo.chapters;
    const allVerses: BibleVerse[] = [];

    for (let chapter = startChapter; chapter <= maxChapter; chapter++) {
      try {
        console.log(`Fetching ${bookInfo.name} chapter ${chapter}...`);
        const chapterVerses = await this.fetchChapter(bookId, chapter);
        allVerses.push(...chapterVerses);
        
        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to fetch chapter ${chapter} of ${bookInfo.name}:`, error);
      }
    }

    return allVerses;
  }

  /**
   * Get list of all available books
   */
  getAllBooks() {
    return BIBLE_BOOKS;
  }

  /**
   * Get books by testament
   */
  getBooksByTestament(testament: 'OT' | 'NT') {
    return BIBLE_BOOKS.filter(book => book.testament === testament);
  }
}