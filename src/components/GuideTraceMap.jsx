import React, { useEffect, useRef, useState } from 'react';
import { listenToGuideTrace } from '../services/firebase';
import { X, Navigation, MapPin } from 'lucide-react';

// Distance calculation using Haversine formula (meters)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
};

export default function GuideTraceMap({ tourCode, guideName, onClose }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const markersRef = useRef([]);

  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stops, setStops] = useState([]);
  const [tourTime, setTourTime] = useState('00:00:00');

  useEffect(() => {
    const unsub = listenToGuideTrace(tourCode, (data) => {
      setTraces(data);
      setLoading(false);
    });
    return () => unsub();
  }, [tourCode]);

  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = window.L.map(mapContainerRef.current, {
        zoom: 14,
        zoomControl: true,
        attributionControl: false
      });
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);
    }

    const mapInstance = mapRef.current;

    // Clear old layers
    if (routeLayerRef.current) mapInstance.removeLayer(routeLayerRef.current);
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (traces.length === 0) {
      // Set to Delhi if no data
      mapInstance.setView([28.6139, 77.2090], 12);
      return;
    }

    // Process Stops Logic
    // Stop defined as: 4 consecutive readings (approx 12-15 mins) within 30 meters
    const computedStops = [];
    let currentStopCandidate = [];
    let offlineSegments = [];

    for (let i = 0; i < traces.length; i++) {
      const pt = traces[i];
      if (i > 0) {
        const prevPt = traces[i-1];
        // Check offline: > 3 minutes (180,000 ms) gap + 10s buffer
        if (pt.timestamp - prevPt.timestamp > 4 * 60 * 1000) {
           offlineSegments.push([ [prevPt.latitude, prevPt.longitude], [pt.latitude, pt.longitude] ]);
        }
      }

      if (currentStopCandidate.length === 0) {
        currentStopCandidate.push(pt);
      } else {
        const anchorPt = currentStopCandidate[0];
        const dist = getDistance(anchorPt.latitude, anchorPt.longitude, pt.latitude, pt.longitude);
        if (dist <= 30) {
          currentStopCandidate.push(pt);
        } else {
          // If we left the 30m radius, check if we accumulated enough points for a stop
          if (currentStopCandidate.length >= 4) {
             computedStops.push({
               start: currentStopCandidate[0].timestamp,
               end: currentStopCandidate[currentStopCandidate.length - 1].timestamp,
               lat: anchorPt.latitude,
               lng: anchorPt.longitude,
               points: currentStopCandidate.length
             });
          }
          // Reset candidate
          currentStopCandidate = [pt];
        }
      }
    }
    // Check end of array
    if (currentStopCandidate.length >= 4) {
      computedStops.push({
         start: currentStopCandidate[0].timestamp,
         end: currentStopCandidate[currentStopCandidate.length - 1].timestamp,
         lat: currentStopCandidate[0].latitude,
         lng: currentStopCandidate[0].longitude,
         points: currentStopCandidate.length
      });
    }

    setStops(computedStops);

    // Calculate Tour Time (first trace to last trace)
    if (traces.length > 0) {
      const ms = traces[traces.length - 1].timestamp - traces[0].timestamp;
      const hrs = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setTourTime(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }

    // Draw Polyline
    const latlngs = traces.map(t => [t.latitude, t.longitude]);
    routeLayerRef.current = window.L.polyline(latlngs, {
      color: '#f59e0b',
      weight: 5,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(mapInstance);

    // Draw Offline Segments as Dashed Red
    offlineSegments.forEach(seg => {
       const dashed = window.L.polyline(seg, {
         color: '#ef4444',
         weight: 4,
         opacity: 0.9,
         dashArray: '10, 10'
       }).addTo(mapInstance);
       markersRef.current.push(dashed);
    });

    // Start/End Markers
    const startPt = traces[0];
    const startIcon = window.L.divIcon({
      html: `<div style="background:#1e3a8a;color:white;font-weight:bold;padding:4px 8px;border-radius:4px;font-size:0.7rem;white-space:nowrap;transform:translate(-50%,-50%);">Tour Start</div>`
    });
    const sm = window.L.marker([startPt.latitude, startPt.longitude], { icon: startIcon }).addTo(mapInstance);
    markersRef.current.push(sm);

    const endPt = traces[traces.length - 1];
    const endIcon = window.L.divIcon({
      html: `<div style="background:#018E42;color:white;font-weight:bold;padding:4px 8px;border-radius:4px;font-size:0.7rem;white-space:nowrap;transform:translate(-50%,-50%); border:2px solid white; box-shadow:0 0 10px rgba(0,0,0,0.5);">CURRENT LOCATION</div>`
    });
    const em = window.L.marker([endPt.latitude, endPt.longitude], { icon: endIcon }).addTo(mapInstance);
    markersRef.current.push(em);

    // Draw Stop Markers
    computedStops.forEach((stop, idx) => {
       const stopFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
       const sTime = new Date(stop.start).toLocaleTimeString('en-US', stopFormatOptions);
       const eTime = new Date(stop.end).toLocaleTimeString('en-US', stopFormatOptions);
       const stopHtml = `
         <div style="background:#1e293b; color:#fff; border-radius:4px; padding:4px 8px; font-size:0.7rem; white-space:nowrap; transform:translate(-20px, -20px); border: 2px solid #f8fafc; font-weight: bold; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            <div style="width: 12px; height: 12px; background: #f59e0b; border-radius: 50%; border: 2px solid white;"></div>
            STOP ${idx + 1}: ${sTime} - ${eTime}
         </div>
       `;
       const stIcon = window.L.divIcon({ html: stopHtml });
       const smm = window.L.marker([stop.lat, stop.lng], { icon: stIcon }).addTo(mapInstance);
       markersRef.current.push(smm);
    });

    if (latlngs.length > 0) {
      mapInstance.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
    }

  }, [traces]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '1200px', height: '90vh',
        backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', position: 'relative'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: '800' }}>Live Route Trace - {guideName}</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Tour Code: {tourCode}</p>
          </div>
          <button onClick={onClose} style={{
            background: '#e2e8f0', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex'
          }}>
            <X size={20} color="#334155" />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Map Area */}
          <div style={{ flex: 1, position: 'relative' }}>
            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', zIndex: 10 }}>
                <span className="live-dot" style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite' }}></span>
                <span style={{ marginLeft: '10px', fontWeight: '600', color: '#64748b' }}>Loading Trace History...</span>
              </div>
            )}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Sidebar */}
          <div style={{ width: '320px', borderLeft: '1px solid #e2e8f0', backgroundColor: '#fafaf9', overflowY: 'auto' }}>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Tour Time:</span>
                  <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{tourTime}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Stops Detected:</span>
                  <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{stops.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Guide:</span>
                  <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{guideName}</span>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#334155', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                  Auto Stop Markers
                </h3>
                {stops.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No stops detected yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {stops.map((stop, i) => {
                      const stopFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
                      const sTime = new Date(stop.start).toLocaleTimeString('en-US', stopFormatOptions);
                      const eTime = new Date(stop.end).toLocaleTimeString('en-US', stopFormatOptions);
                      return (
                        <div key={i} style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ marginTop: '2px' }}><MapPin size={16} color="#f59e0b" /></div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>STOP {i + 1}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{sTime} - {eTime}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
