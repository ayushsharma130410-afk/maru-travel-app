import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Key, User, ShieldAlert, Award, Compass, Car, Globe, Sparkles } from 'lucide-react';
import { listenToTour, signInWithGoogle } from '../services/firebase';

export default function LoginPortal({ onLoginSuccess }) {
  const { t, language, toggleLanguage } = useLanguage();
  const [tourCode, setTourCode] = useState('');
  const [activePortal, setActivePortal] = useState('client'); // 'client', 'guide', 'driver', 'operator'
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [operatorEmail, setOperatorEmail] = useState('');
  const [operatorPassword, setOperatorPassword] = useState('');

  const handleOperatorGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await signInWithGoogle();
      if (user && user.email.toLowerCase() === 'reshu.ranjan@gmail.com') {
        onLoginSuccess({ role: 'operator', user: { email: user.email } });
      } else {
        setErrorMsg(language === 'KO' ? '권한이 없는 이메일입니다. reshu.ranjan@gmail.com으로 로그인하세요.' : 'Unauthorized email. Please login with reshu.ranjan@gmail.com.');
      }
    } catch (error) {
      setErrorMsg('Google Sign-In failed. Please try again.');
    }
    setIsLoading(false);
  };

  const handleTourAccess = async (e) => {
    e.preventDefault();
    if (activePortal === 'operator') {
      setIsLoading(true);
      setErrorMsg('');
      setTimeout(() => {
        setIsLoading(false);
        if (operatorEmail.trim().toLowerCase() === 'reshu.ranjan@gmail.com' && operatorPassword === 'maru123') {
          onLoginSuccess({ role: 'operator', user: { email: operatorEmail.trim() } });
        } else {
          setErrorMsg(language === 'KO' ? '이메일 또는 비밀번호가 올바르지 않습니다.' : 'Invalid Email or Password. Please try again.');
        }
      }, 600);
      return;
    }

    if (!tourCode.trim()) return;

    setIsLoading(true);
    setErrorMsg('');

    // Fetch from Firebase RTDB (with local fallback internally handled)
    let unsubscribe;
    unsubscribe = listenToTour(tourCode.trim().toUpperCase(), (tourData) => {
      if (unsubscribe) {
        unsubscribe();
      } else {
        setTimeout(() => {
          if (unsubscribe) unsubscribe();
        }, 0);
      }
      setIsLoading(false);

      if (tourData) {
        // Valid tour code! Proceed based on selected portal
        onLoginSuccess({
          role: activePortal,
          tourCode: tourCode.trim().toUpperCase(),
          tourData: tourData
        });
      } else {
        // Handle fallback seed for tour codes if DB is freshly seeded
        if (tourCode.toUpperCase() === 'JI-2026-X8J') {
          const fallbackData = {
            tourCode: 'JI-2026-X8J',
            tourName: 'Heritage Jewels of Rajasthan',
            clientName: 'Kim Family (4 Pax)',
            pax: 4,
            startDate: '2026-05-30',
            endDate: '2026-06-05',
            guideName: 'Satay Kumar',
            guideMobile: '+91 98765 43210',
            driverName: 'Rajesh Kumar',
            driverMobile: '+91 91111 22222',
            vehicleNo: 'DL 1Z 4567',
            vehicleType: 'Toyota Innova Crysta (SUV)',
            itinerary: [
              {
                day: 1,
                dateStr: '30-May-2026',
                city: 'New Delhi',
                activities: 'Arrival at IGI Airport, transfer to hotel. Evening walk around India Gate.',
                activitiesList: [
                  { time: '02:00 PM', title: 'Airport Pickup & Hotel Check-in' },
                  { time: '06:00 PM', title: 'India Gate Sunset Stroll' }
                ],
                hotelName: 'The Taj Mahal Palace New Delhi',
                hotelAddress: 'Number One Mansingh Road, New Delhi',
                hotelMapLink: 'https://maps.google.com/?q=Taj+Mansingh+New+Delhi',
                mealPlan: 'Dinner at hotel',
                transport: 'By Surface',
                flightNo: '',
                coverImage: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&auto=format&fit=crop&q=80'
              }
            ]
          };
          onLoginSuccess({
            role: activePortal,
            tourCode: tourCode.trim().toUpperCase(),
            tourData: fallbackData
          });
        } else {
          setErrorMsg(language === 'KO' ? '올바르지 않은 투어 코드입니다. 다시 시도해주세요.' : 'Invalid tour code. Please try again.');
        }
      }
    });
  };

  const portals = [
    { id: 'client', label: language === 'KO' ? '고객 포털' : 'Client', icon: Compass },
    { id: 'guide', label: language === 'KO' ? '가이드' : 'Guide', icon: Award },
    { id: 'driver', label: language === 'KO' ? '드라이버' : 'Driver', icon: Car },
    { id: 'operator', label: language === 'KO' ? '관리자' : 'Operator', icon: User }
  ];

  return (
    <div className="login-bg">
      {/* Floating background particles */}
      <div style={styles.particlesContainer}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.particle,
              width: `${10 + (i % 3) * 10}px`,
              height: `${10 + (i % 3) * 10}px`,
              left: `${(i * 7) % 100}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${8 + (i % 5) * 3}s`
            }}
          />
        ))}
      </div>

      {/* Language Selector */}
      <div className="lang-header-toggle">
        <button onClick={toggleLanguage} className="lang-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={14} />
          {t('langToggle')}
        </button>
      </div>

      <div className="login-card fade-in-anim">
        <div className="login-logo-section">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
            <img src="/maru_logo_clean.png" alt="Maru Travel" style={{ width: '180px', height: 'auto', marginBottom: '4px' }} />
          </div>
          <p style={styles.brandSubtitle}>Premium India Experience</p>
        </div>

        {/* Portal selector tabs */}
        <div style={styles.portalTabs}>
          {portals.map((p) => {
            const Icon = p.icon;
            const isSelected = activePortal === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActivePortal(p.id);
                  setErrorMsg('');
                }}
                style={{
                  ...styles.portalTabBtn,
                  backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                  borderColor: isSelected ? 'rgba(255, 255, 255, 0.4)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.65)'
                }}
              >
                <Icon size={18} />
                <span style={styles.portalTabLabel}>{p.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleTourAccess} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activePortal !== 'operator' ? (
            <div className="login-form-group slide-up-anim">
              <label className="login-label" htmlFor="tourCode">
                {t('enterTourCode')}
              </label>
              <div className="login-input-wrap">
                <Key className="login-icon-prefix" size={18} />
                <input
                  id="tourCode"
                  className="login-input"
                  type="text"
                  placeholder={t('tourCodePlaceholder')}
                  value={tourCode}
                  onChange={(e) => setTourCode(e.target.value)}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="slide-up-anim">
              <div className="login-form-group">
                <label className="login-label" htmlFor="operatorEmail">
                  {language === 'KO' ? '오퍼레이터 이메일' : 'Operator Email'}
                </label>
                <div className="login-input-wrap">
                  <User className="login-icon-prefix" size={18} />
                  <input
                    id="operatorEmail"
                    className="login-input"
                    type="email"
                    placeholder="reshu.ranjan@gmail.com"
                    value={operatorEmail}
                    onChange={(e) => setOperatorEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-label" htmlFor="operatorPassword">
                  {language === 'KO' ? '비밀번호' : 'Password'}
                </label>
                <div className="login-input-wrap">
                  <Key className="login-icon-prefix" size={18} />
                  <input
                    id="operatorPassword"
                    className="login-input"
                    type="password"
                    placeholder="••••••••"
                    value={operatorPassword}
                    onChange={(e) => setOperatorPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="login-error-msg" style={styles.errorBox}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '14px', borderRadius: '12px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div className="spinner-small" /> Loading...
              </div>
            ) : activePortal === 'operator' ? (
              language === 'KO' ? '오퍼레이터 대시보드 입장' : 'Access Operator Panel'
            ) : (
              language === 'KO' ? '포털 접속' : 'Access Portal'
            )}
          </button>

          {activePortal === 'operator' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
              </div>
              <button 
                type="button" 
                onClick={handleOperatorGoogleLogin} 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#fff', color: '#333', border: '1px solid #e2e8f0' }}
                disabled={isLoading}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px', height: '20px' }} />
                {isLoading ? 'Signing In...' : 'Sign in with Google'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: 1
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '50%',
    bottom: '-20px',
    animationName: 'float',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  brandIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: 'rgba(26, 138, 125, 0.3)',
    border: '1px solid rgba(26, 138, 125, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px'
  },
  brandSubtitle: {
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginTop: '2px'
  },
  portalTabs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '14px',
    padding: '4px',
    marginBottom: '24px'
  },
  portalTabBtn: {
    border: '1px solid transparent',
    borderRadius: '10px',
    padding: '8px 4px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.3s ease'
  },
  portalTabLabel: {
    fontSize: '0.62rem',
    fontWeight: '700'
  },
  operatorNote: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px dashed rgba(255, 255, 255, 0.2)',
    padding: '16px',
    borderRadius: '12px',
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.85)'
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    lineHeight: '1.4'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
