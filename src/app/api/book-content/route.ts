import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const GUTENBERG_BASE_URL = 'https://www.gutenberg.org';
const GUTENDEX_API_URL = 'https://gutendex.com/books/';

interface BookMetadata {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year?: number; death_year?: number }>;
  subjects: string[];
  languages: string[];
  bookshelves: string[];
  formats: Record<string, string>;
  download_count: number;
}

interface BookContent {
  metadata: BookMetadata;
  content: string;
  textUrl: string;
}

// Clean up the content by removing Project Gutenberg headers/footers
function cleanContent(content: string): string {
  const lines = content.split('\n');
  let startIndex = 0;
  let endIndex = lines.length;

  // Look for the start of actual content
  for (let i = 0; i < Math.min(lines.length, 500); i++) {
    if (lines[i].includes('*** START OF') || lines[i].includes('*** BEGIN OF')) {
      startIndex = i + 1;
      break;
    }
  }

  // Look for the end of content
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 200); i--) {
    if (lines[i].includes('*** END OF') || lines[i].includes('*** THE END')) {
      endIndex = i;
      break;
    }
  }

  // Extract the actual content
  const contentLines = lines.slice(startIndex, endIndex);
  return contentLines.join('\n').trim();
}

// Get book metadata from Gutendex API
async function getBookMetadata(bookId: string): Promise<BookMetadata | null> {
  try {
    const response = await fetch(`${GUTENDEX_API_URL}?ids=${bookId}`, {
      headers: {
        'User-Agent': 'Gutenberg-Search-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results;

    if (!results || results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error('Error fetching book metadata:', error);
    return null;
  }
}

// Get the best text URL from book formats
function getTextUrl(formats: Record<string, string>): string | null {
  // Prefer UTF-8 text, then plain text
  const textUrl = formats['text/plain; charset=utf-8'] || 
                  formats['text/plain; charset=us-ascii'] ||
                  formats['text/plain'];
  
  return textUrl || null;
}

// Fetch book content from Gutenberg
async function fetchBookContent(bookId: string): Promise<BookContent | null> {
  try {
    // First get metadata
    const metadata = await getBookMetadata(bookId);
    if (!metadata) {
      throw new Error('Book not found');
    }

    // Get the text URL
    const textUrl = getTextUrl(metadata.formats);
    if (!textUrl) {
      throw new Error('No text format available for this book');
    }

    console.log(`📖 Fetching content from: ${textUrl}`);

    // Fetch the actual content
    const contentResponse = await fetch(textUrl, {
      headers: {
        'User-Agent': 'Gutenberg-Search-App/1.0',
      },
    });

    if (!contentResponse.ok) {
      throw new Error(`Failed to fetch content: ${contentResponse.status}`);
    }

    const content = await contentResponse.text();
    const cleanedContent = cleanContent(content);

    return {
      metadata,
      content: cleanedContent,
      textUrl,
    };
  } catch (error) {
    console.error('Error fetching book content:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('id');

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    console.log(`📖 Fetching book content for ID: ${bookId}`);

    const bookContent = await fetchBookContent(bookId);

    if (!bookContent) {
      return NextResponse.json({ error: 'Book not found or content unavailable' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: bookContent,
    });

  } catch (error) {
    console.error('Book content API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch book content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
