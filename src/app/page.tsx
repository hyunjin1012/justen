'use client';

import { useState } from 'react';
import { Search, BookOpen, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  author: string;
  description: string;
  gutenbergId: string;
  similarity: number;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              Gutenberg Search
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Discover books from Project Gutenberg using semantic search. 
            Find exactly what you're looking for with natural language queries.
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., 'I want to find a book that features a British king'"
                className="w-full pl-12 pr-4 py-4 text-lg border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
          </form>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-slate-600 dark:text-slate-400">
                  Searching through thousands of books...
                </p>
              </div>
            ) : results.length > 0 ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                  Search Results ({results.length})
                </h2>
                <div className="space-y-4">
                  {results.map((book, index) => (
                    <div
                      key={book.id}
                      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {book.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-2">
                            by {book.author}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                            Relevance
                          </div>
                          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {Math.round(book.similarity * 100)}%
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 mb-4 line-clamp-3">
                        {book.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Gutenberg ID: {book.gutenbergId}
                        </span>
                        <a
                          href={`https://www.gutenberg.org/ebooks/${book.gutenbergId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                        >
                          Read on Gutenberg →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No results found
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Try rephrasing your search query or using different keywords.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Example Queries */}
        {!hasSearched && (
          <div className="max-w-4xl mx-auto mt-12">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6 text-center">
              Try these example searches:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Books about British kings and royalty",
                "Stories with magical adventures",
                "Novels set in Victorian London",
                "Classic detective mysteries",
                "Romantic stories from the 19th century",
                "Adventure tales on the high seas"
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(example)}
                  className="p-4 text-left bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
                >
                  <p className="text-slate-700 dark:text-slate-300">{example}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
