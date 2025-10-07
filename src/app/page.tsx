'use client';

import { useState, useEffect } from 'react';
import { Search, BookOpen, Loader2, Star, Clock, TrendingUp, Sparkles, BookMarked, ExternalLink, Copy, Check } from 'lucide-react';
import { track } from '@vercel/analytics';

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
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const startTime = Date.now();
    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        let errorMessage = 'Search failed';
        try {
          const errorData = await response.json();
          console.error('Search API error:', errorData);
          errorMessage = errorData.error || errorData.details || response.statusText;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResults(data.results || []);
      
      // Track successful search
      track('search_completed', {
        query: query.trim(),
        results_count: data.results?.length || 0,
        search_time: Date.now() - startTime,
        top_similarity: data.results?.[0]?.similarity || 0
      });
      
      // Update recent searches
      const trimmedQuery = query.trim();
      const newRecentSearches = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 5);
      setRecentSearches(newRecentSearches);
      localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));
      
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      // Track search error
      track('search_error', {
        query: query.trim(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
      setSearchTime(Date.now() - startTime);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      
      // Track copy action
      track('book_id_copied', {
        gutenberg_id: text
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.7) return 'text-green-600 dark:text-green-400';
    if (similarity >= 0.5) return 'text-blue-600 dark:text-blue-400';
    if (similarity >= 0.3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getSimilarityIcon = (similarity: number) => {
    if (similarity >= 0.7) return <Star className="h-4 w-4" />;
    if (similarity >= 0.5) return <TrendingUp className="h-4 w-4" />;
    return <BookMarked className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <BookOpen className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              <Sparkles className="h-5 w-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              Gutenberg Search
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-4">
            Discover books from Project Gutenberg using AI-powered semantic search. 
            Find exactly what you&apos;re looking for with natural language queries.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>1,001+ Books</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Semantic Search</span>
            </div>
          </div>
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
                className="w-full pl-12 pr-32 py-4 text-lg border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all duration-200"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </button>
            </div>
          </form>
          
          {/* Recent Searches */}
          {recentSearches.length > 0 && !hasSearched && (
            <div className="mt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Recent searches:</p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search);
                      track('recent_search_clicked', {
                        query: search
                      });
                    }}
                    className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Search Error
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <Sparkles className="h-4 w-4 text-yellow-500 absolute top-0 right-1/2 transform translate-x-2 animate-pulse" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  Searching through 1,001+ books with AI...
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>This may take a few seconds</span>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Search Results ({results.length})
                  </h2>
                  {searchTime && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Clock className="h-4 w-4" />
                      <span>{searchTime}ms</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {results.map((book, index) => (
                    <div
                      key={book.id}
                      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 break-words">
                                {book.title}
                              </h3>
                              <p className="text-slate-600 dark:text-slate-400 mt-1">
                                by {book.author}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            {getSimilarityIcon(book.similarity)}
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              Relevance
                            </span>
                          </div>
                          <div className={`text-lg font-semibold ${getSimilarityColor(book.similarity)}`}>
                            {Math.round(book.similarity * 100)}%
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 mb-4 line-clamp-3 ml-11">
                        {book.description}
                      </p>
                      <div className="flex items-center justify-between ml-11">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            ID: {book.gutenbergId}
                          </span>
                          <button
                            onClick={() => copyToClipboard(book.gutenbergId, book.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Copy ID"
                          >
                            {copiedId === book.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                        <a
                          href={`https://www.gutenberg.org/ebooks/${book.gutenbergId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => track('gutenberg_link_clicked', {
                            gutenberg_id: book.gutenbergId,
                            book_title: book.title,
                            similarity: book.similarity
                          })}
                          className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Read on Gutenberg
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <Search className="h-6 w-6 text-slate-300 absolute top-2 right-1/2 transform translate-x-8" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No results found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Try rephrasing your search query or using different keywords.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setQuery('classic literature')}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    classic literature
                  </button>
                  <button
                    onClick={() => setQuery('adventure stories')}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    adventure stories
                  </button>
                  <button
                    onClick={() => setQuery('romance novels')}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    romance novels
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Example Queries */}
        {!hasSearched && (
          <div className="max-w-4xl mx-auto mt-12">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Try these example searches:
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Click any example to start searching
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { query: "Books about British kings and royalty", icon: "👑" },
                { query: "Stories with magical adventures", icon: "✨" },
                { query: "Novels set in Victorian London", icon: "🏛️" },
                { query: "Classic detective mysteries", icon: "🔍" },
                { query: "Romantic stories from the 19th century", icon: "💕" },
                { query: "Adventure tales on the high seas", icon: "⚓" }
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(example.query);
                    track('example_query_clicked', {
                      query: example.query,
                      icon: example.icon
                    });
                  }}
                  className="p-4 text-left bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 hover:scale-[1.02] group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                      {example.icon}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      {example.query}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
