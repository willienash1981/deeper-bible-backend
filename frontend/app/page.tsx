import { HeroSection } from '@/components/layout/HeroSection';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deeper Bible - Explore Scripture with AI Insights',
  description: 'Discover the deeper meaning of Bible verses with AI-powered insights and context from the NIV translation.',
};

export default function Home() {
  return (
    <div>
      <HeroSection />
    </div>
  );
}
