import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('❌ Error loading .env.local file:', error.message);
    return {};
  }
}

const env = loadEnvFile();
const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    console.log('🔍 Checking database...');
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error getting count:', countError);
      return;
    }
    
    console.log(`📚 Total books in database: ${count}`);
    
    // Get first and last books
    const { data: books, error } = await supabase
      .from('books')
      .select('id, gutenberg_id, title, created_at')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (books.length > 0) {
      console.log(`📚 First book: ${books[0].title} (ID: ${books[0].gutenberg_id})`);
      console.log(`📚 Last book: ${books[books.length - 1].title} (ID: ${books[books.length - 1].gutenberg_id})`);
      
      // Show the most recently added book
      const { data: recentBooks, error: recentError } = await supabase
        .from('books')
        .select('id, gutenberg_id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!recentError && recentBooks && recentBooks.length > 0) {
        console.log(`📚 Most recently added: ${recentBooks[0].title} (ID: ${recentBooks[0].gutenberg_id})`);
      }
    }
    
    // Check for duplicates
    const gutenbergIds = books.map(book => book.gutenberg_id);
    const uniqueIds = new Set(gutenbergIds);
    
    if (gutenbergIds.length !== uniqueIds.size) {
      console.log(`⚠️ Found ${gutenbergIds.length - uniqueIds.size} duplicate books!`);
    } else {
      console.log('✅ No duplicate books found');
    }
    
    // Check for books without embeddings
    const { data: booksWithoutEmbeddings, error: embeddingError } = await supabase
      .from('books')
      .select('id, title')
      .is('embedding', null);
    
    if (!embeddingError && booksWithoutEmbeddings) {
      if (booksWithoutEmbeddings.length > 0) {
        console.log(`⚠️ Found ${booksWithoutEmbeddings.length} books without embeddings`);
      } else {
        console.log('✅ All books have embeddings');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabase();
