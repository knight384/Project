'use client';

import { format } from 'date-fns';
import { Cloud, CloudRain, Sun, Droplets } from 'lucide-react';
import { WeatherForecastProps } from '@/types';
import { clsx } from 'clsx';

const FORECAST_ICONS: Record<string, React.ReactNode> = {
  'clear sky': <Sun className="w-6 h-6 text-yellow-500" />,
  'few clouds': <Cloud className="w-6 h-6 text-gray-400" />,
  'scattered clouds': <Cloud className="w-6 h-6 text-gray-500" />,
  'broken clouds': <Cloud className="w-6 h-6 text-gray-600" />,
  'shower rain': <CloudRain className="w-6 h-6 text-blue-500" />,
  'rain': <CloudRain className="w-6 h-6 text-blue-600" />,
  'thunderstorm': <CloudRain className="w-6 h-6 text-purple-600" />,
  'snow': <Cloud className="w-6 h-6 text-blue-200" />,
  'mist': <Cloud className="w-6 h-6 text-gray-400" />,
};

export default function WeatherForecast({ forecast, loading, error }: WeatherForecastProps) {
  if (loading && !forecast?.length) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">5-Day Forecast</h3>
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mx-auto mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">5-Day Forecast</h3>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!forecast?.length) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">5-Day Forecast</h3>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {forecast.map((day, index) => {
          const isToday = index === 0;
          const dayName = isToday ? 'Today' : format(new Date(day.date), 'EEE');
          const weatherIcon = FORECAST_ICONS[day.conditions.toLowerCase()] || <Cloud className="w-6 h-6 text-gray-500" />;

          return (
            <div
              key={day.date}
              className={clsx(
                "bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700",
                "hover:shadow-md transition-shadow",
                isToday && "ring-2 ring-blue-500 ring-opacity-50"
              )}
            >
              {/* Day name */}
              <div className={clsx(
                "text-xs font-medium mb-2",
                isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
              )}>
                {dayName}
              </div>

              {/* Weather icon */}
              <div className="flex justify-center mb-2 transform hover:scale-110 transition-transform">
                {weatherIcon}
              </div>

              {/* Temperature range */}
              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {day.high}°
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {day.low}°
                </div>
              </div>

              {/* Precipitation chance */}
              {day.precipitation_chance > 0 && (
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Droplets className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {day.precipitation_chance}%
                  </span>
                </div>
              )}

              {/* Weather condition text */}
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 capitalize line-clamp-1">
                {day.conditions}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend/Info */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        High/Low temperatures in Celsius
      </div>
    </div>
  );
}