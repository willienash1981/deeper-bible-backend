import { BibleReferenceUtil } from '../utils/bible-reference.util';
import { Testament } from '@prisma/client';

describe('BibleReferenceUtil', () => {
  describe('parseReference', () => {
    test('should parse book and chapter only', () => {
      const result = BibleReferenceUtil.parseReference('John 3');
      
      expect(result).toEqual({
        book: 'John',
        chapter: 3,
      });
    });

    test('should parse book, chapter, and verse', () => {
      const result = BibleReferenceUtil.parseReference('John 3:16');
      
      expect(result).toEqual({
        book: 'John',
        chapter: 3,
        verseStart: 16,
        verseEnd: 16,
      });
    });

    test('should parse verse range', () => {
      const result = BibleReferenceUtil.parseReference('John 3:16-17');
      
      expect(result).toEqual({
        book: 'John',
        chapter: 3,
        verseStart: 16,
        verseEnd: 17,
      });
    });

    test('should parse numbered books', () => {
      const result = BibleReferenceUtil.parseReference('1 Corinthians 13:4');
      
      expect(result).toEqual({
        book: '1 Corinthians',
        chapter: 13,
        verseStart: 4,
        verseEnd: 4,
      });
    });

    test('should parse abbreviated book names', () => {
      const result = BibleReferenceUtil.parseReference('Gen 1:1');
      
      expect(result).toEqual({
        book: 'Genesis',
        chapter: 1,
        verseStart: 1,
        verseEnd: 1,
      });
    });

    test('should handle extra spaces', () => {
      const result = BibleReferenceUtil.parseReference('  John   3 : 16  ');
      
      expect(result).toEqual({
        book: 'John',
        chapter: 3,
        verseStart: 16,
        verseEnd: 16,
      });
    });

    test('should return null for invalid references', () => {
      expect(BibleReferenceUtil.parseReference('')).toBeNull();
      expect(BibleReferenceUtil.parseReference('Invalid')).toBeNull();
      expect(BibleReferenceUtil.parseReference('John')).toBeNull();
    });
  });

  describe('normalizeBookName', () => {
    test('should normalize full book names', () => {
      expect(BibleReferenceUtil.normalizeBookName('genesis')).toBe('Genesis');
      expect(BibleReferenceUtil.normalizeBookName('MATTHEW')).toBe('Matthew');
      expect(BibleReferenceUtil.normalizeBookName('song of solomon')).toBe('Song of Solomon');
    });

    test('should normalize abbreviated names', () => {
      expect(BibleReferenceUtil.normalizeBookName('gen')).toBe('Genesis');
      expect(BibleReferenceUtil.normalizeBookName('matt')).toBe('Matthew');
      expect(BibleReferenceUtil.normalizeBookName('1cor')).toBe('1 Corinthians');
    });

    test('should handle common variations', () => {
      expect(BibleReferenceUtil.normalizeBookName('psalm')).toBe('Psalms');
      expect(BibleReferenceUtil.normalizeBookName('revelations')).toBe('Revelation');
      expect(BibleReferenceUtil.normalizeBookName('song of songs')).toBe('Song of Solomon');
    });

    test('should handle numbered books', () => {
      expect(BibleReferenceUtil.normalizeBookName('1 Samuel')).toBe('1 Samuel');
      expect(BibleReferenceUtil.normalizeBookName('2kings')).toBe('2 Kings');
      expect(BibleReferenceUtil.normalizeBookName('3 John')).toBe('3 John');
    });

    test('should return null for invalid names', () => {
      expect(BibleReferenceUtil.normalizeBookName('InvalidBook')).toBeNull();
      expect(BibleReferenceUtil.normalizeBookName('')).toBeNull();
      expect(BibleReferenceUtil.normalizeBookName('123')).toBeNull();
    });
  });

  describe('formatReference', () => {
    test('should format book and chapter only', () => {
      const result = BibleReferenceUtil.formatReference('John', 3);
      expect(result).toBe('John 3');
    });

    test('should format with single verse', () => {
      const result = BibleReferenceUtil.formatReference('John', 3, 16);
      expect(result).toBe('John 3:16');
    });

    test('should format verse range', () => {
      const result = BibleReferenceUtil.formatReference('John', 3, 16, 17);
      expect(result).toBe('John 3:16-17');
    });

    test('should handle same start and end verse', () => {
      const result = BibleReferenceUtil.formatReference('John', 3, 16, 16);
      expect(result).toBe('John 3:16');
    });
  });

  describe('isValidBook', () => {
    test('should validate correct book names', () => {
      expect(BibleReferenceUtil.isValidBook('Genesis')).toBe(true);
      expect(BibleReferenceUtil.isValidBook('john')).toBe(true);
      expect(BibleReferenceUtil.isValidBook('1 Corinthians')).toBe(true);
      expect(BibleReferenceUtil.isValidBook('rev')).toBe(true);
    });

    test('should reject invalid book names', () => {
      expect(BibleReferenceUtil.isValidBook('InvalidBook')).toBe(false);
      expect(BibleReferenceUtil.isValidBook('')).toBe(false);
      expect(BibleReferenceUtil.isValidBook('4 John')).toBe(false);
    });
  });

  describe('getAdjacentChapter', () => {
    const mockBooks = [
      { id: '1', name: 'Genesis', bookOrder: 1, chapterCount: 50, testament: Testament.OLD } as any,
      { id: '2', name: 'Exodus', bookOrder: 2, chapterCount: 40, testament: Testament.OLD } as any,
      { id: '3', name: 'Leviticus', bookOrder: 3, chapterCount: 27, testament: Testament.OLD } as any,
    ];

    test('should get next chapter in same book', () => {
      const result = BibleReferenceUtil.getAdjacentChapter(
        mockBooks[0],
        25,
        'next',
        mockBooks
      );
      
      expect(result).toEqual({
        book: mockBooks[0],
        chapter: 26,
      });
    });

    test('should get next book when at last chapter', () => {
      const result = BibleReferenceUtil.getAdjacentChapter(
        mockBooks[0],
        50,
        'next',
        mockBooks
      );
      
      expect(result).toEqual({
        book: mockBooks[1],
        chapter: 1,
      });
    });

    test('should get previous chapter in same book', () => {
      const result = BibleReferenceUtil.getAdjacentChapter(
        mockBooks[1],
        25,
        'prev',
        mockBooks
      );
      
      expect(result).toEqual({
        book: mockBooks[1],
        chapter: 24,
      });
    });

    test('should get previous book when at first chapter', () => {
      const result = BibleReferenceUtil.getAdjacentChapter(
        mockBooks[1],
        1,
        'prev',
        mockBooks
      );
      
      expect(result).toEqual({
        book: mockBooks[0],
        chapter: 50,
      });
    });

    test('should return null at boundaries', () => {
      const resultNext = BibleReferenceUtil.getAdjacentChapter(
        mockBooks[2],
        27,
        'next',
        mockBooks
      );
      
      const resultPrev = BibleReferenceUtil.getAdjacentChapter(
        mockBooks[0],
        1,
        'prev',
        mockBooks
      );
      
      expect(resultNext).toBeNull();
      expect(resultPrev).toBeNull();
    });
  });

  describe('calculateVerseCount', () => {
    test('should calculate single verse', () => {
      expect(BibleReferenceUtil.calculateVerseCount(16, 16)).toBe(1);
    });

    test('should calculate verse range', () => {
      expect(BibleReferenceUtil.calculateVerseCount(1, 5)).toBe(5);
      expect(BibleReferenceUtil.calculateVerseCount(10, 15)).toBe(6);
    });

    test('should handle invalid ranges', () => {
      expect(BibleReferenceUtil.calculateVerseCount(15, 10)).toBe(0);
    });
  });

  describe('validateReference', () => {
    const mockBook = {
      id: '1',
      name: 'John',
      chapterCount: 21,
      testament: Testament.NEW,
    } as any;

    test('should validate correct chapter', () => {
      const result = BibleReferenceUtil.validateReference(mockBook, 3);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid chapter', () => {
      const result = BibleReferenceUtil.validateReference(mockBook, 25);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Chapter 25 does not exist');
    });

    test('should validate correct verse range', () => {
      const result = BibleReferenceUtil.validateReference(mockBook, 3, 1, 5);
      expect(result.valid).toBe(true);
    });

    test('should reject invalid verse numbers', () => {
      const result = BibleReferenceUtil.validateReference(mockBook, 3, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Verse number must be greater than 0');
    });

    test('should reject invalid verse range', () => {
      const result = BibleReferenceUtil.validateReference(mockBook, 3, 10, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('End verse (5) cannot be before start verse (10)');
    });
  });
});