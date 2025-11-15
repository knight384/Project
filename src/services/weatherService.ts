import { WeatherData, ForecastData, WeatherError } from '@/types';

const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_OPENWEATHER_BASE_URL;

if (!API_KEY || !BASE_URL) {
  console.warn('OpenWeatherMap API credentials not found in environment variables');
}

class WeatherService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
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

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
    if (!API_KEY || !BASE_URL) {
      throw new WeatherError('Weather API configuration error', 401);
    }

    const cacheKey = `weather_${lat}_${lon}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [currentResponse, forecastResponse] = await Promise.all([
        this.fetchWithRetry(
          `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        ),
        this.fetchWithRetry(
          `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        )
      ]);

      if (!currentResponse.ok) {
        if (currentResponse.status === 404) {
          throw new WeatherError('Location not found', 404);
        } else if (currentResponse.status === 401) {
          throw new WeatherError('Invalid API key', 401);
        } else {
          throw new WeatherError('Weather data unavailable', currentResponse.status);
        }
      }

      if (!forecastResponse.ok) {
        throw new WeatherError('Forecast data unavailable', forecastResponse.status);
      }

      const currentData = await currentResponse.json();
      const forecastData: ForecastData = await forecastResponse.json();

      const weatherData: WeatherData = {
        location: {
          name: currentData.name,
          country: currentData.sys.country,
          lat: currentData.coord.lat,
          lon: currentData.coord.lon,
        },
        current: {
          temperature: Math.round(currentData.main.temp),
          feels_like: Math.round(currentData.main.feels_like),
          humidity: currentData.main.humidity,
          pressure: currentData.main.pressure,
          wind_speed: currentData.wind.speed,
          wind_direction: currentData.wind.deg,
          visibility: currentData.visibility || 10000,
          uv_index: 0, // Not available in basic API
          conditions: {
            main: currentData.weather[0].main,
            description: currentData.weather[0].description,
            icon: currentData.weather[0].icon,
          },
        },
        forecast: this.transformForecastData(forecastData),
      };

      this.setCachedData(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      if (error instanceof WeatherError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
        throw new WeatherError('Weather service temporarily unavailable', 503);
      }

      throw new WeatherError('Failed to fetch weather data', 500);
    }
  }

  async getForecast(lat: number, lon: number): Promise<ForecastData> {
    if (!API_KEY || !BASE_URL) {
      throw new WeatherError('Weather API configuration error', 401);
    }

    const cacheKey = `forecast_${lat}_${lon}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(
        `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new WeatherError('Forecast data unavailable', response.status);
      }

      const data: ForecastData = await response.json();
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      if (error instanceof WeatherError) {
        throw error;
      }
      throw new WeatherError('Failed to fetch forecast data', 500);
    }
  }

  async reverseGeocode(lat: number, lon: number): Promise<string> {
    if (!API_KEY || !BASE_URL) {
      throw new WeatherError('Weather API configuration error', 401);
    }

    const cacheKey = `reverse_${lat}_${lon}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(
        `${BASE_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
      );

      if (!response.ok) {
        throw new WeatherError('Reverse geocoding failed', response.status);
      }

      const data = await response.json();
      const cityName = data[0]?.name || 'Unknown Location';

      this.setCachedData(cacheKey, cityName);
      return cityName;
    } catch (error) {
      if (error instanceof WeatherError) {
        throw error;
      }
      throw new WeatherError('Failed to reverse geocode', 500);
    }
  }

  private transformForecastData(forecastData: ForecastData): WeatherData['forecast'] {
    // Group forecast data by day and get daily high/low
    const dailyData = new Map<string, {
      temps: number[];
      conditions: string[];
      icons: string[];
      precipitation: number[];
      date: string;
    }>();

    forecastData.list.forEach(item => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];

      if (!dailyData.has(date)) {
        dailyData.set(date, {
          temps: [],
          conditions: [],
          icons: [],
          precipitation: [],
          date: date
        });
      }

      const day = dailyData.get(date)!;
      day.temps.push(item.main.temp);
      day.conditions.push(item.weather[0].description);
      day.icons.push(item.weather[0].icon);
      day.precipitation.push(item.pop * 100);
    });

    // Transform to forecast format and limit to 5 days
    return Array.from(dailyData.values())
      .slice(0, 5)
      .map(day => ({
        date: day.date,
        high: Math.round(Math.max(...day.temps)),
        low: Math.round(Math.min(...day.temps)),
        conditions: day.conditions[0], // Most common condition
        icon: day.icons[0], // Most common icon
        precipitation_chance: Math.round(Math.max(...day.precipitation))
      }));
  }
}

export const weatherService = new WeatherService();