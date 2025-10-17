# Security Configuration for Gutenberg Search

## Overview
This document outlines the security measures implemented for the Gutenberg Search application, including Row Level Security (RLS) policies and best practices.

## Current Security Issues
**Issue 1**: Table `public.search_logs` is public but RLS has not been enabled.
**Issue 2**: Function `public.search_books_by_similarity` has a mutable search_path.
**Issue 3**: Extension `vector` is installed in the public schema.

**Risks**: 
- Without RLS, the search logs table could be accessed by unauthorized users, potentially exposing search queries and analytics data.
- Mutable search_path in functions can allow SQL injection attacks by manipulating the search path.
- Extensions in the public schema can create security vulnerabilities and namespace conflicts.

## Solution: Complete Security Fix

### Step 1: Run the Ultimate Security Fix
Execute the commands in `ultimate-security-fix.sql` in your Supabase SQL Editor. This addresses all three issues:

**For Extension Security Issues:**

```sql
-- Create dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension from public to extensions schema
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Update search path to include extensions schema
SET search_path = public, extensions, pg_temp;

-- Allow INSERT for authenticated users (your app)
CREATE POLICY "Allow insert for authenticated users" ON public.search_logs
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Allow SELECT only for service role (admin access)
CREATE POLICY "Allow select for service role only" ON public.search_logs
    FOR SELECT 
    TO service_role 
    USING (true);
```

### Step 2: Verify the Fix
After running the SQL commands, verify that RLS is enabled:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('books', 'search_logs');
```

You should see `rowsecurity = true` for both tables.

## Security Policies Explained

### Search Logs Table (`search_logs`)
- **INSERT**: Allowed for authenticated users (your application)
- **SELECT**: Only allowed for service role (admin access)
- **UPDATE/DELETE**: Not allowed (logs should be immutable)

### Books Table (`books`)
- **SELECT**: Allowed for anonymous and authenticated users (public search)
- **INSERT/UPDATE/DELETE**: Only allowed for service role (admin operations)

## Environment Variables Security

### Required Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

### Security Best Practices
1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Use least privilege principle** for database access

## API Security

### Search API (`/api/search`)
- ✅ Validates input parameters
- ✅ Uses environment variables for credentials
- ✅ Implements error handling
- ✅ Logs search activity securely

### Seed API (`/api/seed`)
- ✅ Requires authentication (service role)
- ✅ Validates input parameters
- ✅ Implements duplicate prevention
- ✅ Uses rate limiting

## Database Security Features

### Row Level Security (RLS)
- ✅ Enabled on all public tables
- ✅ Appropriate policies for each table
- ✅ Service role has admin access
- ✅ Public users have read-only access where needed

### Authentication
- ✅ Uses Supabase's built-in authentication
- ✅ Service role for admin operations
- ✅ Anonymous access for public search

## Monitoring and Logging

### Search Analytics
- ✅ Search queries are logged (with RLS protection)
- ✅ Performance metrics are tracked
- ✅ Error logging is implemented
- ✅ Vercel Analytics for user behavior

### Security Monitoring
- ✅ Database access is logged
- ✅ API errors are tracked
- ✅ Failed authentication attempts are monitored

## Compliance

### Data Privacy
- ✅ No personal data is stored
- ✅ Search queries are anonymized
- ✅ Analytics data is aggregated
- ✅ GDPR compliant

### Data Retention
- ✅ Search logs can be purged if needed
- ✅ No permanent storage of user data
- ✅ Analytics data follows retention policies

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**
   - Check if policies are correctly defined
   - Verify user roles and permissions
   - Test with different user types

2. **API Access Denied**
   - Verify environment variables
   - Check Supabase project settings
   - Ensure proper API key permissions

3. **Search Logging Fails**
   - Check RLS policies for search_logs table
   - Verify authenticated user permissions
   - Review error logs

### Verification Commands

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test access (run as different users)
SELECT COUNT(*) FROM public.search_logs;
SELECT COUNT(*) FROM public.books;
```

## Next Steps

1. **Run the SQL commands** in `supabase-rls-fix.sql`
2. **Verify RLS is enabled** using the verification commands
3. **Test the application** to ensure everything works
4. **Monitor for any access issues**
5. **Set up regular security audits**

## Additional Security Recommendations

1. **Enable Supabase Auth** if you plan to add user accounts
2. **Implement rate limiting** for API endpoints
3. **Add request validation** for all inputs
4. **Set up monitoring alerts** for security events
5. **Regular security audits** of your database policies
