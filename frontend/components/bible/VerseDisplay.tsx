'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

interface VerseDisplayProps {
  verses: Verse[];
  bookName: string;
  chapter: number;
  onGoDeeper?: (selectedVerses: Verse[]) => void;
}

export function VerseDisplay({ verses, bookName, chapter, onGoDeeper }: VerseDisplayProps) {
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle verse selection
  const handleVerseClick = (verseNum: number, event: React.MouseEvent) => {
    const newSelected = new Set(selectedVerses);
    
    if (event.shiftKey && selectedVerses.size > 0) {
      // Range selection with shift key
      const min = Math.min(...selectedVerses, verseNum);
      const max = Math.max(...selectedVerses, verseNum);
      for (let i = min; i <= max; i++) {
        newSelected.add(i);
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Multi-select with ctrl/cmd
      if (newSelected.has(verseNum)) {
        newSelected.delete(verseNum);
      } else {
        newSelected.add(verseNum);
      }
    } else {
      // Single select
      newSelected.clear();
      newSelected.add(verseNum);
    }
    
    setSelectedVerses(newSelected);
    
    // Show popup if verses are selected
    if (newSelected.size > 0) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10
      });
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  };

  // Handle text selection (mouse drag)
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') {
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedElements = containerRef.current?.querySelectorAll('.verse-text');
    const newSelected = new Set<number>();

    selectedElements?.forEach((element) => {
      if (selection.containsNode(element, true)) {
        const verseNum = parseInt(element.getAttribute('data-verse') || '0');
        if (verseNum) newSelected.add(verseNum);
      }
    });

    if (newSelected.size > 0) {
      setSelectedVerses(newSelected);
      const rect = range.getBoundingClientRect();
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10
      });
      setShowPopup(true);
    }
  };

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedVerses(new Set());
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGoDeeper = () => {
    const selected = verses.filter(v => selectedVerses.has(v.verse));
    if (onGoDeeper && selected.length > 0) {
      onGoDeeper(selected);
    }
  };

  // Format verse reference
  const getVerseReference = () => {
    if (selectedVerses.size === 0) return '';
    
    const verseNums = Array.from(selectedVerses).sort((a, b) => a - b);
    
    // Check if it's a continuous range
    let ranges: string[] = [];
    let start = verseNums[0];
    let end = verseNums[0];
    
    for (let i = 1; i < verseNums.length; i++) {
      if (verseNums[i] === end + 1) {
        end = verseNums[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = verseNums[i];
        end = verseNums[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    
    return `${bookName} ${chapter}:${ranges.join(',')} NIV`;
  };

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="space-y-1 select-text"
        onMouseUp={handleTextSelection}
      >
        {/* Chapter heading */}
        <h2 className="text-3xl font-bold text-center mb-8">
          {bookName.toUpperCase()} {chapter}
        </h2>

        {/* Section title if exists (e.g., "The Word Became Flesh") */}
        {verses[0]?.verse === 1 && (
          <h3 className="text-xl font-semibold text-center mb-6">
            The Word Became Flesh
          </h3>
        )}

        {/* Verses */}
        <div className="max-w-3xl mx-auto space-y-2">
          {verses.map((verse) => (
            <div
              key={verse.verse}
              className={`verse-container flex gap-2 p-2 rounded-lg transition-colors cursor-pointer
                ${selectedVerses.has(verse.verse) 
                  ? 'bg-blue-100 hover:bg-blue-200' 
                  : 'hover:bg-gray-50'
                }`}
              onClick={(e) => handleVerseClick(verse.verse, e)}
            >
              <sup className="text-xs text-gray-500 mt-1 select-none">
                {verse.verse}
              </sup>
              <span
                className="verse-text text-lg leading-relaxed"
                data-verse={verse.verse}
              >
                {verse.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Selection popup */}
      <AnimatePresence>
        {showPopup && selectedVerses.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4"
            style={{
              left: popupPosition.x,
              top: popupPosition.y,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="text-sm font-medium text-gray-700 mb-3">
              Currently Selected:
            </div>
            <div className="text-base font-semibold text-gray-900 mb-4">
              {getVerseReference()}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleGoDeeper}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Go Deeper
              </button>
              
              <button
                onClick={() => {
                  const selected = verses.filter(v => selectedVerses.has(v.verse));
                  const text = selected.map(v => `${v.verse}. ${v.text}`).join('\n');
                  navigator.clipboard.writeText(text);
                }}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                title="Copy"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  const selected = verses.filter(v => selectedVerses.has(v.verse));
                  const text = selected.map(v => `${v.verse}. ${v.text}`).join('\n');
                  const reference = getVerseReference();
                  const shareText = `${text}\n\n- ${reference}`;
                  
                  if (navigator.share) {
                    navigator.share({
                      title: reference,
                      text: shareText
                    });
                  }
                }}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                title="Share"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.464 0m5.464 0a3 3 0 10-5.464 0M8 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Highlight colors (optional - similar to bible.com) */}
            <div className="flex gap-1 mt-3 pt-3 border-t">
              {['yellow', 'green', 'blue', 'orange', 'pink'].map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full bg-${color}-300 hover:scale-110 transition-transform`}
                  onClick={() => {
                    // Implement highlight functionality
                    console.log(`Highlight in ${color}`);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}