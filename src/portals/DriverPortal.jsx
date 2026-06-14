import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { listenToAllTours, listenToTour, updateDriverLocation, setDriverTrackingOffline, submitComplaint, markDayArrived, updateTourResource, sendDriverHeartbeat } from '../services/firebase';
import { useBackgroundLocation } from '../hooks/useBackgroundLocation';
import { sendNotificationEmail } from '../services/email';
import { Navigation, Car, AlertOctagon, Phone, User, Play, Square, Check, MapPin, Calendar, Compass, Shield, Clock, ChevronRight, CheckCircle2, X, AlertTriangle, Printer, RefreshCw, Volume2, AlertCircle, Fuel, CloudSun, CloudRain, CloudSnow, Sun, Cloud, Thermometer, Gauge, Timer, PhoneCall, Route, TrendingUp, Zap } from 'lucide-react';

export default function DriverPortal({ driverMobile, onLogout }) {
  const { t, language } = useLanguage();
  const [activeTourCode, setActiveTourCode] = useState(null);
  const [tourCodeInput, setTourCodeInput] = useState('');
  const [tourData, setTourData] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Date Filtering States
  const getTodayYYYYMMDD = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayYYYYMMDD());

  // Coordinates mapping for cities
  const getCityCoords = (cityName) => {
    const coordsDb = {
      "New Delhi": { lat: 28.6139, lng: 77.2090 },
      "Agra": { lat: 27.1751, lng: 78.0421 },
      "Jaipur": { lat: 26.9124, lng: 75.7873 },
      "Jodhpur": { lat: 26.2912, lng: 73.0169 },
      "Udaipur": { lat: 24.5854, lng: 73.7125 },
      "Varanasi": { lat: 25.3176, lng: 82.9739 },
      "Mumbai": { lat: 18.9220, lng: 72.8347 },
      "Jaisalmer": { lat: 26.9157, lng: 70.9083 },
      "Khajuraho": { lat: 24.8318, lng: 79.9199 },
      "Shimla": { lat: 31.1048, lng: 77.1734 },
      "Manali": { lat: 32.2396, lng: 77.1887 },
      "Amritsar": { lat: 31.6340, lng: 74.8723 },
      "Kochi": { lat: 9.9312, lng: 76.2673 },
      "Munnar": { lat: 10.0889, lng: 77.0595 },
      "Chennai": { lat: 13.0827, lng: 80.2707 },
      "Lucknow": { lat: 26.8467, lng: 80.9462 },
      "Patna": { lat: 25.6093, lng: 85.1376 }
    };
    return coordsDb[cityName] || { lat: 27.1751, lng: 78.0421 };
  };

  // Distance between two cities (Haversine formula)
  const getDistanceBetweenCities = (city1, city2) => {
    if (!city1 || !city2 || city1 === city2) return 0;
    const c1 = getCityCoords(city1);
    const c2 = getCityCoords(city2);
    const R = 6371;
    const dLat = (c2.lat - c1.lat) * Math.PI / 180;
    const dLng = (c2.lng - c1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 1.3); // 1.3x for road distance approximation
  };

  // Estimated travel time (avg 50 km/h in India)
  const getEstimatedTravelTime = (distKm) => {
    if (!distKm || distKm <= 0) return '—';
    const hours = Math.floor(distKm / 50);
    const mins = Math.round((distKm % 50) / 50 * 60);
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}m`;
  };

  // Fuel estimator (avg 10 km/l for SUV)
  const getEstimatedFuel = (distKm) => {
    if (!distKm || distKm <= 0) return 0;
    return Math.ceil(distKm / 10);
  };

  // Weather simulation based on city (deterministic mock)
  const getWeatherForCity = (cityName) => {
    const weatherDb = {
      'New Delhi': { temp: 42, condition: 'sunny', label: 'Hot & Sunny', humidity: 35 },
      'Agra': { temp: 41, condition: 'sunny', label: 'Hot & Clear', humidity: 38 },
      'Jaipur': { temp: 40, condition: 'sunny', label: 'Dry & Hot', humidity: 25 },
      'Jodhpur': { temp: 39, condition: 'sunny', label: 'Desert Sun', humidity: 20 },
      'Udaipur': { temp: 36, condition: 'cloudy', label: 'Partly Cloudy', humidity: 45 },
      'Varanasi': { temp: 38, condition: 'cloudy', label: 'Humid & Warm', humidity: 65 },
      'Mumbai': { temp: 33, condition: 'rainy', label: 'Humid & Rain', humidity: 80 },
      'Jaisalmer': { temp: 43, condition: 'sunny', label: 'Extreme Heat', humidity: 15 },
      'Khajuraho': { temp: 37, condition: 'cloudy', label: 'Warm & Hazy', humidity: 50 },
      'Shimla': { temp: 22, condition: 'cloudy', label: 'Pleasant & Cool', humidity: 60 },
      'Manali': { temp: 18, condition: 'snowy', label: 'Cold & Snow', humidity: 70 },
      'Amritsar': { temp: 39, condition: 'sunny', label: 'Hot & Bright', humidity: 40 },
      'Kochi': { temp: 30, condition: 'rainy', label: 'Tropical Rain', humidity: 85 },
      'Munnar': { temp: 20, condition: 'cloudy', label: 'Misty & Cool', humidity: 75 },
      'Chennai': { temp: 35, condition: 'sunny', label: 'Warm & Humid', humidity: 70 },
      'Lucknow': { temp: 38, condition: 'cloudy', label: 'Warm & Haze', humidity: 55 },
      'Patna': { temp: 37, condition: 'cloudy', label: 'Humid & Warm', humidity: 60 }
    };
    return weatherDb[cityName] || { temp: 34, condition: 'sunny', label: 'Clear Sky', humidity: 40 };
  };

  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'sunny': return Sun;
      case 'rainy': return CloudRain;
      case 'snowy': return CloudSnow;
      case 'cloudy': return Cloud;
      default: return CloudSun;
    }
  };

  const getWeatherColor = (condition) => {
    switch (condition) {
      case 'sunny': return '#f59e0b';
      case 'rainy': return '#3b82f6';
      case 'snowy': return '#8b5cf6';
      case 'cloudy': return '#6b7280';
      default: return '#f59e0b';
    }
  };

  const [isBroadcasting, setIsBroadcasting] = useState(true);
  const [coords, setCoords] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Reporting State
  const [problemCategory, setProblemCategory] = useState("Traffic");
  const [problemNote, setProblemNote] = useState("");
  const [isProblemSending, setIsProblemSending] = useState(false);
  const [problemSuccess, setProblemSuccess] = useState("");

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const activeDayRef = useRef(null);

  // Current time ticker for duty hours
  const [currentTime, setCurrentTime] = useState(new Date());

  // Helper: Convert 12h AM/PM to 24h
  const format24Hour = useCallback((time12h) => {
    if (!time12h || time12h === 'TBD') return time12h;
    const match = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return time12h;
    let [_, hours, mins, modifier] = match;
    hours = parseInt(hours, 10);
    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${mins}`;
  }, []);
  
  // Robust mobile matching ignoring country codes
  const mobileMatches = useCallback((dbMobile, userMobileStr) => {
    if (!dbMobile || !userMobileStr || userMobileStr.length < 4) return false;
    const cleanDb = String(dbMobile).replace(/\D/g, '');
    if (!cleanDb) return false;
    return cleanDb === userMobileStr || cleanDb.endsWith(userMobileStr) || userMobileStr.endsWith(cleanDb);
  }, []);

  // Helper: check if a given mobile (cleaned digits) is an assigned driver in a tour
  const isMobileAssignedToTour = useCallback((t, cleanMobile) => {
    if (!t || !cleanMobile || cleanMobile.length < 4) return false; // Require at least 4 digits to prevent random short matches

    // Main driver
    if (mobileMatches(t.driverMobile, cleanMobile)) return true;
    
    // Transfer driver on any day
    if (Array.isArray(t.itinerary)) {
      return t.itinerary.some(day =>
        day && day.interCityTransfer &&
        (mobileMatches(day.transferDriverMobile, cleanMobile) || mobileMatches(day.destTransferDriverMobile, cleanMobile))
      );
    }
    return false;
  }, [mobileMatches]);

  // Effect 1: Auto-detect active tour by scanning all tours and matching mobile
  useEffect(() => {
    if (!driverMobile) return;
    setLoadError('');
    setTourData(null); // clear stale data immediately
    const cleanMobile = String(driverMobile).replace(/\D/g, '');

    const unsubscribe = listenToAllTours((allTours) => {
      try {
        const toursArray = Array.isArray(allTours) ? allTours : Object.values(allTours || {});

        // Get today's date in IST (India Standard Time, +05:30)
        const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
        const today = nowIST.toISOString().split('T')[0];

        // DEBUG: Log all tours and mobile numbers for diagnosis
        console.log('[DriverPortal] Searching for mobile:', cleanMobile, '| Today (IST):', today);
        console.log('[DriverPortal] All tours found:', toursArray.map(t => ({
          code: t?.tourCode,
          driverMobile: t?.driverMobile,
          start: t?.startDate,
          end: t?.endDate
        })));

        const assignedTours = toursArray.filter(t => {
          if (!t || !t.tourCode) return false;

          // Only exclude tours that have ALREADY ENDED (endDate is strictly before today)
          // We intentionally allow future tours: the driver is already assigned and should see the tour
          if (t.endDate && today > t.endDate) return false;

          return isMobileAssignedToTour(t, cleanMobile);
        });

        if (assignedTours.length > 0) {
          // Prefer the earliest active tour (sorted by startDate)
          assignedTours.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
          const activeTour = assignedTours[0];

          // For origin transfer driver: hide once their leg is marked done
          let hideTour = false;
          if (Array.isArray(activeTour.itinerary)) {
            const startD = new Date(activeTour.startDate || today);
            const todayD = new Date(today);
            const todayIndex = Math.floor((todayD - startD) / (1000 * 3600 * 24));
            if (todayIndex >= 0) {
              const currentDay = activeTour.itinerary[todayIndex];
              if (currentDay && currentDay.interCityTransfer) {
                const isOrigin = mobileMatches(currentDay.transferDriverMobile, cleanMobile);
                if (isOrigin && currentDay.transferDepartureDone) hideTour = true;
              }
            }
          }

          if (hideTour) {
            setTourData(null);
            setActiveTourCode(null);
            setLoadError(language === 'KO' ? '이 투어의 1구간이 완료되었습니다.' : 'Leg 1 Completed. Handover successful.');
          } else {
            setTourData(activeTour);
            setActiveTourCode(activeTour.tourCode);
          }
        } else {
          // Only clear if we haven't manually loaded a tour
          setTourData(prev => {
            if (prev && prev._manualLoad) return prev; // keep manually loaded tour
            return null;
          });
          setActiveTourCode(prev => {
            if (prev) return prev; // keep manually set code
            return null;
          });
          setLoadError(prev => prev || (language === 'KO' ? '배정된 투어가 없습니다.' : 'No active tours assigned to your mobile number. Please check with your operator.'));
        }
      } catch (err) {
        console.error('DriverPortal tour fetch error:', err);
        setLoadError('Error loading tour data. Please refresh.');
      }
    });
    return () => unsubscribe();
  }, [driverMobile, language, isMobileAssignedToTour]);

  const handleDriverLocation = useCallback((location) => {
    setCoords({ lat: location.latitude, lng: location.longitude });
    updateDriverLocation(activeTourCode, location).catch((err) => {
      console.error('Firebase location update failed:', err);
    });
  }, [activeTourCode]);

  const handleDriverTrackingEnd = useCallback((code) => setDriverTrackingOffline(code), []);

  const canBroadcastGps = useMemo(() => {
    if (!tourData || !isBroadcasting) return false;
    const cleanMobileCalc = String(driverMobile).replace(/\D/g, '');
    const destTransferDayIndex = tourData.itinerary?.findIndex(day =>
      day?.interCityTransfer && mobileMatches(day.destTransferDriverMobile, cleanMobileCalc)
    ) ?? -1;

    // If this is Leg 2 driver, ONLY broadcast if Leg 1 has completed departure
    if (destTransferDayIndex !== -1) {
      const transferSourceDay = tourData.itinerary[destTransferDayIndex];
      if (!transferSourceDay.transferDepartureDone) {
        return false; // Wait for Leg 1
      }
    }
    return true;
  }, [tourData, isBroadcasting, driverMobile, mobileMatches]);

  const { lastGpsAt } = useBackgroundLocation({
    tourCode: activeTourCode,
    tourData,
    onLocation: handleDriverLocation,
    onTrackingEnd: handleDriverTrackingEnd,
    enabled: canBroadcastGps,
  });

  const driverGpsLive = lastGpsAt && Date.now() - lastGpsAt < 45000;

  // Scroll to active day on load
  useEffect(() => {
    if (tourData && activeDayRef.current) {
      setTimeout(() => {
        activeDayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [tourData]);

  // Tick current time every minute for duty hours
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Heartbeat: ping Firebase every 15 s while broadcasting so the
  // operator panel never shows NO SIGNAL when driver is stationary.
  useEffect(() => {
    if (!isBroadcasting || !activeTourCode) return;
    const hb = setInterval(() => { sendDriverHeartbeat(activeTourCode); }, 15000);
    return () => clearInterval(hb);
  }, [isBroadcasting, activeTourCode]);

  const toggleBroadcasting = () => {
    if (isBroadcasting) {
      setIsBroadcasting(false);
      setDriverTrackingOffline(activeTourCode).catch(() => {});
    } else {
      setIsBroadcasting(true);
    }
  };

  const handleReportProblem = async (e) => {
    e.preventDefault();
    setIsProblemSending(true);
    setProblemSuccess("");

    const clientName = tourData?.clientName || "Valued Guest";
    const details = `DRIVER ALERT: ${problemCategory} — ${problemNote || 'No additional details'} | Reported by ${tourData?.driverName || 'Driver'}`;

    await submitComplaint({
      tourCode: activeTourCode,
      clientName: clientName,
      type: 'DRIVER_ALERT',
      category: problemCategory,
      details: details
    });

    await sendNotificationEmail({
      tourCode: activeTourCode,
      clientName: clientName,
      type: 'DRIVER_ALERT',
      category: problemCategory,
      details: details
    });

    setIsProblemSending(false);
    setProblemSuccess("Alert sent to headquarters!");
    setProblemNote("");
    setTimeout(() => {
      setProblemSuccess("");
      setShowReportModal(false);
    }, 2500);
  };

  const handleMarkArrived = async (dayIdx) => {
    const arrivalTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const arrivalDate = new Date().toISOString();
    await markDayArrived(activeTourCode, dayIdx);
    try {
      await updateTourResource(activeTourCode, `itinerary/${dayIdx}/arrivedAt`, arrivalTime);
      await updateTourResource(activeTourCode, `itinerary/${dayIdx}/arrivedTimestamp`, arrivalDate);
    } catch (e) { }
  };

  const handleUndoArrived = async (dayIdx) => {
    try {
      await updateTourResource(activeTourCode, `itinerary/${dayIdx}/arrived`, false);
      await updateTourResource(activeTourCode, `itinerary/${dayIdx}/arrivedAt`, null);
      await updateTourResource(activeTourCode, `itinerary/${dayIdx}/arrivedTimestamp`, null);
    } catch (e) { }
  };

  // Manual tour code load – fetch by code, verify mobile, then set tourData
  const [isManualLoading, setIsManualLoading] = useState(false);
  const handleLoadTour = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    const code = tourCodeInput.trim().toUpperCase();
    if (!code) return;
    setIsManualLoading(true);
    setLoadError('');
    const cleanMobile = String(driverMobile).replace(/\D/g, '');
    let unsub;
    let handled = false;
    try {
      unsub = listenToTour(code, (fetchedTour) => {
        if (handled) return;
        handled = true;
        
        // Safely unsubscribe whether called synchronously or asynchronously
        if (typeof unsub === 'function') unsub();
        else setTimeout(() => typeof unsub === 'function' && unsub(), 0);

        setIsManualLoading(false);
        if (!fetchedTour) {
          setLoadError(`Tour "${code}" not found. Please check the code.`);
          return;
        }
        // Verify this driver is actually assigned to this tour
        if (!isMobileAssignedToTour(fetchedTour, cleanMobile)) {
          setLoadError(`Your mobile number is not assigned to tour "${code}". Please contact your operator.`);
          return;
        }
        // All good — load the tour
        setTourData({ ...fetchedTour, _manualLoad: true });
        setActiveTourCode(code);
        setLoadError('');
      });
    } catch (err) {
      console.error(err);
      setIsManualLoading(false);
      setLoadError('Error verifying tour code. Please try again.');
    }

  }, [tourCodeInput, driverMobile, isMobileAssignedToTour]);

  // Helper date conversions
  const yyyymmddToTourStr = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(m, 10) - 1;
    const monthName = months[monthIndex];
    return `${d}-${monthName}-${y}`;
  };

  const tourStrToYYYYMMDD = (tourStr) => {
    if (!tourStr) return '';
    const parts = tourStr.split('-');
    if (parts.length !== 3) return '';
    const [d, mStr, y] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = months.indexOf(mStr) + 1;
    if (mIdx === 0) return '';
    const m = String(mIdx).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Generate standard meeting locations
  const getPickupLocationName = (actTitle, idx, hotelName, restaurantName) => {
    if (idx === 0) return hotelName || 'Hotel Lobby';
    const lowerTitle = actTitle.toLowerCase();
    if (lowerTitle.includes('airport') || lowerTitle.includes('flight')) {
      return 'Airport Terminal Arrival Gate';
    }
    if (lowerTitle.includes('station') || lowerTitle.includes('rail') || lowerTitle.includes('train')) {
      return 'Railway Station Parking Entry';
    }
    if (lowerTitle.includes('dinner') || lowerTitle.includes('lunch') || lowerTitle.includes('restaurant')) {
      return restaurantName || 'Restaurant Entrance';
    }
    return `${actTitle} Main Parking Lot / Gate`;
  };

  const handleUpdateActivityStatus = async (dayIdx, actIdx, statusValue) => {
    if (actIdx === 998) {
      // Driver 1 completes drop-off
      await updateTourResource(activeTourCode, `itinerary/${dayIdx}/transferDepartureDone`, statusValue === 'completed');
      return;
    }
    if (actIdx === 999) {
      // Driver 2 completes pick-up
      await updateTourResource(activeTourCode, `itinerary/${dayIdx}/transferArrivalDone`, statusValue === 'completed');
      return;
    }
    await updateTourResource(activeTourCode, `itinerary/${dayIdx}/activitiesList/${actIdx}/status`, statusValue);
  };

  if (!tourData) {
    return (
      <div style={styles.loaderWrap}>
        <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ width: '120px', marginBottom: '16px', opacity: 0.9 }} />
        {isManualLoading ? (
          <>
            <div style={styles.spinner} />
            <p style={{ color: '#073549', fontWeight: '600' }}>Verifying tour code...</p>
          </>
        ) : !loadError ? (
          <>
            <div style={styles.spinner} />
            <p style={{ color: '#073549', fontWeight: '600' }}>Searching tours for {driverMobile}...</p>
          </>
        ) : null}
        {loadError && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '10px', fontSize: '0.88rem', maxWidth: '340px', textAlign: 'center' }}>
            <p style={{ marginBottom: '12px', fontWeight: '600' }}>{loadError}</p>
            <p style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '12px' }}>
              If your operator has assigned you a tour code, enter it below:
            </p>
            <form onSubmit={handleLoadTour} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={tourCodeInput}
                onChange={(e) => setTourCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. MR-2026-ABC"
                style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '6px', textTransform: 'uppercase', fontSize: '0.85rem' }}
              />
              <button type="submit" disabled={isManualLoading} style={{ padding: '8px 14px', background: '#1a8a7d', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>
                {isManualLoading ? '...' : 'Load'}
              </button>
            </form>
            <button onClick={onLogout} style={{ marginTop: '12px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
              ← Back to Login
            </button>
          </div>
        )}
      </div>
    );
  }

  // Parse tour range dates
  const tourStartYYYYMMDD = tourData.startDate;
  const tourEndYYYYMMDD = tourData.endDate;

  // Date Check Comparisons
  const isBeforeTour = selectedDate < tourStartYYYYMMDD;
  const isAfterTour = selectedDate > tourEndYYYYMMDD;

  // Find active day matching selected date
  const targetTourDateStr = yyyymmddToTourStr(selectedDate);
  const activeDayIndex = tourData.itinerary?.findIndex(d => d.dateStr === targetTourDateStr) ?? -1;
  const hasScheduledDay = activeDayIndex !== -1;
  const realActiveDayIdx = hasScheduledDay ? activeDayIndex : 0;
  const currentDay = tourData.itinerary?.[realActiveDayIdx] || {};

  const cleanMobileCalc = String(driverMobile).replace(/\D/g, '');

  // ── ROBUST ROLE DETECTION ──────────────────────────────────────────────────
  // Don't rely on currentDay alone. Scan ALL itinerary days to find the driver's role.
  // This is immune to date format mismatches and fallback day index issues.
  
  // Find the day where this driver is the Leg-1 (Origin) DROP-OFF driver.
  // IMPORTANT: Only count days that have a destTransferDriverMobile — meaning there
  // is a Leg-2 driver taking over. This prevents a single-leg airport arrival pickup
  // (Day 1, no leg-2 driver) from being incorrectly treated as a "handoff" point.
  const originTransferDayIndex = tourData.itinerary?.findIndex(day =>
    day?.interCityTransfer &&
    mobileMatches(day.transferDriverMobile, cleanMobileCalc) &&
    !!day.destTransferDriverMobile  // must have a leg-2 driver to be a genuine handoff
  ) ?? -1;

  // Find the day where this driver is the Destination (Leg 2) pick-up driver
  const destTransferDayIndex = tourData.itinerary?.findIndex(day =>
    day?.interCityTransfer && mobileMatches(day.destTransferDriverMobile, cleanMobileCalc)
  ) ?? -1;

  const isOriginTransferCalc = originTransferDayIndex !== -1;
  const isDestTransferCalc = destTransferDayIndex !== -1;

  // The source day for transfer context
  const transferSourceDay = isDestTransferCalc
    ? tourData.itinerary[destTransferDayIndex]
    : isOriginTransferCalc
      ? tourData.itinerary[originTransferDayIndex]
      : currentDay;

  // isMainDriver = true even if they ALSO have a transfer leg (e.g. Deep is main driver AND leg-1 drop-off)
  const isMainDriver = mobileMatches(tourData.driverMobile, cleanMobileCalc);

  // Debug log
  console.log('[DriverPortal] Role detection:', {
    cleanMobileCalc, isOriginTransferCalc, originTransferDayIndex,
    isDestTransferCalc, destTransferDayIndex, isMainDriver, selectedDate,
  });

  // ── ACTIVE DATE RANGE FOR EACH DRIVER ─────────────────────────────────────
  // ALL drivers (including main driver Deep) are limited to their own duty dates.
  // Deep (main+origin): active from tourStart → his handoff day (inclusive).
  // Raj1 (dest+origin): active from his pickup day → his drop-off day.
  // Raj3 (dest only) : active from his pickup day → tourEnd.
  let driverFirstActiveYYYYMMDD = tourStartYYYYMMDD;
  let driverLastActiveYYYYMMDD  = tourEndYYYYMMDD;

  if (!isMainDriver && isDestTransferCalc && destTransferDayIndex !== -1) {
    // Leg-2/3 driver: not active before their pickup day
    const pd = tourData.itinerary[destTransferDayIndex]?.dateStr;
    const c = pd ? tourStrToYYYYMMDD(pd) : null;
    if (c) driverFirstActiveYYYYMMDD = c;
  }
  // ALL drivers with a genuine handoff: their LAST active day is the handoff day.
  // (No !isMainDriver guard — Deep also hands off to Raj1 and should stop seeing after that)
  if (isOriginTransferCalc && originTransferDayIndex !== -1) {
    const dd = tourData.itinerary[originTransferDayIndex]?.dateStr;
    const c = dd ? tourStrToYYYYMMDD(dd) : null;
    if (c) driverLastActiveYYYYMMDD = c;
  }

  // Leg-1 completion flag: when Deep marks drop-off done, Raj1's "upcoming" screen disappears
  const leg1Completed = isDestTransferCalc &&
    !!tourData.itinerary?.[destTransferDayIndex]?.transferDepartureDone;

  // Is today before this driver's assignment start date OR is leg-1 not yet done?
  // The user requested that if leg 1 is marked done, leg 2 opens IMMEDIATELY, without waiting for the date.
  // And if it's undone, it locks again. So we strictly use leg1Completed as the lock.
  const isBeforeDriverRange = !isMainDriver && isDestTransferCalc && !leg1Completed;

  // ── TODAY-SPECIFIC TRANSFER ROLE ────────────────────────────────────────────
  // Determine what role (if any) this driver has specifically TODAY, not just globally.
  // This prevents Raj1 (who will eventually drop off at Varanasi) from being treated
  // as an "origin transfer driver" on days that are irrelevant to him.
  const todayIsMyDestTransferDay = isDestTransferCalc &&
    !!(currentDay?.interCityTransfer) &&
    mobileMatches(currentDay.destTransferDriverMobile, cleanMobileCalc);

  const todayIsMyOriginTransferDay = isOriginTransferCalc &&
    !!(currentDay?.interCityTransfer) &&
    mobileMatches(currentDay.transferDriverMobile, cleanMobileCalc);

  // ── EARLY RETURN: Not yet on duty ─────────────────────────────────────────
  // Show an "Upcoming Assignment" screen instead of irrelevant activities.
  if (isBeforeDriverRange) {
    const pickupDay = destTransferDayIndex !== -1 ? tourData.itinerary[destTransferDayIndex] : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '32px 20px', background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%)', fontFamily: 'Inter, sans-serif' }}>
        <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ width: '100px', marginBottom: '20px', opacity: 0.9 }} />
        <div style={{ textAlign: 'center', padding: '28px 24px', maxWidth: '360px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 32px rgba(0,0,0,0.10)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🕐</div>
          <h2 style={{ color: '#073549', fontWeight: '800', fontSize: '1.05rem', marginBottom: '6px', lineHeight: '1.4' }}>
            Your Assignment Starts On
          </h2>
          <div style={{ color: '#1a8a7d', fontSize: '1.4rem', fontWeight: '900', marginBottom: '14px' }}>
            {pickupDay?.dateStr || driverFirstActiveYYYYMMDD}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.84rem', lineHeight: '1.7', margin: '0 0 18px' }}>
            You are assigned to pick up clients at{' '}
            <strong style={{ color: '#073549' }}>{pickupDay?.transferDestination || 'your destination'}</strong>{' '}
            {pickupDay?.transport === 'By Flight' ? 'Airport ✈️' : 'Railway Station 🚆'}.
            {pickupDay?.flightNo && <><br /><strong>Flight: {pickupDay.flightNo}</strong></>}
            {pickupDay?.trainNo && <><br /><strong>Train: {pickupDay.trainNo}</strong></>}
            <br />Please check back on your assignment date.
          </p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px', color: '#166534', fontSize: '0.82rem', fontWeight: '600', lineHeight: '1.8', textAlign: 'left' }}>
            <div>🗺️ <strong>Tour:</strong> {tourData.tourName || tourData.tourCode}</div>
            <div>📅 <strong>Period:</strong> {tourData.startDate} → {tourData.endDate}</div>
            {pickupDay?.transferOrigin && <div>📍 <strong>Pickup From:</strong> {pickupDay.transferDestination}</div>}
          </div>
          <button onClick={onLogout} style={{ marginTop: '18px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}>
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVITY COMPUTATION ──────────────────────────────────────────────────
  let rawActivities = (currentDay.activitiesList || []).map((act, idx) => ({ ...act, originalIndex: idx }));

  // Inject synthetic transfer tasks ONLY on the EXACT matching transfer day,
  // not on every day the driver has a global transfer role.
  if (todayIsMyOriginTransferDay || todayIsMyDestTransferDay) {
    const srcDay = todayIsMyDestTransferDay
      ? tourData.itinerary?.[destTransferDayIndex]
      : tourData.itinerary?.[originTransferDayIndex];
    const transportMode = srcDay?.transport === 'By Flight' ? 'Airport ✈️' : 'Railway Station 🚆';
    const travelDetail = srcDay?.transport === 'By Flight' ? srcDay.flightNo : srcDay.trainNo;
    const detailStr = travelDetail ? `(${travelDetail})` : '';

    if (todayIsMyOriginTransferDay) {
      rawActivities.push({
        isSyntheticTransfer: true,
        originalIndex: 998,
        time: 'TBD',
        title: `Drop-off at ${currentDay.transferOrigin || 'Origin'} ${transportMode}`,
        desc: `Drop off clients for their onward journey ${detailStr}.`,
        cityTag: 'Origin',
        status: currentDay.transferDepartureDone ? 'completed' : 'pending'
      });
    }
    if (todayIsMyDestTransferDay) {
      const dSrc = tourData.itinerary?.[destTransferDayIndex];
      rawActivities.unshift({
        isSyntheticTransfer: true,
        originalIndex: 999,
        time: 'TBD',
        title: `Pick-up from ${dSrc?.transferDestination || currentDay.city || 'Destination'} ${transportMode}`,
        desc: `Pick up clients arriving via ${dSrc?.transport || 'Transfer'} ${detailStr}. From ${dSrc?.transferOrigin || '—'} → ${dSrc?.transferDestination || currentDay.city || '—'}.`,
        cityTag: 'Destination',
        status: dSrc?.transferArrivalDone ? 'completed' : 'pending'
      });
    }
  }

  // Filter based on TODAY's role — NOT global role — so Raj1 in the middle of
  // his active period sees ALL of that day's activities, not just Destination ones.
  const driverActivitiesWithIndex = rawActivities.filter(act => {
    if (todayIsMyOriginTransferDay && !todayIsMyDestTransferDay) {
      return act.cityTag !== 'Destination';
    }
    if (todayIsMyDestTransferDay && !todayIsMyOriginTransferDay) {
      return act.cityTag === 'Destination' || act.isSyntheticTransfer;
    }
    return true; // Regular day or main driver: show everything
  });

  // ── GLOBAL NEXT ACTIVITY (For the Green Card) ─────────────────────────────
  // Scan all days in the active range to find the FIRST uncompleted activity.
  let globalNextActivity = null;
  let globalNextActivityDateStr = null;

  if (!isBeforeDriverRange && tourData?.itinerary) {
    for (let i = 0; i < tourData.itinerary.length; i++) {
      const day = tourData.itinerary[i];
      const dayYYYY = tourStrToYYYYMMDD(day.dateStr);
      if (!dayYYYY) continue;

      if (driverFirstActiveYYYYMMDD && dayYYYY < driverFirstActiveYYYYMMDD) continue;
      if (driverLastActiveYYYYMMDD && dayYYYY > driverLastActiveYYYYMMDD) continue;

      const dayIsDestTransfer = isDestTransferCalc && day.interCityTransfer && mobileMatches(day.destTransferDriverMobile, cleanMobileCalc);
      const dayIsOriginTransfer = isOriginTransferCalc && day.interCityTransfer && mobileMatches(day.transferDriverMobile, cleanMobileCalc);

      let dayActs = (day.activitiesList || []).map((act, idx) => ({ ...act, originalIndex: idx }));

      if (dayIsOriginTransfer || dayIsDestTransfer) {
        const srcDay = dayIsDestTransfer ? tourData.itinerary?.[destTransferDayIndex] : tourData.itinerary?.[originTransferDayIndex];
        const transportMode = srcDay?.transport === 'By Flight' ? 'Airport ✈️' : 'Railway Station 🚆';
        const travelDetail = srcDay?.transport === 'By Flight' ? srcDay.flightNo : srcDay.trainNo;
        const detailStr = travelDetail ? `(${travelDetail})` : '';

        if (dayIsOriginTransfer) {
          dayActs.push({
            isSyntheticTransfer: true,
            originalIndex: 998,
            time: 'TBD',
            title: `Drop-off at ${day.transferOrigin || 'Origin'} ${transportMode}`,
            desc: `Drop off clients for their onward journey ${detailStr}.`,
            cityTag: 'Origin',
            status: day.transferDepartureDone ? 'completed' : 'pending'
          });
        }
        if (dayIsDestTransfer) {
          const dSrc = tourData.itinerary?.[destTransferDayIndex];
          dayActs.unshift({
            isSyntheticTransfer: true,
            originalIndex: 999,
            time: 'TBD',
            title: `Pick-up from ${dSrc?.transferDestination || day.city || 'Destination'} ${transportMode}`,
            desc: `Pick up clients arriving via ${dSrc?.transport || 'Transfer'} ${detailStr}. From ${dSrc?.transferOrigin || '—'} → ${dSrc?.transferDestination || day.city || '—'}.`,
            cityTag: 'Destination',
            status: dSrc?.transferArrivalDone ? 'completed' : 'pending'
          });
        }
      }

      const filteredDayActs = dayActs.filter(act => {
        if (dayIsOriginTransfer && !dayIsDestTransfer) return act.cityTag !== 'Destination';
        if (dayIsDestTransfer && !dayIsOriginTransfer) return act.cityTag === 'Destination' || act.isSyntheticTransfer;
        return true;
      });

      const uncompleted = filteredDayActs.find(act => act.status !== 'completed');
      if (uncompleted) {
        globalNextActivity = uncompleted;
        globalNextActivityDateStr = day.dateStr;
        break;
      }
    }
  }

  // Use the global next activity for the green card. If all done, default to the first activity of the selected day just so it doesn't break UI.
  const nextActivity = globalNextActivity || driverActivitiesWithIndex[0] || {};

  // Dummy data for visual completion
  const driverDetails = {
    name: tourData.driverName || 'Not Assigned',
    vehicle: tourData.vehicleType || 'Sedan',
    vehicleNo: tourData.vehicleNo || 'XX-XXXX'
  };

  // Calculate how many days completed
  const totalDays = tourData.itinerary?.length || 1;
  const completedDays = tourData.itinerary?.filter(d => d.arrived).length || 0;
  const tourProgressPct = Math.round((completedDays / totalDays) * 100);

  // Next city calculation for distance/fuel
  const nextDayIdx = realActiveDayIdx + 1;
  const nextDayData = tourData.itinerary?.[nextDayIdx] || null;
  const todayCity = currentDay.city || '';
  const nextCity = nextDayData?.city || '';
  const distToNext = getDistanceBetweenCities(todayCity, nextCity);
  const estTravelTime = getEstimatedTravelTime(distToNext);
  const estFuel = getEstimatedFuel(distToNext);

  // Today's total route distance (sum of intra-city activity travel, rough estimate ~40km local)
  const todayLocalDist = driverActivitiesWithIndex.length ? driverActivitiesWithIndex.length * 12 : 30;
  const todayTotalDist = todayLocalDist + (distToNext > 0 ? distToNext : 0);
  const todayTotalFuel = getEstimatedFuel(todayTotalDist);

  // Weather for current city
  const cityWeather = getWeatherForCity(todayCity);
  const WeatherIconComponent = getWeatherIcon(cityWeather.condition);
  const weatherColor = getWeatherColor(cityWeather.condition);

  // Duty hours calculation
  const firstActivityTime = driverActivitiesWithIndex[0]?.time || '09:00 AM';
  const getDutyHours = () => {
    try {
      const now = currentTime;
      const [timePart, ampm] = firstActivityTime.split(' ');
      const [h, m] = timePart.split(':').map(Number);
      let startHour = h;
      if (ampm?.toUpperCase() === 'PM' && h !== 12) startHour += 12;
      if (ampm?.toUpperCase() === 'AM' && h === 12) startHour = 0;
      const startDate = new Date(now);
      startDate.setHours(startHour, m || 0, 0, 0);
      const diffMs = now - startDate;
      if (diffMs < 0) return { hours: 0, mins: 0, status: 'not_started' };
      const totalMins = Math.floor(diffMs / 60000);
      return { hours: Math.floor(totalMins / 60), mins: totalMins % 60, status: totalMins > 720 ? 'overtime' : 'active' };
    } catch {
      return { hours: 0, mins: 0, status: 'not_started' };
    }
  };
  const dutyInfo = getDutyHours();

  if (showPrintPreview) {
    return (
      <div className="print-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f1f5f9', zIndex: 9999, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <style>{`
          @media print {
            html, body, #root {
              width: auto !important;
              height: auto !important;
              overflow: visible !important;
              position: static !important;
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 0 !important;
            }
            #printable-area {
              margin: 0 !important;
              padding: 22mm !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: 100% !important;
              min-height: auto !important;
              display: block !important;
              position: static !important;
              border: none !important;
              background: white !important;
            }
            #printable-area table td,
            #printable-area table th {
              border-color: #000000 !important;
            }
            .print-page-border {
              display: none;
            }
            @media print {
              .print-page-border {
                display: block !important;
                position: fixed !important;
                top: 12mm !important;
                left: 12mm !important;
                right: 12mm !important;
                bottom: 12mm !important;
                border: 2px solid #000000 !important;
                z-index: 99999 !important;
                pointer-events: none !important;
                box-sizing: border-box !important;
              }
            }
          }
        `}</style>

        {/* Non-Printable Action Header */}
        <div className="no-print" style={{ height: '60px', backgroundColor: '#0B4F6C', color: '#FAF7F2', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0 }}>
          <span style={{ fontWeight: '700', fontSize: '1rem' }}>PDF Tour Print Preview ({tourData.tourCode})</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => window.print()} style={{ backgroundColor: '#10B981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Printer size={16} /> Print Brief Itinerary
            </button>
            <button onClick={() => setShowPrintPreview(false)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}>
              ✕ Close Preview
            </button>
          </div>
        </div>

        {/* Printable A4 Itinerary Sheet */}
        <div id="printable-area" style={{ width: '794px', margin: '30px auto', padding: '40px', backgroundColor: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', boxSizing: 'border-box', color: '#000000', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', display: 'block' }}>
          <div className="print-page-border" />
          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
            <thead>
              <tr>
                <td style={{ border: 'none', padding: '0 0 20px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #d97706', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ height: '48px', marginBottom: '4px' }} />
                      <span style={{ fontSize: '0.62rem', letterSpacing: '2px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', margin: 0 }}>Making Travel an experience</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>“{tourData.tourName}”</h2>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: 'none', padding: 0 }}>
                  <div style={{ padding: '0 10px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div style={{ fontSize: '1rem', fontWeight: '800', textTransform: 'uppercase', color: '#0F172A', letterSpacing: '1.5px' }}>
                        {Array.from(new Set(tourData.itinerary?.map(d => d.city).filter(Boolean))).join(' - ')}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginTop: '4px' }}>
                        {String(tourData.itinerary?.length ? tourData.itinerary.length - 1 : 0).padStart(2, '0')} Nights / {String(tourData.itinerary?.length || 0).padStart(2, '0')} Days
                      </div>
                    </div>

                    <div style={{ borderLeft: '3px solid #d97706', paddingLeft: '16px', margin: '20px 0' }}>
                      <span style={{ backgroundColor: '#0B4F6C', color: '#ffffff', padding: '4px 10px', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase', borderRadius: '4px' }}>
                        Detailed Itinerary
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '20px 0' }}>
                      {tourData.itinerary?.map((day, idx) => (
                        <div key={idx} style={{ 
                          pageBreakInside: 'avoid', 
                          breakInside: 'avoid',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '16px',
                          backgroundColor: '#FCFBFA',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #E2E8F0', paddingBottom: '10px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ backgroundColor: '#d97706', color: '#ffffff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '800' }}>
                                DAY {day.day}
                              </span>
                              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0F172A' }}>
                                {day.dateStr}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0B4F6C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {day.city}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.6', marginBottom: '14px', textAlign: 'justify' }}>
                            {day.activities || 'Leisure / Free time'} 
                          </div>

                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                            gap: '12px', 
                            padding: '10px 14px', 
                            backgroundColor: '#F1F5F9', 
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            color: '#475569'
                          }}>
                            {day.hotelName && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '1rem' }}>🏨</span>
                                <div>
                                  <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.8 }}>Hotel Accommodation</strong>
                                  <span style={{ fontWeight: '600' }}>{day.hotelName}</span>
                                </div>
                              </div>
                            )}
                            {day.mealPlan && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '1rem' }}>🍽️</span>
                                <div>
                                  <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.8 }}>Meal Plan</strong>
                                  <span style={{ fontWeight: '600' }}>{day.mealPlan}</span>
                                </div>
                              </div>
                            )}
                            {(day.transport || day.flightNo || day.trainNo) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '1rem' }}>🚗</span>
                                <div>
                                  <strong style={{ color: '#0F172A', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', opacity: 0.8 }}>Transport</strong>
                                  <span style={{ fontWeight: '600' }}>
                                    {day.flightNo ? `Flight: ${day.flightNo}` : day.trainNo ? `Train: ${day.trainNo}` : day.transport || 'By Surface'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ textAlign: 'center', fontWeight: '800', fontSize: '0.95rem', margin: '40px 0 20px 0', letterSpacing: '2px', color: '#94A3B8' }}>
                      --- TOUR ENDS ---
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td style={{ border: 'none', padding: '20px 0 0 0' }}>
                  <div style={{ borderTop: '2px solid #d97706', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#334155', fontFamily: 'sans-serif' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#000000', fontWeight: '800', fontSize: '0.9rem' }}>Maru Travel</h4>
                      <div style={{ fontSize: '0.62rem', letterSpacing: '1px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', marginBottom: '8px' }}>
                        INDIA &nbsp;|&nbsp; SOUTH KOREA
                      </div>
                      <strong style={{ fontSize: '0.72rem', color: '#000000' }}>DELHI OFFICE:</strong>
                      <p style={{ margin: '2px 0 0 0', lineHeight: '1.4', fontSize: '0.75rem', color: '#475569' }}>
                        6A, First Floor, Uttam Nagar Main Rd<br/>
                        Near Metro Pillar No. 666<br/>
                        New Delhi - 110059
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', textAlign: 'right', gap: '2px', fontSize: '0.75rem', color: '#475569' }}>
                      <span><strong>Mobile phone:</strong> +91-9811430044</span>
                      <span><strong>E Mail:</strong> ranjan@maru.travel</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Role Banner for Clarity */}
      {(isOriginTransferCalc || isDestTransferCalc) && (
        <div style={{
          backgroundColor: isDestTransferCalc ? '#f59e0b' : '#3b82f6',
          color: 'white',
          padding: '10px 16px',
          textAlign: 'center',
          fontSize: '0.9rem',
          fontWeight: '600',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {isDestTransferCalc ? '🚗 Driver 2: Destination Pick-up Duty' : '🚗 Driver 1: Origin Drop-off Duty'}
        </div>
      )}

      {/* Top Header Bar */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.headerTitle}>Driver Panel</h1>
            <span style={styles.headerSubtitle}>
              {isDestTransferCalc ? transferSourceDay.destTransferDriverName : isOriginTransferCalc ? transferSourceDay.transferDriverName : tourData.driverName}
            </span>
          </div>
          <img src="/maru_logo_transparent.png" alt="Maru Travel" style={styles.headerLogo} />
        </div>
        <div style={styles.headerRight}>
          <div style={styles.gpsBadge}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: driverGpsLive ? '#22c55e' : '#94a3b8',
              animation: driverGpsLive ? 'mapPulse 1.5s infinite' : 'none'
            }} />
            <span style={{ fontSize: '0.65rem', fontWeight: '700' }}>
              {driverGpsLive ? 'GPS LIVE' : 'GPS WAITING'}
            </span>
          </div>
          <button onClick={() => setShowPrintPreview(true)} style={{ ...styles.logoutBtn, backgroundColor: '#facc15', color: '#000', marginRight: '6px' }}>
            <Printer size={16} />
          </button>
          <button onClick={onLogout} style={styles.logoutBtn}>
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main style={{ ...styles.mainContent, paddingBottom: '100px' }}>

        {/* Tour Progress Bar */}
        {!isBeforeTour && !isAfterTour && (
          <div style={styles.progressCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} color="#1a8a7d" />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {language === 'KO' ? '투어 진행률' : 'Tour Progress'}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#1a8a7d' }}>
                {completedDays}/{totalDays} {language === 'KO' ? '일' : 'Days'}
              </span>
            </div>
            <div style={styles.progressBarTrack}>
              <div style={{ ...styles.progressBarFill, width: `${tourProgressPct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '600' }}>
                {tourProgressPct}% {language === 'KO' ? '완료' : 'complete'}
              </span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '600' }}>
                {totalDays - completedDays} {language === 'KO' ? '일 남음' : 'days remaining'}
              </span>
            </div>
          </div>
        )}

        {/* Emergency Instructions Banner */}
        {tourData.emergencyInstructions && (
          <div style={{
            padding: '16px',
            background: '#FEF2F2',
            borderLeft: '4px solid #EF4444',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            boxShadow: '0 4px 6px rgba(239,68,68,0.1)',
            marginBottom: '16px',
            animation: 'slideDownFadeIn 0.3s ease-out'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🚨</span>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#991B1B', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '800' }}>
                {language === 'KO' ? '긴급 업데이트' : 'URGENT INSTRUCTIONS'}
              </strong>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#7F1D1D', fontWeight: '700', lineHeight: '1.4' }}>
                {tourData.emergencyInstructions}
              </p>
            </div>
          </div>
        )}

        {/* Live Broadcast Banner from Guide */}
        {tourData.announcement && (
          <div style={{
            padding: '12px 16px',
            background: '#fef3c7',
            borderLeft: '4px solid #facc15',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Volume2 size={16} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#b45309', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {language === 'KO' ? '가이드 긴급 안내' : 'BROADCAST ALERT FROM GUIDE'} ({tourData.announcement.time})
              </span>
              <p style={{ fontSize: '0.82rem', color: '#1e293b', margin: '2px 0 0 0', fontWeight: '700', lineHeight: '1.4' }}>
                "{tourData.announcement.text}"
              </p>
            </div>
          </div>
        )}

        {/* Tour Switcher Panel */}
        <div style={{ ...styles.vehicleCard, padding: '14px' }}>
          <h4 style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            {t('changeTourCode')}
          </h4>
          <form onSubmit={handleLoadTour} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. JI-2026-X8J"
              value={tourCodeInput}
              onChange={(e) => setTourCodeInput(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                fontWeight: '700',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{ padding: '8px 12px', borderRadius: '8px', background: '#1a8a7d', color: 'white', border: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              <RefreshCw size={12} /> {t('loadTour')}
            </button>
          </form>
          {loadError && (
            <p style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '700', marginTop: '6px', margin: '6px 0 0 0' }}>{loadError}</p>
          )}
        </div>

        {/* Date Selector Panel */}
        <div style={{ ...styles.vehicleCard, padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#1a8a7d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('currentDate')}</span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>
                {yyyymmddToTourStr(selectedDate)}
              </h3>
            </div>
            
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#0f172a',
                  background: '#fff',
                  outline: 'none',
                }}
              >
                <option value={getTodayYYYYMMDD()}>{language === 'KO' ? '오늘 날짜' : 'Today'}</option>
                {tourData.itinerary?.filter((day) => {
                  const dayYYYY = tourStrToYYYYMMDD(day.dateStr);
                  if (!dayYYYY) return false;
                  if (driverFirstActiveYYYYMMDD && dayYYYY < driverFirstActiveYYYYMMDD) return false;
                  if (driverLastActiveYYYYMMDD && dayYYYY > driverLastActiveYYYYMMDD) return false;
                  return true;
                }).map((day) => {
                  const dayYYYY = tourStrToYYYYMMDD(day.dateStr);
                  return (
                    <option key={day.day} value={dayYYYY}>
                      Day {day.day} ({day.city})
                    </option>
                  );
                })}
              </select>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '5px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Date Conditional Notices */}
        {isBeforeTour ? (
          <div style={{ padding: '24px 16px', background: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '14px', textAlign: 'center' }}>
            <Calendar size={32} color="#d97706" style={{ margin: '0 auto 8px auto' }} />
            <h4 style={{ color: '#92400e', fontWeight: '800', margin: 0, fontSize: '0.95rem' }}>{t('tourNotStartedYet')}</h4>
            <p style={{ color: '#b45309', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              {t('firstDayOfTour')}: <strong>{yyyymmddToTourStr(tourStartYYYYMMDD)}</strong>
            </p>
          </div>
        ) : isAfterTour ? (
          <div style={{ padding: '24px 16px', background: '#ecfdf5', borderLeft: '4px solid #10b981', borderRadius: '14px', textAlign: 'center' }}>
            <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
            <h4 style={{ color: '#065f46', fontWeight: '800', margin: 0, fontSize: '0.95rem' }}>{t('tourCompleted')}</h4>
            <p style={{ color: '#047857', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              {t('lastDayOfTour')}: <strong>{yyyymmddToTourStr(tourEndYYYYMMDD)}</strong>
            </p>
          </div>
        ) : !hasScheduledDay ? (
          <div style={{ padding: '24px 16px', background: '#f8fafc', borderLeft: '4px solid #94a3b8', borderRadius: '14px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#64748b" style={{ margin: '0 auto 8px auto' }} />
            <h4 style={{ color: '#334155', fontWeight: '800', margin: 0, fontSize: '0.95rem' }}>{t('noActivitiesToday')}</h4>
          </div>
        ) : (
          <>
            {/* NEXT UP Card — Enhanced with travel estimates */}
            <div style={styles.nextUpCard}>
              <div style={styles.nextUpHeader}>
                <span style={styles.nextUpBadge}>
                  <Clock size={12} /> {language === 'KO' ? '다음 목적지' : 'NEXT TARGET'} • {nextActivity.time || '09:00 AM'}
                </span>
              </div>
              <h2 style={styles.nextUpTitle}>{nextActivity.title || currentDay.city + ' Sightseeing'}</h2>
              <p style={styles.nextUpDesc}>
                {currentDay.activities?.substring(0, 110)}...
              </p>

              {/* Enhanced: Travel Estimates Strip */}
              {nextCity && distToNext > 0 && (
                <div style={styles.nextUpEstimates}>
                  <div style={styles.nextUpEstItem}>
                    <Route size={13} style={{ opacity: 0.85 }} />
                    <div>
                      <span style={styles.nextUpEstLabel}>{language === 'KO' ? '거리' : 'Distance'}</span>
                      <span style={styles.nextUpEstValue}>{distToNext} km</span>
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'stretch' }} />
                  <div style={styles.nextUpEstItem}>
                    <Timer size={13} style={{ opacity: 0.85 }} />
                    <div>
                      <span style={styles.nextUpEstLabel}>{language === 'KO' ? '예상 시간' : 'Est. Time'}</span>
                      <span style={styles.nextUpEstValue}>{estTravelTime}</span>
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'stretch' }} />
                  <div style={styles.nextUpEstItem}>
                    <MapPin size={13} style={{ opacity: 0.85 }} />
                    <div>
                      <span style={styles.nextUpEstLabel}>{language === 'KO' ? '다음 도시' : 'Next City'}</span>
                      <span style={styles.nextUpEstValue}>{nextCity}</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.nextUpActions}>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((nextActivity.title || currentDay.city) + ', ' + currentDay.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.nextUpNavBtn}
                >
                  <Navigation size={14} /> GPS Navigation
                </a>
                <a href={`tel:${tourData.guideMobile}`} style={styles.nextUpCallBtn}>
                  <Phone size={14} /> Call Guide
                </a>
              </div>
            </div>

            {/* Weather Alert + Duty Hours Row */}
            <div style={styles.infoCardsRow}>
              {/* Weather Alert Card */}
              <div style={styles.weatherCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ ...styles.weatherIconWrap, backgroundColor: `${weatherColor}15` }}>
                    <WeatherIconComponent size={18} color={weatherColor} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                      {todayCity || 'Current City'}
                    </span>
                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a' }}>
                      {cityWeather.label}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: weatherColor, lineHeight: 1 }}>{cityWeather.temp}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8' }}>°C</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Thermometer size={11} color="#94a3b8" />
                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600' }}>{cityWeather.humidity}%</span>
                  </div>
                </div>
              </div>

              {/* Duty Hours Tracker Card */}
              <div style={styles.dutyCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Timer size={14} color={dutyInfo.status === 'overtime' ? '#ef4444' : '#1a8a7d'} />
                  <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {language === 'KO' ? '근무 시간' : 'Duty Hours'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: dutyInfo.status === 'overtime' ? '#ef4444' : '#0f172a', lineHeight: 1 }}>
                    {dutyInfo.hours}h {String(dutyInfo.mins).padStart(2, '0')}m
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: dutyInfo.status === 'overtime' ? '#ef4444' : dutyInfo.status === 'active' ? '#22c55e' : '#94a3b8',
                    animation: dutyInfo.status === 'active' ? 'mapPulse 2s infinite' : 'none'
                  }} />
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: dutyInfo.status === 'overtime' ? '#ef4444' : dutyInfo.status === 'active' ? '#22c55e' : '#94a3b8' }}>
                    {dutyInfo.status === 'overtime' ? (language === 'KO' ? '초과 근무' : 'OVERTIME') : dutyInfo.status === 'active' ? (language === 'KO' ? '근무 중' : 'ON DUTY') : (language === 'KO' ? '미시작' : 'NOT STARTED')}
                  </span>
                </div>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '600', marginTop: '4px', display: 'block' }}>
                  {language === 'KO' ? '시작' : 'Since'} {firstActivityTime}
                </span>
              </div>
            </div>

            {/* Fuel / Distance Tracker Card */}
            <div style={styles.fuelCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Fuel size={16} color="#f59e0b" />
                <h3 style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                  {language === 'KO' ? '오늘 연료/거리 추정' : "Today's Route Estimate"}
                </h3>
              </div>
              <div style={styles.fuelGrid}>
                <div style={styles.fuelGridItem}>
                  <Route size={16} color="#3b82f6" />
                  <div>
                    <span style={styles.fuelGridLabel}>{language === 'KO' ? '총 예상 거리' : 'Est. Distance'}</span>
                    <span style={styles.fuelGridValue}>{todayTotalDist} km</span>
                  </div>
                </div>
                <div style={styles.fuelGridItem}>
                  <Fuel size={16} color="#f59e0b" />
                  <div>
                    <span style={styles.fuelGridLabel}>{language === 'KO' ? '예상 연료' : 'Fuel Needed'}</span>
                    <span style={styles.fuelGridValue}>~{todayTotalFuel} L</span>
                  </div>
                </div>
                <div style={styles.fuelGridItem}>
                  <Gauge size={16} color="#8b5cf6" />
                  <div>
                    <span style={styles.fuelGridLabel}>{language === 'KO' ? '시내 주행' : 'Local Drive'}</span>
                    <span style={styles.fuelGridValue}>{todayLocalDist} km</span>
                  </div>
                </div>
                <div style={styles.fuelGridItem}>
                  <Zap size={16} color="#10b981" />
                  <div>
                    <span style={styles.fuelGridLabel}>{language === 'KO' ? '도시 간 이동' : 'Intercity'}</span>
                    <span style={styles.fuelGridValue}>{distToNext > 0 ? `${distToNext} km` : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Itinerary — Timeline style with interactive status tracking */}
            <div style={styles.todaySection}>
              <div style={styles.todaySectionHeader}>
                <h3 style={styles.sectionTitle}>
                  <Calendar size={16} color="#1a8a7d" /> Today's Itinerary
                </h3>
                <span style={styles.dayBadge}>Day {currentDay.day} · {currentDay.city}</span>
              </div>

              <div style={styles.timelineContainer}>
                {driverActivitiesWithIndex.map((act, arrIdx) => {
                  const idx = act.originalIndex;
                  const currentStatus = act.status || 'scheduled';
                  const pickupLoc = getPickupLocationName(act.title, idx, currentDay.hotelName, currentDay.localRestaurant);

                  return (
                    <div key={idx} style={{ ...styles.timelineItem, minHeight: '80px', marginBottom: '8px' }}>
                      <div style={styles.timelineDotCol}>
                        <div style={{
                          ...styles.timelineDot,
                          backgroundColor: currentStatus === 'completed' ? '#22c55e' : currentStatus === 'enroute' ? '#f59e0b' : '#cbd5e1',
                          width: '12px',
                          height: '12px'
                        }} />
                        {arrIdx < (driverActivitiesWithIndex.length - 1) && (
                          <div style={styles.timelineLine} />
                        )}
                      </div>
                      <div style={styles.timelineContent}>
                        <div style={{ 
                          ...styles.timelineCard, 
                          backgroundColor: currentStatus === 'completed' ? '#f0fdf4' : currentStatus === 'enroute' ? '#fffbeb' : '#f8fafc',
                          borderLeft: currentStatus === 'completed' ? '3px solid #22c55e' : currentStatus === 'enroute' ? '3px solid #f59e0b' : '1px solid #e2e8f0',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={styles.timelineTime}>{format24Hour(act.time)}</span>
                            
                            {/* Live Status Badge */}
                            <span style={{
                              fontSize: '0.62rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              backgroundColor: currentStatus === 'completed' ? '#def7ec' : currentStatus === 'enroute' ? '#fef3c7' : '#e2e8f0',
                              color: currentStatus === 'completed' ? '#03543f' : currentStatus === 'enroute' ? '#92400e' : '#475569'
                            }}>
                              {currentStatus === 'completed' ? t('statusCompleted') : currentStatus === 'enroute' ? t('statusEnRoute') : t('statusScheduled')}
                            </span>
                          </div>
                          
                          <h4 style={styles.timelineTitle}>{act.title}</h4>
                          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 6px 0', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={11} color="#64748b" /> {t('pickupLocation')}: <strong>{pickupLoc}</strong>
                          </p>

                          {/* Action Buttons to control status in real time */}
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            {currentStatus === 'scheduled' && (
                              <button
                                onClick={() => handleUpdateActivityStatus(realActiveDayIdx, idx, 'enroute')}
                                style={{ padding: '12px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}
                              >
                                <Car size={10} /> {language === 'KO' ? '이동 시작' : 'Start Transit'}
                              </button>
                            )}
                            {currentStatus === 'enroute' && (
                              <button
                                onClick={() => handleUpdateActivityStatus(realActiveDayIdx, idx, 'completed')}
                                style={{ padding: '12px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}
                              >
                                <Check size={10} /> {language === 'KO' ? '도착 완료' : 'Mark Arrived'}
                              </button>
                            )}
                            {currentStatus === 'completed' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle2 size={12} /> {language === 'KO' ? '수행 완료됨' : 'Completed'}
                                </span>
                                <button
                                  onClick={() => handleUpdateActivityStatus(realActiveDayIdx, idx, 'scheduled')}
                                  style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontWeight: '600' }}
                                >
                                  Undo
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Dinner / Meal entry */}
                {currentDay.mealPlan && (
                  <div style={styles.timelineItem}>
                    <div style={styles.timelineDotCol}>
                      <div style={{ ...styles.timelineDot, backgroundColor: '#f59e0b', width: '12px', height: '12px' }} />
                    </div>
                    <div style={styles.timelineContent}>
                      <div style={styles.timelineCard}>
                        <span style={styles.timelineTime}>Evening</span>
                        <h4 style={styles.timelineTitle}>🍽️ {currentDay.mealPlan}</h4>
                        <p style={styles.timelineDesc}>At {currentDay.hotelName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Vehicle Status Card */}
        <div style={styles.vehicleCard}>
          <h3 style={styles.sectionTitle}>
            <Car size={16} color="#1a8a7d" /> VEHICLE STATUS
          </h3>
          <div style={styles.vehicleGrid}>
            <div style={styles.vehicleRow}>
              <span style={styles.vehicleLabel}>Vehicle</span>
              <span style={styles.vehicleValue}>{tourData.vehicleType || 'Toyota Innova Crysta'}</span>
            </div>
            <div style={styles.vehicleRow}>
              <span style={styles.vehicleLabel}>Reg No.</span>
              <span style={styles.vehicleValue}>{tourData.vehicleNo || 'DL 1Z 4567'}</span>
            </div>
            <div style={styles.vehicleRow}>
              <span style={styles.vehicleLabel}>Water Stock</span>
              <span style={{ ...styles.vehicleValue, color: '#22c55e', fontWeight: '700' }}>
                Adequate ({tourData.pax * 3} ltrs)
              </span>
            </div>
          </div>
          <p style={styles.vehicleNote}>
            ⚠️ View-only mode. Contact operator for changes.
          </p>
        </div>

        {/* Tour Info Summary */}
        <div style={styles.tourInfoCard}>
          <div style={styles.tourInfoRow}>
            <div style={styles.tourInfoItem}>
              <span style={styles.tourInfoLabel}>Guest</span>
              <span style={styles.tourInfoValue}>{tourData.clientName}</span>
            </div>
            <div style={styles.tourInfoItem}>
              <span style={styles.tourInfoLabel}>Tour Code</span>
              <span style={styles.tourInfoValue}>{activeTourCode}</span>
            </div>
          </div>
          <div style={styles.tourInfoRow}>
            <div style={styles.tourInfoItem}>
              <span style={styles.tourInfoLabel}>Guide</span>
              <span style={styles.tourInfoValue}>{tourData.guideName}</span>
            </div>
            <div style={styles.tourInfoItem}>
              <span style={styles.tourInfoLabel}>Pax</span>
              <span style={styles.tourInfoValue}>{tourData.pax} Guests</span>
            </div>
          </div>
        </div>

        {/* Full Tour Days — Scrollable list */}
        <div style={styles.fullTourSection}>
          <h3 style={styles.sectionTitle}>
            <Compass size={16} color="#1a8a7d" /> Full Tour Days ({completedDays}/{totalDays} completed)
          </h3>

          <div style={styles.daysListContainer}>
            {tourData.itinerary?.filter((day) => {
              // Each driver only sees days within their active range
              const dayYYYY = tourStrToYYYYMMDD(day.dateStr);
              if (!dayYYYY) return true; // no date = show anyway
              if (driverFirstActiveYYYYMMDD && dayYYYY < driverFirstActiveYYYYMMDD) return false;
              if (driverLastActiveYYYYMMDD && dayYYYY > driverLastActiveYYYYMMDD) return false;
              return true;
            }).map((day, _, filteredArr) => {
              const idx = tourData.itinerary.indexOf(day);
              const isSelectedDay = yyyymmddToTourStr(selectedDate) === day.dateStr;
              const isToday = day.dateStr === yyyymmddToTourStr(getTodayYYYYMMDD());
              const isArrived = day.arrived;
              // Is this the handoff day? Show a special indicator
              const isHandoffDay = idx === originTransferDayIndex;

              return (
                <div
                  key={idx}
                  ref={isToday ? activeDayRef : null}
                  onClick={() => {
                    const dayYYYY = tourStrToYYYYMMDD(day.dateStr);
                    if (dayYYYY) setSelectedDate(dayYYYY);
                  }}
                  style={{
                    ...styles.dayCard,
                    borderLeft: isSelectedDay ? '4px solid #1a8a7d' : isHandoffDay ? '4px solid #f59e0b' : isArrived ? '4px solid #22c55e' : '4px solid #e2e8f0',
                    backgroundColor: isSelectedDay ? '#f0fdf4' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <div style={styles.dayCardHeader}>
                    <div>
                      <span style={{
                        ...styles.dayTag,
                        color: isSelectedDay ? '#1a8a7d' : '#64748b'
                      }}>
                        DAY {day.day} · {day.dateStr} {isToday ? ' (TODAY)' : ''}{isHandoffDay ? ' 🔄 HANDOFF' : ''}
                      </span>
                      <h4 style={styles.dayCity}>{day.city}</h4>
                      {day.hotelName && (
                        <span style={styles.dayHotel}>🏨 {day.hotelName}</span>
                      )}
                    </div>

                    <div style={styles.dayCardRight} onClick={(e) => e.stopPropagation()}>
                      {isArrived ? (
                        <div style={styles.arrivedBadge}>
                          <CheckCircle2 size={14} />
                          <div>
                            <span style={styles.arrivedText}>Arrived</span>
                            {day.arrivedAt && (
                              <span style={styles.arrivedTime}>{day.arrivedAt}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleUndoArrived(idx)}
                            style={{ marginLeft: '6px', fontSize: '0.65rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Undo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarkArrived(idx)}
                          style={{
                            ...styles.markArrivedBtn,
                            backgroundColor: isSelectedDay ? '#1a8a7d' : '#94a3b8'
                          }}
                        >
                          <MapPin size={12} /> Mark Arrived
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={styles.dayActivities}>
                    {day.activities?.substring(0, 100)}{day.activities?.length > 100 ? '...' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* GPS Broadcast Control */}
        <div style={styles.gpsCard}>
          <h3 style={styles.sectionTitle}>
            <Compass size={16} color="#1a8a7d" /> GPS Broadcast
          </h3>
          <p style={styles.gpsStatus}>
            {coords && driverGpsLive
              ? `📡 Live broadcast: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
              : coords
                ? `📡 Last fix: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} — acquiring GPS...`
                : '⚪ Waiting for first GPS fix...'}
          </p>
          <button onClick={toggleBroadcasting} style={{
            ...styles.gpsToggleBtn,
            backgroundColor: isBroadcasting ? '#ef4444' : '#1a8a7d'
          }}>
            {isBroadcasting ? (
              <><Square size={14} /> Stop Broadcasting</>
            ) : (
              <><Play size={14} /> Start Live Broadcast</>
            )}
          </button>
        </div>

        {/* Emergency Report Button */}
        <button
          onClick={() => setShowReportModal(true)}
          style={styles.emergencyBtn}
        >
          <AlertTriangle size={16} /> Report Emergency / Delay
        </button>

        {/* Quick Contact Row */}
        <div style={styles.contactRow}>
          <a href={`tel:${tourData.guideMobile}`} style={styles.contactBtn}>
            <Phone size={14} /> Call Guide
          </a>
          <a href="tel:+919999999999" style={{ ...styles.contactBtn, backgroundColor: '#0f172a', color: '#fff' }}>
            <Shield size={14} /> Call HQ
          </a>
        </div>

      {/* Speed Dial Floating Action Bar */}
      <div style={styles.speedDialBar}>
        <a href={`tel:${tourData.guideMobile}`} style={styles.speedDialBtn}>
          <div style={{ ...styles.speedDialIcon, backgroundColor: '#1a8a7d' }}>
            <User size={16} color="#fff" />
          </div>
          <span style={styles.speedDialLabel}>{language === 'KO' ? '가이드' : 'Guide'}</span>
        </a>
        <a href="tel:+919811430044" style={styles.speedDialBtn}>
          <div style={{ ...styles.speedDialIcon, backgroundColor: '#0f172a' }}>
            <Shield size={16} color="#fff" />
          </div>
          <span style={styles.speedDialLabel}>HQ</span>
        </a>
        <a href="tel:112" style={styles.speedDialBtn}>
          <div style={{ ...styles.speedDialIcon, backgroundColor: '#ef4444' }}>
            <PhoneCall size={16} color="#fff" />
          </div>
          <span style={styles.speedDialLabel}>{language === 'KO' ? '긴급 112' : 'SOS 112'}</span>
        </a>
      </div>

      </main>

      {/* Emergency Report Modal */}
      {showReportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowReportModal(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <AlertOctagon size={20} color="#ef4444" /> Report Issue
              </h3>
              <button onClick={() => setShowReportModal(false)} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReportProblem} style={styles.modalForm}>
              <div>
                <label style={styles.formLabel}>Issue Category</label>
                <select
                  style={styles.formSelect}
                  value={problemCategory}
                  onChange={(e) => setProblemCategory(e.target.value)}
                >
                  <option value="Traffic">🚦 Heavy Traffic / Delay</option>
                  <option value="Breakdown">🔧 Vehicle Breakdown</option>
                  <option value="AC Issue">❄️ AC / Comfort Issue</option>
                  <option value="Medical Alert">🏥 Medical Emergency</option>
                  <option value="Road Block">🚧 Road Block / Diversion</option>
                  <option value="Accident">⚠️ Accident / Safety</option>
                </select>
              </div>

              <div>
                <label style={styles.formLabel}>Additional Notes (Optional)</label>
                <textarea
                  style={styles.formTextarea}
                  placeholder="Describe the issue briefly..."
                  value={problemNote}
                  onChange={(e) => setProblemNote(e.target.value)}
                  rows={3}
                />
              </div>

              {problemSuccess && (
                <p style={{ color: '#22c55e', fontWeight: '700', fontSize: '0.85rem' }}>
                  ✅ {problemSuccess}
                </p>
              )}

              <button type="submit" disabled={isProblemSending} style={styles.submitAlertBtn}>
                {isProblemSending ? 'Sending...' : '🚨 Send Alert to Headquarters'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    overflowY: 'auto',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', 'Outfit', sans-serif",
  },
  loaderWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '12px',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#1a8a7d',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  headerLogo: {
    height: '32px',
    width: 'auto'
  },
  headerTitle: {
    fontSize: '1rem',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.2
  },
  headerSubtitle: {
    fontSize: '0.72rem',
    color: '#64748b',
    fontWeight: '600'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  gpsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#f1f5f9',
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#475569'
  },
  logoutBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },

  // Main content
  mainContent: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingBottom: '40px',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%'
  },

  // NEXT UP Card
  nextUpCard: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    borderRadius: '16px',
    padding: '20px',
    color: '#ffffff',
    boxShadow: '0 4px 16px rgba(5, 150, 105, 0.25)'
  },
  nextUpHeader: {
    marginBottom: '8px'
  },
  nextUpBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  nextUpTitle: {
    fontSize: '1.8rem',
    fontWeight: '900',
    margin: '8px 0 10px 0',
    lineHeight: 1.2,
    letterSpacing: '-0.5px'
  },
  nextUpDesc: {
    fontSize: '0.8rem',
    opacity: 0.9,
    lineHeight: 1.4,
    marginBottom: '14px'
  },
  nextUpActions: {
    display: 'flex',
    gap: '8px'
  },
  nextUpNavBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#ffffff',
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: '700',
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  nextUpCallBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ffffff',
    color: '#059669',
    padding: '8px 14px',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: '700',
    textDecoration: 'none',
    cursor: 'pointer'
  },

  // Vehicle Card
  vehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  sectionTitle: {
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 0 12px 0'
  },
  vehicleGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  vehicleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  vehicleLabel: {
    fontSize: '0.82rem',
    color: '#64748b',
    fontWeight: '600'
  },
  vehicleValue: {
    fontSize: '0.82rem',
    color: '#0f172a',
    fontWeight: '700'
  },
  vehicleNote: {
    fontSize: '0.72rem',
    color: '#94a3b8',
    marginTop: '10px',
    fontStyle: 'italic'
  },

  // Tour Info Card
  tourInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  tourInfoRow: {
    display: 'flex',
    gap: '12px'
  },
  tourInfoItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  tourInfoLabel: {
    fontSize: '0.68rem',
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tourInfoValue: {
    fontSize: '0.85rem',
    color: '#0f172a',
    fontWeight: '700'
  },

  // Today's Itinerary
  todaySection: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid #e2e8f0'
  },
  todaySectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px'
  },
  dayBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#1a8a7d',
    backgroundColor: '#f0fdf4',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid #bbf7d0'
  },
  timelineContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px'
  },
  timelineItem: {
    display: 'flex',
    gap: '12px',
    minHeight: '52px'
  },
  timelineDotCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '20px',
    paddingTop: '6px'
  },
  timelineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0
  },
  timelineLine: {
    width: '2px',
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginTop: '4px'
  },
  timelineContent: {
    flex: 1,
    paddingBottom: '12px'
  },
  timelineCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    padding: '10px 12px',
    border: '1px solid #f1f5f9'
  },
  timelineTime: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#1a8a7d',
    letterSpacing: '0.3px'
  },
  timelineTitle: {
    fontSize: '0.88rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: '2px 0 0 0'
  },
  timelineDesc: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '2px'
  },
  googleMapsBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#f0fdf4',
    color: '#1a8a7d',
    border: '1px solid #bbf7d0',
    padding: '10px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: '700',
    textDecoration: 'none',
    marginTop: '12px',
    cursor: 'pointer'
  },

  // Full Tour Days
  fullTourSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  daysListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  dayCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '14px 16px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease'
  },
  dayCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  dayTag: {
    fontSize: '0.68rem',
    fontWeight: '800',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  },
  dayCity: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: '#0f172a',
    margin: '2px 0 0 0'
  },
  dayHotel: {
    fontSize: '0.72rem',
    color: '#64748b',
    fontWeight: '600'
  },
  dayCardRight: {
    display: 'flex',
    alignItems: 'flex-start'
  },
  arrivedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#22c55e',
    fontSize: '0.78rem',
    fontWeight: '700'
  },
  arrivedText: {
    display: 'block',
    fontWeight: '700'
  },
  arrivedTime: {
    display: 'block',
    fontSize: '0.65rem',
    color: '#94a3b8',
    fontWeight: '600'
  },
  markArrivedBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.72rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  dayActivities: {
    fontSize: '0.78rem',
    color: '#64748b',
    lineHeight: 1.4,
    margin: 0
  },
  dayMapLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: '#1a8a7d',
    fontSize: '0.75rem',
    fontWeight: '700',
    textDecoration: 'none',
    marginTop: '8px'
  },

  // GPS Card
  gpsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid #e2e8f0'
  },
  gpsStatus: {
    fontSize: '0.82rem',
    color: '#64748b',
    marginBottom: '12px',
    lineHeight: 1.4
  },
  gpsToggleBtn: {
    width: '100%',
    color: '#ffffff',
    border: 'none',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  },

  // Emergency & Contact
  emergencyBtn: {
    width: '100%',
    backgroundColor: '#fef2f2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  contactRow: {
    display: 'flex',
    gap: '10px'
  },
  contactBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: '#1a8a7d',
    color: '#ffffff',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '0.82rem',
    fontWeight: '700',
    textDecoration: 'none',
    cursor: 'pointer'
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 9999
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: '500px',
    padding: '24px',
    maxHeight: '80vh',
    overflowY: 'auto',
    animation: 'slideUp 0.3s ease'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0
  },
  modalCloseBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    display: 'block'
  },
  formSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '0.88rem',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontWeight: '600'
  },
  formTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '0.85rem',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontFamily: "'Inter', sans-serif",
    resize: 'vertical'
  },
  submitAlertBtn: {
    width: '100%',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    padding: '14px',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '800',
    cursor: 'pointer'
  },

  // Tour Progress Bar
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  progressBarTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #1a8a7d, #10b981)',
    borderRadius: '10px',
    transition: 'width 0.6s ease'
  },

  // Next Up Estimates
  nextUpEstimates: {
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '14px'
  },
  nextUpEstItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#ffffff'
  },
  nextUpEstLabel: {
    display: 'block',
    fontSize: '0.58rem',
    fontWeight: '700',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  nextUpEstValue: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: '800'
  },

  // Info Cards Row (Weather + Duty Hours)
  infoCardsRow: {
    display: 'flex',
    gap: '12px'
  },
  weatherCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '14px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  weatherIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dutyCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '14px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },

  // Fuel / Distance Tracker
  fuelCard: {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
  },
  fuelGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  fuelGridItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #f1f5f9'
  },
  fuelGridLabel: {
    display: 'block',
    fontSize: '0.62rem',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  fuelGridValue: {
    display: 'block',
    fontSize: '0.88rem',
    fontWeight: '800',
    color: '#0f172a'
  },

  // Speed Dial Floating Action Bar
  speedDialBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    padding: '10px 20px 14px 20px',
    background: 'linear-gradient(to top, rgba(255,255,255,0.98) 70%, rgba(255,255,255,0.0))',
    backdropFilter: 'blur(10px)',
    zIndex: 90,
    maxWidth: '600px',
    margin: '0 auto'
  },
  speedDialBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    textDecoration: 'none',
    cursor: 'pointer'
  },
  speedDialIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s ease'
  },
  speedDialLabel: {
    fontSize: '0.62rem',
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }
};
