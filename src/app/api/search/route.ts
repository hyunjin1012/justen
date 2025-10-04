import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import cosineSimilarity from 'cosine-similarity';
import { supabase, Book, SearchLog } from '@/lib/supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Gutendex API configuration
const GUTENDEX_API_URL = 'https://gutendex.com';

// Generate a description for a book based on available data
function generateBookDescription(bookData: Record<string, unknown>): string {
  const authors = bookData.authors as Array<{ name: string }> | undefined;
  const subjects = bookData.subjects as string[] | undefined;
  const languages = bookData.languages as string[] | undefined;
  const bookshelves = bookData.bookshelves as string[] | undefined;
  
  const author = authors?.[0]?.name || 'Unknown Author';
  const subjectsList = subjects || [];
  const languagesList = languages || [];
  
  const language = languagesList.length > 0 ? languagesList[0] : 'classic';
  const languageDisplay = language === 'en' ? 'English' : language;
  const article = languageDisplay.toLowerCase().match(/^[aeiou]/) ? 'An' : 'A';
  let description = `${article} ${languageDisplay} work by ${author}.`;
  
  if (subjectsList.length > 0) {
    const mainSubjects = subjectsList.slice(0, 3).join(', ');
    description += ` This book explores themes related to ${mainSubjects}.`;
  }
  
  if (bookshelves && bookshelves.length > 0) {
    const bookshelvesList = bookshelves.slice(0, 2).join(', ');
    description += ` Categorized under ${bookshelvesList}.`;
  }
  
  return description;
}

// Fetch books from Gutendex API and store in Supabase
async function fetchAndStoreBooks(limit: number = 50): Promise<Book[]> {
  try {
    console.log(`🌐 Fetching books from Gutendex API: ${GUTENDEX_API_URL}/books?limit=${limit}`);
    const response = await fetch(`${GUTENDEX_API_URL}/books?limit=${limit}`, {
      headers: {
        'User-Agent': 'Gutenberg-Search-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch books: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 API Response: ${data.count} total books available, fetching ${data.results.length} books`);
    
    const books: Book[] = [];

    for (const bookData of data.results) {
      const book: Book = {
        gutenberg_id: bookData.id,
        title: bookData.title || 'Unknown Title',
        author: bookData.authors?.[0]?.name || 'Unknown Author',
        description: generateBookDescription(bookData),
        subjects: bookData.subjects || [],
        languages: bookData.languages || [],
        bookshelves: bookData.bookshelves || [],
      };
      books.push(book);
    }

    console.log(`📚 Successfully processed ${books.length} books from API`);

    // Store books in Supabase (upsert to avoid duplicates)
    const { data: storedBooks, error } = await supabase
      .from('books')
      .upsert(books, { onConflict: 'gutenberg_id' })
      .select();

    if (error) {
      console.error('❌ Error storing books in Supabase:', error);
      return books; // Return books even if storage fails
    }

    console.log(`💾 Stored ${storedBooks?.length || 0} books in Supabase`);
    return storedBooks || books;
  } catch (error) {
    console.error('❌ Error fetching books from API:', error);
    return [];
  }
}

// Generate embeddings for books and store in Supabase
async function generateAndStoreEmbeddings(books: Book[]): Promise<Book[]> {
  console.log(`🧠 Starting embedding generation for ${books.length} books...`);
  const booksWithEmbeddings: Book[] = [];
  
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    try {
      const textToEmbed = `${book.title} by ${book.author}. ${book.description}`;
      console.log(`  🧠 [${i + 1}/${books.length}] Generating embedding for: ${book.title}`);
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textToEmbed,
      });
      
      const embedding = response.data[0].embedding;
      console.log(`  ✅ [${i + 1}/${books.length}] Embedding generated (${embedding.length} dimensions)`);
      
      // Update book with embedding in Supabase
      const { error } = await supabase
        .from('books')
        .update({ embedding })
        .eq('gutenberg_id', book.gutenberg_id);

      if (error) {
        console.error(`  ❌ [${i + 1}/${books.length}] Error updating book with embedding:`, error);
        console.error(`  ❌ Error details:`, error);
      } else {
        console.log(`  ✅ [${i + 1}/${books.length}] Embedding stored in Supabase for ${book.title}`);
        book.embedding = embedding;
        booksWithEmbeddings.push(book);
      }
    } catch (error) {
      console.error(`  ❌ [${i + 1}/${books.length}] Error generating embedding for ${book.title}:`, error);
      booksWithEmbeddings.push(book);
    }
  }
  
  console.log(`🧠 Completed embedding generation: ${booksWithEmbeddings.filter(b => b.embedding).length}/${books.length} successful`);
  return booksWithEmbeddings;
}

