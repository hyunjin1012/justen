-- Simple fix for search_books_by_similarity function security
-- Copy and paste this entire block into Supabase SQL Editor

DROP FUNCTION IF EXISTS public.search_books_by_similarity(vector, double precision, integer);

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

GRANT EXECUTE ON FUNCTION public.search_books_by_similarity(vector, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_books_by_similarity(vector, double precision, integer) TO anon;

