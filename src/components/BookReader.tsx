'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen, User, Calendar, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface BookMetadata {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year?: number; death_year?: number }>;
  subjects: string[];
  languages: string[];
  bookshelves: string[];
  formats: Record<string, string>;
  download_count: number;
}

interface BookContent {
  metadata: BookMetadata;
  content: string;
  textUrl: string;
}

interface BookReaderProps {
  bookId: string;
  onClose: () => void;
}

export default function BookReader({ bookId, onClose }: BookReaderProps) {
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookContent();
  }, [bookId]);

  const fetchBookContent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/book-content?id=${bookId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch book content');
      }

      setBookContent(data.data);
    } catch (err) {
      console.error('Error fetching book content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load book content');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAuthorName = (author: { name: string; birth_year?: number; death_year?: number }) => {
    let name = author.name;
    if (author.birth_year || author.death_year) {
      const years = [author.birth_year, author.death_year].filter(Boolean).join('–');
      name += ` (${years})`;
    }
    return name;
  };

  const getGutenbergUrl = (bookId: string) => {
    return `https://www.gutenberg.org/ebooks/${bookId}`;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <p className="text-center text-slate-600 dark:text-slate-300">
            Loading book content...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Error Loading Book
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={fetchBookContent}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!bookContent) {
    return null;
  }

  const { metadata, content, textUrl } = bookContent;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {metadata.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                by {metadata.authors.map(formatAuthorName).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Book Info */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Subjects:</span>
              <p className="text-slate-600 dark:text-slate-400">
                {metadata.subjects.slice(0, 3).join(', ')}
                {metadata.subjects.length > 3 && '...'}
              </p>
            </div>
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Language:</span>
              <p className="text-slate-600 dark:text-slate-400">
                {metadata.languages.join(', ')}
              </p>
            </div>
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Downloads:</span>
              <p className="text-slate-600 dark:text-slate-400">
                {metadata.download_count.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <a
              href={getGutenbergUrl(bookId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              View on Project Gutenberg
            </a>
            <a
              href={textUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="h-4 w-4" />
              Download Text
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
