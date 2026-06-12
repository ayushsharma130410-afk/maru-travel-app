import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, update, get, remove, serverTimestamp, onDisconnect } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { SEED_CITIES, SEED_HOTELS, SEED_ACTIVITIES, SEED_GUIDES, SEED_DRIVERS } from './cityData';

const firebaseConfig = {
  apiKey: "AIzaSyA5I8W9v0CIwA0_QNJEF1-P7aPrn_Kdv9E",
  authDomain: "yatrika-47a16.firebaseapp.com",
  databaseURL: "https://yatrika-47a16-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "yatrika-47a16",
  storageBucket: "yatrika-47a16.firebasestorage.app",
  messagingSenderId: "977399117603",
  appId: "1:977399117603:web:9d93881bb3a69d0a2b3e96",
  measurementId: "G-VMGYJX724V"
};

let app;
let database;
let isFirebaseAvailable = false;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  isFirebaseAvailable = true;
  console.log("Firebase Realtime Database initialized successfully.");
} catch (error) {
  console.warn("Firebase initialization failed. Falling back to LocalStorage:", error);
}

// Google Auth Setup
const auth = isFirebaseAvailable ? getAuth(app) : null;
const googleProvider = isFirebaseAvailable ? new GoogleAuthProvider() : null;

const ALLOWED_OPERATOR_EMAIL = 'reshu.ranjan@gmail.com';

