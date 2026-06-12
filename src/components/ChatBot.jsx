import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MessageSquare, X, Send, Bot, User, Bell } from 'lucide-react';
import { submitComplaint } from '../services/firebase';
import { sendNotificationEmail } from '../services/email';

export default function ChatBot({ tourCode, activeTour, clientName }) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showOptions, setShowOptions] = useState(true);
  const [interactionMode, setInteractionMode] = useState(null); // 'COMPLAINT' or 'SERVICE' or null
  const chatEndRef = useRef(null);

  // Initialize bot welcome message
  useEffect(() => {
    setMessages([
      {
        id: 1,
        sender: 'bot',
        text: t('botWelcome'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [language]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const addMessage = (sender, text) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleOptionClick = async (option) => {
    setShowOptions(false);
    
    if (option === 'itinerary') {
      addMessage('user', t('botOptionItinerary'));
      
      if (activeTour && activeTour.itinerary && activeTour.itinerary.length > 0) {
        let itinerarySummary = `${t('botItineraryAns')}\n`;
        activeTour.itinerary.forEach((day, index) => {
          itinerarySummary += `• ${t('day')} ${index + 1} (${day.city}): ${day.activities || 'Sightseeing'}\n`;
        });
        setTimeout(() => {
          addMessage('bot', itinerarySummary);
          setShowOptions(true);
        }, 600);
      } else {
        setTimeout(() => {
          addMessage('bot', language === 'EN' ? "We couldn't find an active itinerary for this tour code yet." : "현재 투어 코드에 등록된 활성화된 일정이 없습니다.");
          setShowOptions(true);
        }, 600);
      }
    } 
    
    else if (option === 'driver') {
      addMessage('user', t('botOptionDriver'));
      const dName = activeTour?.driverName || "Rajesh Kumar";
      const dCar = activeTour?.vehicleNo || "DL 1Z 4567";
      const ans = t('botDriverAns').replace('{name}', dName).replace('{car}', dCar);
      
      setTimeout(() => {
        addMessage('bot', ans);
        setShowOptions(true);
      }, 600);
    } 
    
    else if (option === 'complaint') {
      addMessage('user', t('botOptionCompliant'));
      setTimeout(() => {
        addMessage('bot', t('botComplaintSelect'));
        setInteractionMode('COMPLAINT');
      }, 500);
    } 
    
    else if (option === 'service') {
      addMessage('user', t('botOptionAmenity'));
      setTimeout(() => {
        addMessage('bot', t('botServiceSelect'));
        setInteractionMode('SERVICE');
      }, 500);
    }
  };

  const handleSubOptionClick = async (category, label) => {
    addMessage('user', label);
    setInteractionMode(null);

    const cName = clientName || "Valued Guest";

    if (showOptions === false) {
      if (messages[messages.length - 1]?.text === t('botComplaintSelect')) {
        // Registering a complaint!
        const complaintDetails = `Client requested attention for: ${label}`;
        
        // PUSH to Firebase Realtime DB
        await submitComplaint({
          tourCode,
          clientName: cName,
          type: 'COMPLAINT',
          category: category,
          details: label
        });

        // Trigger EmailJS notification to Owner reshu.ranjan@gmail.com
        await sendNotificationEmail({
          tourCode,
          clientName: cName,
          type: 'COMPLAINT',
          category: category,
          details: label
        });

        setTimeout(() => {
          addMessage('bot', t('complaintSuccess'));
          setShowOptions(true);
        }, 800);
      } else {
        // Registering a special service!
        
        // PUSH to Firebase
        await submitComplaint({
          tourCode,
          clientName: cName,
          type: 'SERVICE_REQUEST',
          category: category,
          details: label
        });

        // Send EmailJS alert
        await sendNotificationEmail({
          tourCode,
          clientName: cName,
          type: 'SERVICE_REQUEST',
          category: category,
          details: label
        });

        setTimeout(() => {
          addMessage('bot', t('serviceSuccess'));
          setShowOptions(true);
        }, 800);
      }
    }
  };

  return (
    <>
      {/* Floating Branded Peacock Bot Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.fab,
          boxShadow: isOpen ? 'none' : '0 10px 25px rgba(11, 79, 108, 0.35)'
        }}
      >
        {isOpen ? <X size={24} /> : <Bot size={28} className="bot-breath-anim" />}
        {!isOpen && <span style={styles.badge} />}
      </button>

      {/* Floating Chat Container */}
      {isOpen && (
        <div style={styles.chatWindow} className="glass-panel slide-up-anim">
          {/* Header */}
          <div style={styles.chatHeader}>
            <div style={styles.headerTitleWrap}>
              <div style={styles.botIconCircle}>
                <Bot size={20} color="#FAF7F2" />
              </div>
              <div>
                <h4 style={styles.headerTitle}>{t('clientConcierge')}</h4>
                <p style={styles.headerSubtitle}>{t('liveSync')}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div style={styles.chatBody}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{
                  ...styles.msgRow,
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.sender === 'bot' && (
                  <div style={styles.avatarMini}>
                    <Bot size={12} color="#0B4F6C" />
                  </div>
                )}
                <div 
                  style={{
                    ...styles.msgBubble,
                    backgroundColor: msg.sender === 'user' ? '#0B4F6C' : '#E5ECF0',
                    color: msg.sender === 'user' ? '#FAF7F2' : '#12252C',
                    borderRadius: msg.sender === 'user' 
                      ? '16px 16px 2px 16px' 
                      : '16px 16px 16px 2px',
                  }}
                >
                  <p style={{ whiteSpace: 'pre-line', fontSize: '0.88rem', lineHeight: '1.4' }}>{msg.text}</p>
                  <span style={styles.msgTime}>{msg.time}</span>
                </div>
              </div>
            ))}
            
            {/* Quick Action Options */}
            {showOptions && (
              <div style={styles.optionsWrap}>
                <button onClick={() => handleOptionClick('itinerary')} style={styles.optionBtn}>
                  {t('botOptionItinerary')}
                </button>
                <button onClick={() => handleOptionClick('driver')} style={styles.optionBtn}>
                  {t('botOptionDriver')}
                </button>
                <button onClick={() => handleOptionClick('service')} style={styles.optionBtn}>
                  {t('botOptionAmenity')}
                </button>
                <button onClick={() => handleOptionClick('complaint')} style={styles.optionBtnDanger}>
                  {t('botOptionCompliant')}
                </button>
              </div>
            )}

            {/* Complaint categories sub-options */}
            {interactionMode === 'COMPLAINT' && (
              <div style={styles.optionsWrap}>
                <button onClick={() => handleSubOptionClick('Vehicle', t('complaintVehicle'))} style={styles.subOptionBtn}>
                  ⚠️ {t('complaintVehicle')}
                </button>
                <button onClick={() => handleSubOptionClick('Driver', t('complaintDriver'))} style={styles.subOptionBtn}>
                  👤 {t('complaintDriver')}
                </button>
                <button onClick={() => handleSubOptionClick('Guide', t('complaintGuide'))} style={styles.subOptionBtn}>
                  🗺️ {t('complaintGuide')}
                </button>
                <button onClick={() => handleSubOptionClick('Hotel', t('complaintHotel'))} style={styles.subOptionBtn}>
                  🏨 {t('complaintHotel')}
                </button>
                <button onClick={() => handleSubOptionClick('Other', t('complaintOther'))} style={styles.subOptionBtn}>
                  📝 {t('complaintOther')}
                </button>
              </div>
            )}

            {/* Special service sub-options */}
            {interactionMode === 'SERVICE' && (
              <div style={styles.optionsWrap}>
                <button onClick={() => handleSubOptionClick('Water', t('serviceWater'))} style={styles.subOptionBtn}>
                  💧 {t('serviceWater')}
                </button>
                <button onClick={() => handleSubOptionClick('Wheelchair', t('serviceWheelchair'))} style={styles.subOptionBtn}>
                  ♿ {t('serviceWheelchair')}
                </button>
                <button onClick={() => handleSubOptionClick('Meals', t('serviceMeal'))} style={styles.subOptionBtn}>
                  🍛 {t('serviceMeal')}
                </button>
                <button onClick={() => handleSubOptionClick('Amenities', t('serviceAmenity'))} style={styles.subOptionBtn}>
                  🛋️ {t('serviceAmenity')}
                </button>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  fab: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#018E42',
    color: '#FAF7F2',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#D95D39',
    border: '2px solid #FAF7F2',
    animation: 'pulse 2s infinite',
  },
  chatWindow: {
    position: 'fixed',
    bottom: '96px',
    right: '24px',
    width: '350px',
    height: '460px',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9999,
    boxShadow: '0 12px 40px rgba(7, 30, 38, 0.2)',
  },
  chatHeader: {
    padding: '16px',
    background: 'linear-gradient(135deg, #0B4F6C 0%, #073549 100%)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  botIconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FAF7F2',
    fontSize: '0.95rem',
    fontWeight: '700',
    fontFamily: "'Outfit', sans-serif",
  },
  headerSubtitle: {
    color: '#018E42',
    fontSize: '0.72rem',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
  },
  chatBody: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    maxWidth: '85%',
  },
  avatarMini: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#E5ECF0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  msgBubble: {
    padding: '10px 14px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
    position: 'relative',
  },
  msgTime: {
    fontSize: '0.62rem',
    opacity: 0.65,
    display: 'block',
    textAlign: 'right',
    marginTop: '4px',
  },
  optionsWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingLeft: '28px',
    marginTop: '6px',
    animation: 'fadeIn 0.5s ease',
  },
  optionBtn: {
    padding: '8px 12px',
    borderRadius: '20px',
    border: '1px solid #0B4F6C',
    backgroundColor: 'transparent',
    color: '#0B4F6C',
    fontSize: '0.8rem',
    fontWeight: '600',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  optionBtnDanger: {
    padding: '8px 12px',
    borderRadius: '20px',
    border: '1px solid #D95D39',
    backgroundColor: 'rgba(217, 93, 57, 0.05)',
    color: '#D95D39',
    fontSize: '0.8rem',
    fontWeight: '600',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  subOptionBtn: {
    padding: '8px 12px',
    borderRadius: '20px',
    border: '1px solid #E5ECF0',
    backgroundColor: '#FAF7F2',
    color: '#12252C',
    fontSize: '0.8rem',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  }
};

// Add standard keyframe CSS dynamically for pulsing badge and float
const botStyleCss = `
.bot-breath-anim {
  animation: breath 2.5s ease-in-out infinite;
}
@keyframes breath {
  0% { transform: scale(1); }
  50% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
@keyframes pulse {
  0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(217, 93, 57, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(217, 93, 57, 0); }
  100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(217, 93, 57, 0); }
}
`;
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(botStyleCss));
  document.head.appendChild(style);
}
