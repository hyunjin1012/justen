# Vercel Analytics Setup

## Overview
Vercel Analytics has been successfully integrated into your Gutenberg Search application to provide insights into user behavior and application performance.

## What's Tracked

### 🔍 **Search Analytics**
- **Search Queries**: What users are searching for
- **Search Performance**: How long searches take
- **Search Results**: Number of results returned and top similarity scores
- **Search Errors**: When searches fail and why

### 🎯 **User Interactions**
- **Example Query Clicks**: Which example searches users click
- **Recent Search Clicks**: When users reuse previous searches
- **Book ID Copies**: When users copy Gutenberg IDs
- **Gutenberg Link Clicks**: When users click to read books on Project Gutenberg

### 📊 **Custom Events**
The following custom events are tracked with detailed metadata:

1. **`search_completed`**
   - `query`: The search term used
   - `results_count`: Number of results returned
   - `search_time`: Time taken for the search (ms)
   - `top_similarity`: Similarity score of the top result

2. **`search_error`**
   - `query`: The search term that failed
   - `error_message`: Specific error message

3. **`example_query_clicked`**
   - `query`: The example query clicked
   - `icon`: The emoji icon associated with the query

4. **`recent_search_clicked`**
   - `query`: The recent search that was reused

5. **`book_id_copied`**
   - `gutenberg_id`: The ID that was copied

6. **`gutenberg_link_clicked`**
   - `gutenberg_id`: The book ID
   - `book_title`: The title of the book
   - `similarity`: The similarity score of the book

## How to View Analytics

1. **Deploy to Vercel**: Analytics only work in production
2. **Access Vercel Dashboard**: Go to your project in the Vercel dashboard
3. **View Analytics Tab**: Click on the "Analytics" tab to see:
   - Page views and unique visitors
   - Custom events and their metadata
   - Performance metrics
   - User behavior patterns

## Benefits

### 📈 **Performance Insights**
- Monitor search response times
- Identify slow queries
- Track error rates

### 🎯 **User Behavior**
- Understand what users are searching for
- See which example queries are most popular
- Track engagement with search results

### 🔧 **Product Improvements**
- Identify common search patterns
- Optimize search performance
- Improve user experience based on data

## Privacy & Compliance

- Vercel Analytics is privacy-focused
- No personal data is collected
- Complies with GDPR and other privacy regulations
- Analytics data is aggregated and anonymized

## Development vs Production

- **Development**: Analytics events are logged to console but not sent
- **Production**: Analytics events are sent to Vercel's servers
- **Local Testing**: Use `npm run dev` to test analytics integration

## Next Steps

1. Deploy your application to Vercel
2. Wait 24-48 hours for initial data to populate
3. Check the Analytics tab in your Vercel dashboard
4. Use the insights to improve your application

## Troubleshooting

If analytics aren't showing up:
1. Ensure you're viewing the production deployment
2. Check that the `@vercel/analytics` package is properly installed
3. Verify the `<Analytics />` component is in your layout
4. Wait 24-48 hours for data to appear in the dashboard
