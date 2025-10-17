-- Complete RLS setup for Gutenberg Search application
-- Run these commands in your Supabase SQL Editor

-- ==============================================
-- 1. CHECK CURRENT STATUS
-- ==============================================
SELECT 'Current RLS Status:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('books', 'search_logs')
ORDER BY tablename;

-- ==============================================
-- 2. ENABLE RLS ON BOTH TABLES
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
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.books;
DROP POLICY IF EXISTS "Allow select for service role only" ON public.books;

-- Drop existing policies on search_logs table
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.search_logs;
DROP POLICY IF EXISTS "Allow select for service role only" ON public.search_logs;
DROP POLICY IF EXISTS "Allow admin access to search logs" ON public.search_logs;

-- ==============================================
-- 4. CREATE POLICIES FOR BOOKS TABLE
-- ==============================================

-- Allow public read access to books (for search functionality)
CREATE POLICY "Allow public read access to books" ON public.books
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- Allow service role full access to books (for seeding and admin operations)
CREATE POLICY "Allow service role full access to books" ON public.books
    FOR ALL 
    TO service_role 
    USING (true);

-- ==============================================
-- 5. CREATE POLICIES FOR SEARCH_LOGS TABLE
-- ==============================================

-- Allow INSERT for authenticated users (your app can log searches)
CREATE POLICY "Allow insert for authenticated users" ON public.search_logs
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Allow SELECT only for service role (admin access only)
CREATE POLICY "Allow select for service role only" ON public.search_logs
    FOR SELECT 
    TO service_role 
    USING (true);

-- ==============================================
-- 6. VERIFY THE SETUP
-- ==============================================

SELECT 'Final RLS Status:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('books', 'search_logs')
ORDER BY tablename;

SELECT 'Created Policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('books', 'search_logs')
ORDER BY tablename, policyname;

-- ==============================================
-- 7. TEST ACCESS (Optional - for verification)
-- ==============================================

-- Test that public can read books (this should work)
-- SELECT COUNT(*) as book_count FROM public.books;

-- Test that service role can read search_logs (this should work for service role)
-- SELECT COUNT(*) as log_count FROM public.search_logs;

