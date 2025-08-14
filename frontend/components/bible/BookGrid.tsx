'use client';

import { useEffect, useState } from 'react';
import { bibleAPI, BibleBook } from '@/lib/api/bible-service';
import { BookCard } from './BookCard';
import { BookGridSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export function BookGrid() {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bibleAPI.getBooks();
      setBooks(response.books);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  if (loading) {
    return <BookGridSkeleton />;
  }

  if (error) {
    return (
      <ErrorState 
        message={error}
        onRetry={fetchBooks}
      />
    );
  }

  const oldTestamentBooks = books.filter(book => book.testament === 'old');
  const newTestamentBooks = books.filter(book => book.testament === 'new');

  return (
    <div className="space-y-12">
      {/* Old Testament */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
          Old Testament
          <span className="ml-2 text-sm text-gray-500">({oldTestamentBooks.length} books)</span>
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {oldTestamentBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      {/* New Testament */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
          New Testament
          <span className="ml-2 text-sm text-gray-500">({newTestamentBooks.length} books)</span>
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {newTestamentBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>
    </div>
  );
}