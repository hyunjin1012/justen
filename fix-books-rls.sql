-- Fix RLS for books table specifically
-- Run these commands in your Supabase SQL Editor

-- First, check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'books';

-- Enable RLS on the books table
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on books table (in case they exist)
DROP POLICY IF EXISTS "Allow public read access to books" ON public.books;
DROP POLICY IF EXISTS "Allow service role full access to books" ON public.books;

-- Create policy for public read access to books (for search functionality)
CREATE POLICY "Allow public read access to books" ON public.books
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- Create policy for service role full access (for seeding and admin operations)
CREATE POLICY "Allow service role full access to books" ON public.books
    FOR ALL 
    TO service_role 
    USING (true);

-- Verify RLS is now enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'books';

-- Check that policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'books';

