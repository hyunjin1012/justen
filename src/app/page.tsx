'use client';

import { useState, useEffect } from 'react';
import { Search, BookOpen, Loader2, Star, Clock, TrendingUp, Sparkles, BookMarked, ExternalLink } from 'lucide-react';
import { track } from '@vercel/analytics';
import BookReader from '@/components/BookReader';

interface SearchResult {
  id: string;
  title: string;
  author: string;
  description: string;
  gutenbergId: string;
  similarity: number;
  subjects?: string[];
  languages?: string[];
  bookshelves?: string[];
  summary?: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [bookSummaries, setBookSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Format description to be more readable
  const formatDescription = (description: string): string | null => {
    if (!description) return null;
    
    let cleaned = description
      // Remove "An English work by..." prefix
      .replace(/^An? \w+ work by [^.]+\.[\s]*/i, '')
      // Remove "This book explores themes related to..." 
      .replace(/This book explores themes related to /gi, '')
      // Remove "Categorized under..."
      .replace(/\. Categorized under [^.]+\.?/gi, '.')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    // If description is just a list of subjects (contains "-- Fiction" or similar patterns), hide it
    if (cleaned.match(/--\s*(Fiction|History|Poetry|Drama|Literature)/i)) {
      return null;
    }
    
    // If description contains comma-separated subjects followed by "--", it's likely a subject list
    if (cleaned.match(/^[^.]*,\s*[^.]*\s*--/)) {
      return null;
    }
    
    // If description contains patterns like "1564-1616" (birth-death years), it's likely metadata
    if (cleaned.match(/\d{4}-\d{4}/)) {
      return null;
    }
    
    // If description is just a comma-separated list of short phrases (like "English poetry, Sonnets, English.")
    const commaParts = cleaned.split(',');
    if (commaParts.length >= 2) {
      const parts = commaParts.map(p => p.trim().replace(/\.$/, ''));
      // If all parts are short (likely subjects) and no part contains a sentence, it's probably just subjects
      if (parts.every(part => part.length < 30 && !part.match(/\.\s+[A-Z]/))) {
        return null;
      }
    }
    
    // If description is very short or just subjects, don't show it
    if (cleaned.length < 20) {
      return null;
    }
    
    // Capitalize first letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    
    return cleaned || null;
  };

  // Format subject tags - make them shorter and more readable
  const formatSubject = (subject: string): string => {
    let formatted = subject;
    
    // Remove "Category: " prefix
    formatted = formatted.replace(/^Category:\s*/i, '');
    
    // Handle complex subjects with multiple "--" separators
    const parts = formatted.split(/\s*--\s*/);
    
    // Remove common suffixes
    const suffixesToRemove = ['Fiction', 'History', 'Poetry', 'Drama', 'Nonfiction', 'Literature'];
    const cleanedParts = parts.filter(part => 
      !suffixesToRemove.some(suffix => part.toLowerCase() === suffix.toLowerCase())
    );
    
    // Handle special cases
    if (cleanedParts.length > 1) {
      // Skip generic terms if there's something more specific
      const genericTerms = ['British', 'England', 'Europe', 'United States', 'America', 'English'];
      const specificParts = cleanedParts.filter(part => {
        const partLower = part.toLowerCase();
        return !genericTerms.some(term => partLower === term.toLowerCase() || partLower.includes(term.toLowerCase()));
      });
      
      if (specificParts.length > 0) {
        formatted = specificParts[specificParts.length - 1];
      } else {
        formatted = cleanedParts[cleanedParts.length - 1];
      }
    } else if (cleanedParts.length === 1) {
      formatted = cleanedParts[0];
    }
    
    // Clean up parentheses content (like "Juliet (Fictitious character)")
    formatted = formatted.replace(/\s*\([^)]*\)/g, '');
    
    // Clean up common patterns
    formatted = formatted
      .replace(/\s*--\s*Fiction\s*$/i, '')
      .replace(/\s*--\s*History\s*$/i, '')
      .replace(/\s*--\s*Poetry\s*$/i, '')
      .replace(/\s*--\s*Drama\s*$/i, '')
      .replace(/\s*,\s*etc\.?/gi, '')
      .trim();
    
    // Handle "Early modern and..." type subjects - extract key term
    if (formatted.toLowerCase().includes('early modern')) {
      formatted = 'Early modern';
    }
    
    // Handle "Conflict of..." type subjects - extract the key concept
    if (formatted.toLowerCase().includes('conflict of')) {
      const match = formatted.match(/conflict of\s+(.+)/i);
      if (match && match[1]) {
        formatted = match[1].split(/\s+/)[0]; // Take first word after "of"
      } else {
        formatted = 'Conflict';
      }
    }
    
    // Capitalize first letter
    if (formatted.length > 0) {
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
    
    // Truncate very long subjects (but try to keep them shorter)
    if (formatted.length > 22) {
      // Try to truncate at a word boundary
      const truncated = formatted.substring(0, 19);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 8) {
        formatted = truncated.substring(0, lastSpace) + '...';
      } else {
        formatted = truncated + '...';
      }
    }
    
    return formatted;
  };

  // Get primary subjects (top 3) with formatting
  const getPrimarySubjects = (subjects?: string[]): string[] => {
    if (!subjects || subjects.length === 0) return [];
    return subjects.slice(0, 3).map(formatSubject);
  };

