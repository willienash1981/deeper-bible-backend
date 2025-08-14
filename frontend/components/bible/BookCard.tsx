import Link from 'next/link';
import { BibleBook } from '@/types';
import { cn } from '@/lib/utils/cn';

interface BookCardProps {
  book: BibleBook;
}

export function BookCard({ book }: BookCardProps) {
  const isOldTestament = book.testament === 'old';
  
  return (
    <Link 
      href={`/bible/${book.id}`}
      className={cn(
        "block p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
        isOldTestament 
          ? "bg-blue-50 border-blue-200 hover:border-blue-300 hover:bg-blue-100" 
          : "bg-green-50 border-green-200 hover:border-green-300 hover:bg-green-100"
      )}
    >
      <div className="text-center">
        <h3 className={cn(
          "font-semibold text-sm md:text-base",
          isOldTestament ? "text-blue-900" : "text-green-900"
        )}>
          {book.name}
        </h3>
        <p className={cn(
          "text-xs mt-1 uppercase tracking-wide",
          isOldTestament ? "text-blue-600" : "text-green-600"
        )}>
          {book.testament === 'old' ? 'Old Testament' : 'New Testament'}
        </p>
      </div>
    </Link>
  );
}