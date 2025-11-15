'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye, RefreshCw, MapPin, AlertCircle } from 'lucide-react';
import { WeatherCardProps } from '@/types';
import { clsx } from 'clsx';

const WEATHER_ICONS: Record<string, React.ReactNode> = {
  'Clear': <Sun className="w-12 h-12 text-yellow-500" />,
  'Clouds': <Cloud className="w-12 h-12 text-gray-500" />,
  'Rain': <CloudRain className="w-12 h-12 text-blue-500" />,
  'Drizzle': <CloudRain className="w-12 h-12 text-blue-400" />,
  'Thunderstorm': <CloudRain className="w-12 h-12 text-purple-600" />,
  'Snow': <Cloud className="w-12 h-12 text-blue-200" />,
  'Mist': <Cloud className="w-12 h-12 text-gray-400" />,
  'Fog': <Cloud className="w-12 h-12 text-gray-400" />,
  'Haze': <Cloud className="w-12 h-12 text-yellow-200" />,
  'Dust': <Cloud className="w-12 h-12 text-yellow-600" />,
  'Sand': <Cloud className="w-12 h-12 text-yellow-700" />,
  'Ash': <Cloud className="w-12 h-12 text-gray-600" />,
  'Squall': <Wind className="w-12 h-12 text-gray-500" />,
  'Tornado': <Wind className="w-12 h-12 text-gray-700" />,
};

export default function WeatherCard({ weather, loading, error, onRefresh, lastUpdated }: WeatherCardProps) {
  const [refreshDisabled, setRefreshDisabled] = useState(false);

  const handleRefresh = () => {
    if (refreshDisabled || loading) return;

    setRefreshDisabled(true);
    onRefresh?.();

    setTimeout(() => {
      setRefreshDisabled(false);
    }, 2000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading && !weather) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-700 dark:to-blue-900 rounded-2xl p-6 shadow-xl">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/20 rounded w-3/4"></div>
            <div className="h-20 bg-white/20 rounded w-1/2"></div>
            <div className="h-4 bg-white/20 rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-12 bg-white/20 rounded"></div>
              <div className="h-12 bg-white/20 rounded"></div>
              <div className="h-12 bg-white/20 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">Weather Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                disabled={refreshDisabled}
                className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No weather data available</p>
          </div>
        </div>
      </div>
    );
  }

  const weatherIcon = WEATHER_ICONS[weather.current.conditions.main] || <Cloud className="w-12 h-12 text-gray-500" />;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={clsx(
        "bg-gradient-to-br rounded-2xl p-6 shadow-xl relative overflow-hidden",
        weather.current.conditions.main === 'Clear' && "from-blue-400 to-blue-600 dark:from-blue-700 dark:to-blue-900",
        weather.current.conditions.main === 'Clouds' && "from-gray-400 to-gray-600 dark:from-gray-700 dark:to-gray-900",
        weather.current.conditions.main === 'Rain' && "from-slate-500 to-slate-700 dark:from-slate-700 dark:to-slate-900",
        weather.current.conditions.main === 'Snow' && "from-blue-100 to-blue-300 dark:from-blue-800 dark:to-blue-900",
        // Default gradient for other conditions
        !['Clear', 'Clouds', 'Rain', 'Snow'].includes(weather.current.conditions.main) && "from-sky-400 to-sky-600 dark:from-sky-700 dark:to-sky-900"
      )}>
        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={refreshDisabled || loading}
          className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title="Refresh weather"
        >
          <RefreshCw className={clsx(
            "w-4 h-4 text-white",
            loading && "animate-spin"
          )} />
        </button>

        {/* Location */}
        <div className="flex items-center gap-2 text-white mb-4">
          <MapPin className="w-4 h-4" />
          <h2 className="font-semibold text-lg">
            {weather.location.name}, {weather.location.country}
          </h2>
        </div>

        {/* Current weather */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-5xl font-bold text-white mb-2">
              {weather.current.temperature}°
            </div>
            <div className="text-white/90 capitalize">
              {weather.current.conditions.description}
            </div>
            <div className="text-white/80 text-sm mt-1">
              Feels like {weather.current.feels_like}°
            </div>
          </div>
          <div className="transform hover:scale-110 transition-transform">
            {weatherIcon}
          </div>
        </div>

        {/* Weather stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <Droplets className="w-4 h-4 text-white mx-auto mb-1" />
            <div className="text-white text-xs">Humidity</div>
            <div className="text-white font-semibold">{weather.current.humidity}%</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <Wind className="w-4 h-4 text-white mx-auto mb-1" />
            <div className="text-white text-xs">Wind</div>
            <div className="text-white font-semibold">{weather.current.wind_speed} m/s</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
            <Eye className="w-4 h-4 text-white mx-auto mb-1" />
            <div className="text-white text-xs">UV</div>
            <div className="text-white font-semibold">{weather.current.uv_index || '0'}</div>
          </div>
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div className="text-white/70 text-xs text-center">
            Updated {format(lastUpdated, 'h:mm a')}
          </div>
        )}
      </div>
    </div>
  );
}