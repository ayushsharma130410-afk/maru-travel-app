const fs = require('fs');
let content = fs.readFileSync('src/portals/GuidePortal.jsx', 'utf8');

// The block my script inserted was exactly this:
const blockToRemove = `  // Weather simulation
  const getWeatherForCity = (cityName) => {
    const weatherDb = {
      'New Delhi': { temp: 42, condition: 'sunny', label: 'Hot & Sunny', humidity: 35 },
      'Agra': { temp: 41, condition: 'sunny', label: 'Hot & Clear', humidity: 38 },
      'Jaipur': { temp: 40, condition: 'sunny', label: 'Dry & Hot', humidity: 25 },
      'Udaipur': { temp: 36, condition: 'cloudy', label: 'Partly Cloudy', humidity: 45 },
      'Mumbai': { temp: 33, condition: 'rainy', label: 'Humid & Rain', humidity: 80 }
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

  const todayCity = currentDayItinerary.city || '';
  const cityWeather = getWeatherForCity(todayCity);
  const WeatherIconComponent = getWeatherIcon(cityWeather.condition);
  const weatherColor = getWeatherColor(cityWeather.condition);

  // Progress Bar logic
  const totalDays = tourData.itinerary?.length || 1;
  const completedDays = tourData.itinerary?.filter(d => d.arrived).length || 0;
  const tourProgressPct = Math.round((completedDays / totalDays) * 100);

`;

content = content.replace(blockToRemove, '');

// The block my script inserted for Tour Progress Bar
const pbBlock = `{/* Tour Progress Bar */}
        {!isBeforeTour && !isAfterTour && (
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} color="var(--primary)" />
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {language === 'KO' ? '투어 진행률' : 'Tour Progress'}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)' }}>
                {completedDays}/{totalDays} {language === 'KO' ? '일' : 'Days'}
              </span>
            </div>
            <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, #34d399 100%)', width: \`\${tourProgressPct}%\`, transition: 'width 0.5s ease-out' }} />
            </div>
          </div>
        )}

        `;

content = content.replace(pbBlock, '');

// The block my script inserted for profile toast logic
const toastLogic = `  // Guide Profile Update Watcher
  useEffect(() => {
    if (tourData?.guideName || tourData?.guideMobile) {
      setProfileToast('Profile Updated');
      const timer = setTimeout(() => setProfileToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [tourData?.guideName, tourData?.guideMobile]);

`;

content = content.replace(toastLogic, '');

// Profile toast UI
const toastUI = `<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '2px 0 0 0' }}>{tourData.guideName || 'No Guide Assigned'}</h4>{profileToast && <span style={{ fontSize: '0.6rem', background: '#22c55e', color: 'white', padding: '2px 6px', borderRadius: '8px', animation: 'fade 0.5s ease-in-out' }}>{profileToast}</span>}</div>`;
content = content.replace(toastUI, `<h4 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '2px 0 0 0' }}>{tourData.guideName || 'No Guide Assigned'}</h4>`);

// The guest details hero card we replaced
const guestDetails = `{/* Guest Overview Hero Card with Details */}
        <div className="client-hero-card" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #1A8A7D 0%, #115E59 100%)', boxShadow: 'var(--shadow-md)', marginBottom: '16px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.8, letterSpacing: '1px', color: '#FAF7F2' }}>TOUR ID: {activeTourCode}</span>
            <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: '#FAF7F2' }}>{tourData.tourName}</h2>
            <p style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.95, color: '#FAF7F2', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={14} /> <strong>{tourData.clientName}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '12px' }}>
            <Users size={20} color="#facc15" style={{ margin: '0 auto' }} />
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>{tourData.pax}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase' }}>Guests</span>
          </div>
        </div>

        {/* Weather Widget */}
        {!isBeforeTour && !isAfterTour && hasScheduledDay && (
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: \`\${weatherColor}15\`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WeatherIconComponent size={24} color={weatherColor} />
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {todayCity} Weather
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--navy)' }}>{cityWeather.temp}°C</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>{cityWeather.label}</span>
              </div>
            </div>
          </div>
        )}

        `;
const oldHeroCard = `{/* Guest Overview Hero Card */}
        <div className="client-hero-card" style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #1A8A7D 0%, #115E59 100%)', boxShadow: 'var(--shadow-md)', marginBottom: '16px', padding: '18px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: '800', opacity: 0.8, letterSpacing: '1px' }}>TOUR ID: {activeTourCode}</span>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem', fontWeight: '800', marginTop: '4px', color: '#FAF7F2' }}>{tourData.tourName}</h2>
          <p style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.95 }}>
            Client: <strong>{tourData.clientName}</strong> ({tourData.pax} Guests)
          </p>
        </div>

        `;
content = content.replace(guestDetails, oldHeroCard);

// Remove the SOS button
const sosButton = `  {/* Emergency SOS Button */}
        <div style={{ marginTop: '24px' }}>
          <a href="tel:112" className="btn-secondary" style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: '800', textDecoration: 'none' }}>
            <AlertTriangle size={18} /> {language === 'KO' ? '긴급 구조 (112)' : 'EMERGENCY SOS (112)'}
          </a>
        </div>
      `;
content = content.replace(sosButton, '');

fs.writeFileSync('src/portals/GuidePortal.jsx', content);
console.log('Reverted GuidePortal.jsx successfully');
