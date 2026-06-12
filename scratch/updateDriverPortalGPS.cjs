const fs = require('fs');
let content = fs.readFileSync('src/portals/DriverPortal.jsx', 'utf8');

// 1. Remove Simulation and add HTML5 Geolocation Watcher
const gpsSimulationBlock = `  // GPS Coordinator Shift Simulation
  useEffect(() => {
    if (!isSimulating || !tourData) return;
    const currentCity = tourData.itinerary?.[0]?.city || "Agra";
    const baseCoords = getCityCoords(currentCity);

    let step = 0;
    const interval = setInterval(async () => {
      step += 0.0003;
      const nextLat = baseCoords.lat + Math.sin(step) * 0.004;
      const nextLng = baseCoords.lng + Math.cos(step) * 0.004;
      setCoords({ lat: nextLat, lng: nextLng });
      await updateDriverLocation(activeTourCode, nextLat, nextLng);
    }, 1800);

    return () => clearInterval(interval);
  }, [isSimulating, tourData, activeTourCode]);`;

const realGpsBlock = `  // HTML5 Geolocation Watcher
  useEffect(() => {
    if (!isSimulating || !tourData) return;
    
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        await updateDriverLocation(activeTourCode, latitude, longitude);
      },
      (error) => {
        console.error("GPS Error:", error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulating, tourData, activeTourCode]);`;

content = content.replace(gpsSimulationBlock, realGpsBlock);

// Replace toggleSimulation logic to just use current coords if needed or just start watch
const toggleSimOld = `  const toggleSimulation = async () => {
    if (isSimulating) {
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      await updateDriverLocation(activeTourCode, coords.lat, coords.lng);
    }
  };`;
const toggleSimNew = `  const toggleSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await updateDriverLocation(activeTourCode, pos.coords.latitude, pos.coords.longitude);
        });
      }
    }
  };`;
content = content.replace(toggleSimOld, toggleSimNew);

// 2. Add handleUndoArrived
const handleMarkArrivedBlock = `  const handleMarkArrived = async (dayIdx) => {
    const arrivalTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const arrivalDate = new Date().toISOString();
    await markDayArrived(activeTourCode, dayIdx);
    try {
      await updateTourResource(activeTourCode, \`itinerary/\${dayIdx}/arrivedAt\`, arrivalTime);
      await updateTourResource(activeTourCode, \`itinerary/\${dayIdx}/arrivedTimestamp\`, arrivalDate);
    } catch (e) {
      // Fallback
    }
  };`;
const handleMarkArrivedNew = `  const handleMarkArrived = async (dayIdx) => {
    const arrivalTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const arrivalDate = new Date().toISOString();
    await markDayArrived(activeTourCode, dayIdx);
    try {
      await updateTourResource(activeTourCode, \`itinerary/\${dayIdx}/arrivedAt\`, arrivalTime);
      await updateTourResource(activeTourCode, \`itinerary/\${dayIdx}/arrivedTimestamp\`, arrivalDate);
    } catch (e) { }
  };

  const handleUndoArrived = async (dayIdx) => {
    try {
      await updateTourResource(activeTourCode, \`itinerary/\${dayIdx}/arrived\`, false);
      await updateTourResource(activeTourCode, \`itinerary/\${dayIdx}/arrivedAt\`, null);
      await updateTourResource(activeTourCode, \`itinerary/\${dayIdx}/arrivedTimestamp\`, null);
    } catch (e) { }
  };`;
content = content.replace(handleMarkArrivedBlock, handleMarkArrivedNew);

// UI for arrived badge undo
const arrivedBadgeOld = `<div style={styles.arrivedBadge}>
                          <CheckCircle2 size={14} /> Arrived {currentDay.arrivedAt && \`at \${currentDay.arrivedAt}\`}
                        </div>`;
const arrivedBadgeNew = `<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={styles.arrivedBadge}>
                            <CheckCircle2 size={14} /> Arrived {currentDay.arrivedAt && \`at \${currentDay.arrivedAt}\`}
                          </div>
                          <button onClick={() => handleUndoArrived(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>Undo</button>
                        </div>`;
content = content.replace(arrivedBadgeOld, arrivedBadgeNew);

// 3. UI for activity status undo
const activityStatusButtonsOld = `{currentStatus === 'completed' && (
                              <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <CheckCircle2 size={12} /> {language === 'KO' ? '?? ???' : 'Task Completed'}
                              </span>
                            )}`;
const activityStatusButtonsNew = `{currentStatus === 'completed' && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle2 size={12} /> {language === 'KO' ? '작업 완료' : 'Task Completed'}
                                </span>
                                <button onClick={() => handleUpdateActivityStatus(realActiveDayIdx, idx, 'enroute')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline' }}>Undo</button>
                              </div>
                            )}`;
content = content.replace(activityStatusButtonsOld, activityStatusButtonsNew);

const enrouteUndoOld = `<button
                                onClick={() => handleUpdateActivityStatus(realActiveDayIdx, idx, 'completed')}
                                style={{ padding: '4px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Check size={10} /> {language === 'KO' ? '?? ??' : 'Mark Arrived'}
                              </button>`;
const enrouteUndoNew = `<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => handleUpdateActivityStatus(realActiveDayIdx, idx, 'completed')}
                                style={{ padding: '4px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                <Check size={10} /> {language === 'KO' ? '도착' : 'Mark Arrived'}
                              </button>
                              <button onClick={() => handleUpdateActivityStatus(realActiveDayIdx, idx, 'scheduled')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline' }}>Undo</button>
                            </div>`;
content = content.replace(enrouteUndoOld, enrouteUndoNew);

fs.writeFileSync('src/portals/DriverPortal.jsx', content);
console.log('DriverPortal.jsx updated successfully for real GPS and undo features.');
