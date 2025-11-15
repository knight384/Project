export interface CitySearchResult {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  population?: number;
}

export interface UserPreferences {
  location: {
    city: string;
    lat: number;
    lon: number;
    method: 'auto' | 'manual';
    lastUpdated: string;
  };
  units: {
    temperature: 'celsius' | 'fahrenheit';
    windSpeed: 'ms' | 'mph';
  };
  news: {
    preferredCategory: string;
    lastCategories: string[];
  };
}

export interface CitySelectorProps {
  currentCity?: string;
  onCityChange: (city: string, lat: number, lon: number) => void;
  loading?: boolean;
}

export interface LocationDetectorProps {
  onLocationDetected: (city: string, lat: number, lon: number) => void;
  onError?: (error: string) => void;
}

export interface GeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
  timestamp: number;
}