  // Fetch summary for a book
  const fetchBookSummary = async (bookId: string) => {
    // Don't fetch if already loading or already have summary
    if (loadingSummaries.has(bookId) || bookSummaries[bookId]) {
      return;
    }

    setLoadingSummaries(prev => new Set(prev).add(bookId));

    try {
      console.log(`📖 Fetching summary for book ${bookId}...`);
      const response = await fetch(`/api/book-summary?id=${bookId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ HTTP error for book ${bookId}:`, response.status, errorData);
        return;
      }
      
      const data = await response.json();
      console.log(`📖 Summary response for book ${bookId}:`, data);

      if (data.success && data.summary) {
        setBookSummaries(prev => ({
          ...prev,
          [bookId]: data.summary
        }));
        console.log(`✅ Summary loaded for book ${bookId}`);
      } else {
        console.log(`ℹ️ No summary available for book ${bookId} (success: ${data.success}, hasSummary: ${data.hasSummary})`);
      }
    } catch (error) {
      console.error(`❌ Error fetching summary for book ${bookId}:`, error);
    } finally {
      setLoadingSummaries(prev => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }
  };

  // Toggle summary expansion
  const toggleSummary = (bookId: string) => {
    setExpandedSummaries(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  };

  // Check if summary needs truncation (rough estimate: more than ~150 chars)
  const needsTruncation = (text: string): boolean => {
    return text.length > 150;
  };

  // Fetch summaries for all books when results change
  useEffect(() => {
    if (results.length > 0) {
      console.log(`📚 Fetching summaries for ${results.length} books...`);
      // Fetch summaries for all books
      results.forEach(book => {
        const bookId = book.gutenbergId;
        if (!bookSummaries[bookId] && !loadingSummaries.has(bookId)) {
          fetchBookSummary(bookId);
        } else {
          console.log(`⏭️ Skipping book ${bookId} (already loaded or loading)`);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const startTime = Date.now();
    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setBookSummaries({}); // Clear previous summaries
    setLoadingSummaries(new Set()); // Clear loading states
    setExpandedSummaries(new Set()); // Clear expanded states

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
                <div className="relative inline-block mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" />
                  </div>
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
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                      Search Results ({results.length})
                    </h2>
                    {searchTime && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Found in {searchTime}ms
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  {results.map((book, index) => (
                    <div
                      key={book.id}
                      className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                    >
                      <div className="flex items-start gap-4">
                        {/* Rank Badge */}
                        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg text-sm font-bold shadow-md">
                          {index + 1}
                        </div>
                        
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title and Author */}
                          <div className="mb-3">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 break-words mb-1">
                              {book.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                              {book.author}
                            </p>
                          </div>

                          {/* Subjects and Description */}
                          {(() => {
                            // Prefer summary over description
                            const summary = bookSummaries[book.gutenbergId];
                            const desc = formatDescription(book.description);
                            const displayText = summary || desc;
                            const hasContent = !!displayText;
                            const isLoadingSummary = loadingSummaries.has(book.gutenbergId);
                            
                            return (
                              <>
                                {/* Subjects as Tags */}
                                {getPrimarySubjects(book.subjects).length > 0 && (
                                  <div className={`flex flex-wrap gap-2 ${hasContent ? 'mb-3' : 'mb-4'}`}>
                                    {getPrimarySubjects(book.subjects).map((subject, idx) => {
                                      const originalSubject = book.subjects?.[idx] || '';
                                      // Show tooltip if formatted subject is different from original or if original is long
                                      const showTooltip = originalSubject && (
                                        originalSubject !== subject || 
                                        originalSubject.length > 25
                                      );
                                      return (
                                        <span
                                          key={idx}
                                          title={showTooltip ? originalSubject : undefined}
                                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-help"
                                        >
                                          {subject}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Description/Summary */}
                                {isLoadingSummary && (
                                  <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Loading description...</span>
                                  </div>
                                )}
                                {hasContent && !isLoadingSummary && (
                                  <div className="mb-4">
                                    <p className={`text-slate-700 dark:text-slate-300 leading-relaxed ${expandedSummaries.has(book.gutenbergId) ? '' : 'line-clamp-3'}`}>
                                      {displayText}
                                    </p>
                                    {needsTruncation(displayText) && (
                                      <button
                                        onClick={() => toggleSummary(book.gutenbergId)}
                                        className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                                      >
                                        {expandedSummaries.has(book.gutenbergId) ? 'Show less' : 'Read more'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              {/* Relevance Score */}
                              <div className="flex items-center gap-2">
                                {getSimilarityIcon(book.similarity)}
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                  {Math.round(book.similarity * 100)}% match
                                </span>
                              </div>
                              
                              {/* Language */}
                              {book.languages && book.languages.length > 0 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                                  {book.languages[0].toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedBookId(book.gutenbergId);
                                  track('book_reader_opened', {
                                    gutenberg_id: book.gutenbergId,
                                    book_title: book.title,
                                    similarity: book.similarity
                                  });
                                }}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm hover:shadow-md"
                              >
                                <BookOpen className="h-4 w-4" />
                                Read
                              </button>
                              <a
                                href={`https://www.gutenberg.org/ebooks/${book.gutenbergId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => track('gutenberg_link_clicked', {
                                  gutenberg_id: book.gutenbergId,
                                  book_title: book.title,
                                  similarity: book.similarity
                                })}
                                className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium text-sm transition-colors"
                                title="View on Project Gutenberg"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        </div>
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

      {/* Book Reader Modal */}
      {selectedBookId && (
        <BookReader
          bookId={selectedBookId}
          onClose={() => setSelectedBookId(null)}
        />
      )}
    </div>
  );
}
