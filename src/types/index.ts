export * from './weather';
export * from './news';
export * from './location';

// Common error classes
export class AppError extends Error {
  constructor(message: string, public code: number, public type: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class WeatherError extends AppError {
  constructor(message: string, code: number) {
    super(message, code, 'WeatherError');
    this.name = 'WeatherError';
  }
}

export class NewsError extends AppError {
  constructor(message: string, code: number) {
    super(message, code, 'NewsError');
    this.name = 'NewsError';
  }
}

export class LocationError extends AppError {
  constructor(message: string, code: number) {
    super(message, code, 'LocationError');
    this.name = 'LocationError';
  }
}