const fs = require('fs');
let content = fs.readFileSync('src/portals/GuidePortal.jsx', 'utf8');

if (!content.includes('updateGuideLocation')) {
  content = content.replace(
    "import { listenToTour, listenToCities, updateTourResource } from '../services/firebase';",
    "import { listenToTour, listenToCities, updateTourResource, updateGuideLocation } from '../services/firebase';"
  );
}

const watcherBlock = `  // HTML5 Geolocation Watcher for Guide
  useEffect(() => {
    if (!tourData) return;
    
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await updateGuideLocation(activeTourCode, latitude, longitude);
        },
        (error) => {
          console.error("GPS Error:", error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [tourData, activeTourCode]);`;

if (!content.includes('HTML5 Geolocation Watcher for Guide')) {
  // insert it after the Subscribe to tour changes reactively block
  const anchor = `  // Subscribe to cities info`;
  content = content.replace(anchor, watcherBlock + "\n\n" + anchor);
}

fs.writeFileSync('src/portals/GuidePortal.jsx', content);
console.log('GuidePortal.jsx updated successfully for real GPS');
