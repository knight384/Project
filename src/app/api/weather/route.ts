import { NextRequest, NextResponse } from 'next/server';
import { weatherService } from '@/services/weatherService';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

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
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const units = searchParams.get('units') || 'metric';

    // Validate required parameters
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat and lon are required' },
        { status: 400 }
      );
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return NextResponse.json(
        { error: 'Invalid coordinates. lat and lon must be valid numbers' },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinate ranges. lat must be -90 to 90, lon must be -180 to 180' },
        { status: 400 }
      );
    }

    // Validate units parameter
    if (!['metric', 'imperial'].includes(units)) {
      return NextResponse.json(
        { error: 'Invalid units parameter. Must be "metric" or "imperial"' },
        { status: 400 }
      );
    }

    // Fetch weather data
    const weatherData = await weatherService.getCurrentWeather(latNum, lonNum);

    // Add CORS headers
    const response = NextResponse.json({
      data: weatherData,
      lastUpdated: new Date().toISOString(),
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error: any) {
    console.error('Weather API error:', error);

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
        { error: 'Weather service temporarily unavailable' },
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

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}