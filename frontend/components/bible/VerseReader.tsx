'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { bibleAPI, Verse } from '@/lib/api/bible-service';
import { VerseSelection } from './VerseSelection';
import { FontSizeControl } from './FontSizeControl';
import { VerseSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { FontSize } from '@/types';

interface VerseReaderProps {
  bookId: string;
  chapterNumber: number;
}

export function VerseReader({ bookId, chapterNumber }: VerseReaderProps) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [fontSize, setFontSize] = useState<FontSize>('md');

  const fetchVerses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bibleAPI.getChapterContent(bookId, chapterNumber);
      setVerses(response.verses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verses');
    } finally {
      setLoading(false);
    }
  }, [bookId, chapterNumber]);

  useEffect(() => {
    fetchVerses();
  }, [fetchVerses]);

  const formatVerseSelection = (verses: number[]): string => {
    if (verses.length === 0) return '';
    if (verses.length === 1) return verses[0].toString();
    
    // Group consecutive verses into ranges
    const ranges: string[] = [];
    let start = verses[0];
    let end = verses[0];
    
    for (let i = 1; i < verses.length; i++) {
      if (verses[i] === end + 1) {
        end = verses[i];
      } else {
        ranges.push(start === end ? start.toString() : `${start}-${end}`);
        start = end = verses[i];
      }
    }
    ranges.push(start === end ? start.toString() : `${start}-${end}`);
    
    return ranges.join(',');
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <div className="w-32 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-24 h-8 bg-gray-200 rounded animate-pulse" />
        </div>
        <VerseSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchVerses} />;
  }

  const verseSelectionText = formatVerseSelection(selectedVerses);

  return (
    <div>
      {/* Controls */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          {/* Chapter Navigation */}
          <div className="flex items-center space-x-2">
            {chapterNumber > 1 && (
              <Link
                href={`/bible/${bookId}/${chapterNumber - 1}`}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </Link>
            )}
            <Link
              href={`/bible/${bookId}/${chapterNumber + 1}`}
              className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              Next
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Font Size Control */}
        <FontSizeControl onFontSizeChange={setFontSize} />
      </div>

      {/* Verses */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <VerseSelection
          verses={verses}
          fontSize={fontSize}
          onSelectionChange={setSelectedVerses}
        />
      </div>

      {/* Go Deeper Button */}
      {selectedVerses.length > 0 && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <Link
            href={`/deeper/${bookId}/${chapterNumber}/${verseSelectionText}`}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
          >
            Go Deeper
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}