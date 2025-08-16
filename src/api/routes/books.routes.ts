import { Router, Request, Response } from 'express';
import { BollsBibleService } from '../services/bolls-bible.service';
import { getChapterVerses as getSampleChapterVerses, getVerse as getSampleVerse, getVerseRange as getSampleVerseRange } from '../data/sample-verses';

// Import from complete NIV data if available, fallback to sample data
let getChapterVerses: any;
let getVerse: any; 
let getVerseRange: any;

// For now, use the sample data and supplement with Bolls API
getChapterVerses = getSampleChapterVerses;
getVerse = getSampleVerse;
getVerseRange = getSampleVerseRange;
console.log('📖 Using sample Bible data + Bolls API for missing content');

// Initialize Bolls service for dynamic fetching
const bollsService = new BollsBibleService();

const router = Router();

// Bible books data
const bibleBooks = [
  // Old Testament
  { id: 'genesis', name: 'Genesis', chapters: 50, testament: 'old' },
  { id: 'exodus', name: 'Exodus', chapters: 40, testament: 'old' },
  { id: 'leviticus', name: 'Leviticus', chapters: 27, testament: 'old' },
  { id: 'numbers', name: 'Numbers', chapters: 36, testament: 'old' },
  { id: 'deuteronomy', name: 'Deuteronomy', chapters: 34, testament: 'old' },
  { id: 'joshua', name: 'Joshua', chapters: 24, testament: 'old' },
  { id: 'judges', name: 'Judges', chapters: 21, testament: 'old' },
  { id: 'ruth', name: 'Ruth', chapters: 4, testament: 'old' },
  { id: '1-samuel', name: '1 Samuel', chapters: 31, testament: 'old' },
  { id: '2-samuel', name: '2 Samuel', chapters: 24, testament: 'old' },
  { id: '1-kings', name: '1 Kings', chapters: 22, testament: 'old' },
  { id: '2-kings', name: '2 Kings', chapters: 25, testament: 'old' },
  { id: '1-chronicles', name: '1 Chronicles', chapters: 29, testament: 'old' },
  { id: '2-chronicles', name: '2 Chronicles', chapters: 36, testament: 'old' },
  { id: 'ezra', name: 'Ezra', chapters: 10, testament: 'old' },
  { id: 'nehemiah', name: 'Nehemiah', chapters: 13, testament: 'old' },
  { id: 'esther', name: 'Esther', chapters: 10, testament: 'old' },
  { id: 'job', name: 'Job', chapters: 42, testament: 'old' },
  { id: 'psalms', name: 'Psalms', chapters: 150, testament: 'old' },
  { id: 'proverbs', name: 'Proverbs', chapters: 31, testament: 'old' },
  { id: 'ecclesiastes', name: 'Ecclesiastes', chapters: 12, testament: 'old' },
  { id: 'song-of-songs', name: 'Song of Songs', chapters: 8, testament: 'old' },
  { id: 'isaiah', name: 'Isaiah', chapters: 66, testament: 'old' },
  { id: 'jeremiah', name: 'Jeremiah', chapters: 52, testament: 'old' },
  { id: 'lamentations', name: 'Lamentations', chapters: 5, testament: 'old' },
  { id: 'ezekiel', name: 'Ezekiel', chapters: 48, testament: 'old' },
  { id: 'daniel', name: 'Daniel', chapters: 12, testament: 'old' },
  { id: 'hosea', name: 'Hosea', chapters: 14, testament: 'old' },
  { id: 'joel', name: 'Joel', chapters: 3, testament: 'old' },
  { id: 'amos', name: 'Amos', chapters: 9, testament: 'old' },
  { id: 'obadiah', name: 'Obadiah', chapters: 1, testament: 'old' },
  { id: 'jonah', name: 'Jonah', chapters: 4, testament: 'old' },
  { id: 'micah', name: 'Micah', chapters: 7, testament: 'old' },
  { id: 'nahum', name: 'Nahum', chapters: 3, testament: 'old' },
  { id: 'habakkuk', name: 'Habakkuk', chapters: 3, testament: 'old' },
  { id: 'zephaniah', name: 'Zephaniah', chapters: 3, testament: 'old' },
  { id: 'haggai', name: 'Haggai', chapters: 2, testament: 'old' },
  { id: 'zechariah', name: 'Zechariah', chapters: 14, testament: 'old' },
  { id: 'malachi', name: 'Malachi', chapters: 4, testament: 'old' },

  // New Testament
  { id: 'matthew', name: 'Matthew', chapters: 28, testament: 'new' },
  { id: 'mark', name: 'Mark', chapters: 16, testament: 'new' },
  { id: 'luke', name: 'Luke', chapters: 24, testament: 'new' },
  { id: 'john', name: 'John', chapters: 21, testament: 'new' },
  { id: 'acts', name: 'Acts', chapters: 28, testament: 'new' },
  { id: 'romans', name: 'Romans', chapters: 16, testament: 'new' },
  { id: '1-corinthians', name: '1 Corinthians', chapters: 16, testament: 'new' },
  { id: '2-corinthians', name: '2 Corinthians', chapters: 13, testament: 'new' },
  { id: 'galatians', name: 'Galatians', chapters: 6, testament: 'new' },
  { id: 'ephesians', name: 'Ephesians', chapters: 6, testament: 'new' },
  { id: 'philippians', name: 'Philippians', chapters: 4, testament: 'new' },
  { id: 'colossians', name: 'Colossians', chapters: 4, testament: 'new' },
  { id: '1-thessalonians', name: '1 Thessalonians', chapters: 5, testament: 'new' },
  { id: '2-thessalonians', name: '2 Thessalonians', chapters: 3, testament: 'new' },
  { id: '1-timothy', name: '1 Timothy', chapters: 6, testament: 'new' },
  { id: '2-timothy', name: '2 Timothy', chapters: 4, testament: 'new' },
  { id: 'titus', name: 'Titus', chapters: 3, testament: 'new' },
  { id: 'philemon', name: 'Philemon', chapters: 1, testament: 'new' },
  { id: 'hebrews', name: 'Hebrews', chapters: 13, testament: 'new' },
  { id: 'james', name: 'James', chapters: 5, testament: 'new' },
  { id: '1-peter', name: '1 Peter', chapters: 5, testament: 'new' },
  { id: '2-peter', name: '2 Peter', chapters: 3, testament: 'new' },
  { id: '1-john', name: '1 John', chapters: 5, testament: 'new' },
  { id: '2-john', name: '2 John', chapters: 1, testament: 'new' },
  { id: '3-john', name: '3 John', chapters: 1, testament: 'new' },
  { id: 'jude', name: 'Jude', chapters: 1, testament: 'new' },
  { id: 'revelation', name: 'Revelation', chapters: 22, testament: 'new' },
];

