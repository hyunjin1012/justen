-- Fix search_books_by_similarity function security
-- This addresses the "mutable search_path" security issue

-- ==============================================
-- 1. DROP THE EXISTING FUNCTION
-- ==============================================
DROP FUNCTION IF EXISTS public.search_books_by_similarity(vector, double precision, integer);

-- ==============================================
-- 2. CREATE SECURE FUNCTION WITH IMMUTABLE SEARCH_PATH
-- ==============================================
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
SET search_path = public, pg_temp
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
-- 3. GRANT APPROPRIATE PERMISSIONS
-- ==============================================

-- Grant execute permission to authenticated users (for your app)
GRANT EXECUTE ON FUNCTION public.search_books_by_similarity(vector, double precision, integer) TO authenticated;

-- Grant execute permission to anon users (for public search)
GRANT EXECUTE ON FUNCTION public.search_books_by_similarity(vector, double precision, integer) TO anon;

-- ==============================================
-- 4. VERIFY THE FUNCTION
-- ==============================================

-- Check function definition
SELECT 
  routine_name,
  routine_type,
  security_type,
  is_deterministic,
  sql_data_access,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'search_books_by_similarity' 
AND routine_schema = 'public';

-- Test the function (optional - uncomment to test)
-- SELECT * FROM public.search_books_by_similarity(
--   (SELECT embedding FROM public.books WHERE embedding IS NOT NULL LIMIT 1),
--   0.0,
--   5
-- );