// Check if books have embeddings and regenerate if needed
async function ensureEmbeddingsExist(): Promise<void> {
  try {
    console.log('🔍 Checking if books have embeddings...');
    
    // Get books without embeddings
    const { data: booksWithoutEmbeddings, error } = await supabase
      .from('books')
      .select('*')
      .is('embedding', null)
      .limit(50);

    if (error) {
      console.error('❌ Error checking embeddings:', error);
      return;
    }

    if (booksWithoutEmbeddings && booksWithoutEmbeddings.length > 0) {
      console.log(`📚 Found ${booksWithoutEmbeddings.length} books without embeddings, generating...`);
      await generateAndStoreEmbeddings(booksWithoutEmbeddings);
    } else {
      console.log('✅ All books have embeddings');
    }
  } catch (error) {
    console.error('❌ Error ensuring embeddings exist:', error);
  }
}

// Search books using vector similarity in Supabase
async function searchBooksWithVector(queryEmbedding: number[], limit: number = 10): Promise<Book[]> {
  try {
    console.log('🔍 Searching books using vector similarity in Supabase...');
    
    // Use pgvector's cosine similarity search
    const { data: books, error } = await supabase
      .rpc('search_books_by_similarity', {
        query_embedding: queryEmbedding,
        match_threshold: 0.0, // Lower threshold to get more results
        match_count: limit
      });

    if (error) {
      console.error('❌ Error searching books with vector similarity:', error);
      return [];
    }

    console.log(`🔍 Found ${books?.length || 0} similar books`);
    
    // Debug: Check if returned books have embeddings
    if (books && books.length > 0) {
      const booksWithEmbeddings = books.filter((book: Book) => book.embedding && book.embedding.length > 0);
      console.log(`🔍 Debug: ${booksWithEmbeddings.length}/${books.length} returned books have embeddings`);
      
      if (booksWithEmbeddings.length === 0) {
        console.log('⚠️ No embeddings in returned books, checking database directly...');
        // Fallback: get books directly from database
        const { data: allBooks, error: directError } = await supabase
          .from('books')
          .select('*')
          .not('embedding', 'is', null)
          .limit(10);
        
        if (directError) {
          console.error('❌ Error getting books directly:', directError);
        } else {
          console.log(`🔍 Direct query found ${allBooks?.length || 0} books with embeddings`);
          return allBooks || [];
        }
      }
    }
    
    return books || [];
  } catch (error) {
    console.error('❌ Error in vector search:', error);
    return [];
  }
}

