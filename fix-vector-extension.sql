-- Fix vector extension security issue
-- Move vector extension from public schema to a dedicated schema

-- ==============================================
-- 1. CREATE DEDICATED SCHEMA FOR EXTENSIONS
-- ==============================================

-- Create a dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- ==============================================
-- 2. MOVE VECTOR EXTENSION TO NEW SCHEMA
-- ==============================================

-- Drop the vector extension from public schema
DROP EXTENSION IF EXISTS vector CASCADE;

-- Install vector extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- ==============================================
-- 3. UPDATE SEARCH PATH
-- ==============================================

-- Update the search path to include the extensions schema
-- This allows the vector extension to be found automatically
ALTER DATABASE postgres SET search_path TO public, extensions, pg_temp;

-- ==============================================
-- 4. UPDATE THE SEARCH FUNCTION
-- ==============================================

-- Drop the existing function
DROP FUNCTION IF EXISTS public.search_books_by_similarity(vector, double precision, integer);

-- Recreate the function with updated search path
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
-- 5. GRANT PERMISSIONS
-- ==============================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_books_by_similarity(vector, double precision, integer) TO authenticated;

-- Grant execute permission to anon users
GRANT EXECUTE ON FUNCTION public.search_books_by_similarity(vector, double precision, integer) TO anon;

-- ==============================================
-- 6. VERIFICATION
-- ==============================================

-- Check that vector extension is in the extensions schema
SELECT 
  extname as extension_name,
  nspname as schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'vector';

-- Check current search path
SHOW search_path;

-- Test the function (optional - uncomment to test)
-- SELECT * FROM public.search_books_by_similarity(
--   (SELECT embedding FROM public.books WHERE embedding IS NOT NULL LIMIT 1),
--   0.0,
--   5
-- );






