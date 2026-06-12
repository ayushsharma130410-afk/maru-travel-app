import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { listenToTour, listenToCities, updateTourResource, updateGuideLocation, setGuideTrackingOffline } from '../services/firebase';
import { useBackgroundLocation } from '../hooks/useBackgroundLocation';
import { Award, Phone, Calendar, MapPin, Navigation, User, Car, Info, ShieldAlert, Printer, RefreshCw, Send, CheckSquare, Square, Volume2, AlertCircle, CloudSun, CloudRain, Sun, Cloud, Snowflake, Users, PhoneCall, BarChart3 } from 'lucide-react';

export default function GuidePortal({ tourCode: initialTourCode, onLogout }) {
  const { t, language } = useLanguage();
  const [activeTourCode, setActiveTourCode] = useState(initialTourCode);
  const [tourCodeInput, setTourCodeInput] = useState(initialTourCode);
  const [tourData, setTourData] = useState(null);
  const [citiesData, setCitiesData] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Profile Updated toast state
  const [showProfileToast, setShowProfileToast] = useState(false);
  const prevGuideRef = useRef({ name: null, mobile: null });

  // Date Filtering States
  const getTodayYYYYMMDD = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayYYYYMMDD());

  // Guide Checklist state
  const [completedTasks, setCompletedTasks] = useState({});
  // Announcement input state
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementStatus, setAnnouncementStatus] = useState('');
  const [profileToast, setProfileToast] = useState('');

  // Subscribe to tour changes reactively
  useEffect(() => {
    setLoadError('');
    const unsubscribe = listenToTour(activeTourCode, (data) => {
      if (data) {
        setTourData(data);
      } else {
        setLoadError(language === 'KO' ? '해당 투어 코드를 찾을 수 없습니다.' : 'Tour code not found in database.');
      }
    });
    return () => unsubscribe();
  }, [activeTourCode, language]);

  const handleGuideLocation = useCallback((location) => {
    updateGuideLocation(activeTourCode, location).catch((err) => {
      console.error('Firebase location update failed:', err);
    });
  }, [activeTourCode]);

  const handleGuideTrackingEnd = useCallback((code) => setGuideTrackingOffline(code), []);

  useBackgroundLocation({
    tourCode: activeTourCode,
    tourData,
    onLocation: handleGuideLocation,
    onTrackingEnd: handleGuideTrackingEnd,
    enabled: Boolean(tourData),
  });

  // Subscribe to cities info
  useEffect(() => {
    const unsubscribe = listenToCities((data) => {
      if (data) setCitiesData(data);
    });
    return () => unsubscribe();
  }, []);

  // ──────────────────────────────────────────────
  // Feature 1: Profile Updated toast
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!tourData) return;
    const prevName = prevGuideRef.current.name;
    const prevMobile = prevGuideRef.current.mobile;
    const curName = tourData.guideName;
    const curMobile = tourData.guideMobile;

    // Only show toast if we had previous values and they changed
    if (prevName !== null && prevMobile !== null) {
      if (prevName !== curName || prevMobile !== curMobile) {
        setShowProfileToast(true);
        const timer = setTimeout(() => setShowProfileToast(false), 3000);
        return () => clearTimeout(timer);
      }
    }
    prevGuideRef.current = { name: curName, mobile: curMobile };
  }, [tourData?.guideName, tourData?.guideMobile]);

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

  const handleLoadTour = (e) => {
    e.preventDefault();
    if (!tourCodeInput.trim()) return;
    setActiveTourCode(tourCodeInput.trim().toUpperCase());
  };

  const handleTaskToggle = (taskKey) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };

  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setAnnouncementStatus(language === 'KO' ? '전송 중...' : 'Publishing...');
    try {
      const time = new Date().toLocaleTimeString(language === 'KO' ? 'ko-KR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      await updateTourResource(activeTourCode, 'announcement', {
        text: announcementText.trim(),
        time: time,
        date: new Date().toLocaleDateString('en-GB')
      });
      setAnnouncementStatus(language === 'KO' ? '전송 완료!' : 'Announcement published!');
      setAnnouncementText('');
      setTimeout(() => setAnnouncementStatus(''), 3000);
    } catch (err) {
      setAnnouncementStatus(language === 'KO' ? '오류 발생' : 'Failed to publish');
    }
  };

  const handleClearAnnouncement = async () => {
    try {
      await updateTourResource(activeTourCode, 'announcement', null);
      setAnnouncementStatus(language === 'KO' ? '삭제 완료!' : 'Announcement cleared!');
      setTimeout(() => setAnnouncementStatus(''), 3000);
    } catch (err) {
      setAnnouncementStatus('Error clearing');
    }
  };

  // ──────────────────────────────────────────────
  // Feature 2: Weather Widget helper
  // ──────────────────────────────────────────────
  const getWeatherForCity = (cityName) => {
    if (!cityName) return { icon: 'sun', label: 'Clear Skies', temp: '32°C', desc: 'Warm & sunny' };
    const lower = cityName.toLowerCase();
    // Rainy-season / coastal cities
    if (['mumbai', 'kochi', 'goa', 'chennai', 'kolkata'].some(c => lower.includes(c))) {
      return { icon: 'rain', label: language === 'KO' ? '비' : 'Rainy', temp: '28°C', desc: language === 'KO' ? '우산 지참 권장' : 'Carry umbrellas' };
    }
    // Hill stations / cold
    if (['shimla', 'manali', 'leh', 'srinagar', 'darjeeling', 'mussoorie'].some(c => lower.includes(c))) {
      return { icon: 'snow', label: language === 'KO' ? '서늘함' : 'Cool', temp: '14°C', desc: language === 'KO' ? '자켓 필요' : 'Jacket recommended' };
    }
    // Cloudy / semi-arid
    if (['jodhpur', 'jaisalmer', 'udaipur', 'varanasi', 'lucknow'].some(c => lower.includes(c))) {
      return { icon: 'cloudsun', label: language === 'KO' ? '구름 조금' : 'Partly Cloudy', temp: '35°C', desc: language === 'KO' ? '자외선 차단제 사용' : 'Use sunscreen' };
    }
    // Overcast
    if (['amritsar', 'patna', 'khajuraho'].some(c => lower.includes(c))) {
      return { icon: 'cloud', label: language === 'KO' ? '흐림' : 'Overcast', temp: '30°C', desc: language === 'KO' ? '약간 습함' : 'Slightly humid' };
    }
    // Default sunny (Delhi, Agra, Jaipur, etc.)
    return { icon: 'sun', label: language === 'KO' ? '맑음' : 'Sunny', temp: '34°C', desc: language === 'KO' ? '수분 보충 필수' : 'Stay hydrated' };
  };

  const WeatherIcon = ({ type, size = 20 }) => {
    const props = { size, strokeWidth: 2 };
    switch (type) {
      case 'rain': return <CloudRain {...props} color="#3b82f6" />;
      case 'snow': return <Snowflake {...props} color="#818cf8" />;
      case 'cloud': return <Cloud {...props} color="#94a3b8" />;
      case 'cloudsun': return <CloudSun {...props} color="#f59e0b" />;
      default: return <Sun {...props} color="#f59e0b" />;
    }
  };

  // ──────────────────────────────────────────────
  // Feature 3: Tour Progress helpers
  // ──────────────────────────────────────────────
  const computeTourProgress = () => {
    if (!tourData?.startDate || !tourData?.endDate) return { passed: 0, total: 1, pct: 0 };
    const today = new Date(getTodayYYYYMMDD());
    const start = new Date(tourData.startDate);
    const end = new Date(tourData.endDate);
    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const daysPassed = Math.max(0, Math.min(totalDays, Math.round((today - start) / 86400000) + 1));
    const pct = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
    return { passed: daysPassed, total: totalDays, pct };
  };

  if (!tourData) {
    return (
      <div style={styles.loaderWrap}>
        <div style={styles.spinner} />
        <p style={{ color: 'var(--navy)', fontWeight: '600', marginTop: '12px' }}>{t('loadingSplash')}</p>
        {loadError && (
          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.88rem' }}>
            {loadError}
            <div style={{ marginTop: '8px' }}>
              <input 
                type="text" 
                value={tourCodeInput} 
                onChange={(e) => setTourCodeInput(e.target.value)} 
                style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '4px', marginRight: '6px', textTransform: 'uppercase' }}
              />
              <button onClick={handleLoadTour} style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px' }}>Load</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Parse tour range dates
  const tourStartYYYYMMDD = tourData.startDate; // e.g. "2026-05-30"
  const tourEndYYYYMMDD = tourData.endDate;     // e.g. "2026-06-05"

  // Date Check Comparisons
  const isBeforeTour = selectedDate < tourStartYYYYMMDD;
  const isAfterTour = selectedDate > tourEndYYYYMMDD;

  // Find active day matching selected date
  const targetTourDateStr = yyyymmddToTourStr(selectedDate);
  const activeDayIndex = tourData.itinerary?.findIndex(d => d.dateStr === targetTourDateStr) ?? -1;
  const hasScheduledDay = activeDayIndex !== -1;
  const currentDayItinerary = hasScheduledDay ? tourData.itinerary[activeDayIndex] : {};

  // Find details for current city
  const cityDetails = citiesData.find(c => c.name === currentDayItinerary.city) || null;

  // Checklist items for today
  const dailyTasksList = currentDayItinerary.city ? [
    { key: 'pickup', text: `${language === 'KO' ? '기사 ' : 'Coordinate pickup with '}${tourData.driverName} (${tourData.vehicleNo})` },
    { key: 'hotel', text: `${language === 'KO' ? '호텔 숙소 정보 확인: ' : 'Confirm check-in at '}${currentDayItinerary.hotelName || 'hotel'}` },
    { key: 'tickets', text: language === 'KO' ? '관광지 입장권 및 가이드 티켓 수령' : "Ensure entry tickets / local fees are prepared" },
    { key: 'water', text: language === 'KO' ? '탑승 차량용 차가운 생수 보관 확인' : 'Verify chilled mineral water stock in the vehicle' },
    { key: 'meals', text: currentDayItinerary.mealPlan ? `${language === 'KO' ? '식사 계획 조율: ' : 'Coordinate Meal Plan: '}${currentDayItinerary.mealPlan}` : (language === 'KO' ? '식사 시간 및 장소 안내' : 'Guide guests for local dining options') }
  ] : [];

  // Progress bar data
  const progress = computeTourProgress();

  // Weather data for current city
  const currentCity = currentDayItinerary.city || tourData.itinerary?.[0]?.city || '';
  const weather = getWeatherForCity(currentCity);

  if (showPrintPreview) {
    return (
      <div className="print-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f1f5f9', zIndex: 9999, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* ── Print CSS (matching DriverPortal) ── */}
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

        <style>{`@media print { .print-page-border { display: block !important; position: fixed !important; top: 12mm !important; left: 12mm !important; right: 12mm !important; bottom: 12mm !important; border: 2px solid #000 !important; z-index: 99999 !important; pointer-events: none !important; box-sizing: border-box !important; } }`}</style>
        <div id="printable-area" style={{ width: '794px', margin: '30px auto', padding: '40px', backgroundColor: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', boxSizing: 'border-box', color: '#000000', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', display: 'block' }}>
          <div className="print-page-border" />
          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
            <thead>
              <tr>
                <td style={{ border: 'none', padding: '10px 15px 15px 15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #d97706', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ height: '48px', marginBottom: '4px' }} />
                      <span style={{ fontSize: '0.62rem', letterSpacing: '2px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', margin: 0 }}>Making Travel an experience</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>"{tourData.tourName}"</h2>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: 'none', padding: '5px 15px' }}>
                  <div style={{ padding: '0' }}>
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '16px 0' }}>
                      {tourData.itinerary?.map((day, idx) => (
                        <div key={idx} className="brief-day-card" style={{ 
                          pageBreakInside: 'avoid', 
                          breakInside: 'avoid',
                          border: '1.5px solid #cccccc',
                          borderRadius: '0',
                          padding: '14px 16px',
                          backgroundColor: '#ffffff',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #dddddd', paddingBottom: '8px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ backgroundColor: '#d97706', color: '#ffffff', padding: '3px 10px', borderRadius: '3px', fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                                DAY {day.day}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#000000' }}>
                                {day.dateStr}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0B4F6C', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              {day.city}
                            </span>
                          </div>

                          <div style={{ 
                            fontSize: '0.82rem', 
                            color: '#222222', 
                            lineHeight: '1.7', 
                            marginBottom: '12px', 
                            textAlign: 'justify',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {day.activities || 'Leisure / Free time'} 
                          </div>

                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cccccc', fontSize: '0.78rem' }}>
                            <tbody>
                              <tr>
                                {day.hotelName && (
                                  <td style={{ border: '1px solid #cccccc', padding: '8px 10px', verticalAlign: 'top' }}>
                                    <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: '#666666', marginBottom: '2px' }}>Hotel Accommodation</strong>
                                    <span style={{ fontWeight: '600', color: '#000000' }}>{day.hotelName}</span>
                                  </td>
                                )}
                                {day.mealPlan && (
                                  <td style={{ border: '1px solid #cccccc', padding: '8px 10px', verticalAlign: 'top' }}>
                                    <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: '#666666', marginBottom: '2px' }}>Meal Plan</strong>
                                    <span style={{ fontWeight: '600', color: '#000000' }}>{day.mealPlan}</span>
                                  </td>
                                )}
                                {(day.transport || day.flightNo || day.trainNo) && (
                                  <td style={{ border: '1px solid #cccccc', padding: '8px 10px', verticalAlign: 'top' }}>
                                    <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: '#666666', marginBottom: '2px' }}>Transport</strong>
                                    <span style={{ fontWeight: '600', color: '#000000' }}>
                                      {day.flightNo ? `Flight: ${day.flightNo}` : day.trainNo ? `Train: ${day.trainNo}` : day.transport || 'By Surface'}
                                    </span>
                                  </td>
                                )}
                              </tr>
                            </tbody>
                          </table>
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
                <td style={{ border: 'none', padding: '15px 15px 10px 15px' }}>
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
    <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Profile Updated Toast (Feature 1) ── */}
      {showProfileToast && (
        <div style={{
          position: 'fixed',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #059669, #10b981)',
          color: '#ffffff',
          padding: '10px 24px',
          borderRadius: '12px',
          fontWeight: '700',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
          animation: 'slideDownFadeIn 0.4s ease-out',
        }}>
          <User size={16} />
          {language === 'KO' ? '프로필 업데이트 완료' : 'Profile Updated'}
        </div>
      )}

      {/* Animation keyframes for toast */}
      <style>{`
        @keyframes slideDownFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        @keyframes sosPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        }
      `}</style>

      {/* Top Header Bar */}
      <header className="portal-header" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#ffffff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div className="portal-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={22} color="var(--primary)" />
          <span className="brand-text" style={{ fontWeight: '800', fontFamily: "'Outfit', sans-serif", fontSize: '1.1rem', color: 'var(--navy)' }}>
            {t('guidePortalTitle')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowPrintPreview(true)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#facc15', color: '#000', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
            <Printer size={14} /> Print
          </button>
          <button onClick={onLogout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '700' }}>
            {language === 'KO' ? '로그아웃' : 'Logout'}
          </button>
        </div>
      </header>

      <main className="portal-content-body" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>

        {/* ── Feature 3: Tour Progress Bar ── */}
        <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: '16px', marginBottom: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1px solid #d1fae5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={14} color="#059669" />
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {language === 'KO' ? '투어 진행률' : 'Tour Progress'}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#065f46' }}>
              {language === 'KO' ? `${progress.passed}일 / ${progress.total}일` : `Day ${progress.passed} of ${progress.total}`}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#d1fae5', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              width: `${progress.pct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981, #059669)',
              borderRadius: '99px',
              transition: 'width 0.6s ease',
              animation: progress.pct > 0 && progress.pct < 100 ? 'progressPulse 2s ease infinite' : 'none',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '0.62rem', color: '#6b7280', fontWeight: '600' }}>{yyyymmddToTourStr(tourStartYYYYMMDD)}</span>
            <span style={{ fontSize: '0.62rem', color: '#059669', fontWeight: '800' }}>{progress.pct}%</span>
            <span style={{ fontSize: '0.62rem', color: '#6b7280', fontWeight: '600' }}>{yyyymmddToTourStr(tourEndYYYYMMDD)}</span>
          </div>
        </div>
        
        {/* Dynamic Guide Profile Card */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: '#073549', color: 'white', borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-md)', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} color="#facc15" />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#facc15' }}>{t('activeGuide')}</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '2px 0 0 0' }}>{tourData.guideName || 'No Guide Assigned'}</h4>
            <p style={{ fontSize: '0.8rem', opacity: 0.85, margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={12} /> {tourData.guideMobile || 'N/A'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>ACTIVE</span>
          </div>
          {/* Subtle profile-updated flash overlay */}
          {showProfileToast && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(16, 185, 129, 0.12)',
              borderRadius: '16px',
              pointerEvents: 'none',
            }} />
          )}
        </div>

        {/* Tour Control & Switching Bar */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
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
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                fontWeight: '700',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '10px 16px', borderRadius: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', border: 'none' }}
            >
              <RefreshCw size={14} /> {t('loadTour')}
            </button>
          </form>
          {loadError && (
            <p style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: '700', marginTop: '6px', margin: '6px 0 0 0' }}>{loadError}</p>
          )}
        </div>

        {/* Guest Overview Hero Card */}
        <div className="client-hero-card" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #1A8A7D 0%, #115E59 100%)', boxShadow: 'var(--shadow-md)', marginBottom: '16px', padding: '18px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.8, letterSpacing: '1px' }}>TOUR ID: {activeTourCode}</span>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: '#FAF7F2' }}>{tourData.tourName}</h2>
          <p style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.95 }}>
            Client: <strong>{tourData.clientName}</strong> ({tourData.pax} Guests)
          </p>
        </div>

        {/* ── Feature 5: Guest Count & Details Card ── */}
        <div className="glass-panel" style={{ padding: '16px', borderRadius: '16px', marginBottom: '16px', border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Users size={16} color="#6366f1" />
            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#4338ca', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {language === 'KO' ? '게스트 정보' : 'Guest Details'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#4338ca', display: 'block' }}>{tourData.pax || '—'}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {language === 'KO' ? '총 인원' : 'Total Guests'}
              </span>
            </div>
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#4338ca', display: 'block' }}>
                {tourData.nationality ? (tourData.nationality.length > 4 ? tourData.nationality.substring(0, 4) : tourData.nationality) : '🌍'}
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {language === 'KO' ? '국적' : 'Nationality'}
              </span>
            </div>
          </div>
          {tourData.clientName && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={14} color="#6366f1" />
              <div>
                <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', display: 'block' }}>
                  {language === 'KO' ? '대표 고객' : 'Lead Guest'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e1b4b' }}>{tourData.clientName}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Feature 2: Weather Widget ── */}
        {currentCity && (
          <div className="glass-panel" style={{ padding: '14px 16px', borderRadius: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WeatherIcon type={weather.icon} size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {language === 'KO' ? '현재 날씨' : 'Weather'} · {currentCity}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#78350f' }}>{weather.temp}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e' }}>{weather.label}</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#a16207', fontWeight: '600' }}>{weather.desc}</span>
            </div>
          </div>
        )}

        {/* Guest Overview Hero Card */}
        <div className="client-hero-card" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #1A8A7D 0%, #115E59 100%)', boxShadow: 'var(--shadow-md)', marginBottom: '16px', padding: '18px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.8, letterSpacing: '1px' }}>TOUR ID: {activeTourCode}</span>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: '#FAF7F2' }}>{tourData.tourName}</h2>
          <p style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.95 }}>
            Client: <strong>{tourData.clientName}</strong> ({tourData.pax} Guests)
          </p>
        </div>

        {/* Date Selector & active schedule */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('currentDate')}</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--navy)', margin: '2px 0 0 0' }}>
                {yyyymmddToTourStr(selectedDate)}
              </h3>
            </div>
            
            {/* Quick dropdown of Itinerary Days */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  color: 'var(--navy)',
                  background: '#fff',
                  outline: 'none',
                }}
              >
                <option value={getTodayYYYYMMDD()}>{language === 'KO' ? '오늘 날짜' : 'Today'}</option>
                {tourData.itinerary?.map((day) => {
                  const dayYYYYMMDD = tourStrToYYYYMMDD(day.dateStr);
                  return dayYYYYMMDD ? (
                    <option key={day.day} value={dayYYYYMMDD}>
                      Day {day.day} ({day.city})
                    </option>
                  ) : null;
                })}
              </select>

              {/* HTML5 Date Picker for Manual Entry */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '7px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  color: 'var(--navy)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Conditional Warning / Info Cards based on Date */}
          {isBeforeTour ? (
            <div style={{ padding: '24px 16px', background: '#fef3c7', borderLeft: '4px solid #f59e0b', borderRadius: '10px', textAlign: 'center', marginBottom: '8px' }}>
              <Calendar size={32} color="#d97706" style={{ margin: '0 auto 8px auto' }} />
              <h4 style={{ color: '#92400e', fontWeight: '800', margin: 0, fontSize: '0.95rem' }}>{t('tourNotStartedYet')}</h4>
              <p style={{ color: '#b45309', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                {t('firstDayOfTour')}: <strong>{yyyymmddToTourStr(tourStartYYYYMMDD)}</strong>
              </p>
            </div>
          ) : isAfterTour ? (
            <div style={{ padding: '24px 16px', background: '#ecfdf5', borderLeft: '4px solid #10b981', borderRadius: '10px', textAlign: 'center', marginBottom: '8px' }}>
              <ShieldAlert size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
              <h4 style={{ color: '#065f46', fontWeight: '800', margin: 0, fontSize: '0.95rem' }}>{t('tourCompleted')}</h4>
              <p style={{ color: '#047857', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                {t('lastDayOfTour')}: <strong>{yyyymmddToTourStr(tourEndYYYYMMDD)}</strong>
              </p>
            </div>
          ) : !hasScheduledDay ? (
            <div style={{ padding: '24px 16px', background: '#f8fafc', borderLeft: '4px solid #94a3b8', borderRadius: '10px', textAlign: 'center', marginBottom: '8px' }}>
              <Info size={32} color="#64748b" style={{ margin: '0 auto 8px auto' }} />
              <h4 style={{ color: '#334155', fontWeight: '800', margin: 0, fontSize: '0.95rem' }}>{t('noActivitiesToday')}</h4>
            </div>
          ) : (
            // Today's Detailed Plan
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                DAY {currentDayItinerary.day} SCHEDULE ({currentDayItinerary.city})
              </span>
              <p style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.4' }}>
                {currentDayItinerary.activities}
              </p>

              {currentDayItinerary.hotelName && (
                <div style={{ marginTop: '12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <span>🏨 Hotel:</span>
                  <strong style={{ color: 'var(--navy)' }}>{currentDayItinerary.hotelName}</strong>
                </div>
              )}

              {cityDetails && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>Famous Foods</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.3' }}>
                      {cityDetails.food?.map(f => `${f.emoji} ${f.name}`).join(', ')}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>Emergency Contacts</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{cityDetails.emergency}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Guide Dynamic Checklist Panel */}
        {hasScheduledDay && dailyTasksList.length > 0 && (
          <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '0.95rem', fontWeight: '800', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <CheckSquare size={16} color="var(--primary)" /> {t('dailyTasks')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dailyTasksList.map((task) => {
                const isDone = !!completedTasks[`${activeTourCode}_${selectedDate}_${task.key}`];
                return (
                  <div 
                    key={task.key} 
                    onClick={() => handleTaskToggle(`${activeTourCode}_${selectedDate}_${task.key}`)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '10px', 
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isDone ? 'rgba(26, 138, 125, 0.05)' : 'transparent',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <div style={{ marginTop: '2px', color: isDone ? 'var(--primary)' : '#94a3b8' }}>
                      {isDone ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      color: isDone ? '#64748b' : 'var(--text-primary)',
                      textDecoration: isDone ? 'line-through' : 'none' 
                    }}>
                      {task.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Broadcast Announcement Panel */}
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '0.95rem', fontWeight: '800', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Volume2 size={16} color="var(--primary)" /> {t('broadcastMsg')}
          </h3>
          
          {tourData.announcement && (
            <div style={{ padding: '12px', background: 'rgba(24acc15, 0.08)', borderLeft: '4px solid #facc15', borderRadius: '8px', marginBottom: '14px', position: 'relative' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#d97706', display: 'block', textTransform: 'uppercase' }}>
                CURRENT BROADCAST ({tourData.announcement.time})
              </span>
              <p style={{ fontSize: '0.82rem', color: '#1e293b', margin: '4px 0 0 0', fontWeight: '600', paddingRight: '20px' }}>
                "{tourData.announcement.text}"
              </p>
              <button 
                onClick={handleClearAnnouncement}
                style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'transparent', color: '#ef4444', fontWeight: '800', cursor: 'pointer', fontSize: '0.72rem' }}
              >
                ✕ Clear
              </button>
            </div>
          )}

          <form onSubmit={handlePublishAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea
              placeholder={language === 'KO' ? '고객과 드라이버에게 전달할 공지사항을 입력하세요...' : 'Type an announcement for guests & driver...'}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '0.82rem',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>
                {announcementStatus}
              </span>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '700' }}
              >
                <Send size={12} /> {t('sendAlert')}
              </button>
            </div>
          </form>
        </div>

        {/* Crew / Driver details */}
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', fontWeight: '800', margin: '20px 0 8px 0', color: 'var(--navy)' }}>
          Crew Coordination
        </h3>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px', marginBottom: '24px' }}>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase' }}>{t('driver')}</span>
            <h4 style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--navy)', marginTop: '2px' }}>{tourData.driverName}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{tourData.vehicleNo} | {tourData.vehicleType}</p>
          </div>
          {tourData.driverMobile && (
            <a href={`tel:${tourData.driverMobile}`} className="btn-secondary" style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: '1px solid var(--border)' }}>
              <Phone size={14} color="var(--primary)" />
            </a>
          )}
        </div>

        {/* Full Itinerary Overview */}
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.05rem', fontWeight: '800', margin: '20px 0 8px 0', color: 'var(--navy)' }}>
          {t('guideItineraryOverview')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {tourData.itinerary?.map((day, idx) => (
            <div 
              key={idx} 
              className="glass-panel" 
              onClick={() => {
                const dayYYYY = tourStrToYYYYMMDD(day.dateStr);
                if (dayYYYY) setSelectedDate(dayYYYY);
              }}
              style={{ 
                padding: '14px', 
                borderRadius: '12px',
                cursor: 'pointer',
                borderLeft: yyyymmddToTourStr(selectedDate) === day.dateStr ? '4px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: yyyymmddToTourStr(selectedDate) === day.dateStr ? '#f0fdfa' : '#ffffff',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '0.88rem', fontWeight: '800', color: 'var(--navy)' }}>
                  Day {day.day} ({day.dateStr}) - {day.city}
                </h4>
                <span style={{ fontSize: '0.62rem', fontWeight: '700', backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '2px 8px', borderRadius: '10px' }}>
                  {day.mealPlan}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.35', margin: 0 }}>
                {day.activities?.substring(0, 100)}{day.activities?.length > 100 ? '...' : ''}
              </p>
            </div>
          ))}
        </div>

        {/* ── Feature 4: Emergency SOS Button ── */}
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 999,
        }}>
          <a
            href="tel:+919811430044"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
              borderRadius: '99px',
              fontWeight: '800',
              fontSize: '0.82rem',
              textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
              animation: 'sosPulse 2s ease infinite',
              border: '2px solid rgba(255,255,255,0.25)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            <PhoneCall size={18} />
            {language === 'KO' ? '긴급 SOS' : 'Emergency SOS'}
          </a>
        </div>

      </main>
    </div>
  );
}

const styles = {
  loaderWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '12px',
    background: '#f8fafc'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--border)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
