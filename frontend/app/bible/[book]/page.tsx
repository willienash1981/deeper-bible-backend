import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ChapterGrid } from '@/components/bible/ChapterGrid';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

interface PageProps {
  params: Promise<{ book: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { book } = await params;
  const bookName = book.charAt(0).toUpperCase() + book.slice(1);
  
  return {
    title: `${bookName} Chapters - Deeper Bible`,
    description: `Browse all chapters of ${bookName} and dive deeper into scripture.`,
  };
}

export default async function BookPage({ params }: PageProps) {
  const { book } = await params;
  
  return (
    <div className="py-8">
      <Container>
        <Breadcrumbs 
          items={[
            { label: 'Home', href: '/' },
            { label: 'Books', href: '/bible' },
            { label: book.charAt(0).toUpperCase() + book.slice(1) }
          ]}
        />
        
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {book.charAt(0).toUpperCase() + book.slice(1)}
          </h1>
          <p className="text-lg text-gray-600">
            Select a chapter to begin your deeper study
          </p>
        </div>
        
        <ChapterGrid bookId={book} />
      </Container>
    </div>
  );
}