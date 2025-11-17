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
    const response = await fetch(`${GUTENDEX_API_URL}?ids=${bookId}`, {
      headers: {
        'User-Agent': 'Gutenberg-Search-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch book: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results;

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const book = results[0];
    
    // Gutendex API provides summaries array - use the first one if available
    const summaries = book.summaries as string[] | undefined;
    let summary = summaries && summaries.length > 0 ? summaries[0] : null;

    // Remove the automatic disclaimer that Gutendex adds
    if (summary) {
      summary = summary
        .replace(/\s*\(This is an automatically generated summary\.\)\s*$/i, '')
        .replace(/\s*\(This is an automatically generated summary\)\s*$/i, '')
        .trim();
    }

    return NextResponse.json({
      success: true,
      summary: summary,
      hasSummary: !!summary,
    });

  } catch (error) {
    console.error('Book summary API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch book summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

