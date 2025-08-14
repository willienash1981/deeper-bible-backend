import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { ReportDisplay } from '@/components/report/ReportDisplay';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

interface PageProps {
  params: Promise<{ book: string; chapter: string; verses: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { book, chapter, verses } = await params;
  const bookName = book.charAt(0).toUpperCase() + book.slice(1);
  
  return {
    title: `${bookName} ${chapter}:${verses} - Deeper Study`,
    description: `Deep insights and analysis of ${bookName} ${chapter}:${verses}`,
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { book, chapter, verses } = await params;
  const bookName = book.charAt(0).toUpperCase() + book.slice(1);
  
  return (
    <div className="py-8">
      <Container maxWidth="lg">
        <Breadcrumbs 
          items={[
            { label: 'Home', href: '/' },
            { label: 'Books', href: '/bible' },
            { label: bookName, href: `/bible/${book}` },
            { label: `Chapter ${chapter}`, href: `/bible/${book}/${chapter}` },
            { label: `Verses ${verses}` }
          ]}
        />
        
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Deeper Study: {bookName} {chapter}:{verses}
          </h1>
          <p className="text-gray-600">
            AI-powered insights and analysis
          </p>
        </div>
        
        <ReportDisplay 
          bookId={book} 
          chapterNumber={parseInt(chapter)} 
          verses={verses} 
        />
      </Container>
    </div>
  );
}