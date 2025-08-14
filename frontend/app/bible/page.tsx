import { Metadata } from 'next';
import { BookGrid } from '@/components/bible/BookGrid';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  title: 'Browse Books - Deeper Bible',
  description: 'Browse all 66 books of the Bible and start your deeper study journey.',
};

export default function BiblePage() {
  return (
    <div className="py-8">
      <Container>
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose a Book
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select any book from the Bible to begin exploring its chapters and verses with deeper insights.
          </p>
        </div>
        
        <BookGrid />
      </Container>
    </div>
  );
}