'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 hidden md:block bg-white shadow-sm border-b border-gray-100">
        <div className="mx-auto max-w-screen-xl px-4 md:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-blue-600">
                Deeper Bible
              </div>
            </Link>
            
            <nav className="flex items-center space-x-6">
              <Link 
                href="/bible" 
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                Browse Books
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        {/* Mobile Top Header */}
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Deeper Bible
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex h-16 items-center justify-around px-4">
            <Link href="/" className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs">Home</span>
            </Link>
            
            <Link href="/bible" className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xs">Bible</span>
            </Link>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
            <div className="absolute top-14 left-0 right-0 bg-white shadow-lg">
              <nav className="py-4">
                <Link 
                  href="/bible" 
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Browse Books
                </Link>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Spacer */}
      <div className="h-16 md:hidden" />
    </>
  );
}