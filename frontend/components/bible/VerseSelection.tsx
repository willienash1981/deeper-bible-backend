'use client';

import { useState, useCallback } from 'react';
import { Verse } from '@/types';
import { cn } from '@/lib/utils/cn';

interface VerseSelectionProps {
  verses: Verse[];
  fontSize: 'sm' | 'md' | 'lg';
  onSelectionChange: (selectedVerses: number[]) => void;
}

export function VerseSelection({ verses, fontSize, onSelectionChange }: VerseSelectionProps) {
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const fontSizeClasses = {
    sm: 'text-base leading-relaxed',
    md: 'text-lg leading-relaxed',
    lg: 'text-xl leading-relaxed',
  };

  const toggleVerse = useCallback((verseNumber: number) => {
    setSelectedVerses(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(verseNumber)) {
        newSelected.delete(verseNumber);
      } else {
        newSelected.add(verseNumber);
      }
      // Use setTimeout to defer the state update to prevent updating parent during render
      setTimeout(() => {
        onSelectionChange(Array.from(newSelected).sort((a, b) => a - b));
      }, 0);
      return newSelected;
    });
  }, [onSelectionChange]);

  const handleMouseDown = (verseNumber: number) => {
    setIsSelecting(true);
    toggleVerse(verseNumber);
  };

  const handleMouseEnter = (verseNumber: number) => {
    if (isSelecting) {
      toggleVerse(verseNumber);
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  return (
    <div 
      className="space-y-2 select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {verses.map((verse) => (
        <div
          key={`verse-${verse.number}`}
          className={cn(
            'cursor-pointer transition-all duration-200 p-2 rounded-lg',
            selectedVerses.has(verse.number)
              ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm'
              : 'hover:bg-gray-50',
            fontSizeClasses[fontSize]
          )}
          onMouseDown={() => handleMouseDown(verse.number)}
          onMouseEnter={() => handleMouseEnter(verse.number)}
        >
          <span className="inline-flex">
            <sup className="text-blue-600 font-semibold mr-2 text-sm">
              {verse.number}
            </sup>
            <span className="font-serif text-gray-800 leading-relaxed">
              {verse.text}
            </span>
          </span>
        </div>
      ))}
      
    </div>
  );
}