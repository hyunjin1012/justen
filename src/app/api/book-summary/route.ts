import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const GUTENDEX_API_URL = 'https://gutendex.com/books/';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('id');

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    console.log(`📖 Fetching summary for book ID: ${bookId}`);

    // Fetch book metadata from Gutendex API
    // Note: Gutendex API may have SSL certificate issues, so we handle ALL errors gracefully
    let response;
    try {
      response = await fetch(`${GUTENDEX_API_URL}?ids=${bookId}`, {
        headers: {
          'User-Agent': 'Gutenberg-Search-App/1.0',
        },
      });
    } catch (fetchError: unknown) {
      // Handle ALL fetch errors gracefully (SSL certificate errors, network issues, etc.)
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error(`❌ Fetch error for book ${bookId}:`, errorMessage);
      console.log(`⚠️ Returning empty summary for book ${bookId} due to fetch error`);
      return NextResponse.json({
        success: true,
        summary: null,
        hasSummary: false,
      });
    }

    if (!response.ok) {
      console.error(`❌ HTTP error for book ${bookId}:`, response.status);
      return NextResponse.json({
        success: true,
        summary: null,
        hasSummary: false,
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error(`❌ JSON parse error for book ${bookId}:`, jsonError);
      return NextResponse.json({
        success: true,
        summary: null,
        hasSummary: false,
      });
    }

    const results = data.results;

    if (!results || results.length === 0) {
      console.log(`ℹ️ Book ${bookId} not found in Gutendex`);
      return NextResponse.json({
        success: true,
        summary: null,
        hasSummary: false,
      });
    }

    const book = results[0];
    
    // Gutendex API provides summaries array - use the first one if available
    const summaries = book.summaries as string[] | undefined;
    console.log(`📖 Book ${bookId} summaries:`, summaries);
    
    let summary = summaries && summaries.length > 0 ? summaries[0] : null;

    // Remove the automatic disclaimer that Gutendex adds
    if (summary) {
      summary = summary
        .replace(/\s*\(This is an automatically generated summary\.\)\s*$/i, '')
        .replace(/\s*\(This is an automatically generated summary\)\s*$/i, '')
        .trim();
      console.log(`✅ Cleaned summary for book ${bookId}:`, summary.substring(0, 100) + '...');
    } else {
      console.log(`ℹ️ No summary found for book ${bookId}`);
    }

    return NextResponse.json({
      success: true,
      summary: summary,
      hasSummary: !!summary,
    });

  } catch (error) {
    // Handle ALL unexpected errors gracefully - return success with no summary
    console.error(`❌ Unexpected error for book summary:`, error);
    return NextResponse.json({
      success: true,
      summary: null,
      hasSummary: false,
    });
  }
}

