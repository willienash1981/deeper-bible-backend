// Re-export API types for easier imports
export type {
  BibleBook,
  BooksResponse,
  ChapterResponse,
  Verse,
  ChapterContentResponse,
  ReportResponse,
} from '@/lib/api/bible-service';

// UI Component Types
export interface SelectionRange {
  start: number;
  end: number;
}

export interface VerseSelection {
  verses: number[];
  ranges: SelectionRange[];
  displayText: string;
}

// Navigation Types
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Component Props
export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

// State Management Types
export interface AppState {
  selectedVerses: VerseSelection | null;
  fontSize: 'sm' | 'md' | 'lg';
  isBottomSheetOpen: boolean;
}

export type FontSize = 'sm' | 'md' | 'lg';