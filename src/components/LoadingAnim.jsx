import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function LoadingAnim({ onFinished }) {
  const [fade, setFade] = useState(false);
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
    // Explicitly play videos to ensure mobile browsers kick off the playback
    if (foregroundVideoRef.current) {
      foregroundVideoRef.current.play().catch(() => {});
    }
    if (backgroundVideoRef.current) {
      backgroundVideoRef.current.play().catch(() => {});
    }

    // Smoothly fade in the video shortly after mounting
    const fadeInTimer = setTimeout(() => {
      setVideoOpacity(1);
    }, 150);

    // Robust fallback: after 6 seconds, transition to the app automatically
    const fallbackTimer = setTimeout(() => {
      handleVideoEnded();
    }, 6000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fallbackTimer);
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
          transform: 'scale(1.15)', // Scale slightly to hide raw edges from blur filter
          opacity: videoOpacity,
          transition: 'opacity 1s ease-in-out',
          pointerEvents: 'none',
        }}
      />

      {/* Main Crisp Foreground Video (Contains entire landscape frame, uncropped, centered) */}
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
          zIndex: 1,
        }}
      />
    </div>
  );
}