// Log search activity
async function logSearch(query: string, resultsCount: number, topSimilarity: number, searchTimeMs: number) {
  try {
    const searchLog: SearchLog = {
      query,
      results_count: resultsCount,
      top_similarity: topSimilarity,
      search_time_ms: searchTimeMs,
    };

    const { error } = await supabase
      .from('search_logs')
      .insert(searchLog);

    if (error) {
      console.error('❌ Error logging search:', error);
    } else {
      console.log('📊 Search logged successfully');
    }
  } catch (error) {
    console.error('❌ Error in search logging:', error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 API route started');
    
    // Check environment variables first
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Supabase credentials not found');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    console.log('✅ Environment variables check passed');
    
    const { query } = await request.json();
    console.log('🔍 Starting search process...');
    console.log('📝 Query received:', query);

    if (!query || typeof query !== 'string') {
      console.log('❌ Invalid query format');
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.log('❌ Supabase not configured');
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Generate embedding for the search query
    console.log('🔍 Generating embedding for search query...');
    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = queryResponse.data[0].embedding;
    console.log(`🔍 Query embedding generated (${queryEmbedding.length} dimensions)`);

    // First, ensure all books have embeddings
    await ensureEmbeddingsExist();

    // Search using vector similarity
    const results = await searchBooksWithVector(queryEmbedding, 10);
    
    // Check if we have good quality results
    const hasGoodResults = results.length > 0 && results.some(book => {
      // Calculate similarity to check quality
      if (book.embedding && typeof book.embedding === 'string') {
        try {
          const embeddingArray = JSON.parse(book.embedding);
          const similarity = cosineSimilarity(queryEmbedding, embeddingArray);
          return similarity > 0.15; // 15% similarity threshold
        } catch {
          return false;
        }
      }
      return false;
    });
    
    if (!hasGoodResults) {
      console.log('📚 No good quality results found, fetching and storing new books...');
      const books = await fetchAndStoreBooks(50);
      await generateAndStoreEmbeddings(books);
      
      // Try search again with new books
      const newResults = await searchBooksWithVector(queryEmbedding, 10);
      
      if (newResults.length === 0) {
        console.log('❌ Still no results after adding new books');
        return NextResponse.json({ results: [] });
      }
      
      results.push(...newResults);
    }

    // Calculate similarity scores for results
    console.log('📊 Calculating similarity scores...');
    console.log(`📊 Processing ${results.length} books from vector search`);
    
    const resultsWithSimilarity = results
      .filter(book => {
        const hasEmbedding = !!book.embedding;
        if (!hasEmbedding) {
          console.log(`  ⚠️ ${book.title}: No embedding found`);
        }
        return hasEmbedding;
      })
      .map(book => {
        // Debug: Check embedding format
        console.log(`  🔍 Debug ${book.title}: embedding type=${typeof book.embedding}, length=${book.embedding?.length}`);
        
        // Convert embedding to array if it's a string
        let embeddingArray: number[];
        if (typeof book.embedding === 'string') {
          try {
            embeddingArray = JSON.parse(book.embedding);
            console.log(`  🔄 Converted string embedding to array for ${book.title}`);
          } catch (error) {
            console.error(`  ❌ Failed to parse embedding for ${book.title}:`, error);
            return { ...book, similarity: 0 };
          }
        } else if (Array.isArray(book.embedding)) {
          embeddingArray = book.embedding;
        } else {
          console.error(`  ❌ Unknown embedding format for ${book.title}:`, typeof book.embedding);
          return { ...book, similarity: 0 };
        }
        
        const similarity = cosineSimilarity(queryEmbedding, embeddingArray);
        console.log(`  📊 ${book.title}: ${(similarity * 100).toFixed(1)}% similarity`);
        return {
          ...book,
          similarity
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
      .map((book) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { embedding, ...bookWithoutEmbedding } = book;
        return bookWithoutEmbedding;
      });

    console.log(`📊 Top results (${resultsWithSimilarity.length} books):`);
    resultsWithSimilarity.forEach((book, index) => {
      console.log(`  ${index + 1}. ${book.title} - ${(book.similarity * 100).toFixed(1)}%`);
    });

    // Log search activity
    const searchTime = Date.now() - startTime;
    const topSimilarity = resultsWithSimilarity[0]?.similarity || 0;
    await logSearch(query, resultsWithSimilarity.length, topSimilarity, searchTime);

    console.log('✅ Search completed successfully');
    return NextResponse.json({ results: resultsWithSimilarity });

  } catch (error) {
    console.error('❌ Search error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}