'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, Navigation, X, ChevronDown, AlertCircle } from 'lucide-react';
import { CitySelectorProps, CitySearchResult } from '@/types';
import { locationService } from '@/services/locationService';
import { clsx } from 'clsx';

export default function CitySelector({ currentCity, onCityChange, loading }: CitySelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [detectLoading, setDetectLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setSearchQuery('');
        setSearchResults([]);
        setSearchError(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isExpanded]);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const results = await locationService.searchCities(query);
      setSearchResults(results);
    } catch (error: any) {
      console.error('City search error:', error);
      setSearchError(error.message || 'Failed to search cities');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle city selection
  const handleCitySelect = (city: CitySearchResult) => {
    onCityChange(city.name, city.lat, city.lon);
    setIsExpanded(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);

    // Store user preference
    try {
      const prefs = locationService.getUserPreferences();
      locationService.setUserPreferences({
        ...prefs,
        location: {
          city: city.name,
          lat: city.lat,
          lon: city.lon,
          method: 'manual',
          lastUpdated: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.warn('Failed to save location preference:', error);
    }
  };

  // Handle auto-detect location
  const handleAutoDetect = async () => {
    setDetectLoading(true);
    setSearchError(null);

    try {
      const position = await locationService.getCurrentPosition();
      const cityResult = await locationService.reverseGeocode(position.coords.latitude, position.coords.longitude);
      handleCitySelect(cityResult);
    } catch (error: any) {
      console.error('Auto-detect error:', error);
      setSearchError(error.message || 'Failed to detect location');
    } finally {
      setDetectLoading(false);
    }
  };

  const displayedCity = currentCity || 'Select location';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* City selector button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
          "min-w-[200px] justify-between"
        )}
        aria-expanded={isExpanded}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {displayedCity}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
          <ChevronDown
            className={clsx(
              "w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform",
              isExpanded && "transform rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown content */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 space-y-3">
            {/* Auto-detect button */}
            <button
              onClick={handleAutoDetect}
              disabled={detectLoading}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Navigation className={clsx(
                "w-4 h-4",
                detectLoading && "animate-spin"
              )} />
              <span className="text-sm font-medium">
                {detectLoading ? 'Detecting...' : 'Use my current location'}
              </span>
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  or search for a city
                </span>
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search city name..."
                className={clsx(
                  "w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  "placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100"
                )}
              />
            </div>

            {/* Search error */}
            {searchError && (
              <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">{searchError}</p>
              </div>
            )}

            {/* Search results */}
            {searchLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((city, index) => (
                  <button
                    key={`${city.lat}-${city.lon}-${index}`}
                    onClick={() => handleCitySelect(city)}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {city.name}
                    </div>
                    {city.state && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {city.state}, {city.country}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 3 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No cities found for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Type at least 3 characters to search
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}