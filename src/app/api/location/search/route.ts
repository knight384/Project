import { NextRequest, NextResponse } from 'next/server';
import { locationService } from '@/services/locationService';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number; lastSearch: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;
const SEARCH_COOLDOWN = 1000; // 1 second between searches

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] :
             request.headers.get('x-real-ip') ||
             'unknown';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
      lastSearch: now
    });
    return { allowed: true };
  }

  // Check search cooldown
  if (now - record.lastSearch < SEARCH_COOLDOWN) {
    return {
      allowed: false,
      error: 'Please wait a moment before searching again'
    };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      error: 'Search rate limit exceeded. Please try again later.'
    };
  }

  record.count++;
  record.lastSearch = now;
  return { allowed: true };
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateLimitCheck = checkRateLimit(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error },
        { status: 429 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '5';

    // Validate search query
    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        {
          error: 'Search query must be at least 3 characters long',
          received: query
        },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    // Validate and sanitize limit
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 10) {
      return NextResponse.json(
        {
          error: 'Invalid limit parameter. Must be a number between 1 and 10',
          received: limit
        },
        { status: 400 }
      );
    }

    // Input sanitization
    if (/[<>]/.test(trimmedQuery)) {
      return NextResponse.json(
        { error: 'Search query contains invalid characters' },
        { status: 400 }
      );
    }

    // Perform city search
    const results = await locationService.searchCities(trimmedQuery);

    // Limit results
    const limitedResults = results.slice(0, limitNum);

    // Add CORS headers
    const response = NextResponse.json({
      results: limitedResults,
      total: results.length,
      query: trimmedQuery,
      lastUpdated: new Date().toISOString(),
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error: any) {
    console.error('Location search API error:', error);

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
        { error: 'Location search service temporarily unavailable' },
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

// Handle POST requests for reverse geocoding
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateLimitCheck = checkRateLimit(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.error },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { action, lat, lon } = body;

    if (action === 'reverse') {
      // Validate coordinates
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        return NextResponse.json(
          { error: 'Invalid coordinates. lat and lon must be numbers' },
          { status: 400 }
        );
      }

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return NextResponse.json(
          { error: 'Invalid coordinate ranges. lat must be -90 to 90, lon must be -180 to 180' },
          { status: 400 }
        );
      }

      // Perform reverse geocoding
      const result = await locationService.reverseGeocode(lat, lon);

      // Add CORS headers
      const response = NextResponse.json({
        result,
        lastUpdated: new Date().toISOString(),
      });

      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: reverse' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Location POST API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (error.code) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code }
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