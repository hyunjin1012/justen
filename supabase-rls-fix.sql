-- Fix Row Level Security (RLS) for search_logs table
-- Run these commands in your Supabase SQL Editor

-- Enable RLS on the search_logs table
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows INSERT operations for authenticated users
-- This allows your application to log search queries
CREATE POLICY "Allow insert for authenticated users" ON public.search_logs
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Create a policy that allows SELECT operations only for service role
-- This prevents regular users from reading search logs
CREATE POLICY "Allow select for service role only" ON public.search_logs
    FOR SELECT 
    TO service_role 
    USING (true);

-- Optional: Create a policy for admin users if you have an admin role
-- Uncomment and modify if you have admin users who should access logs
-- CREATE POLICY "Allow admin access to search logs" ON public.search_logs
--     FOR ALL 
--     TO authenticated 
--     USING (
--         EXISTS (
--             SELECT 1 FROM auth.users 
--             WHERE auth.users.id = auth.uid() 
--             AND auth.users.raw_user_meta_data->>'role' = 'admin'
--         )
--     );

-- Also enable RLS on the books table for consistency
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Allow public read access to books (since this is a public search app)
CREATE POLICY "Allow public read access to books" ON public.books
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

-- Allow service role full access to books (for seeding and updates)
CREATE POLICY "Allow service role full access to books" ON public.books
    FOR ALL 
    TO service_role 
    USING (true);

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('books', 'search_logs');

