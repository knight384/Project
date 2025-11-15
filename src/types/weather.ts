export interface WeatherData {
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  current: {
    temperature: number; // Celsius
    feels_like: number;
    humidity: number; // percentage
    pressure: number; // hPa
    wind_speed: number; // m/s
    wind_direction: number; // degrees
    visibility: number; // meters
    uv_index: number;
    conditions: {
      main: string; // "Clear", "Clouds", "Rain", etc.
      description: string;
      icon: string; // OpenWeatherMap icon code
    };
  };
  forecast: {
    date: string;
    high: number;
    low: number;
    conditions: string;
    icon: string;
    precipitation_chance: number; // percentage
  }[]; // 5-day forecast
}

export interface ForecastData {
  list: {
    dt: number;
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: {
      main: string;
      description: string;
      icon: string;
    }[];
    wind: {
      speed: number;
      deg: number;
    };
    pop: number; // precipitation probability
  }[];
  city: {
    name: string;
    country: string;
    coord: {
      lat: number;
      lon: number;
    };
  };
}

export interface WeatherCardProps {
  weather: WeatherData;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  lastUpdated?: Date;
}

export interface WeatherForecastProps {
  forecast: WeatherData['forecast'];
  loading?: boolean;
  error?: string;
}