const fs = require('fs');
let content = fs.readFileSync('src/services/firebase.js', 'utf8');

const targetStr = `export const updateDriverLocation = async (tourCode, lat, lng) => {
  const loc = { lat, lng, timestamp: new Date().toISOString() };
  if (isFirebaseAvailable) {
    await set(ref(database, \`locations/\${tourCode}\`), loc);
  } else {
    localDB.update('locations', (locs) => ({ ...locs, [tourCode]: loc }));
  }
  return { success: true };
};

export const listenToDriverLocation = (tourCode, callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, \`locations/\${tourCode}\`);
    return onValue(dbRef, (snapshot) => {
      callback(snapshot.val());
    }, () => {
      const locs = localDB.get('locations') || {};
      callback(locs[tourCode] || null);
    });
  } else {
    const handleLocalUpdate = () => {
      const locs = localDB.get('locations') || {};
      callback(locs[tourCode] || null);
    };
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};`;

const replacement = `export const updateDriverLocation = async (tourCode, lat, lng) => {
  const loc = { lat, lng, timestamp: new Date().toISOString() };
  if (isFirebaseAvailable) {
    await set(ref(database, \`locations/\${tourCode}/driver\`), loc);
  } else {
    localDB.update('locations', (locs) => ({
      ...locs,
      [tourCode]: { ...(locs[tourCode] || {}), driver: loc }
    }));
  }
  return { success: true };
};

export const updateGuideLocation = async (tourCode, lat, lng) => {
  const loc = { lat, lng, timestamp: new Date().toISOString() };
  if (isFirebaseAvailable) {
    await set(ref(database, \`locations/\${tourCode}/guide\`), loc);
  } else {
    localDB.update('locations', (locs) => ({
      ...locs,
      [tourCode]: { ...(locs[tourCode] || {}), guide: loc }
    }));
  }
  return { success: true };
};

export const listenToLocations = (tourCode, callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, \`locations/\${tourCode}\`);
    return onValue(dbRef, (snapshot) => {
      callback(snapshot.val() || { driver: null, guide: null });
    }, () => {
      const locs = localDB.get('locations') || {};
      callback(locs[tourCode] || { driver: null, guide: null });
    });
  } else {
    const handleLocalUpdate = () => {
      const locs = localDB.get('locations') || {};
      callback(locs[tourCode] || { driver: null, guide: null });
    };
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const listenToAllLocations = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, \`locations\`);
    return onValue(dbRef, (snapshot) => {
      callback(snapshot.val() || {});
    }, () => {
      callback(localDB.get('locations') || {});
    });
  } else {
    const handleLocalUpdate = () => {
      callback(localDB.get('locations') || {});
    };
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync('src/services/firebase.js', content);
  console.log("firebase.js updated successfully");
} else {
  console.log("Could not find the target string in firebase.js");
}
