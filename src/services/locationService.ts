import { CitySearchResult, LocationError, UserPreferences, GeolocationPosition } from '@/types';

const GEOCODING_API_KEY = process.env.NEXT_PUBLIC_GEOCODING_API_KEY;
const GEOCODING_BASE_URL = process.env.NEXT_PUBLIC_GEOCODING_BASE_URL;

if (!GEOCODING_API_KEY || !GEOCODING_BASE_URL) {
  console.warn('Geocoding API credentials not found in environment variables');
}

class LocationService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly SEARCH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly REVERSE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private watchId: number | null = null;

  private getCachedData(key: string, isReverse = false): any | null {
    const cached = this.cache.get(key);
    const duration = isReverse ? this.REVERSE_CACHE_DURATION : this.SEARCH_CACHE_DURATION;
    if (cached && Date.now() - cached.timestamp < duration) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any, isReverse = false): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new LocationError('Geolocation not supported by this browser', 400));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new LocationError('Location permission denied', 403));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new LocationError('Location information unavailable', 503));
              break;
            case error.TIMEOUT:
              reject(new LocationError('Location request timed out', 408));
              break;
            default:
              reject(new LocationError('Unknown location error', 500));
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  watchPosition(callback: PositionCallback): number {
    if (!navigator.geolocation) {
      throw new LocationError('Geolocation not supported by this browser', 400);
    }

    this.watchId = navigator.geolocation.watchPosition(
      callback,
      (error) => {
        console.error('Location watch error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );

    return this.watchId;
  }

  clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      if (this.watchId === watchId) {
        this.watchId = null;
      }
    }
  }

  async searchCities(query: string): Promise<CitySearchResult[]> {
    if (!query || query.trim().length < 3) {
      throw new LocationError('Search query must be at least 3 characters', 400);
    }

    if (!GEOCODING_API_KEY || !GEOCODING_BASE_URL) {
      throw new LocationError('Geocoding API configuration error', 401);
    }

    const trimmedQuery = query.trim();
    const cacheKey = `search_${encodeURIComponent(trimmedQuery)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams({
        key: GEOCODING_API_KEY,
        q: trimmedQuery,
        limit: '5',
      });

      const response = await this.fetchWithRetry(`${GEOCODING_BASE_URL}/json?${params}`);

      if (!response.ok) {
        if (response.status === 400) {
          throw new LocationError('Invalid search parameters', 400);
        } else if (response.status === 402) {
          throw new LocationError('API quota exceeded', 429);
        } else if (response.status === 429) {
          throw new LocationError('Rate limit exceeded', 429);
        } else {
          throw new LocationError('City search unavailable', response.status);
        }
      }

      const data = await response.json();

      if (data.status.code !== 200) {
        throw new LocationError(data.status.message || 'Search failed', 500);
      }

      const results: CitySearchResult[] = data.results
        .filter((result: any) => result.components.city || result.components.town || result.components.village)
        .map((result: any) => ({
          name: result.formatted,
          country: result.components.country,
          state: result.components.state || result.components.region,
          lat: result.geometry.lat,
          lon: result.geometry.lng,
          population: result.annotations?.population?.value || undefined,
        }))
        .sort((a: CitySearchResult, b: CitySearchResult) => {
          // Prioritize results with population data
          if (a.population && b.population) {
            return b.population - a.population;
          }
          if (a.population) return -1;
          if (b.population) return 1;
          return a.name.localeCompare(b.name);
        });

      this.setCachedData(cacheKey, results);
      return results;
    } catch (error) {
      if (error instanceof LocationError) {
        throw error;
      }

      if (error instanceof Error && (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT'))) {
        throw new LocationError('Location service temporarily unavailable', 503);
      }

      throw new LocationError('Failed to search cities', 500);
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<CitySearchResult> {
    if (!GEOCODING_API_KEY || !GEOCODING_BASE_URL) {
      throw new LocationError('Geocoding API configuration error', 401);
    }

    const cacheKey = `reverse_${lat}_${lon}`;
    const cached = this.getCachedData(cacheKey, true);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams({
        key: GEOCODING_API_KEY,
        q: `${lat},${lon}`,
        limit: '1',
      });

      const response = await this.fetchWithRetry(`${GEOCODING_BASE_URL}/reverse?${params}`);

      if (!response.ok) {
        throw new LocationError('Reverse geocoding failed', response.status);
      }

      const data = await response.json();

      if (data.status.code !== 200 || !data.results.length) {
        throw new LocationError('Location not found', 404);
      }

      const result = data.results[0];
      const cityResult: CitySearchResult = {
        name: result.formatted,
        country: result.components.country,
        state: result.components.state || result.components.region,
        lat: result.geometry.lat,
        lon: result.geometry.lng,
        population: result.annotations?.population?.value || undefined,
      };

      this.setCachedData(cacheKey, cityResult, true);
      return cityResult;
    } catch (error) {
      if (error instanceof LocationError) {
        throw error;
      }
      throw new LocationError('Failed to reverse geocode', 500);
    }
  }

  // Fallback to IP-based location (using a free service)
  async getIPLocation(): Promise<{ lat: number; lon: number; city: string; country: string }> {
    try {
      const response = await this.fetchWithRetry('https://ipapi.co/json/');
      if (!response.ok) {
        throw new LocationError('IP location service unavailable', response.status);
      }

      const data = await response.json();
      return {
        lat: data.latitude,
        lon: data.longitude,
        city: data.city || 'Unknown',
        country: data.country_name || 'Unknown',
      };
    } catch (error) {
      throw new LocationError('Failed to get IP-based location', 500);
    }
  }

  // User preferences management
  getUserPreferences(): UserPreferences {
    const stored = localStorage.getItem('userPreferences');
    if (!stored) {
      return this.getDefaultPreferences();
    }

    try {
      const prefs = JSON.parse(stored);
      return {
        ...this.getDefaultPreferences(),
        ...prefs,
      };
    } catch (error) {
      console.error('Failed to parse user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  setUserPreferences(prefs: Partial<UserPreferences>): void {
    const currentPrefs = this.getUserPreferences();
    const newPrefs = { ...currentPrefs, ...prefs };
    localStorage.setItem('userPreferences', JSON.stringify(newPrefs));
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      location: {
        city: 'New York',
        lat: 40.7128,
        lon: -74.0060,
        method: 'manual',
        lastUpdated: new Date().toISOString(),
      },
      units: {
        temperature: 'celsius',
        windSpeed: 'ms',
      },
      news: {
        preferredCategory: 'general',
        lastCategories: [],
      },
    };
  }
}

export const locationService = new LocationService();