export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    return { success: false, error: 'Firebase not available' };
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const email = result.user.email;
    if (email.toLowerCase() === ALLOWED_OPERATOR_EMAIL) {
      return { success: true, user: result.user };
    } else {
      await signOut(auth);
      return { success: false, error: `Access denied. Only ${ALLOWED_OPERATOR_EMAIL} is authorized as Operator.` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signOutGoogle = async () => {
  if (auth) await signOut(auth);
};

// LocalStorage Helper
const localDB = {
  get: (key) => JSON.parse(localStorage.getItem(`maru_${key}`)) || null,
  set: (key, value) => {
    localStorage.setItem(`maru_${key}`, JSON.stringify(value));
    window.dispatchEvent(new Event('maru_db_change'));
  },
  update: (key, callback) => {
    const data = localDB.get(key) || [];
    const updated = callback(data);
    localDB.set(key, updated);
  }
};

// Seed Local Database if empty
const seedLocalDBIfEmpty = () => {
  if (!localStorage.getItem('maru_cities')) {
    localDB.set('cities', SEED_CITIES.reduce((acc, c, idx) => ({ ...acc, [`c_${idx}`]: { id: `c_${idx}`, ...c } }), {}));
    localDB.set('hotels', SEED_HOTELS.reduce((acc, h, idx) => ({ ...acc, [`h_${idx}`]: { id: `h_${idx}`, ...h } }), {}));
    localDB.set('activities', SEED_ACTIVITIES.reduce((acc, a, idx) => ({ ...acc, [`a_${idx}`]: { id: `a_${idx}`, ...a } }), {}));
    localDB.set('guides', SEED_GUIDES.reduce((acc, g, idx) => ({ ...acc, [`g_${idx}`]: { id: `g_${idx}`, ...g } }), {}));
    localDB.set('drivers', SEED_DRIVERS.reduce((acc, d, idx) => ({ ...acc, [`d_${idx}`]: { id: `d_${idx}`, ...d } }), {}));
    localDB.set('tours', {});
    localDB.set('complaints', []);
    localDB.set('locations', {});
    console.log("LocalStorage database seeded successfully.");
  }
};
seedLocalDBIfEmpty();

// Database Seeding
export const seedDatabase = async () => {
  if (!isFirebaseAvailable) return;
  try {
    const snapshot = await get(ref(database, 'cities'));
    if (!snapshot.exists()) {
      console.log("Seeding Firebase database...");
      // Seed cities
      const citiesRef = ref(database, 'cities');
      const citiesObj = SEED_CITIES.reduce((acc, c, idx) => {
        acc[`c_${idx}`] = { id: `c_${idx}`, ...c };
        return acc;
      }, {});
      await set(citiesRef, citiesObj);

      // Seed hotels
      const hotelsRef = ref(database, 'hotels');
      const hotelsObj = SEED_HOTELS.reduce((acc, h, idx) => {
        acc[`h_${idx}`] = { id: `h_${idx}`, ...h };
        return acc;
      }, {});
      await set(hotelsRef, hotelsObj);

      // Seed activities
      const activitiesRef = ref(database, 'activities');
      const activitiesObj = SEED_ACTIVITIES.reduce((acc, a, idx) => {
        acc[`a_${idx}`] = { id: `a_${idx}`, ...a };
        return acc;
      }, {});
      await set(activitiesRef, activitiesObj);

      // Seed guides
      const guidesRef = ref(database, 'guides');
      const guidesObj = SEED_GUIDES.reduce((acc, g, idx) => {
        acc[`g_${idx}`] = { id: `g_${idx}`, ...g };
        return acc;
      }, {});
      await set(guidesRef, guidesObj);

      // Seed drivers
      const driversRef = ref(database, 'drivers');
      const driversObj = SEED_DRIVERS.reduce((acc, d, idx) => {
        acc[`d_${idx}`] = { id: `d_${idx}`, ...d };
        return acc;
      }, {});
      await set(driversRef, driversObj);

      console.log("Firebase Database seeded successfully.");
    }
  } catch (error) {
    console.error("Firebase seeding failed:", error);
  }
};

// Execute seeding check on load
seedDatabase();

// Helper to convert Firebase Object of Objects to Array with IDs
const toArray = (obj) => {
  if (!obj) return [];
  return Object.entries(obj).map(([key, val]) => ({
    id: key,
    ...val
  }));
};

// ------------------------------------------
// CITIES CRUD
// ------------------------------------------
export const listenToCities = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'cities');
    return onValue(dbRef, (snapshot) => {
      callback(toArray(snapshot.val()));
    }, () => {
      // Fallback
      callback(toArray(localDB.get('cities')));
    });
  } else {
    const handleLocalUpdate = () => callback(toArray(localDB.get('cities')));
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const addCity = async (cityData) => {
  const id = `c_${Date.now()}`;
  const newCity = { id, ...cityData };
  if (isFirebaseAvailable) {
    await set(ref(database, `cities/${id}`), newCity);
  } else {
    localDB.update('cities', (cities) => ({ ...cities, [id]: newCity }));
  }
  return { success: true, id };
};

export const updateCity = async (cityId, data) => {
  if (isFirebaseAvailable) {
    await update(ref(database, `cities/${cityId}`), data);
  } else {
    localDB.update('cities', (cities) => {
      if (cities[cityId]) {
        cities[cityId] = { ...cities[cityId], ...data };
      }
      return cities;
    });
  }
  return { success: true };
};

export const deleteCity = async (cityId) => {
  if (isFirebaseAvailable) {
    await remove(ref(database, `cities/${cityId}`));
  } else {
    localDB.update('cities', (cities) => {
      delete cities[cityId];
      return cities;
    });
  }
  return { success: true };
};

// ------------------------------------------
// HOTELS CRUD
// ------------------------------------------
export const listenToHotels = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'hotels');
    return onValue(dbRef, (snapshot) => {
      callback(toArray(snapshot.val()));
    }, () => {
      callback(toArray(localDB.get('hotels')));
    });
  } else {
    const handleLocalUpdate = () => callback(toArray(localDB.get('hotels')));
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const getHotelsByCity = (cityName, callback) => {
  return listenToHotels((hotels) => {
    callback(hotels.filter(h => h.city === cityName));
  });
};

export const addHotel = async (hotelData) => {
  const id = `h_${Date.now()}`;
  const newHotel = { id, ...hotelData };
  if (isFirebaseAvailable) {
    await set(ref(database, `hotels/${id}`), newHotel);
  } else {
    localDB.update('hotels', (hotels) => ({ ...hotels, [id]: newHotel }));
  }
  return { success: true, id };
};

export const deleteHotel = async (hotelId) => {
  if (isFirebaseAvailable) {
    await remove(ref(database, `hotels/${hotelId}`));
  } else {
    localDB.update('hotels', (hotels) => {
      delete hotels[hotelId];
      return hotels;
    });
  }
  return { success: true };
};

// ------------------------------------------
// ACTIVITIES CRUD
// ------------------------------------------
export const listenToActivities = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'activities');
    return onValue(dbRef, (snapshot) => {
      callback(toArray(snapshot.val()));
    }, () => {
      callback(toArray(localDB.get('activities')));
    });
  } else {
    const handleLocalUpdate = () => callback(toArray(localDB.get('activities')));
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const getActivitiesByCity = (cityName, callback) => {
  return listenToActivities((activities) => {
    callback(activities.filter(a => a.city === cityName));
  });
};

export const addActivity = async (activityData) => {
  const id = `a_${Date.now()}`;
  const newActivity = { id, ...activityData };
  if (isFirebaseAvailable) {
    await set(ref(database, `activities/${id}`), newActivity);
  } else {
    localDB.update('activities', (activities) => ({ ...activities, [id]: newActivity }));
  }
  return { success: true, id };
};

export const deleteActivity = async (activityId) => {
  if (isFirebaseAvailable) {
    await remove(ref(database, `activities/${activityId}`));
  } else {
    localDB.update('activities', (activities) => {
      delete activities[activityId];
      return activities;
    });
  }
  return { success: true };
};

// ------------------------------------------
// GUIDES CRUD
// ------------------------------------------
export const listenToGuides = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'guides');
    return onValue(dbRef, (snapshot) => {
      callback(toArray(snapshot.val()));
    }, () => {
      callback(toArray(localDB.get('guides')));
    });
  } else {
    const handleLocalUpdate = () => callback(toArray(localDB.get('guides')));
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const addGuide = async (guideData) => {
  const id = `g_${Date.now()}`;
  const newGuide = { id, ...guideData };
  if (isFirebaseAvailable) {
    await set(ref(database, `guides/${id}`), newGuide);
  } else {
    localDB.update('guides', (guides) => ({ ...guides, [id]: newGuide }));
  }
  return { success: true, id };
};

export const deleteGuide = async (guideId) => {
  if (isFirebaseAvailable) {
    await remove(ref(database, `guides/${guideId}`));
  } else {
    localDB.update('guides', (guides) => {
      delete guides[guideId];
      return guides;
    });
  }
  return { success: true };
};

export const getGuideBusyStatus = (guideName, callback) => {
  return listenToAllTours((tours) => {
    const busyDates = [];
    tours.forEach(tour => {
      if (tour.guideName === guideName) {
        busyDates.push({
          tourCode: tour.tourCode,
          startDate: tour.startDate,
          endDate: tour.endDate
        });
      }
    });
    callback(busyDates);
  });
};

// ------------------------------------------
// DRIVERS CRUD
// ------------------------------------------
export const listenToDrivers = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'drivers');
    return onValue(dbRef, (snapshot) => {
      callback(toArray(snapshot.val()));
    }, () => {
      callback(toArray(localDB.get('drivers')));
    });
  } else {
    const handleLocalUpdate = () => callback(toArray(localDB.get('drivers')));
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const addDriver = async (driverData) => {
  const id = `d_${Date.now()}`;
  const newDriver = { id, ...driverData };
  if (isFirebaseAvailable) {
    await set(ref(database, `drivers/${id}`), newDriver);
  } else {
    localDB.update('drivers', (drivers) => ({ ...drivers, [id]: newDriver }));
  }
  return { success: true, id };
};

export const deleteDriver = async (driverId) => {
  if (isFirebaseAvailable) {
    await remove(ref(database, `drivers/${driverId}`));
  } else {
    localDB.update('drivers', (drivers) => {
      delete drivers[driverId];
      return drivers;
    });
  }
  return { success: true };
};

// ------------------------------------------
// TOURS CRUD
// ------------------------------------------
export const publishTour = async (tourData) => {
  const code = tourData.tourCode;
  if (isFirebaseAvailable) {
    await set(ref(database, `tours/${code}`), tourData);
  } else {
    localDB.update('tours', (tours) => ({ ...tours, [code]: tourData }));
  }
  return { success: true };
};

export const listenToTour = (tourCode, callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, `tours/${tourCode}`);
    return onValue(dbRef, (snapshot) => {
      callback(snapshot.val());
    }, () => {
      const tours = localDB.get('tours') || {};
      callback(tours[tourCode] || null);
    });
  } else {
    const handleLocalUpdate = () => {
      const tours = localDB.get('tours') || {};
      callback(tours[tourCode] || null);
    };
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const listenToAllTours = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'tours');
    return onValue(dbRef, (snapshot) => {
      callback(toArray(snapshot.val()));
    }, () => {
      callback(toArray(localDB.get('tours')));
    });
  } else {
    const handleLocalUpdate = () => callback(toArray(localDB.get('tours')));
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const updateTourResource = async (tourCode, field, value) => {
  if (isFirebaseAvailable) {
    await update(ref(database, `tours/${tourCode}`), { [field]: value });
  } else {
    localDB.update('tours', (tours) => {
      if (tours[tourCode]) {
        tours[tourCode][field] = value;
      }
      return tours;
    });
  }
  return { success: true };
};export const updateTour = async (tourCode, tourData) => {
  if (isFirebaseAvailable) {
    await set(ref(database, `tours/${tourCode}`), tourData);
  } else {
    localDB.update('tours', (tours) => {
      tours[tourCode] = tourData;
      return tours;
    });
  }
  return { success: true };
};

export const updateTourDay = async (tourCode, dayIndex, dayData) => {
  if (isFirebaseAvailable) {
    await update(ref(database, `tours/${tourCode}/itinerary/${dayIndex}`), dayData);
  } else {
    localDB.update('tours', (tours) => {
      if (tours[tourCode] && tours[tourCode].itinerary && tours[tourCode].itinerary[dayIndex]) {
        tours[tourCode].itinerary[dayIndex] = { ...tours[tourCode].itinerary[dayIndex], ...dayData };
      }
      return tours;
    });
  }
  return { success: true };
};

export const markDayArrived = async (tourCode, dayIndex) => {
  if (isFirebaseAvailable) {
    await update(ref(database, `tours/${tourCode}/itinerary/${dayIndex}`), { arrived: true });
  } else {
    localDB.update('tours', (tours) => {
      if (tours[tourCode] && tours[tourCode].itinerary && tours[tourCode].itinerary[dayIndex]) {
        tours[tourCode].itinerary[dayIndex].arrived = true;
      }
      return tours;
    });
  }
  return { success: true };
};

// ------------------------------------------
// COMPLAINTS
// ------------------------------------------
export const submitComplaint = async (complaint) => {
  const newComplaint = { id: `comp_${Date.now()}`, ...complaint, timestamp: new Date().toISOString() };
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'complaints');
    await push(dbRef, newComplaint);
  } else {
    localDB.update('complaints', (comps) => [...comps, newComplaint]);
  }
  return { success: true };
};