// GET /api/books - Get all Bible books
router.get('/', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: bibleBooks,
      total: bibleBooks.length
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Bible books'
    });
  }
});

// GET /api/books/:bookId - Get specific book details
router.get('/:bookId', (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const book = bibleBooks.find(b => b.id === bookId);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }
    
    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch book details'
    });
  }
});

// GET /api/books/:bookId/chapters - Get chapters for a specific book
router.get('/:bookId/chapters', (req: Request, res: Response) => {
  try {
    const { bookId } = req.params;
    const book = bibleBooks.find(b => b.id === bookId);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }
    
    // Generate array of chapter numbers
    const chapters = Array.from({ length: book.chapters }, (_, i) => ({
      number: i + 1,
      verses: 31 // Default verse count for demo purposes
    }));
    
    res.json({
      success: true,
      data: {
        bookId: book.id,
        bookName: book.name,
        chapters: chapters,
        totalChapters: book.chapters
      }
    });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chapters'
    });
  }
});

// GET /api/books/:bookId/chapters/:chapterNumber/verses - Get verses for a specific chapter
router.get('/:bookId/chapters/:chapterNumber/verses', async (req: Request, res: Response) => {
  try {
    const { bookId, chapterNumber } = req.params;
    const book = bibleBooks.find(b => b.id === bookId);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }
    
    const chapter = parseInt(chapterNumber);
    if (isNaN(chapter) || chapter < 1 || chapter > book.chapters) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chapter number'
      });
    }
    
    // Get verses from available data source
    let verses: any[] = [];
    
    try {
      // First try to get from sample data
      verses = getChapterVerses(bookId, chapter);
      console.log(`📖 Got ${verses.length} verses from sample data for ${bookId} ${chapter}`);
      
      // If no sample data available, try Bolls API
      if (verses.length === 0) {
        console.log(`📖 No sample data for ${bookId} ${chapter}, fetching from Bolls API...`);
        try {
          verses = await bollsService.fetchChapter(bookId, chapter);
          console.log(`📖 Got ${verses.length} verses from Bolls API for ${bookId} ${chapter}`);
        } catch (bollsError) {
          console.error('📖 Bolls API failed:', bollsError);
          verses = [];
        }
      }
    } catch (error) {
      console.log('📖 Error with sample data, trying Bolls API...');
      try {
        verses = await bollsService.fetchChapter(bookId, chapter);
        console.log(`📖 Got ${verses.length} verses from Bolls API for ${bookId} ${chapter}`);
      } catch (bollsError) {
        console.error('📖 Both sample data and Bolls API failed:', bollsError);
        verses = [];
      }
    }
    
    // If no sample verses available, generate placeholder verses
    if (verses.length === 0) {
      const placeholderVerses = Array.from({ length: 20 }, (_, i) => ({
        book: bookId,
        chapter: chapter,
        verse: i + 1,
        text: `This is verse ${i + 1} of ${book.name} chapter ${chapter}. (Sample text - replace with actual Bible text)`,
        translation: 'NIV'
      }));
      
      res.json({
        success: true,
        data: {
          bookId: book.id,
          bookName: book.name,
          chapter: chapter,
          verses: placeholderVerses,
          totalVerses: placeholderVerses.length
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          bookId: book.id,
          bookName: book.name,
          chapter: chapter,
          verses: verses,
          totalVerses: verses.length
        }
      });
    }
  } catch (error) {
    console.error('Error fetching verses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verses'
    });
  }
});

