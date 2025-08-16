'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ReportService } from '@/lib/api/reportService';
import { bibleAPI } from '@/lib/api/bible-service';
import { ErrorState } from '@/components/ui/ErrorState';
import { BiblicalAnalysisRenderer } from '@/components/analysis/BiblicalAnalysisRenderer';
import { BiblicalAnalysis } from '@/lib/types/xml-types';

interface ReportDisplayProps {
  bookId: string;
  chapterNumber: number;
  verses: string;
}

export function ReportDisplay({ bookId, chapterNumber, verses }: ReportDisplayProps) {
  const [content, setContent] = useState<string>('');
  const [analysis, setAnalysis] = useState<BiblicalAnalysis | null>(null);
  const [verseText, setVerseText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('processing');

  const bookName = bookId.charAt(0).toUpperCase() + bookId.slice(1);
  const verseReference = ReportService.formatVerseReference(bookName, chapterNumber, verses);

  // Function to validate analysis data structure
  const validateAnalysisData = (analysis: any): BiblicalAnalysis | null => {
    try {
      console.log('🔍 Validating analysis data:', analysis);
      console.log('🔍 Analysis keys:', Object.keys(analysis || {}));
      console.log('🔍 Has summary?', !!analysis?.summary);
      console.log('🔍 Summary keys:', Object.keys(analysis?.summary || {}));
      
      // Check for new JSON structure first
      if (analysis && analysis.summary && analysis.summary.what_is_this_passage_primarily_about) {
        console.log('✅ Valid new JSON structure detected');
        return analysis as BiblicalAnalysis;
      }
      // Fallback to old XML structure for backward compatibility
      if (analysis && analysis.passage_overview && analysis.passage_overview.main_theme) {
        console.log('✅ Valid old XML structure detected');
        return analysis as BiblicalAnalysis;
      }
      console.log('❌ No valid structure found');
      return null;
    } catch (error) {
      console.error('Failed to validate analysis data:', error);
      return null;
    }
  };

  // Function to fetch verse text
  const fetchVerseText = useCallback(async () => {
    try {
      const chapterContent = await bibleAPI.getChapterContent(bookId, chapterNumber);
      
      // Parse verses range (e.g., "16-19" or "28")
      const verseNumbers = verses.includes('-') 
        ? (() => {
            const [start, end] = verses.split('-').map(Number);
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
          })()
        : [parseInt(verses)];
      
      // Get the text for the specified verses
      const selectedVerses = chapterContent.verses.filter(v => 
        verseNumbers.includes(v.number)
      );
      
      // Format the verse text
      const verseTextFormatted = selectedVerses
        .map(v => `${v.number}. ${v.text}`)
        .join(' ');
      
      setVerseText(verseTextFormatted);
    } catch (err) {
      console.error('Failed to fetch verse text:', err);
      // Don't fail the whole component if verse text fails
      setVerseText('');
    }
  }, [bookId, chapterNumber, verses]);

  const generateReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStatus('processing');

      // Fetch both the report and verse text in parallel
      const [report] = await Promise.all([
        ReportService.generateAndWaitForReport(
          bookId,
          chapterNumber,
          verses,
          (newStatus) => setStatus(newStatus)
        ),
        fetchVerseText()
      ]);

      const reportContent = report.content || '';
      setContent(reportContent);
      
      // Use analysis data directly from the API response
      const validatedAnalysis = validateAnalysisData(report.analysis);
      setAnalysis(validatedAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [bookId, chapterNumber, verses, fetchVerseText]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Generating Your Report
          </h2>
          <p className="text-blue-700 mb-4">
            Analyzing {verseReference}...
          </p>
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-600 capitalize">{status}</span>
          </div>
        </div>

        {/* Loading Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={generateReport} />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Deeper Study Report
            </h2>
            <p className="text-blue-700 font-medium">
              {verseReference}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Generated on {new Date().toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              title="Copy to clipboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {analysis ? (
        // Render beautiful structured analysis
        <BiblicalAnalysisRenderer 
          analysis={analysis} 
          verseReference={verseReference}
          verseText={verseText}
        />
      ) : (
        // Fallback to markdown content
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="prose prose-lg max-w-none">
            <div 
              className="leading-relaxed"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {content}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-center">
        <Link
          href={`/bible/${bookId}/${chapterNumber}`}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Chapter
        </Link>
      </div>
    </div>
  );
}