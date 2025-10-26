-- Ultimate Security Fix for Gutenberg Search Application
-- Addresses all security issues: RLS, function search_path, and vector extension

-- ==============================================
-- 1. CREATE EXTENSIONS SCHEMA AND MOVE VECTOR
-- ==============================================

-- Create dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension from public to extensions schema
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Update database search path
ALTER DATABASE postgres SET search_path TO public, extensions, pg_temp;

-- ==============================================
-- 2. ENABLE RLS ON ALL TABLES
-- ==============================================

-- Enable RLS on books table
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Enable RLS on search_logs table
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 3. DROP EXISTING POLICIES (if any)
-- ==============================================

-- Drop existing policies on books table
DROP POLICY IF EXISTS "Allow public read access to books" ON public.books;
DROP POLICY IF EXISTS "Allow service role full access to books" ON public.books;

-- Drop existing policies on search_logs table
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.search_logs;
DROP POLICY IF EXISTS "Allow select for service role only" ON public.search_logs;

-- ==============================================
-- 4. CREATE SECURE RLS POLICIES
-- ==============================================

-- Books table policies
CREATE POLICY "Allow public read access to books" ON public.books
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Allow service role full access to books" ON public.books
    FOR ALL 
    TO service_role 
    USING (true);

-- Search logs table policies
CREATE POLICY "Allow insert for authenticated users" ON public.search_logs
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow select for service role only" ON public.search_logs
    FOR SELECT 
    TO service_role 
    USING (true);

-- ==============================================
-- 5. CREATE SECURE SEARCH FUNCTION
-- ==============================================

-- Drop the existing function
DROP FUNCTION IF EXISTS public.search_books_by_similarity(vector, double precision, integer);

-- Create secure function with proper search path
CREATE OR REPLACE FUNCTION public.search_books_by_similarity(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id integer,
  gutenberg_id integer,
  title text,
  author text,
  description text,
  subjects text[],
  languages text[],
  bookshelves text[],
  created_at timestamptz,
  updated_at timestamptz,
  embedding vector(1536),
  similarity float
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT
    b.id,
    b.gutenberg_id,
    b.title,
    b.author,
    b.description,
    b.subjects,
    b.languages,
    b.bookshelves,
    b.created_at,
    b.updated_at,
    b.embedding,
    1 - (b.embedding <=> query_embedding) AS similarity
  FROM public.books b
  WHERE b.embedding IS NOT NULL
    AND 1 - (b.embedding <=> query_embedding) > match_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ==============================================
-- 6. GRANT FUNCTION PERMISSIONS
-- ==============================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_books_by_similarity(vector, double precision, integer) TO authenticated;

-- Grant execute permission to anon users
GRANT EXECUTE ON FUNCTION public.search_books_by_similarity(vector, double precision, integer) TO anon;

-- ==============================================
-- 7. COMPREHENSIVE VERIFICATION
-- ==============================================

-- Check extension location
SELECT 'Extension Location:' as info;
SELECT 
  extname as extension_name,
  nspname as schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'vector';

-- Check RLS status
SELECT 'RLS Status:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('books', 'search_logs')
ORDER BY tablename;

-- Check policies
SELECT 'Policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('books', 'search_logs')
ORDER BY tablename, policyname;

-- Check function security
SELECT 'Function Security:' as info;
SELECT 
  routine_name,
  security_type,
  is_deterministic,
  sql_data_access
FROM information_schema.routines 
WHERE routine_name = 'search_books_by_similarity' 
AND routine_schema = 'public';

-- Check search path
SELECT 'Search Path:' as info;
SHOW search_path;

-- ==============================================
-- 8. TEST (Optional - uncomment to test)
-- ==============================================

-- Test function access
-- SELECT COUNT(*) as book_count FROM public.books;

-- Test function execution (if you have embeddings)
-- SELECT * FROM public.search_books_by_similarity(
--   (SELECT embedding FROM public.books WHERE embedding IS NOT NULL LIMIT 1),
--   0.0,
--   5
-- );



