import React, { useEffect, useRef } from 'react';

const GPS_STATUS_META = {
  live: { label: 'GPS Live', color: '#018E42', pulse: true },
  stale: { label: 'Last known position', color: '#f59e0b', pulse: false },
  offline: { label: 'GPS Offline', color: '#ef4444', pulse: false },
  waiting: { label: 'Waiting for GPS', color: '#94a3b8', pulse: false },
};

export default function LeafletMap({
  driverLat = null,
  driverLng = null,
  hotelLat = null,
  hotelLng = null,
  hotelName = "",
  gpsStatus = 'waiting',
  statusDetail = '',
  markers = null, // Array of: { id, lat, lng, title, subtitle, type: 'driver'|'guide'|'hotel', status }
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerGroupRef = useRef([]);

  // Check if we have any valid location coordinates to show
  const hasDriverCoords = driverLat != null && driverLng != null && !Number.isNaN(driverLat) && !Number.isNaN(driverLng);
  const hasHotelCoords = hotelLat != null && hotelLng != null && !Number.isNaN(hotelLat) && !Number.isNaN(hotelLng);
  const hasValidMarkers = Array.isArray(markers) && markers.some(m => m.lat != null && m.lng != null && !Number.isNaN(m.lat) && !Number.isNaN(m.lng));

  // Require live tracking telemetry (either driver coordinates or valid multi-markers) to render the map
  const shouldRenderMap = hasValidMarkers || hasDriverCoords;

  useEffect(() => {
    if (!window.L || !mapContainerRef.current || !shouldRenderMap) return;

    // Determine initial center
    let initialCenter = [28.6139, 77.2090]; // Delhi as fallback for viewing, but we'll fit bounds immediately
    if (hasHotelCoords) {
      initialCenter = [hotelLat, hotelLng];
    } else if (hasDriverCoords) {
      initialCenter = [driverLat, driverLng];
    } else if (hasValidMarkers) {
      const firstValid = markers.find(m => m.lat != null && m.lng != null);
      initialCenter = [firstValid.lat, firstValid.lng];
    }

    // Initialize the map if not already done
    if (!mapRef.current) {
      mapRef.current = window.L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: true,
        attributionControl: false
      });

      // Add a premium vector styled map tile layer
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);
    }

    // Clear old markers
    markerGroupRef.current.forEach(m => m.remove());
    markerGroupRef.current = [];

    const mapInstance = mapRef.current;
    const bounds = window.L.latLngBounds();

    if (Array.isArray(markers)) {
      // MULTI-MARKER MODE (Operator Fleet View)
      markers.forEach(m => {
        if (m.lat == null || m.lng == null || Number.isNaN(m.lat) || Number.isNaN(m.lng)) return;

        const coords = [m.lat, m.lng];
        bounds.extend(coords);

        let iconHtml = "";
        let borderCol = "#FAF7F2";
        let shadowCol = "rgba(0,0,0,0.3)";
        let bgCol = "#94a3b8";
        let labelEmoji = "📍";

        if (m.type === 'driver') {
          bgCol = m.status === 'live' ? '#018E42' : m.status === 'stale' ? '#f59e0b' : '#ef4444';
          labelEmoji = "🚗";
          shadowCol = `rgba(${m.status === 'live' ? '1,142,66' : m.status === 'stale' ? '245,158,11' : '239,68,68'}, 0.4)`;
        } else if (m.type === 'guide') {
          bgCol = m.status === 'live' ? '#1e3a8a' : m.status === 'stale' ? '#d97706' : '#9f1239';
          labelEmoji = "🗺️";
          shadowCol = "rgba(30, 58, 138, 0.4)";
        } else if (m.type === 'hotel') {
          bgCol = "#D95D39";
          labelEmoji = "🏨";
          shadowCol = "rgba(217, 93, 57, 0.4)";
        }

        iconHtml = `
          <div style="
            width: 38px;
            height: 38px;
            background-color: ${bgCol};
            border: 2px solid ${borderCol};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px ${shadowCol};
            animation: ${m.status === 'live' ? 'mapPulse 2s infinite' : 'none'};
            opacity: ${m.status === 'offline' ? '0.6' : '1'};
            transition: all 0.3s ease;
          ">
            <div style="font-size: 18px;">${labelEmoji}</div>
          </div>
        `;

        const customIcon = window.L.divIcon({
          className: `custom-marker-${m.id}`,
          html: iconHtml,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const newMarker = window.L.marker(coords, { icon: customIcon })
          .addTo(mapInstance)
          .bindPopup(`
            <div style="font-family: 'Inter', sans-serif; padding: 4px;">
              <b style="font-size: 0.9rem; color: #0f172a;">${m.title}</b><br/>
              <span style="font-size: 0.78rem; color: #64748b;">${m.subtitle}</span>
              ${m.status ? `<br/><span style="display:inline-block; margin-top:4px; font-size:0.65rem; font-weight:bold; padding:2px 6px; border-radius:4px; background-color:${bgCol}22; color:${bgCol};">${m.status.toUpperCase()}</span>` : ''}
            </div>
          `);

        markerGroupRef.current.push(newMarker);
      });

      // Fit bounds if markers exist
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } else {
      // SINGLE TOUR MODE (Driver + Hotel)
      if (hasHotelCoords) {
        bounds.extend([hotelLat, hotelLng]);
        const hotelIcon = window.L.divIcon({
          className: 'custom-hotel-marker',
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background-color: #D95D39;
              border: 2px solid #FAF7F2;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            ">
              <div style="transform: rotate(45deg); font-size: 16px;">🏨</div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });

        const hotelMarker = window.L.marker([hotelLat, hotelLng], { icon: hotelIcon })
          .addTo(mapInstance)
          .bindPopup(`<b>${hotelName || 'Base Hotel'}</b><br/>Your Tour Base`);

        markerGroupRef.current.push(hotelMarker);
      }

      if (hasDriverCoords && gpsStatus !== 'waiting') {
        bounds.extend([driverLat, driverLng]);
        const driverIcon = window.L.divIcon({
          className: 'custom-driver-marker',
          html: `
            <div style="
              width: 38px;
              height: 38px;
              background-color: ${gpsStatus === 'live' ? '#018E42' : gpsStatus === 'stale' ? '#f59e0b' : '#ef4444'};
              border: 2px solid #FAF7F2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(1, 142, 66, 0.4);
              animation: ${gpsStatus === 'live' ? 'mapPulse 2s infinite' : 'none'};
              opacity: ${gpsStatus === 'offline' ? '0.55' : '1'};
            ">
              <div style="font-size: 18px;">🚗</div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const driverMarker = window.L.marker([driverLat, driverLng], { icon: driverIcon })
          .addTo(mapInstance)
          .bindPopup(`<b>Your Chauffeur</b><br/>En Route`);

        markerGroupRef.current.push(driverMarker);
      }

      // Fit bounds
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [driverLat, driverLng, hotelLat, hotelLng, hotelName, gpsStatus, markers, shouldRenderMap]);

  // CSS for pulsing map pin
  useEffect(() => {
    const mapCss = `
      @keyframes mapPulse {
        0% { box-shadow: 0 0 0 0 rgba(1, 142, 66, 0.7); }
        70% { box-shadow: 0 0 0 12px rgba(1, 142, 66, 0); }
        100% { box-shadow: 0 0 0 0 rgba(1, 142, 66, 0); }
      }
    `;
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(mapCss));
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!shouldRenderMap) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        minHeight: '260px',
        backgroundColor: '#f1f5f9',
        border: '2px dashed #cbd5e1',
        borderRadius: '18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        padding: '20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>📡</div>
        <b style={{ fontSize: '1rem', color: '#334155' }}>NO SIGNAL</b>
        <span style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          Waiting for active GPS telemetry. Real-time fleet tracking updates automatically.
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '18px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '260px' }} />
      {/* Map Control Float overlay */}
      {!markers && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          backgroundColor: 'rgba(7, 30, 38, 0.85)',
          color: '#FAF7F2',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.68rem',
          fontWeight: '600',
          zIndex: 1000,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(4px)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: GPS_STATUS_META[gpsStatus]?.color ?? '#94a3b8',
            display: 'inline-block',
            animation: GPS_STATUS_META[gpsStatus]?.pulse ? 'mapPulse 1.5s infinite' : 'none',
          }} />
          {statusDetail || GPS_STATUS_META[gpsStatus]?.label || 'Waiting for GPS'}
        </div>
      )}
    </div>
  );
}