export const listenToComplaints = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'complaints');
    return onValue(dbRef, (snapshot) => {
      callback(toArray(snapshot.val()));
    }, () => {
      callback(localDB.get('complaints') || []);
    });
  } else {
    const handleLocalUpdate = () => callback(localDB.get('complaints') || []);
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

// ------------------------------------------
// GPS LOCATION SERVICES
// ------------------------------------------
const buildLocationPayload = (location) => {
  const latitude = location.latitude;
  const longitude = location.longitude;
  const now = Date.now();
  return {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    accuracy: location.accuracy ?? null,
    bearing: location.bearing ?? null,
    speed: location.speed ?? null,
    altitude: location.altitude ?? null,
    simulated: location.simulated === true,
    trackingActive: true,
    offlineAt: null,
    timestamp: location.time ?? now,
    clientWrittenAt: now,
    updatedAt: isFirebaseAvailable ? serverTimestamp() : now,
  };
};

const setTrackingOffline = async (tourCode, role) => {
  const payload = {
    trackingActive: false,
    offlineAt: isFirebaseAvailable ? serverTimestamp() : Date.now(),
    updatedAt: isFirebaseAvailable ? serverTimestamp() : Date.now(),
  };
  if (isFirebaseAvailable) {
    const trackingRef = ref(database, `locations/${tourCode}/${role}`);
    try {
      await onDisconnect(trackingRef).cancel();
    } catch (err) {
      console.warn("Failed to cancel onDisconnect registration:", err);
    }
    await update(trackingRef, payload);
  } else {
    localDB.update('locations', (locs) => ({
      ...locs,
      [tourCode]: {
        ...(locs[tourCode] || {}),
        [role]: { ...(locs[tourCode]?.[role] || {}), ...payload },
      },
    }));
  }
};

export const setDriverTrackingOffline = (tourCode) => setTrackingOffline(tourCode, 'driver');
export const setGuideTrackingOffline = (tourCode) => setTrackingOffline(tourCode, 'guide');

export const updateDriverLocation = async (tourCode, locationOrLat, lng) => {
  const location = typeof locationOrLat === 'object'
    ? locationOrLat
    : { latitude: locationOrLat, longitude: lng, time: Date.now() };
  const payload = buildLocationPayload(location);
  if (isFirebaseAvailable) {
    const trackingRef = ref(database, `locations/${tourCode}/driver`);
    await update(trackingRef, payload);
    onDisconnect(trackingRef).update({
      trackingActive: false,
      offlineAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    localDB.update('locations', (locs) => ({
      ...locs,
      [tourCode]: { ...(locs[tourCode] || {}), driver: payload }
    }));
  }
  return { success: true };
};

export const updateGuideLocation = async (tourCode, locationOrLat, lng) => {
  const location = typeof locationOrLat === 'object'
    ? locationOrLat
    : { latitude: locationOrLat, longitude: lng, time: Date.now() };
  const payload = buildLocationPayload(location);
  if (isFirebaseAvailable) {
    const trackingRef = ref(database, `locations/${tourCode}/guide`);
    await update(trackingRef, payload);
    onDisconnect(trackingRef).update({
      trackingActive: false,
      offlineAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    localDB.update('locations', (locs) => ({
      ...locs,
      [tourCode]: { ...(locs[tourCode] || {}), guide: payload }
    }));
  }
  return { success: true };
};

export const listenToLocations = (tourCode, callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, `locations/${tourCode}`);
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
    const dbRef = ref(database, `locations`);
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
};

// ------------------------------------------
// RESTAURANTS CRUD
// ------------------------------------------
export const listenToRestaurants = (callback) => {
  if (isFirebaseAvailable) {
    const dbRef = ref(database, 'restaurants');
    return onValue(dbRef, (snapshot) => {
      callback(toArray(snapshot.val()));
    }, () => {
      callback(toArray(localDB.get('restaurants')));
    });
  } else {
    const handleLocalUpdate = () => callback(toArray(localDB.get('restaurants')));
    window.addEventListener('maru_db_change', handleLocalUpdate);
    handleLocalUpdate();
    return () => window.removeEventListener('maru_db_change', handleLocalUpdate);
  }
};

export const addRestaurant = async (restaurantData) => {
  const id = `r_${Date.now()}`;
  const newRestaurant = { id, ...restaurantData };
  if (isFirebaseAvailable) {
    await set(ref(database, `restaurants/${id}`), newRestaurant);
  } else {
    localDB.update('restaurants', (restaurants) => ({ ...restaurants, [id]: newRestaurant }));
  }
  return { success: true, id };
};

export const deleteRestaurant = async (restaurantId) => {
  if (isFirebaseAvailable) {
    await remove(ref(database, `restaurants/${restaurantId}`));
  } else {
    localDB.update('restaurants', (restaurants) => {
      delete restaurants[restaurantId];
      return restaurants;
    });
  }
  return { success: true };
};

// ------------------------------------------
// BACKWARD COMPATIBILITY ALIASES
// ------------------------------------------
export const getGuides = listenToGuides;
export const getDrivers = listenToDrivers;
export const getHotels = listenToHotels;
export const getActivities = listenToActivities;
