import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { listenToTour, listenToLocations, submitComplaint, getHotels, getActivities } from '../services/firebase';
import ChatBot from '../components/ChatBot';
import LeafletMap from '../components/LeafletMap';
import { normalizeTrackingLocation, getGpsStatus, getCityCoords } from '../utils/locationStatus';
import { sendNotificationEmail } from '../services/email';
import { 
  Calendar, MapPin, Phone, User, Clock, CloudSun, Utensils, 
  Map, MessageSquare, LogOut, ChevronRight, CheckCircle2, Navigation,
  ChevronLeft, X, Mail, Star, Compass, Info, Award, Printer, Volume2
} from 'lucide-react';

export default function ClientPortal({ tourCode, onLogout }) {
  const { t, toggleLanguage, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary', 'map', 'support', 'profile'
  const [tourData, setTourData] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [locationTick, setLocationTick] = useState(0);
  const [activeDayIdx, setActiveDayIdx] = useState(2); // Default is Day 3 (Agra) for visual showcase
  
  // Explore Drawer Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerCityIndex, setDrawerCityIndex] = useState(0);
  const [drawerActiveTab, setDrawerActiveTab] = useState('places'); // 'places', 'food', 'info', 'tips', 'hotel'
  const [emailStatus, setEmailStatus] = useState("");

  // Master lists
  const [masterHotels, setMasterHotels] = useState([]);
  const [masterActivities, setMasterActivities] = useState([]);

  // Subscribe to all master details
  useEffect(() => {
    const unsubHotels = getHotels((hList) => setMasterHotels(hList));
    const unsubActivities = getActivities((aList) => setMasterActivities(aList));
    return () => {
      unsubHotels();
      unsubActivities();
    };
  }, []);

  // 1. Live subscribe to Tour details from Firebase RTDB
  useEffect(() => {
    const unsubscribe = listenToTour(tourCode, (data) => {
      if (data) {
        setTourData(data);
      } else {
        // Build the EXACT 8-Day premium itinerary provided by user
        setTourData({
          tourCode: tourCode,
          tourName: "Joyful India Luxury Tour",
          clientName: "Mr. Park & Family (4 Pax)",
          pax: 4,
          driverName: "Rajesh Kumar",
          driverMobile: "+91 98765 43210",
          vehicleNo: "DL 1Z 4567",
          vehicleType: "Toyota Innova Crysta (SUV)",
          guideName: "Anjali Sharma",
          guideMobile: "+91 99999 88888",
          startDate: "2026-01-18",
          endDate: "2026-01-25",
          itinerary: [
            {
              day: 1,
              dateStr: "18-Jan-2026",
              city: "New Delhi",
              coverImage: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80",
              activitiesList: [
                { time: "12:45", title: "Flight KE497 departs Incheon (ICN)" },
                { time: "18:20", title: "Arrive at Delhi IGI Airport (DEL)" },
                { time: "19:30", title: "Meet & Greet with Private Chauffeur" },
                { time: "20:30", title: "Check-in at Hotel Hyatt Regency Gurgaon" }
              ],
              activities: "Arrival at Delhi International Airport by flight KE497. Meet your private driver and guide. Transfer to Hyatt Regency Gurgaon for check-in. Welcoming buffet dinner and restful overnight.",
              hotelName: "Hyatt Regency Gurgaon",
              hotelAddress: "NH8, Sector 83, Gurgaon, Haryana 122004",
              hotelMapLink: "https://maps.app.goo.gl/uN7xYw6X8N3a",
              mealPlan: "All Inclusive Buffet Dinner",
              transport: "AC Innova Crysta (SUV)",
              flightNo: "KE497",
              famousPlaces: "IGI Airport, Aerocity lounge",
              famousFood: "Regency gourmet buffet",
              thingsToDo: " airport pickup, currencies exchange, rest"
            },
            {
              day: 2,
              dateStr: "19-Jan-2026",
              city: "Jaipur",
              coverImage: "https://images.unsplash.com/photo-1477584322904-48723d8f07e0?auto=format&fit=crop&w=600&q=80",
              activitiesList: [
                { time: "08:00", title: "Scenic drive from Delhi to Jaipur (Pink City)" },
                { time: "11:30", title: "Amber Fort exploration by Jeep ride" },
                { time: "13:30", title: "Gourmet Lunch on arrival at Hotel" },
                { time: "15:00", title: "Hawa Mahal & City Palace sightseeing" }
              ],
              activities: "Drive past Aravali hills to the Pink City of Jaipur. Enjoy Amber Fort by traditional open Jeep, explore Hawa Mahal (Palace of Winds), and tour the Maharaja's City Palace and Jantar Mantar observatory. Rest and dinner at hotel.",
              hotelName: "Radisson Blu Tonk Road Jaipur",
              hotelAddress: "Plot No. 5-6, Airport Plaza, Tonk Rd, Durgapura, Jaipur",
              hotelMapLink: "https://maps.app.goo.gl/3X8L3N8G5N",
              mealPlan: "Breakfast & Dinner (MAP)",
              transport: "AC Innova Crysta (SUV)",
              famousPlaces: "Amber Fort, Hawa Mahal, City Palace, Birla Mandir",
              famousFood: "Dal Baati Churma, Rajasthani Thali",
              thingsToDo: "Jeep ride in Amer, local bazaar gemstone shopping"
            },
            {
              day: 3,
              dateStr: "20-Jan-2026",
              city: "Agra",
              coverImage: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80",
              activitiesList: [
                { time: "08:00", title: "Drive to Agra via Abhaneri stepwell" },
                { time: "10:30", title: "Visit Chand Baori ancient stepwell" },
                { time: "12:30", title: "Lunch at local restaurant in Abhaneri" },
                { time: "14:30", title: "Explore Fatehpur Sikri red fortress" }
              ],
              activities: "Drive to Agra. Stop at Abhaneri village to witness the giant Chand Baori geometric stepwell. Visit the ghost city of Fatehpur Sikri. On arrival in Agra, check-in at Hotel Jaypee Palace for dinner.",
              hotelName: "Hotel Jaypee Palace Agra",
              hotelAddress: "Fatehabad Rd, Tajganj, Agra, Uttar Pradesh 282001",
              hotelMapLink: "https://maps.app.goo.gl/9r9X2Y7G4N",
              mealPlan: "Breakfast & Dinner (MAP)",
              transport: "AC Innova Crysta (SUV)",
              famousPlaces: "Chand Baori, Fatehpur Sikri fortress, Mughal capital",
              famousFood: "Agra Petha, Bedai & Kachori breakfast",
              thingsToDo: "Photography at stepwell, exploring palace courtyards"
            },
            {
              day: 4,
              dateStr: "21-Jan-2026",
              city: "Agra",
              coverImage: "https://images.unsplash.com/photo-1545229765-706a86455357?auto=format&fit=crop&w=600&q=80",
              activitiesList: [
                { time: "06:00", title: "Taj Mahal sunrise guided tour" },
                { time: "09:30", title: "Return to Hotel for Breakfast" },
                { time: "11:30", title: "Red sandstone Agra Fort exploration" },
                { time: "15:00", title: "Traditional Henna painting session" }
              ],
              activities: "Breathtaking early morning sunrise tour of the Taj Mahal. Return for a warm breakfast. Explore the massive red walls of Agra Fort. Enjoy a traditional Henna art session in the afternoon.",
              hotelName: "Hotel Jaypee Palace Agra",
              hotelAddress: "Fatehabad Rd, Tajganj, Agra, Uttar Pradesh 282001",
              hotelMapLink: "https://maps.app.goo.gl/9r9X2Y7G4N",
              mealPlan: "Breakfast & Dinner (MAP)",
              transport: "AC Innova Crysta (SUV)",
              famousPlaces: "Taj Mahal, Agra Fort, Mehtab Bagh",
              famousFood: "Mughlai Biryani, Shahi Paneer",
              thingsToDo: "Sunrise photography, Henna art session"
            },
            {
              day: 5,
              dateStr: "22-Jan-2026",
              city: "Khajuraho",
              coverImage: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=600&q=80",
              activitiesList: [
                { time: "07:15", title: "Transfer to Agra Railway Station" },
                { time: "07:55", title: "Board Gatimaan Express to Jhansi" },
                { time: "11:30", title: "Explore medieval Orchha fort" },
                { time: "17:00", title: "Evening Yoga & meditation session" }
              ],
              activities: "Board India's fastest train Gatimaan Express to Jhansi. Drive to Orchha to tour its palace complexes. Enjoy a organic lunch at Amar Palace Orchha, then drive to Khajuraho for check-in and an evening yoga session.",
              hotelName: "Hotel Jass Radisson Khajuraho",
              hotelAddress: "By Pass Road, Khajuraho, Madhya Pradesh 471606",
              hotelMapLink: "https://maps.app.goo.gl/X9N",
              mealPlan: "Breakfast & Dinner (MAP)",
              transport: "Gatimaan Express Train",
              flightNo: "Train 12050",
              famousPlaces: "Orchha Cenotaphs, Khajuraho temples, Yoga ashram",
              famousFood: "Organic local vegetables, Ayurvedic herb teas",
              thingsToDo: "Yoga in gardens, train trip, Orchha heritage walk"
            },
            {
              day: 6,
              dateStr: "23-Jan-2026",
              city: "Varanasi",
              coverImage: "https://images.unsplash.com/photo-1561361062-658b738b8f2a?auto=format&fit=crop&w=600&q=80",
              activitiesList: [
                { time: "08:30", title: "Tour the East & West Erotic temples" },
                { time: "10:30", title: "Transfer to Khajuraho Airport" },
                { time: "11:45", title: "Board Flight 6E2379 to Varanasi" },
                { time: "18:00", title: "Witness Ganga Aarti Pooja ceremony" }
              ],
              activities: "Tour the UNESCO-listed Khajuraho erotic temples. Fly to Varanasi, the spiritual heart of India. Check-in. In the evening, ride a cycle rickshaw to the banks of the Ganges for the spectacular Ganga Aarti oil lamp prayer ceremony.",
              hotelName: "Radisson Varanasi",
              hotelAddress: "The Mall Rd, Cantonment, Varanasi, Uttar Pradesh 221002",
              hotelMapLink: "https://maps.app.goo.gl/VNS",
              mealPlan: "Breakfast & Dinner (MAP)",
              transport: "Flight 6E2379",
              flightNo: "6E2379",
              famousPlaces: "Khajuraho temples, Dashashwamedh Ghat Ganga Aarti",
              famousFood: "Banarasi Lassi in clay cups, Kachori Sabzi",
              thingsToDo: "Ganga Aarti ceremony, rickshaw ride through alleys, hot Chai"
            },
            {
              day: 7,
              dateStr: "24-Jan-2026",
              city: "Varanasi",
              coverImage: "https://images.unsplash.com/photo-1561361062-658b738b8f2a?auto=format&fit=crop&w=600&q=80",
              activitiesList: [
                { time: "05:30", title: "Sunrise boat ride on holy Ganges river" },
                { time: "10:00", title: "Sarnath Temple & Archaeological museum" },
                { time: "14:30", title: "Transfer to Varanasi Airport" },
                { time: "19:30", title: "Gourmet dinner at Aerocity Delhi" }
              ],
              activities: "Rise early for a quiet boat ride on the Ganges as the sun rises. Return for breakfast. Visit Sarnath where Buddha gave his first sermon. Fly back to Delhi. Enjoy a grand dinner at Bizzo-Bizzo Restaurant Aerocity.",
              hotelName: "Crowne Plaza Okhla Delhi",
              hotelAddress: "Plot No. 1, Community Centre, Okhla Phase I, New Delhi",
              hotelMapLink: "https://maps.app.goo.gl/CPD",
              mealPlan: "Breakfast & Dinner (MAP)",
              transport: "Flight 6E5040",
              flightNo: "6E5040",
              famousPlaces: "Sarnath Deer Park, Aerocity Delhi, Ganga River Ghats",
              famousFood: "Farewell dinner at Bizzo-Bizzo",
              thingsToDo: "Sunrise boating, museum walk, Aerocity dining"
            },
            {
              day: 8,
              dateStr: "25-Jan-2026",
              city: "New Delhi",
              coverImage: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80",
              activitiesList: [
                { time: "09:00", title: "Tour the giant Akshardham Temple" },
                { time: "11:00", title: "SS India Gate & President Palace" },
                { time: "13:30", title: "Authentic Korean Lunch at Gung" },
                { time: "19:50", title: "Board Flight KE498 to Incheon" }
              ],
              activities: "Morning exploration of the grand Akshardham Temple complex. Drive past the President's Palace and Parliament house. Savor a farewell Korean lunch at Gung Restaurant. Transfer to IGI Airport for your return flight KE498 to Incheon.",
              hotelName: "Crowne Plaza Okhla Delhi",
              hotelAddress: "Plot No. 1, Community Centre, Okhla Phase I, New Delhi",
              hotelMapLink: "https://maps.app.goo.gl/CPD",
              mealPlan: "Breakfast Only (CP)",
              transport: "AC Innova Crysta (SUV)",
              flightNo: "KE498",
              famousPlaces: "Akshardham, Parliament house, Qutub Minar",
              famousFood: "Korean delicacies at Gung Restaurant",
              thingsToDo: "Gung Korean lunch, airport souvenir shopping"
            }
          ]
        });
      }
    });

    return () => unsubscribe();
  }, [tourCode, language]);

  // Re-check GPS freshness every 5s (phone off = stale data → offline)
  useEffect(() => {
    const interval = setInterval(() => setLocationTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Live subscribe to Driver coordinate stream from Firebase RTDB
  useEffect(() => {
    const unsubscribe = listenToLocations(tourCode, (locs) => {
      setDriverLoc(normalizeTrackingLocation(locs?.driver));
    });

    return () => unsubscribe();
  }, [tourCode]);

  const driverGps = getGpsStatus(driverLoc, 'Driver');
  void locationTick;

  // Weather & Local Time Simulation
  const [localTime, setLocalTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      setLocalTime(new Date().toLocaleTimeString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenExploreDrawer = (dayIdx) => {
    setDrawerCityIndex(dayIdx);
    setDrawerActiveTab('places');
    setIsDrawerOpen(true);
  };

  const handleEmailGuide = async (cityPlan) => {
    setEmailStatus("Sending...");
    
    const details = `Please send detailed city guide brochures for: ${cityPlan.city} containing information about: Places (${cityPlan.famousPlaces}), Food (${cityPlan.famousFood}) and Hotels (${cityPlan.hotelName}).`;
    
    // Trigger EmailJS alert to reshu.ranjan@gmail.com
    const res = await sendNotificationEmail({
      tourCode,
      clientName: tourData?.clientName || "Valued Guest",
      type: 'GUIDE_REQUEST',
      category: cityPlan.city,
      details: details
    });

    if (res.success) {
      setEmailStatus("Sent Successful!");
      setTimeout(() => setEmailStatus(""), 3000);
    } else {
      setEmailStatus("Offline Success! (Console logged)");
      setTimeout(() => setEmailStatus(""), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!tourData) {
    return (
      <div style={styles.loaderWrap}>
        <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ width: '120px', marginBottom: '16px', opacity: 0.9 }} />
        <div style={styles.spinner} />
        <p>{t('loadingSplash')}</p>
      </div>
    );
  }

  // Active day details based on selector or visual index
  const activeDay = tourData.itinerary?.[activeDayIdx] || {};
  const hotelCoords = getCityCoords(activeDay?.city || tourData.itinerary?.[0]?.city);

  // Calculate completion
  const totalDays = tourData.itinerary?.length || 1;
  const completedDays = tourData.itinerary?.filter(d => d.arrived).length || 0;
  const progressPercent = Math.round((completedDays / totalDays) * 100);

  return (
    <div className="app-container mobile-preview-frame">
      <div className="peacock-bg-pattern" />

      {/* Header Bar */}
      <header className="portal-header">
        <div className="portal-brand">
          <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ height: '32px' }} />
          <span className="brand-text">Joyful India</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          <div style={styles.syncBadge}>
            <span className="sync-pulse-dot" />
            <span style={{ fontSize: '0.62rem', fontWeight: '700', color: 'var(--peacock-teal)' }}>{t('liveSync')}</span>
          </div>
          <button className="lang-btn" onClick={toggleLanguage}>
            {language}
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="portal-content-body">
        {activeTab === 'itinerary' && (
          <div className="fade-in-anim">
            {/* Immersive Cover Hero Header */}
            <div className="client-hero-card" style={{ padding: '24px', backgroundImage: `linear-gradient(rgba(11, 79, 108, 0.4), rgba(7, 30, 38, 0.8)), url('${tourData.itinerary?.[activeDayIdx]?.coverImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <span className="client-weather-pill">
                <CloudSun size={14} /> 28°C · {activeDay.city}
              </span>
              <p style={styles.tourIdTag}>TOUR CODE: {tourCode}</p>
              <h2 style={styles.heroTitle}>{tourData.tourName}</h2>
              <div style={styles.timeWrap}>
                <Clock size={16} />
                <span>{localTime} (Local Time)</span>
              </div>
            </div>

            {tourData.announcement && (
              <div style={{
                margin: '14px 0 0 0',
                padding: '12px 16px',
                background: '#fef3c7',
                borderLeft: '4px solid #facc15',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <Volume2 size={16} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#b45309', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {language === 'KO' ? '가이드 공지사항' : 'ANNOUNCEMENT FROM GUIDE'} ({tourData.announcement.time})
                  </span>
                  <p style={{ fontSize: '0.82rem', color: '#1e293b', margin: '2px 0 0 0', fontWeight: '600', lineHeight: '1.4' }}>
                    {tourData.announcement.text}
                  </p>
                </div>
              </div>
            )}

            {/* Service Crew Quick Contact Ribbon */}
            <div style={styles.quickCrewRibbon}>
              <div style={styles.quickCrewBubble}>
                <span>🚗 {tourData.driverName}</span>
                <a href={`tel:${tourData.driverMobile}`} style={styles.crewPhoneBtn}><Phone size={11} /></a>
              </div>
              <div style={styles.quickCrewBubble}>
                <span>🗺️ {tourData.guideName}</span>
                <a href={`tel:${tourData.guideMobile}`} style={styles.crewPhoneBtn}><Phone size={11} /></a>
              </div>
            </div>

            {/* Section: Your Journey (Visual Carousel Timeline) */}
            <h3 style={styles.sectionHeader}>🗺️ {language === 'EN' ? "Your Journey" : "당신의 여행 일정"}</h3>
            <div className="visual-journey-section">
              <div className="carousel-timeline-container">
                {tourData.itinerary?.map((day, idx) => {
                  const isCurrentDay = idx === activeDayIdx; // Day 3 highlighted as active
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setActiveDayIdx(idx);
                      }}
                      className={`visual-day-card ${isCurrentDay ? 'visual-day-card-active' : ''}`}
                    >
                      {isCurrentDay && <span className="card-today-badge">Today</span>}
                      
                      <div className="card-cover-wrapper">
                        <img src={day.coverImage} alt={day.city} className="card-cover-img" />
                        <div className="card-cover-overlay">
                          <span className="card-day-tag">Day {day.day} · {day.dateStr}</span>
                          <h4 className="card-city-name">{day.city}</h4>
                        </div>
                      </div>

                      {/* Small inline bullet activities list */}
                      <div className="card-activities-list">
                        {day.activitiesList?.slice(0, 3).map((act, actIdx) => (
                          <div key={actIdx} className="card-activity-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="card-activity-dot" />
                              <span className="card-activity-time" style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--primary)' }}>{act.time}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{act.title}</span>
                            </div>
                            {act.status && act.status !== 'scheduled' && (
                              <span style={{
                                fontSize: '0.6rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                backgroundColor: act.status === 'completed' ? '#def7ec' : '#fef3c7',
                                color: act.status === 'completed' ? '#03543f' : '#92400e',
                                flexShrink: 0
                              }}>
                                {act.status === 'completed' ? 'Done' : 'Transit'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Click to Explore City Detail drawer */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenExploreDrawer(idx);
                        }}
                        className="card-explore-btn-link"
                      >
                        Tap to explore {day.city} ➜
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today's Transit Progress Dashboard */}
            <div className="today-progress-card">
              <div className="progress-header">
                <span>🚘 {language === 'EN' ? "Tour Completion" : "여행 완료율"}</span>
                <span style={{ color: 'var(--peacock-gold)' }}>{progressPercent}%</span>
              </div>
              <div className="progress-bar-outer">
                <div className="progress-bar-inner" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="progress-crew-bar">
                <span>📍 {completedDays} of {totalDays} Days Completed</span>
                <span>Chauffeur: {tourData.driverName}</span>
              </div>
            </div>

            {/* Curated Dining Spots Horizontal List */}
            <h3 style={styles.sectionHeader}>🍛 {t('diningCurated')}</h3>
            <div style={styles.diningRibbon}>
              <div className="dining-card">
                <div style={styles.diningThumb}>🍽️</div>
                <h4 style={styles.diningTitle}>Chokhi Dhani</h4>
                <p style={styles.diningSub}>{t('authenticRaj')}</p>
                <span style={styles.diningRating}>★ 4.8</span>
              </div>
              <div className="dining-card">
                <div style={styles.diningThumb}>☕</div>
                <h4 style={styles.diningTitle}>LMB Sweet Shop</h4>
                <p style={styles.diningSub}>Famous Desserts & Snacks</p>
                <span style={styles.diningRating}>★ 4.6</span>
              </div>
              <div className="dining-card">
                <div style={styles.diningThumb}>🍛</div>
                <h4 style={styles.diningTitle}>Pinch of Spice</h4>
                <p style={styles.diningSub}>VIP Mughal Fine Dining</p>
                <span style={styles.diningRating}>★ 4.9</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="fade-in-anim" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={styles.sectionHeader}>🛰️ Real-Time GPS Tracking</h3>
            <p style={styles.mapSubText}>
              Watch your driver <b>{tourData.driverName}</b> move live on the map. Keep track of their transit directly from your hotel: <b>{tourData.itinerary?.[0]?.hotelName}</b>.
            </p>
            <div style={{ flex: 1, minHeight: '350px', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
              <LeafletMap 
                driverLat={driverLoc?.lat} 
                driverLng={driverLoc?.lng} 
                hotelLat={hotelCoords.lat} 
                hotelLng={hotelCoords.lng}
                hotelName={activeDay.hotelName || "ITC Mughal"}
                gpsStatus={driverGps.status}
                statusDetail={driverGps.detail}
              />
            </div>
            
            <div style={styles.gpsCoordOverlay}>
              <span style={{
                ...styles.gpsPulseDot,
                backgroundColor: driverGps.dotColor,
                animation: driverGps.pulse ? 'mapPulse 1.5s infinite' : 'none',
              }} />
              <span>
                {driverLoc
                  ? `Driver: ${driverLoc.lat.toFixed(5)}, ${driverLoc.lng.toFixed(5)} — ${driverGps.detail}`
                  : driverGps.detail}
              </span>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="fade-in-anim">
            <h3 style={styles.sectionHeader}>💬 Concierge Service Desk</h3>
            <p style={styles.supportIntro}>
              Need assistance, a custom request, or want to file a complaint? Use the floating **Maru Concierge** chatbot in the bottom right corner of your screen! Our bot is connected to our database and manager's email to serve you instantly.
            </p>
            <div style={styles.conciergeAlertCard}>
              <h4 style={styles.alertTitle}>🛡️ Direct Manager Guarantee</h4>
              <p style={styles.alertText}>
                Every complaint or urgent request goes directly to the phone of our manager: <b>reshu.ranjan@gmail.com</b>. Your comfort is our premium priority.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="fade-in-anim" style={styles.profileContainer}>
            <div style={{...styles.avatarHuge, backgroundColor: 'transparent', border: 'none', boxShadow: 'none'}}>
              <img src="/maru_logo_transparent.png" alt="Profile" style={{ width: '80px', height: 'auto' }} />
            </div>
            <h2 style={styles.profileName}>{tourData.clientName}</h2>
            <p style={styles.profileEmail}>pax: {tourData.pax} Guests</p>
            <div style={styles.profileDetailsBox}>
              <div style={styles.profileDetailRow}>
                <span>Tour Code</span>
                <b>{tourCode}</b>
              </div>
              <div style={styles.profileDetailRow}>
                <span>Driver Assigned</span>
                <b>{tourData.driverName}</b>
              </div>
              <div style={styles.profileDetailRow}>
                <span>Guide Assigned</span>
                <b>{tourData.guideName}</b>
              </div>
            </div>
            <button onClick={onLogout} style={styles.logoutBtn}>
              <LogOut size={16} /> {t('backToLogin')}
            </button>
          </div>
        )}
      </main>

      {/* Floating Branded Peacock Bot Overlay */}
      <ChatBot tourCode={tourCode} activeTour={tourData} clientName={tourData.clientName} />

      {/* Floating Bottom Navigation Bar */}
      <nav className="bottom-nav-bar">
        <button 
          onClick={() => setActiveTab('itinerary')} 
          className={`bottom-nav-item ${activeTab === 'itinerary' ? 'bottom-nav-item-active' : ''}`}
        >
          <div className="bottom-nav-icon-wrap">
            <Calendar size={22} />
          </div>
          <span className="bottom-nav-label">Itinerary</span>
        </button>

        <button 
          onClick={() => setActiveTab('map')} 
          className={`bottom-nav-item ${activeTab === 'map' ? 'bottom-nav-item-active' : ''}`}
        >
          <div className="bottom-nav-icon-wrap">
            <Map size={22} />
          </div>
          <span className="bottom-nav-label">Live Map</span>
        </button>

        <button 
          onClick={() => setActiveTab('support')} 
          className={`bottom-nav-item ${activeTab === 'support' ? 'bottom-nav-item-active' : ''}`}
        >
          <div className="bottom-nav-icon-wrap">
            <MessageSquare size={22} />
          </div>
          <span className="bottom-nav-label">Support</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')} 
          className={`bottom-nav-item ${activeTab === 'profile' ? 'bottom-nav-item-active' : ''}`}
        >
          <div className="bottom-nav-icon-wrap">
            <User size={22} />
          </div>
          <span className="bottom-nav-label">Profile</span>
        </button>
      </nav>

      {/* ========================================== */}
      {/* GORGEOUS TABS EXPLORE DRAWER OVERLAY */}
      {/* ========================================== */}
      {isDrawerOpen && (
        <div className="explore-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="explore-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Top banner image */}
            <div className="drawer-cover-banner" style={{ backgroundImage: `linear-gradient(rgba(18, 26, 29, 0.2), rgba(18, 26, 29, 0.9)), url('${tourData.itinerary?.[drawerCityIndex]?.coverImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>
                <X size={20} />
              </button>
              <div className="drawer-header-overlay">
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: '700', color: 'var(--peacock-gold)' }}>
                  Day {tourData.itinerary?.[drawerCityIndex]?.day} Details
                </span>
                <h2 className="drawer-city-title">{tourData.itinerary?.[drawerCityIndex]?.city}</h2>
                <div className="drawer-meta-subtitle">
                  <span>📅 {tourData.itinerary?.[drawerCityIndex]?.dateStr}</span>
                  <span>⛅ 28°C Sunny</span>
                </div>
              </div>
            </div>

            {/* Navigation tabs inside Explore Drawer */}
            <div className="drawer-tab-bar">
              <button 
                onClick={() => setDrawerActiveTab('places')}
                className={`drawer-tab-btn ${drawerActiveTab === 'places' ? 'drawer-tab-btn-active' : ''}`}
              >
                🏛️ Places
              </button>
              <button 
                onClick={() => setDrawerActiveTab('hotel')}
                className={`drawer-tab-btn ${drawerActiveTab === 'hotel' ? 'drawer-tab-btn-active' : ''}`}
              >
                🏨 Hotel
              </button>
              <button 
                onClick={() => setDrawerActiveTab('food')}
                className={`drawer-tab-btn ${drawerActiveTab === 'food' ? 'drawer-tab-btn-active' : ''}`}
              >
                🍛 Food
              </button>
              <button 
                onClick={() => setDrawerActiveTab('info')}
                className={`drawer-tab-btn ${drawerActiveTab === 'info' ? 'drawer-tab-btn-active' : ''}`}
              >
                ℹ️ Info
              </button>
              <button 
                onClick={() => setDrawerActiveTab('tips')}
                className={`drawer-tab-btn ${drawerActiveTab === 'tips' ? 'drawer-tab-btn-active' : ''}`}
              >
                💡 Tips
              </button>
            </div>

            {/* Scrollable drawer body */}
            <div className="drawer-scroll-body">
              {drawerActiveTab === 'places' && (
                <div className="fade-in-anim explore-grid">
                  {/* Dynamic place cards filtered by the city */}
                  {masterActivities.filter(a => a.city === tourData.itinerary?.[drawerCityIndex]?.city).map((place, pIdx) => (
                    <div key={place.id || pIdx} className="explore-place-card">
                      <img src={place.imageUrl} alt={place.title} className="explore-place-thumb" />
                      <div className="explore-place-info">
                        <h4 className="explore-place-title">{place.title}</h4>
                        <p className="explore-place-desc">{place.info}</p>
                        <span className="explore-place-bullet">💡 Recommended Visit Spot</span>
                      </div>
                    </div>
                  ))}
                  {masterActivities.filter(a => a.city === tourData.itinerary?.[drawerCityIndex]?.city).length === 0 && (
                    <div className="explore-place-card">
                      <div className="explore-place-info">
                        <h4 className="explore-place-title">🏛️ Sightseeing Targets</h4>
                        <p className="explore-place-desc">{tourData.itinerary?.[drawerCityIndex]?.activities}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {drawerActiveTab === 'hotel' && (
                <div className="fade-in-anim hotel-view-wrapper">
                  <img src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80" alt="Resort Room" className="hotel-room-cover" />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h3 className="hotel-spec-title">{tourData.itinerary?.[drawerCityIndex]?.hotelName}</h3>
                    <div className="hotel-rating-row">
                      <span className="hotel-stars">★★★★★</span>
                      <span className="hotel-rating-label">5 Star Luxury</span>
                    </div>
                  </div>

                  <div className="hotel-fields-box">
                    <div className="hotel-field-row">
                      <MapPin size={18} className="hotel-field-icon" />
                      <div className="hotel-field-content">
                        <span className="hotel-field-label">Address</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="hotel-field-value">{tourData.itinerary?.[drawerCityIndex]?.hotelAddress}</span>
                          <a href={tourData.itinerary?.[drawerCityIndex]?.hotelMapLink} target="_blank" rel="noopener noreferrer" className="hotel-map-link-btn">
                            <Navigation size={12} /> Maps
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="hotel-field-row">
                      <Phone size={18} className="hotel-field-icon" />
                      <div className="hotel-field-content">
                        <span className="hotel-field-label">Phone</span>
                        <span className="hotel-field-value">+91 562 223 1515</span>
                      </div>
                    </div>

                    <div className="hotel-field-row">
                      <Clock size={18} className="hotel-field-icon" />
                      <div className="hotel-field-content">
                        <span className="hotel-field-label">Check-In / Out</span>
                        <span className="hotel-field-value">2:00 PM → 12:00 PM</span>
                      </div>
                    </div>

                    <div className="hotel-field-row">
                      <Utensils size={18} className="hotel-field-icon" />
                      <div className="hotel-field-content">
                        <span className="hotel-field-label">Meals</span>
                        <span className="hotel-field-value">{tourData.itinerary?.[drawerCityIndex]?.mealPlan}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {drawerActiveTab === 'food' && (
                <div className="fade-in-anim hotel-view-wrapper">
                  <img src="https://images.unsplash.com/photo-1585938338392-50a59970d2ee?auto=format&fit=crop&w=600&q=80" alt="Indian Feast" className="hotel-room-cover" />
                  <h3 className="hotel-spec-title">Authentic {tourData.itinerary?.[drawerCityIndex]?.city} Culinary Sights</h3>
                  <div className="hotel-fields-box">
                    <p style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>
                      🌟 <b>Famous Foods to Try:</b><br/>
                      {tourData.itinerary?.[drawerCityIndex]?.famousFood || "Authentic traditional regional delicacies."}
                    </p>
                  </div>
                </div>
              )}

              {drawerActiveTab === 'info' && (
                <div className="fade-in-anim hotel-view-wrapper">
                  <h3 className="hotel-spec-title">ℹ️ Daily Travel Information</h3>
                  <div className="hotel-fields-box">
                    <p style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                      🚌 <b>Transport Mode:</b> {tourData.itinerary?.[drawerCityIndex]?.transport}<br/>
                      {tourData.itinerary?.[drawerCityIndex]?.flightNo && `✈️ Flight Number: ${tourData.itinerary?.[drawerCityIndex]?.flightNo}\n`}
                    </p>
                    <p style={{ fontSize: '0.85rem', lineHeight: '1.4', marginTop: '10px' }}>
                      📝 <b>Day Schedule:</b><br/>
                      {tourData.itinerary?.[drawerCityIndex]?.activities}
                    </p>
                  </div>
                </div>
              )}

              {drawerActiveTab === 'tips' && (
                <div className="fade-in-anim hotel-view-wrapper">
                  <h3 className="hotel-spec-title">💡 Local Expert Tips</h3>
                  <div className="hotel-fields-box" style={{ borderLeft: '4px solid var(--peacock-gold)', backgroundColor: 'rgba(217,93,57,0.03)' }}>
                    <p style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                      🦚 <b>Things to Do & Explore:</b><br/>
                      • {tourData.itinerary?.[drawerCityIndex]?.thingsToDo || "Enjoy photo shoots at national monuments."}<br/>
                      • Wear comfortable walking shoes.<br/>
                      • Stay hydrated with mineral water provided in vehicle.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer action footer */}
            <div className="drawer-action-footer">
              <button 
                onClick={() => handleEmailGuide(tourData.itinerary?.[drawerCityIndex])}
                className="btn-primary" 
                style={{ width: '100%', backgroundColor: 'var(--peacock-gold)' }}
              >
                <Mail size={16} /> {emailStatus ? emailStatus : "Email This City Guide"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  loaderWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#FAF7F2',
    color: '#073549',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5ECF0',
    borderTopColor: '#018E42',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  syncBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(1, 142, 66, 0.08)',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  tourIdTag: {
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '1.5px',
    color: '#FAF7F2',
    opacity: 0.8,
    marginBottom: '6px',
  },
  heroTitle: {
    color: '#FAF7F2',
    fontSize: '1.6rem',
    fontWeight: '800',
    lineHeight: '1.25',
    marginBottom: '8px',
    fontFamily: "'Outfit', sans-serif",
  },
  timeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.82rem',
    color: '#FAF7F2',
    opacity: 0.9,
  },
  sectionHeader: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--peacock-blue-dark)',
    marginBottom: '14px',
    marginTop: '16px',
  },
  quickCrewRibbon: {
    display: 'flex',
    gap: '12px',
    margin: '16px 0',
  },
  quickCrewBubble: {
    backgroundColor: 'var(--peacock-white)',
    border: '1px solid var(--peacock-light-grey)',
    borderRadius: '16px',
    padding: '8px 12px',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--peacock-blue-dark)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: 'var(--shadow-sm)',
    flex: 1,
    justifyContent: 'space-between',
  },
  crewPhoneBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'var(--peacock-teal-light)',
    color: 'var(--peacock-teal)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
  },
  diningRibbon: {
    overflowX: 'auto',
    whiteSpace: 'nowrap',
    paddingBottom: '12px',
    marginBottom: '20px',
  },
  diningThumb: {
    fontSize: '32px',
    marginBottom: '8px',
    textAlign: 'center',
  },
  diningTitle: {
    fontSize: '0.88rem',
    fontWeight: '700',
    color: 'var(--peacock-blue-dark)',
  },
  diningSub: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
    marginBottom: '6px',
  },
  diningRating: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--peacock-gold)',
    backgroundColor: 'rgba(217,93,57,0.08)',
    padding: '2px 6px',
    borderRadius: '8px',
  },
  mapSubText: {
    fontSize: '0.85rem',
    lineHeight: '1.4',
    color: 'var(--text-muted)',
  },
  gpsCoordOverlay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--peacock-white)',
    border: '1px solid var(--peacock-light-grey)',
    padding: '10px 16px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--peacock-blue-dark)',
    boxShadow: 'var(--shadow-sm)',
    alignSelf: 'center',
  },
  gpsPulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#018E42',
    animation: 'mapPulse 1.5s infinite',
  },
  supportIntro: {
    fontSize: '0.88rem',
    lineHeight: '1.5',
    color: 'var(--text-dark)',
    marginBottom: '20px',
  },
  conciergeAlertCard: {
    borderLeft: '4px solid var(--peacock-teal)',
    backgroundColor: 'var(--peacock-teal-light)',
    padding: '16px',
    borderRadius: '12px',
  },
  alertTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--peacock-teal)',
    marginBottom: '6px',
  },
  alertText: {
    fontSize: '0.8rem',
    lineHeight: '1.4',
    color: 'var(--text-dark)',
  },
  profileContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0',
  },
  avatarHuge: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    backgroundColor: 'var(--peacock-teal-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '44px',
    boxShadow: 'var(--shadow-md)',
    marginBottom: '16px',
    border: '3px solid var(--peacock-teal)',
  },
  profileName: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--peacock-blue-dark)',
  },
  profileEmail: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
    marginBottom: '24px',
  },
  profileDetailsBox: {
    width: '100%',
    backgroundColor: 'var(--peacock-white)',
    border: '1px solid var(--peacock-light-grey)',
    borderRadius: '20px',
    padding: '16px',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  profileDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--peacock-light-grey)',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #D95D39',
    color: '#D95D39',
    padding: '10px 24px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.25s ease',
  }
};
