'use client';

import { useState, useEffect } from 'react';
import { FontSize } from '@/types';

interface FontSizeControlProps {
  onFontSizeChange: (size: FontSize) => void;
}

const fontSizeOptions: { value: FontSize; label: string; icon: string }[] = [
  { value: 'sm', label: 'Small', icon: 'A' },
  { value: 'md', label: 'Medium', icon: 'A' },
  { value: 'lg', label: 'Large', icon: 'A' },
];

export function FontSizeControl({ onFontSizeChange }: FontSizeControlProps) {
  const [fontSize, setFontSize] = useState<FontSize>('md');

  useEffect(() => {
    // Load saved font size from localStorage
    const saved = localStorage.getItem('bible-font-size') as FontSize;
    if (saved && ['sm', 'md', 'lg'].includes(saved)) {
      setFontSize(saved);
      onFontSizeChange(saved);
    }
  }, [onFontSizeChange]);

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    onFontSizeChange(size);
    localStorage.setItem('bible-font-size', size);
  };

  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      {fontSizeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => handleFontSizeChange(option.value)}
          className={`
            flex items-center justify-center w-10 h-8 rounded-md transition-all duration-200
            ${fontSize === option.value 
              ? 'bg-white shadow-sm text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
          title={option.label}
        >
          <span 
            className={`font-serif ${
              option.value === 'sm' ? 'text-xs' : 
              option.value === 'md' ? 'text-sm' : 'text-base'
            }`}
          >
            {option.icon}
          </span>
        </button>
      ))}
    </div>
  );
}