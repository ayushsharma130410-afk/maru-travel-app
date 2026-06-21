import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function LoadingAnim({ onFinished }) {
  const [fade, setFade] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const foregroundVideoRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const hasTransitioned = useRef(false);

  const handleVideoEnded = useCallback(() => {
    if (hasTransitioned.current) return;
    hasTransitioned.current = true;
    setFade(true);
    setTimeout(() => {
      if (onFinished) onFinished();
    }, 850);
  }, [onFinished]);

  useEffect(() => {
    const fg = foregroundVideoRef.current;
    const bg = backgroundVideoRef.current;

    // When video has enough data to play, show it
    const onCanPlay = () => {
      setVideoReady(true);
      setVideoOpacity(1);
    };

    if (fg) {
      fg.addEventListener('canplaythrough', onCanPlay);
      fg.play().catch(() => {});
    }
    if (bg) {
      bg.play().catch(() => {});
    }

    // If video loads fast (cached), check immediately
    if (fg && fg.readyState >= 3) {
      onCanPlay();
    }

    // Fallback: after 4 seconds, transition to app regardless
    const fallbackTimer = setTimeout(() => {
      handleVideoEnded();
    }, 4000);

    return () => {
      clearTimeout(fallbackTimer);
      if (fg) fg.removeEventListener('canplaythrough', onCanPlay);
    };
  }, [handleVideoEnded]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: '#060B13',
      zIndex: 99999,
      overflow: 'hidden',
      opacity: fade ? 0 : 1,
      transition: 'opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
      pointerEvents: fade ? 'none' : 'auto',
    }}>

      {/* Static branded fallback — always visible behind the video */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 0,
        background: 'radial-gradient(ellipse at center, #1a2a3a 0%, #060B13 70%)',
      }}>
        <img
          src="/maru_logo_clean.png"
          alt="Maru Travel"
          style={{
            width: '200px',
            height: 'auto',
            marginBottom: '24px',
            opacity: videoReady ? 0 : 1,
            transition: 'opacity 0.6s ease',
          }}
        />
        {!videoReady && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '24px',
              height: '3px',
              borderRadius: '3px',
              background: 'linear-gradient(90deg, transparent, rgba(26, 138, 125, 0.8), transparent)',
              animation: 'shimmerBar 1.5s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '3px',
              textTransform: 'uppercase',
            }}>
              Loading
            </span>
            <div style={{
              width: '24px',
              height: '3px',
              borderRadius: '3px',
              background: 'linear-gradient(90deg, transparent, rgba(26, 138, 125, 0.8), transparent)',
              animation: 'shimmerBar 1.5s ease-in-out infinite reverse',
            }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmerBar {
          0%, 100% { opacity: 0.2; transform: scaleX(0.5); }
          50% { opacity: 1; transform: scaleX(1.5); }
        }
      `}</style>

      {/* Blurred Ambient Background Video (Covers full screen, no black bars) */}
      <video
        ref={backgroundVideoRef}
        src="/entry_animation.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(30px) brightness(0.4)',
          transform: 'scale(1.15)',
          opacity: videoOpacity,
          transition: 'opacity 1s ease-in-out',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Main Crisp Foreground Video */}
      <video
        ref={foregroundVideoRef}
        src="/entry_animation.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleVideoEnded}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: videoOpacity,
          transition: 'opacity 1s ease-in-out',
          zIndex: 2,
        }}
      />
    </div>
  );
}

