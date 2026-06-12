import { useEffect, useRef, useState } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

const BG_GEO_OPTIONS = {
  backgroundMessage: 'Maru Travel is sharing your live location with the tour team.',
  backgroundTitle: 'Live GPS Tracking Active',
  requestPermissions: true,
  stale: false,
  distanceFilter: 0,
};

const LOCATION_PERMISSION_MESSAGE =
  'Location access is required for live tracking. Open Settings and set location permission to "Allow all the time" so tracking continues when the app is closed.';

export function useBackgroundLocation({
  tourCode,
  tourData,
  onLocation,
  onTrackingEnd,
  enabled = true,
}) {
  const [lastGpsAt, setLastGpsAt] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const tourCodeRef = useRef(tourCode);
  const onLocationRef = useRef(onLocation);
  const onTrackingEndRef = useRef(onTrackingEnd);

  useEffect(() => {
    tourCodeRef.current = tourCode;
    onLocationRef.current = onLocation;
    onTrackingEndRef.current = onTrackingEnd;
  }, [tourCode, onLocation, onTrackingEnd]);

  useEffect(() => {
    if (!enabled || !tourData || !tourCode) return;

    let watcherId = null;
    let watchId = null;
    let cancelled = false;

    const handleLocationUpdate = (location) => {
      setGpsError(null);
      setLastGpsAt(Date.now());
      onLocationRef.current?.(location);
    };

    const handleLocationError = (error) => {
      const isPermissionErr = 
        error?.code === 'NOT_AUTHORIZED' || 
        error?.message?.toLowerCase().includes('permission') || 
        error?.message?.toLowerCase().includes('authorized') ||
        error?.message?.toLowerCase().includes('denied');
      
      setGpsError(error?.message || 'GPS error');
      if (isPermissionErr) {
        window.alert(LOCATION_PERMISSION_MESSAGE);
        BackgroundGeolocation.openSettings().catch(() => {});
      }
      console.error('GPS Error:', error);
    };

    if (Capacitor.isNativePlatform()) {
      BackgroundGeolocation.addWatcher(BG_GEO_OPTIONS, (location, error) => {
        if (error) {
          handleLocationError(error);
          return;
        }
        if (location) handleLocationUpdate(location);
      }).then((id) => {
        if (cancelled) {
          BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
        } else {
          watcherId = id;
        }
      });
    } else if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          handleLocationUpdate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            bearing: position.coords.heading,
            speed: position.coords.speed,
            altitude: position.coords.altitude,
            time: position.timestamp,
            simulated: false,
          });
        },
        handleLocationError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }

    return () => {
      cancelled = true;
      if (watcherId) {
        BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => {});
      }
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      onTrackingEndRef.current?.(tourCodeRef.current)?.catch?.(() => {});
    };
  }, [enabled, tourData, tourCode]);

  return { lastGpsAt, gpsError };
}
