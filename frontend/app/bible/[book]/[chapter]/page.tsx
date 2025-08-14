import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { VerseReader } from '@/components/bible/VerseReader';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

interface PageProps {
  params: Promise<{ book: string; chapter: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { book, chapter } = await params;
  const bookName = book.charAt(0).toUpperCase() + book.slice(1);
  
  return {
    title: `${bookName} ${chapter} - Deeper Bible`,
    description: `Read ${bookName} chapter ${chapter} with deeper insights and AI-powered analysis.`,
  };
}

export default async function ChapterPage({ params }: PageProps) {
  const { book, chapter } = await params;
  const chapterNumber = parseInt(chapter);
  const bookName = book.charAt(0).toUpperCase() + book.slice(1);
  
  return (
    <div className="py-8">
      <Container maxWidth="lg">
        <Breadcrumbs 
          items={[
            { label: 'Home', href: '/' },
            { label: 'Books', href: '/bible' },
            { label: bookName, href: `/bible/${book}` },
            { label: `Chapter ${chapter}` }
          ]}
        />
        
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {bookName} Chapter {chapter}
          </h1>
          <p className="text-gray-600">
            Select verses to explore their deeper meaning
          </p>
        </div>
        
        <VerseReader bookId={book} chapterNumber={chapterNumber} />
      </Container>
    </div>
  );
}