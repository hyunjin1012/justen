import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Book {
  id?: number;
  gutenberg_id: number;
  title: string;
  author: string;
  description: string;
  embedding?: number[];
  subjects?: string[];
  languages?: string[];
  bookshelves?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SearchLog {
  id?: number;
  query: string;
  results_count: number;
  top_similarity: number;
  search_time_ms: number;
  created_at?: string;
}
