import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

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

// Fetch books from Gutendex API with pagination, skipping existing books
async function fetchBooksFromAPI(totalBooks: number = 200): Promise<Record<string, unknown>[]> {
  const allBooks: Record<string, unknown>[] = [];
  let page = 1;
  const limit = 32; // Gutendex API limit per page
  
  console.log(`🌐 Starting to fetch ${totalBooks} books from Gutendex API...`);
  
  // Get existing book IDs to avoid duplicates
  const { data: existingBooks } = await supabase
    .from('books')
    .select('gutenberg_id');
  
  const existingIds = new Set(existingBooks?.map(book => book.gutenberg_id) || []);
  console.log(`📚 Found ${existingIds.size} existing books in database`);
  console.log(`📚 Sample existing IDs:`, Array.from(existingIds).slice(0, 5));
  
  while (allBooks.length < totalBooks) {
    try {
      console.log(`📚 Fetching page ${page} (${allBooks.length}/${totalBooks} books so far)...`);
      
      const response = await fetch(`${GUTENDEX_API_URL}/books?page=${page}&limit=${limit}`, {
        headers: {
          'User-Agent': 'Gutenberg-Search-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch books: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.log('📚 No more books available from API');
        break;
      }
      
      // Filter out existing books and add new ones to our collection
      console.log(`📚 Page ${page} books:`, data.results.map((book: Record<string, unknown>) => ({ id: book.id, title: book.title })).slice(0, 3));
      const newBooks = data.results.filter((book: Record<string, unknown>) => !existingIds.has(book.id));
      const booksToAdd = newBooks.slice(0, totalBooks - allBooks.length);
      allBooks.push(...booksToAdd);
      
      console.log(`📚 Found ${newBooks.length} new books on page ${page}, adding ${booksToAdd.length}`);
      
      // If no new books found on this page, we need to go to the next page
      if (newBooks.length === 0) {
        console.log(`📚 No new books found on page ${page}, moving to next page...`);
        page++;
        continue;
      }
      
      // If we got fewer books than requested, we've reached the end
      if (data.results.length < limit) {
        console.log('📚 Reached end of available books');
        break;
      }
      
      page++;
      
      // Add a small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error);
      break;
    }
  }
  
  console.log(`📚 Successfully fetched ${allBooks.length} books total`);
  return allBooks;
}

// Generate embeddings for books
async function generateAndStoreEmbeddings(books: Record<string, unknown>[]): Promise<{ processed: number, skipped: number, errors: number }> {
  console.log(`🧠 Starting embedding generation for ${books.length} books...`);
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < books.length; i++) {
    const bookData = books[i];
    try {
      const book = {
        gutenberg_id: bookData.id,
        title: bookData.title || 'Unknown Title',
        author: (bookData.authors as Array<{ name: string }>)?.[0]?.name || 'Unknown Author',
        description: generateBookDescription(bookData),
        subjects: bookData.subjects || [],
        languages: bookData.languages || [],
        bookshelves: bookData.bookshelves || [],
      };
      
      // Check if book already exists in database
      const { data: existingBooks } = await supabase
        .from('books')
        .select('id, embedding')
        .eq('gutenberg_id', book.gutenberg_id);
      
      console.log(`  🔍 [${i + 1}/${books.length}] Checking ${book.title} (ID: ${book.gutenberg_id})`);
      console.log(`  🔍 Existing books found: ${existingBooks?.length || 0}`);
      
      if (existingBooks && existingBooks.length > 0) {
        console.log(`  ⏭️ [${i + 1}/${books.length}] Skipping ${book.title} (already exists)`);
        skipped++;
        continue;
      }
      
      console.log(`  🧠 [${i + 1}/${books.length}] Processing: ${book.title}`);
      
      // Generate embedding
      const textToEmbed = `${book.title} by ${book.author}. ${book.description}`;
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: textToEmbed,
      });
      
      const embedding = response.data[0].embedding;
      
      // Store book with embedding in Supabase
      const { error } = await supabase
        .from('books')
        .insert({
          ...book,
          embedding
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`  ⏭️ [${i + 1}/${books.length}] Skipped ${book.title} (already exists)`);
          skipped++;
        } else {
          console.error(`  ❌ [${i + 1}/${books.length}] Error storing ${book.title}:`, error);
          errors++;
        }
      } else {
        console.log(`  ✅ [${i + 1}/${books.length}] Stored ${book.title} with embedding`);
        processed++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`  ❌ [${i + 1}/${books.length}] Error processing book:`, error);
      errors++;
    }
  }
  
  console.log(`🧠 Completed embedding generation: ${processed} processed, ${skipped} skipped, ${errors} errors`);
  return { processed, skipped, errors };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    // Get number of books to seed (default 200)
    const { totalBooks = 200 } = await request.json().catch(() => ({}));
    
    console.log(`🌱 Seeding database with ${totalBooks} books...`);
    
    // Fetch books from Gutendex API
    const books = await fetchBooksFromAPI(totalBooks);
    
    if (books.length === 0) {
      return NextResponse.json({ error: 'No books fetched from API' }, { status: 500 });
    }
    
    // Generate embeddings and store in database
    const results = await generateAndStoreEmbeddings(books);
    
    console.log('✅ Database seeding completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: `Database seeding completed`,
      booksFetched: books.length,
      booksProcessed: results.processed,
      booksSkipped: results.skipped,
      booksWithErrors: results.errors,
      note: results.processed === 0 ? "No new books were added (all were duplicates)" : `${results.processed} new books added`
    });
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    return NextResponse.json(
      { 
        error: 'Database seeding failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
