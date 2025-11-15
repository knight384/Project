'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import WeatherCard from '@/components/Weather/WeatherCard';
import WeatherForecast from '@/components/Weather/WeatherForecast';
import NewsFeed from '@/components/News/NewsFeed';
import CitySelector from '@/components/Location/CitySelector';
import LocationDetector from '@/components/Location/LocationDetector';
import { locationService } from '@/services/locationService';
import { WeatherData, NewsArticle, UserPreferences } from '@/types';

// Simple fetcher for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch' }));
    throw new Error(error.error || 'Failed to fetch data');
  }
  return response.json();
};

export default function Home() {
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [currentLocation, setCurrentLocation] = useState({
    city: '',
    lat: 40.7128,
    lon: -74.0060
  });
  const [selectedNewsCategory, setSelectedNewsCategory] = useState('general');

  // Load user preferences on mount
  useEffect(() => {
    try {
      const prefs = locationService.getUserPreferences();
      setUserPreferences(prefs);
      setCurrentLocation({
        city: prefs.location.city,
        lat: prefs.location.lat,
        lon: prefs.location.lon
      });
      setSelectedNewsCategory(prefs.news.preferredCategory);
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
      // Use default preferences
      setCurrentLocation({
        city: 'New York',
        lat: 40.7128,
        lon: -74.0060
      });
    }
  }, []);

  // Fetch weather data
  const { data: weatherData, error: weatherError, isLoading: weatherLoading } = useSWR(
    currentLocation.lat && currentLocation.lon
      ? `/api/weather?lat=${currentLocation.lat}&lon=${currentLocation.lon}&units=metric`
      : null,
    fetcher,
    {
      refreshInterval: 30 * 60 * 1000, // 30 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Fetch news data
  const { data: newsData, error: newsError, isLoading: newsLoading } = useSWR(
    `/api/news?category=${selectedNewsCategory}&country=us&pageSize=20`,
    fetcher,
    {
      refreshInterval: 30 * 60 * 1000, // 30 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Handle location change
  const handleLocationChange = useCallback((city: string, lat: number, lon: number) => {
    setCurrentLocation({ city, lat, lon });

    // Update preferences
    try {
      const prefs = locationService.getUserPreferences();
      locationService.setUserPreferences({
        ...prefs,
        location: {
          city,
          lat,
          lon,
          method: 'manual',
          lastUpdated: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.warn('Failed to save location preference:', error);
    }
  }, []);

  // Handle location detected automatically
  const handleLocationDetected = useCallback((city: string, lat: number, lon: number) => {
    setCurrentLocation({ city, lat, lon });

    // Update preferences
    try {
      const prefs = locationService.getUserPreferences();
      locationService.setUserPreferences({
        ...prefs,
        location: {
          city,
          lat,
          lon,
          method: 'auto',
          lastUpdated: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.warn('Failed to save auto-detected location:', error);
    }
  }, []);

  // Handle news category change
  const handleNewsCategoryChange = useCallback((category: string) => {
    setSelectedNewsCategory(category);

    // Update preferences
    try {
      const prefs = locationService.getUserPreferences();
      locationService.setUserPreferences({
        ...prefs,
        news: {
          ...prefs.news,
          preferredCategory: category,
          lastCategories: [...new Set([category, ...prefs.news.lastCategories.slice(0, 4)])]
        }
      });
    } catch (error) {
      console.warn('Failed to save news preference:', error);
    }
  }, []);

  // Manual refresh functions
  const handleWeatherRefresh = () => {
    // SWR will handle the refresh when we mutate
    const weatherUrl = `/api/weather?lat=${currentLocation.lat}&lon=${currentLocation.lon}&units=metric`;
    // Trigger revalidation
    window.location.reload();
  };

  const handleNewsRefresh = () => {
    // SWR will handle the refresh when we mutate
    const newsUrl = `/api/news?category=${selectedNewsCategory}&country=us&pageSize=20`;
    // Trigger revalidation
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with location selector */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* App title */}
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Weather & News Hub
              </h1>
            </div>

            {/* Location controls */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <LocationDetector
                onLocationDetected={handleLocationDetected}
              />
              <CitySelector
                currentCity={currentLocation.city}
                onCityChange={handleLocationChange}
                loading={weatherLoading}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content - improved layout for mobile/desktop balance */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">

          {/* Weather section - takes full width on mobile/tablet, 5 columns on desktop */}
          <section className="xl:col-span-5 space-y-4 sm:space-y-6">
            <div className="flex justify-center lg:justify-start">
              <WeatherCard
                weather={weatherData?.data}
                loading={weatherLoading}
                error={weatherError?.message}
                onRefresh={handleWeatherRefresh}
                lastUpdated={weatherData?.lastUpdated ? new Date(weatherData.lastUpdated) : undefined}
              />
            </div>

            {weatherData?.data?.forecast && (
              <div className="flex justify-center lg:justify-start mt-6">
                <WeatherForecast
                  forecast={weatherData.data.forecast}
                  loading={weatherLoading}
                  error={weatherError?.message}
                />
              </div>
            )}
          </section>

          {/* News section - takes full width on mobile/tablet, 7 columns on desktop */}
          <section className="xl:col-span-7">
            <NewsFeed
              articles={newsData?.articles}
              loading={newsLoading}
              error={newsError?.message}
              category={selectedNewsCategory}
              onCategoryChange={handleNewsCategoryChange}
              onRefresh={handleNewsRefresh}
            />
          </section>
        </div>

        {/* Footer with info */}
        <footer className="mt-8 sm:mt-12 lg:mt-16 pt-6 sm:pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="text-base sm:text-sm">
              Live weather updates and trending news for {currentLocation.city}
            </p>
            <p className="text-xs sm:text-sm">
              Data refreshes automatically every 30 minutes
            </p>
            <div className="flex justify-center items-center gap-4 text-xs opacity-75">
              <span>Powered by OpenWeatherMap</span>
              <span>•</span>
              <span>News from NewsAPI.org</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}