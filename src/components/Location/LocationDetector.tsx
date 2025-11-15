'use client';

import { useState, useEffect } from 'react';
import { Navigation, AlertCircle, Wifi } from 'lucide-react';
import { LocationDetectorProps } from '@/types';
import { locationService } from '@/services/locationService';
import { clsx } from 'clsx';

interface LocationState {
  status: 'idle' | 'detecting' | 'success' | 'error';
  message?: string;
  error?: string;
}

export default function LocationDetector({ onLocationDetected, onError }: LocationDetectorProps) {
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    // Cleanup location watch on unmount
    return () => {
      if (watchId !== null) {
        locationService.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setLocationState({
        status: 'error',
        error: 'Geolocation is not supported by your browser'
      });
      onError?.('Geolocation is not supported by your browser');
      return;
    }

    try {
      setLocationState({
        status: 'detecting',
        message: 'Requesting location permission...'
      });

      // Check permission status first
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });

        if (permission.state === 'denied') {
          setLocationState({
            status: 'error',
            error: 'Location permission denied. Please enable location access in your browser settings.'
          });
          onError?.('Location permission denied');
          return;
        }
      }

      setLocationState({
        status: 'detecting',
        message: 'Getting your current location...'
      });

      const position = await locationService.getCurrentPosition();

      setLocationState({
        status: 'detecting',
        message: 'Finding city name...'
      });

      const cityResult = await locationService.reverseGeocode(position.coords.latitude, position.coords.longitude);

      // Store location preference
      try {
        const prefs = locationService.getUserPreferences();
        locationService.setUserPreferences({
          ...prefs,
          location: {
            city: cityResult.name,
            lat: cityResult.lat,
            lon: cityResult.lon,
            method: 'auto',
            lastUpdated: new Date().toISOString(),
          }
        });
      } catch (error) {
        console.warn('Failed to save location preference:', error);
      }

      setLocationState({
        status: 'success',
        message: `Location detected: ${cityResult.name}`
      });

      onLocationDetected(cityResult.name, cityResult.lat, cityResult.lon);

      // Reset state after delay
      setTimeout(() => {
        setLocationState({ status: 'idle' });
      }, 3000);

    } catch (error: any) {
      console.error('Location detection failed:', error);

      let errorMessage = 'Failed to detect location';

      if (error.message.includes('permission denied')) {
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
      } else if (error.message.includes('unavailable')) {
        errorMessage = 'Location information unavailable. Please try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Location request timed out. Please try again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      setLocationState({
        status: 'error',
        error: errorMessage
      });

      onError?.(errorMessage);

      // Try IP-based fallback if geolocation fails
      tryIPLocationFallback();
    }
  };

  const tryIPLocationFallback = async () => {
    setLocationState({
      status: 'detecting',
      message: 'Trying IP-based location detection...'
    });

    try {
      const ipLocation = await locationService.getIPLocation();

      setLocationState({
        status: 'success',
        message: `Location estimated: ${ipLocation.city}`
      });

      onLocationDetected(ipLocation.city, ipLocation.lat, ipLocation.lon);

      // Store as auto-detected with note that it's IP-based
      try {
        const prefs = locationService.getUserPreferences();
        locationService.setUserPreferences({
          ...prefs,
          location: {
            city: ipLocation.city,
            lat: ipLocation.lat,
            lon: ipLocation.lon,
            method: 'auto',
            lastUpdated: new Date().toISOString(),
          }
        });
      } catch (error) {
        console.warn('Failed to save IP location preference:', error);
      }

    } catch (ipError: any) {
      setLocationState({
        status: 'error',
        error: 'Unable to determine location. Please select your city manually.'
      });
      onError?.('Unable to determine location. Please select your city manually.');
    }

    // Reset state after delay
    setTimeout(() => {
      setLocationState({ status: 'idle' });
    }, 5000);
  };

  const getStateIcon = () => {
    switch (locationState.status) {
      case 'detecting':
        return <Navigation className="w-4 h-4 animate-spin" />;
      case 'success':
        return <Navigation className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Navigation className="w-4 h-4" />;
    }
  };

  const getStateColor = () => {
    switch (locationState.status) {
      case 'detecting':
        return 'text-blue-600 dark:text-blue-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (locationState.status === 'idle') {
    return (
      <button
        onClick={detectLocation}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Auto-detect my location"
      >
        <Navigation className="w-4 h-4" />
        <span>Auto-detect</span>
      </button>
    );
  }

  return (
    <div className={clsx(
      "flex items-center gap-2 px-3 py-2 text-sm rounded-lg",
      "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
      getStateColor()
    )}>
      <div className={getStateColor()}>
        {getStateIcon()}
      </div>

      <div className="flex-1">
        {locationState.message && (
          <p className="text-xs font-medium">{locationState.message}</p>
        )}
        {locationState.error && (
          <p className="text-xs">{locationState.error}</p>
        )}
      </div>

      {locationState.status === 'detecting' && (
        <Wifi className="w-4 h-4 animate-pulse" />
      )}
    </div>
  );
}