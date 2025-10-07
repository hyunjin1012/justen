import { createClient } from '@supabase/supabase-js';

// You'll need to set these manually or load from .env.local
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...');
    
    const { data: books, error } = await supabase
      .from('books')
      .select('id, gutenberg_id, title')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`📚 Total books in database: ${books.length}`);
    
    if (books.length > 0) {
      console.log(`📚 First book: ${books[0].title} (ID: ${books[0].gutenberg_id})`);
      console.log(`📚 Last book: ${books[books.length - 1].title} (ID: ${books[books.length - 1].gutenberg_id})`);
    }
    
    // Check for duplicates
    const gutenbergIds = books.map(book => book.gutenberg_id);
    const uniqueIds = new Set(gutenbergIds);
    
    if (gutenbergIds.length !== uniqueIds.size) {
      console.log(`⚠️ Found ${gutenbergIds.length - uniqueIds.size} duplicate books!`);
    } else {
      console.log('✅ No duplicate books found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabase();
