import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/services/newsService';
import { NEWS_CATEGORIES } from '@/types/news';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15;

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] :
             request.headers.get('x-real-ip') ||
             'unknown';
  return ip;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'general';
    const country = searchParams.get('country') || 'us';
    const pageSize = searchParams.get('pageSize') || '20';
    const query = searchParams.get('query'); // For search functionality

    // Validate category
    if (category !== 'all' && !NEWS_CATEGORIES.includes(category as any)) {
      return NextResponse.json(
        {
          error: 'Invalid category. Must be one of: ' + ['all', ...NEWS_CATEGORIES].join(', ')
        },
        { status: 400 }
      );
    }

    // Validate country code (2 letters)
    if (!/^[a-z]{2}$/i.test(country)) {
      return NextResponse.json(
        { error: 'Invalid country code. Must be a 2-letter ISO country code' },
        { status: 400 }
      );
    }

    // Validate pageSize
    const pageSizeNum = parseInt(pageSize);
    if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 50) {
      return NextResponse.json(
        { error: 'Invalid pageSize. Must be a number between 1 and 50' },
        { status: 400 }
      );
    }

    let articles;

    if (query) {
      // Search functionality
      if (query.length < 2) {
        return NextResponse.json(
          { error: 'Search query must be at least 2 characters long' },
          { status: 400 }
        );
      }
      articles = await newsService.searchNews(query, category === 'all' ? undefined : category);
    } else {
      // Get top headlines
      articles = await newsService.getTopHeadlines(
        category === 'all' ? undefined : category,
        country.toLowerCase()
      );
    }

    // Limit results to requested page size
    const limitedArticles = articles.slice(0, pageSizeNum);

    // Add CORS headers
    const response = NextResponse.json({
      articles: limitedArticles,
      totalResults: articles.length,
      category: category,
      country: country.toLowerCase(),
      query: query || null,
      lastUpdated: new Date().toISOString(),
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error: any) {
    console.error('News API error:', error);

    // Handle specific error types
    if (error.code) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code }
      );
    }

    // Handle network errors
    if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { error: 'News service temporarily unavailable' },
        { status: 503 }
      );
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle POST requests for more complex queries or future features
export async function POST(request: NextRequest) {
  try {
    const rateLimitKey = getRateLimitKey(request);
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { action, ...params } = body;

    if (action === 'categories') {
      const categories = await newsService.getCategories();
      return NextResponse.json({
        categories: ['all', ...categories],
        lastUpdated: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('News POST API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}