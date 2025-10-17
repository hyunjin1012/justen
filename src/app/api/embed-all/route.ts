import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🧠 Starting embedding generation for all books without embeddings...');
    
    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all books without embeddings
    const { data: booksWithoutEmbeddings, error: fetchError } = await supabase
      .from('books')
      .select('*')
      .is('embedding', null);

    if (fetchError) {
      console.error('❌ Error fetching books without embeddings:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
    }

    if (!booksWithoutEmbeddings || booksWithoutEmbeddings.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'All books already have embeddings!',
        booksProcessed: 0 
      });
    }

    console.log(`📚 Found ${booksWithoutEmbeddings.length} books without embeddings`);

    let processed = 0;
    let errors = 0;
    const writeClient = supabaseAdmin ?? supabase;

    // Process books in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < booksWithoutEmbeddings.length; i += batchSize) {
      const batch = booksWithoutEmbeddings.slice(i, i + batchSize);
      
      console.log(`🧠 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(booksWithoutEmbeddings.length / batchSize)} (${batch.length} books)...`);
      
      for (let j = 0; j < batch.length; j++) {
        const book = batch[j];
        try {
          const textToEmbed = `${book.title} by ${book.author}. ${book.description}`;
          console.log(`  🧠 [${i + j + 1}/${booksWithoutEmbeddings.length}] Generating embedding for: ${book.title}`);
          
          const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: textToEmbed,
          });
          
          const embedding = response.data[0].embedding;
          console.log(`  ✅ [${i + j + 1}/${booksWithoutEmbeddings.length}] Embedding generated (${embedding.length} dimensions)`);
          
          // Update book with embedding in Supabase
          const { data: updateData, error: updateError } = await writeClient
            .from('books')
            .update({ embedding })
            .eq('gutenberg_id', book.gutenberg_id)
            .select('gutenberg_id');

          if (updateError) {
            console.error(`  ❌ [${i + j + 1}/${booksWithoutEmbeddings.length}] Error updating book with embedding:`, updateError);
            errors++;
          } else if (!updateData || updateData.length === 0) {
            console.error(`  ❌ [${i + j + 1}/${booksWithoutEmbeddings.length}] Update succeeded but no rows affected for ${book.title} (likely RLS blocking)`);
            errors++;
          } else {
            console.log(`  ✅ [${i + j + 1}/${booksWithoutEmbeddings.length}] Embedding stored in Supabase for ${book.title}`);
            processed++;
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`  ❌ [${i + j + 1}/${booksWithoutEmbeddings.length}] Error generating embedding for ${book.title}:`, error);
          errors++;
        }
      }
      
      // Longer delay between batches
      if (i + batchSize < booksWithoutEmbeddings.length) {
        console.log(`⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`🧠 Completed embedding generation: ${processed} processed, ${errors} errors`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Embedding generation completed`,
      booksProcessed: processed,
      booksWithErrors: errors,
      totalBooks: booksWithoutEmbeddings.length
    });
    
  } catch (error) {
    console.error('❌ Embedding generation error:', error);
    return NextResponse.json(
      { 
        error: 'Embedding generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
