import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test API route started');
    
    const { query } = await request.json();
    console.log('🧪 Test query received:', query);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test API working',
      query: query 
    });
    
  } catch (error) {
    console.error('❌ Test API error:', error);
    return NextResponse.json(
      { 
        error: 'Test API failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
