'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { bibleAPI } from '@/lib/api/bible-service';
import { ChapterGridSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

interface ChapterGridProps {
  bookId: string;
}

export function ChapterGrid({ bookId }: ChapterGridProps) {
  const [chapters, setChapters] = useState<number>(0);
  const [bookName, setBookName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bibleAPI.getChapters(bookId);
      setChapters(response.chapters);
      setBookName(response.bookName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  if (loading) {
    return <ChapterGridSkeleton />;
  }

  if (error) {
    return (
      <ErrorState 
        message={error}
        onRetry={fetchChapters}
      />
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <p className="text-gray-600">
          {chapters} {chapters === 1 ? 'chapter' : 'chapters'} in {bookName}
        </p>
      </div>
      
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
        {Array.from({ length: chapters }, (_, index) => {
          const chapterNumber = index + 1;
          return (
            <Link
              key={chapterNumber}
              href={`/bible/${bookId}/${chapterNumber}`}
              className="aspect-square flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg text-gray-800 font-semibold hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              {chapterNumber}
            </Link>
          );
        })}
      </div>
    </div>
  );
}