// GET /api/books/:bookId/chapters/:chapterNumber/verses/:verseRange - Get specific verse or range
router.get('/:bookId/chapters/:chapterNumber/verses/:verseRange', (req: Request, res: Response) => {
  try {
    const { bookId, chapterNumber, verseRange } = req.params;
    const book = bibleBooks.find(b => b.id === bookId);
    
    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Book not found'
      });
    }
    
    const chapter = parseInt(chapterNumber);
    if (isNaN(chapter) || chapter < 1 || chapter > book.chapters) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chapter number'
      });
    }
    
    // Parse verse range (e.g., "1", "1-5", "1,3,5")
    let verses: any[] = [];
    
    if (verseRange.includes('-')) {
      // Range format: "1-5"
      const [start, end] = verseRange.split('-').map(v => parseInt(v));
      verses = getVerseRange(bookId, chapter, start, end);
    } else if (verseRange.includes(',')) {
      // List format: "1,3,5"
      const verseNumbers = verseRange.split(',').map(v => parseInt(v));
      verses = verseNumbers.map(v => getVerse(bookId, chapter, v)).filter(Boolean);
    } else {
      // Single verse
      const verseNum = parseInt(verseRange);
      const verse = getVerse(bookId, chapter, verseNum);
      if (verse) verses = [verse];
    }
    
    res.json({
      success: true,
      data: {
        bookId: book.id,
        bookName: book.name,
        chapter: chapter,
        requestedVerses: verseRange,
        verses: verses,
        totalVerses: verses.length
      }
    });
  } catch (error) {
    console.error('Error fetching verse range:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch verse range'
    });
  }
});

export default router;