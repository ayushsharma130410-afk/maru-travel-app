export const GPS_LIVE_MS = 90000;   // 90 s — generous for mobile networks
export const GPS_STALE_MS = 300000; // 5 min

export const CITY_COORDS = {
  'New Delhi': { lat: 28.6139, lng: 77.2090 },
  Agra: { lat: 27.1751, lng: 78.0421 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Jodhpur: { lat: 26.2912, lng: 73.0169 },
  Udaipur: { lat: 24.5854, lng: 73.7125 },
  Varanasi: { lat: 25.3176, lng: 82.9739 },
  Mumbai: { lat: 18.9220, lng: 72.8347 },
  Jaisalmer: { lat: 26.9157, lng: 70.9083 },
  Khajuraho: { lat: 24.8318, lng: 79.9199 },
  Shimla: { lat: 31.1048, lng: 77.1734 },
  Manali: { lat: 32.2396, lng: 77.1887 },
  Amritsar: { lat: 31.6340, lng: 74.8723 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Munnar: { lat: 10.0889, lng: 77.0595 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Patna: { lat: 25.6093, lng: 85.1376 },
};

export function getCityCoords(cityName) {
  return CITY_COORDS[cityName] || { lat: 28.6139, lng: 77.2090 };
}

export function getLocationTimestampMs(loc) {
  if (!loc) return 0;
  // Try every possible timestamp field the driver/heartbeat writes
  const ts = loc.clientWrittenAt ?? loc.updatedAt ?? loc.timestamp ?? loc.offlineAt;
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  // Firebase serverTimestamp resolves to a number, but handle edge cases
  if (typeof ts === 'object' && ts['.sv']) return Date.now(); // unresolved server timestamp → treat as "now"
  const parsed = new Date(ts).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function normalizeTrackingLocation(raw) {
  if (!raw) return null;
  const lat = raw.lat ?? raw.latitude;
  const lng = raw.lng ?? raw.longitude;
  if (lat == null || lng == null) return null;
  return {
    lat: Number(lat),
    lng: Number(lng),
    timestamp: raw.timestamp,
    updatedAt: raw.updatedAt,
    clientWrittenAt: raw.clientWrittenAt,   // ← was missing! critical for age calc
    offlineAt: raw.offlineAt,
    trackingActive: raw.trackingActive,
    accuracy: raw.accuracy,
    speed: raw.speed,
    bearing: raw.bearing,
    simulated: raw.simulated,
  };
}

export function getGpsStatus(loc, roleLabel = 'Driver') {
  if (!loc) {
    return {
      status: 'waiting',
      detail: `Waiting for ${roleLabel} GPS`,
      dotColor: '#94a3b8',
      pulse: false,
      badgeBg: '#f1f5f9',
      badgeColor: '#64748b',
      badgeText: 'NO SIGNAL',
    };
  }

  // If tracking was explicitly stopped (driver pressed "Stop Broadcasting"),
  // show OFFLINE — but ONLY if the location data is also old enough to confirm.
  // This prevents the race condition where onDisconnect fires briefly during
  // a mobile network blip while the driver is still actually broadcasting.
  if (loc.trackingActive === false) {
    const tsMs = getLocationTimestampMs(loc);
    const ageMs = tsMs > 0 ? Date.now() - tsMs : 0;
    // If the data is less than 30 seconds old AND coordinates exist,
    // the driver might have just reconnected — show STALE, not OFFLINE
    if (ageMs >= 0 && ageMs < 30000 && loc.lat && loc.lng) {
      return {
        status: 'stale',
        detail: `${roleLabel} reconnecting...`,
        dotColor: '#f59e0b',
        pulse: true,
        badgeBg: '#fef3c7',
        badgeColor: '#b45309',
        badgeText: 'RECONNECTING',
      };
    }
    return {
      status: 'offline',
      detail: `${roleLabel} GPS stopped — app closed or broadcast ended`,
      dotColor: '#ef4444',
      pulse: false,
      badgeBg: '#fee2e2',
      badgeColor: '#b91c1c',
      badgeText: 'OFFLINE',
    };
  }

  const tsMs = getLocationTimestampMs(loc);
  const ageMs = tsMs > 0 ? Date.now() - tsMs : 0;

  // ★ FIX: If driver's phone clock is ahead of operator's laptop clock,
  //   ageMs is negative. That means "future timestamp" = the data JUST arrived.
  //   Clamp to 0 so it correctly shows LIVE instead of OFFLINE.
  const ageSec = Math.max(0, Math.floor(ageMs / 1000));

  if (ageSec < GPS_LIVE_MS / 1000) {
    return {
      status: 'live',
      detail: 'GPS Live',
      dotColor: '#018E42',
      pulse: true,
      badgeBg: '#dcfce7',
      badgeColor: '#166534',
      badgeText: 'LIVE',
    };
  }

  if (ageSec < GPS_STALE_MS / 1000) {
    const mins = Math.max(1, Math.floor(ageSec / 60));
    return {
      status: 'stale',
      detail: `Last seen ${mins} min ago (not live)`,
      dotColor: '#f59e0b',
      pulse: false,
      badgeBg: '#fef3c7',
      badgeColor: '#b45309',
      badgeText: 'STALE',
    };
  }

  return {
    status: 'offline',
    detail: `${roleLabel} GPS Offline — phone may be off or no signal`,
    dotColor: '#ef4444',
    pulse: false,
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
    badgeText: 'OFFLINE',
  };
}

export function formatLocationTime(loc) {
  const ms = getLocationTimestampMs(loc);
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString();
}
