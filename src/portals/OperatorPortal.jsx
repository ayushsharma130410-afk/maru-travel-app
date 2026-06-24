import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  listenToCities, addCity, deleteCity,
  listenToHotels, addHotel, deleteHotel,
  listenToActivities, addActivity, deleteActivity,
  listenToGuides, addGuide, deleteGuide, getGuideBusyStatus,
  listenToDrivers, addDriver, deleteDriver,
  publishTour, listenToAllTours, updateTourResource, updateTour, deleteTour,
  listenToComplaints, signOutGoogle, listenToAllLocations,
  listenToRestaurants, addRestaurant, deleteRestaurant,
  deleteTourLocationData
} from '../services/firebase';
import { normalizeTrackingLocation, getGpsStatus, formatLocationTime } from '../utils/locationStatus';
import LeafletMap from '../components/LeafletMap';
import GuideTraceMap from '../components/GuideTraceMap';
import { 
  BarChart2, MapPin, Compass, Hotel, Award, Car, Clipboard, 
  Plus, Trash2, Calendar, Users, Phone, Shield, Star, Check, CheckCircle2, Globe, HelpCircle, Printer, UtensilsCrossed, Edit3, Navigation
} from 'lucide-react';

const MEAL_PLAN_OPTIONS = [
  'AP (Breakfast, Lunch & Dinner)',
  'MAP (Breakfast & Dinner / Lunch)',
  'CP (Breakfast Only)',
  'EP (No Meal)'
];

export default function OperatorPortal({ onLogout }) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'cities', 'activities', 'hotels', 'guides', 'drivers', 'restaurants', 'tourBuilder'

  // Master Data
  const [cities, setCities] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [activities, setActivities] = useState([]);
  const [guides, setGuides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [tours, setTours] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [liveLocations, setLiveLocations] = useState({});
  const [selectedTraceTour, setSelectedTraceTour] = useState(null);
  const [locationTick, setLocationTick] = useState(0);

  // Busy states for guides
  const [guideBusyStates, setGuideBusyStates] = useState({});

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  // UI State
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dashboardFilterCity, setDashboardFilterCity] = useState('');
  const [dashboardFilterDutyType, setDashboardFilterDutyType] = useState('');
  const [expandedTourCode, setExpandedTourCode] = useState(null);
  const [printTour, setPrintTour] = useState(null);
  const [editingTour, setEditingTour] = useState(null);
  const [printFormat, setPrintFormat] = useState('short');
  // Hotel Voucher States
  const [voucherDayIndex, setVoucherDayIndex] = useState(0);
  const [voucherGrpName, setVoucherGrpName] = useState('');
  const [voucherFileCode, setVoucherFileCode] = useState('');
  const [voucherRoomType, setVoucherRoomType] = useState('');
  const [voucherRoomNote, setVoucherRoomNote] = useState('Twin should be proper twins with separate beds');
  const [voucherNote, setVoucherNote] = useState('Confirmation No. Awaiting');
  const [voucherCheckInTime, setVoucherCheckInTime] = useState('14:00');
  const [voucherCheckOutTime, setVoucherCheckOutTime] = useState('09:00');
  const [voucherRemarks, setVoucherRemarks] = useState('Please forward your bill to Maru Travel India as per negotiated company rate along with this voucher for settlement. Collect all extras directly from guest.');
  const [voucherIssueDate, setVoucherIssueDate] = useState('');
  const [voucherTelNo, setVoucherTelNo] = useState('+91 9811430044');
  // Dashboard sub-views
  const [dashboardView, setDashboardView] = useState('daily'); // 'daily' | 'range'
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [rangeCityFilter, setRangeCityFilter] = useState('');
  // Master itinerary selection
  const [selectedMasterItinerary, setSelectedMasterItinerary] = useState('');

  // Instant Shift State
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftTour, setShiftTour] = useState(null);
  const [shiftDayIndex, setShiftDayIndex] = useState(null);
  const [shiftFlightDetails, setShiftFlightDetails] = useState('');
  const [shiftMode, setShiftMode] = useState('Train'); // 'Train', 'Car', 'Flight'
  const [shiftTrainNo, setShiftTrainNo] = useState('');
  const [shiftDriver, setShiftDriver] = useState('');
  const [shiftFlightNo, setShiftFlightNo] = useState('');
  const [shiftActionWait, setShiftActionWait] = useState(false);
  const [shiftActionDismiss, setShiftActionDismiss] = useState(false);
  const [shiftActionRoute, setShiftActionRoute] = useState(false);
  // trackingFlight state removed as no longer tracking internally

  // New Entity Forms
  const [newCity, setNewCity] = useState({
    name: '', tagline: '', description: '', bestTime: '', language: '', currency: '', transport: '', emergency: '', imageUrl: '', mapUrl: ''
  });
  const [newActivity, setNewActivity] = useState({
    city: '', title: '', description: '', time: '2 hours', imageUrl: '', mapUrl: ''
  });
  const [newHotel, setNewHotel] = useState({
    city: '', name: '', stars: 5, phone: '', address: '', checkInOut: '2:00 PM → 12:00 PM', imageUrl: '', mapUrl: '',
    amenities: { Pool: true, Spa: true, Restaurant: true, Gym: true, WiFi: true, BarLounge: false, RoomService: false, Laundry: false, Parking: false, AirportShuttle: false }
  });
  const [newGuide, setNewGuide] = useState({ name: '', mobile: '' });
  const [newDriver, setNewDriver] = useState({ name: '', mobile: '', carNumber: '', vehicleType: 'Toyota Innova Crysta (SUV)' });
  const [newRestaurant, setNewRestaurant] = useState({ city: '', name: '', mealType: 'Lunch', cuisine: '', address: '', phone: '', mapUrl: '', imageUrl: '' });

  // Tour Builder State
  const [newTour, setNewTour] = useState({
    tourCode: '', tourName: '', clientName: '', pax: 2, startDate: '', endDate: '', guideName: '', driverName: '', vehicleType: '',
    doubleRooms: 0, twinRooms: 0, singleRooms: 0, tripleRooms: 0
  });
  const [itineraryDays, setItineraryDays] = useState([]);

  // Subscriptions
  useEffect(() => {
    const unsubCities = listenToCities(setCities);
    const unsubHotels = listenToHotels(setHotels);
    const unsubActivities = listenToActivities(setActivities);
    const unsubGuides = listenToGuides(setGuides);
    const unsubDrivers = listenToDrivers(setDrivers);
    const unsubTours = listenToAllTours(setTours);
    const unsubComplaints = listenToComplaints(setComplaints);
    const unsubRestaurants = listenToRestaurants ? listenToRestaurants(setRestaurants) : () => {};
    const unsubLocations = listenToAllLocations(setLiveLocations);

    return () => {
      unsubCities();
      unsubHotels();
      unsubActivities();
      unsubGuides();
      unsubDrivers();
      unsubTours();
      unsubComplaints();
      unsubRestaurants();
      unsubLocations();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setLocationTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  void locationTick;

  // Fetch guide busy statuses when guides or tours change
  useEffect(() => {
    const newGuideBusyStates = {};
    guides.forEach((g) => {
      const busyDates = [];
      tours.forEach(tour => {
        if (tour.guideName === g.name) {
          busyDates.push({
            tourCode: tour.tourCode,
            startDate: tour.startDate,
            endDate: tour.endDate
          });
        }
      });
      newGuideBusyStates[g.name] = busyDates;
    });
    setGuideBusyStates(newGuideBusyStates);
  }, [guides, tours]);

  // Auto-populate Hotel Voucher details when printTour is set
  useEffect(() => {
    if (printTour) {
      // Set default issue date to today
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      setVoucherIssueDate(today);

      // Extract details
      const grp = printTour.tourTitle || printTour.clientName || '';
      setVoucherGrpName(grp);

      // Generate File Code: KR + Month + Year
      let autoFileCode = '';
      if (printTour.startDate) {
        const sd = new Date(printTour.startDate);
        if (!isNaN(sd)) {
          const mm = String(sd.getMonth() + 1).padStart(2, '0');
          const yy = sd.getFullYear();
          autoFileCode = `KR${mm}${yy}`;
        }
      }
      setVoucherFileCode(autoFileCode || (printTour.tourCode ? `MT / ${printTour.tourCode.toUpperCase()}` : ''));

      // Calculate rooms string based on rooms count saved in the tour
      const doubleCount = parseInt(printTour.doubleRooms, 10) || 0;
      const twinCount = parseInt(printTour.twinRooms, 10) || 0;
      const singleCount = parseInt(printTour.singleRooms, 10) || 0;
      const tripleCount = parseInt(printTour.tripleRooms, 10) || 0;
      
      const parts = [];
      if (doubleCount > 0) parts.push(`${String(doubleCount).padStart(2, '0')} Double`);
      if (twinCount > 0) parts.push(`${String(twinCount).padStart(2, '0')} Twin`);
      if (singleCount > 0) parts.push(`${String(singleCount).padStart(2, '0')} Single`);
      if (tripleCount > 0) parts.push(`${String(tripleCount).padStart(2, '0')} Triple`);
      
      let roomsStr = '';
      if (parts.length > 0) {
        const last = parts.pop();
        roomsStr = parts.length > 0 ? `${parts.join(', ')} & ${last}` : last;
        roomsStr += ` Room${(doubleCount + twinCount + singleCount + tripleCount) > 1 ? 's' : ''}`;
      } else {
        // Fallback to pax calculations if no rooms specified
        const pax = printTour.pax || 2;
        const autoRooms = Math.ceil(pax / 2);
        roomsStr = `${String(autoRooms).padStart(2, '0')} Room${autoRooms > 1 ? 's' : ''}`;
      }
      setVoucherRoomType(roomsStr);
      
      // Auto-set the first day index that actually has a hotel assigned!
      if (printTour.itinerary) {
        const firstHotelIdx = printTour.itinerary.findIndex(day => day.hotelName);
        if (firstHotelIdx !== -1) {
          setVoucherDayIndex(firstHotelIdx);
        } else {
          setVoucherDayIndex(0);
        }
      }
    }
  }, [printTour]);

  const formatTourRooms = (tour) => {
    if (!tour) return '';
    const parts = [];
    if (tour.doubleRooms) parts.push(`${tour.doubleRooms} Dbl`);
    if (tour.twinRooms) parts.push(`${tour.twinRooms} Twin`);
    if (tour.singleRooms) parts.push(`${tour.singleRooms} Sgl`);
    if (tour.tripleRooms) parts.push(`${tour.tripleRooms} Trpl`);
    return parts.length > 0 ? `| Rooms: ${parts.join(', ')}` : '';
  };

  // Handle Dynamic Day Generation for Tour Builder based on Start/End Dates
  useEffect(() => {
    if (!newTour.startDate || !newTour.endDate) return;
    const start = new Date(newTour.startDate);
    const end = new Date(newTour.endDate);
    const timeDiff = end.getTime() - start.getTime();
    if (timeDiff < 0) return;

    const daysCount = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
    const newDays = [];

    // Pre-fill existing data if we are just expanding, otherwise default
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

      const existingDay = itineraryDays[i];
      newDays.push({
        day: i + 1,
        dateStr,
        city: existingDay?.city || (cities[0]?.name || ''),
        activities: existingDay?.activities || '',
        activitiesList: existingDay?.activitiesList || [{ time: '09:00 AM', title: '' }],
        hotelName: existingDay?.hotelName || '',
        hotelAddress: existingDay?.hotelAddress || '',
        hotelMapLink: existingDay?.hotelMapLink || '',
        mealPlan: existingDay?.mealPlan || 'Breakfast & Dinner (MAP)',
        transport: existingDay?.transport || 'By Surface',
        flightNo: existingDay?.flightNo || '',
        trainNo: existingDay?.trainNo || '',
        localRestaurant: existingDay?.localRestaurant || '',
        restaurantMealType: existingDay?.restaurantMealType || '',
        restaurantMapUrl: existingDay?.restaurantMapUrl || '',
        coverImage: existingDay?.coverImage || ''
      });
    }
    setItineraryDays(newDays);
  }, [newTour.startDate, newTour.endDate, cities]);

  // Sync Hotel Voucher details from selected itinerary day
  useEffect(() => {
    if (!printTour || printFormat !== 'hotelVoucher') return;
    const day = printTour.itinerary?.[voucherDayIndex];
    if (!day) return;

    const getMMDD = (dStr) => {
      const pts = (dStr || '').split('-');
      if (pts.length === 3) {
        const months = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const m = months[pts[1].toLowerCase().substring(0,3)] || '01';
        return `${m}${pts[0]}`;
      }
      return '0101';
    };

    const dateMMDD = getMMDD(printTour.startDate || '');
    const fullTourTitle = (printTour.tourName || '').toUpperCase();
    setVoucherGrpName(`MT ${fullTourTitle} GROUP ${dateMMDD}`);
    // File code: last 4 chars of tourCode + year of startDate
    const tourCode = (printTour.tourCode || '');
    const last4 = tourCode.slice(-4);
    const publishYear = printTour.startDate ? new Date(printTour.startDate).getFullYear() : new Date().getFullYear();
    setVoucherFileCode(`${last4}${publishYear}/ MT`);
    
    // Build room type string from actual room requirements
    const roomParts = [];
    const dbl = parseInt(printTour.doubleRooms) || 0;
    const twin = parseInt(printTour.twinRooms) || 0;
    const sgl = parseInt(printTour.singleRooms) || 0;
    const trpl = parseInt(printTour.tripleRooms) || 0;
    if (dbl > 0) roomParts.push(`${String(dbl).padStart(2,'0')} Double room${dbl > 1 ? 's' : ''}`);
    if (twin > 0) roomParts.push(`${String(twin).padStart(2,'0')} Twin room${twin > 1 ? 's' : ''}`);
    if (sgl > 0) roomParts.push(`${String(sgl).padStart(2,'0')} Single room${sgl > 1 ? 's' : ''}`);
    if (trpl > 0) roomParts.push(`${String(trpl).padStart(2,'0')} Triple room${trpl > 1 ? 's' : ''}`);
    const roomTypeStr = roomParts.length > 0 ? roomParts.join(' + ') : `${String(Math.ceil((printTour.pax || 2) / 2)).padStart(2,'0')} Twin standard rooms`;
    setVoucherRoomType(roomTypeStr);
    
    // Only add twin note if twin rooms are included
    const hasTwin = twin > 0;
    setVoucherRoomNote(hasTwin ? 'Twin should be proper twins with separate beds' : '');
    setVoucherNote('Confirmation No. Awaiting');
    setVoucherCheckInTime('14:00');
    setVoucherCheckOutTime('09:00');
    setVoucherRemarks('Please forward your bill to Maru Travel India as per negotiated company rate along with this voucher for settlement. Collect all extras directly from guest.');
    
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    setVoucherIssueDate(todayStr);
    setVoucherTelNo('+91 9811430044');
  }, [printTour, printFormat, voucherDayIndex]);

  // Paste image helper
  const handleImagePaste = (e, callback) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          callback(event.target.result); // Base64 data URL
        };
        reader.readAsDataURL(blob);
        e.preventDefault();
        break;
      }
    }
  };

  // Generate unique Tour Code
  const generateTourCode = () => {
    const code = `MT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setNewTour(prev => ({ ...prev, tourCode: code }));
  };

  // Check if a guide is busy on specific dates
  const isGuideBusyOnDates = (guideName, startStr, endStr) => {
    const busyList = guideBusyStates[guideName] || [];
    if (!startStr || !endStr) return false;
    const start = new Date(startStr);
    const end = new Date(endStr);

    return busyList.some(b => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return (start <= bEnd && end >= bStart);
    });
  };

  // Actions
  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCity.name) return;
    await addCity(newCity);
    setNewCity({ name: '', tagline: '', description: '', bestTime: '', language: '', currency: '', transport: '', emergency: '', imageUrl: '', mapUrl: '' });
    setShowAddForm(false);
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!newActivity.title || !newActivity.city) return;
    await addActivity(newActivity);
    setNewActivity({ city: '', title: '', description: '', time: '2-3 hours', imageUrl: '', mapUrl: '' });
    setShowAddForm(false);
  };

  const handleAddHotel = async (e) => {
    e.preventDefault();
    if (!newHotel.name || !newHotel.city) return;
    const amenitiesArr = Object.entries(newHotel.amenities)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    await addHotel({
      ...newHotel,
      amenities: amenitiesArr
    });
    setNewHotel({
      city: '', name: '', stars: 5, phone: '', address: '', checkInOut: '2:00 PM → 12:00 PM', imageUrl: '', mapUrl: '',
      amenities: { Pool: true, Spa: true, Restaurant: true, Gym: true, WiFi: true, BarLounge: false, RoomService: false, Laundry: false, Parking: false, AirportShuttle: false }
    });
    setShowAddForm(false);
  };

  const handleAddGuide = async (e) => {
    e.preventDefault();
    if (!newGuide.name || !newGuide.mobile) return;
    await addGuide(newGuide);
    setNewGuide({ name: '', mobile: '' });
    setShowAddForm(false);
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    if (!newDriver.name || !newDriver.mobile) return;
    await addDriver(newDriver);
    setNewDriver({ name: '', mobile: '', carNumber: '', vehicleType: 'Toyota Innova Crysta (SUV)' });
    setShowAddForm(false);
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    if (!newRestaurant.name || !newRestaurant.city) return;
    await addRestaurant(newRestaurant);
    setNewRestaurant({ city: '', name: '', mealType: 'Lunch', cuisine: '', address: '', phone: '', mapUrl: '', imageUrl: '' });
    setShowAddForm(false);
  };

  const handleDeleteTourItem = async (tourCode) => {
    await deleteTour(tourCode);
  };

  const trackFlight = (flightNo) => {
    if (!flightNo) return;
    // Strip spaces and convert to lowercase for the FlightRadar24 URL
    const cleanFlightNo = flightNo.replace(/\s+/g, '').toLowerCase();
    const url = `https://www.flightradar24.com/data/flights/${cleanFlightNo}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openInstantShift = (tour, dayIndex, flightNo) => {
    setShiftTour(tour);
    setShiftDayIndex(dayIndex);
    setShiftFlightDetails(flightNo || 'Unknown Transport');
    setShiftMode('Train');
    setShiftTrainNo('');
    setShiftDriver(tour.driverName || '');
    setShiftFlightNo('');
    setShiftActionWait(false);
    setShiftActionDismiss(false);
    setShiftActionRoute(false);
    setShiftModalOpen(true);
  };

  const handleInstantShiftSubmit = async () => {
    if (!shiftTour || shiftDayIndex === null) return;
    
    const updatedTour = JSON.parse(JSON.stringify(shiftTour));
    const targetDay = updatedTour.itinerary[shiftDayIndex];
    
    // Update Transport
    if (shiftMode === 'Train') {
      targetDay.transport = 'By Train';
      targetDay.trainNo = shiftTrainNo;
      targetDay.flightNo = '';
    } else if (shiftMode === 'Car') {
      targetDay.transport = 'By Surface';
      targetDay.flightNo = '';
      targetDay.trainNo = '';
      updatedTour.driverName = shiftDriver; // Assign new driver
    } else if (shiftMode === 'Flight') {
      targetDay.transport = 'By Flight';
      targetDay.flightNo = shiftFlightNo;
      targetDay.trainNo = '';
    }
    
    // Add Emergency Instructions
    let instructions = [];
    if (shiftActionWait) instructions.push("Wait at airport/station.");
    if (shiftActionDismiss) instructions.push("You are dismissed from current duty.");
    if (shiftActionRoute) instructions.push("Route to new station/airport immediately.");
    
    updatedTour.emergencyInstructions = instructions.length > 0 ? instructions.join(' | ') : null;
    
    // Versioning
    const currentVersion = parseFloat(updatedTour.version || '1.0');
    updatedTour.version = (currentVersion + 0.1).toFixed(1);
    updatedTour.updateReason = `Updated Due to Transport Shift (${shiftMode})`;
    
    await updateTour(updatedTour.tourCode, updatedTour);
    
    // Close modal
    setShiftModalOpen(false);
    
    // Open Print Preview automatically with new version
    setPrintTour(updatedTour);
  };


  const parseItineraryText = (text, dayData) => {
    const cleanedText = (text || '').replace(/\s+/g, ' ').trim();
    if (!cleanedText) {
      if (dayData.hotelName) {
        return [
          { time: '09:00 AM', title: `Pickup from ${dayData.hotelName}` },
          { time: '05:30 PM', title: `Drop back to ${dayData.hotelName}` }
        ];
      }
      return [
        { time: '09:00 AM', title: 'Start Day Transit' },
        { time: '05:30 PM', title: 'End Day Transit' }
      ];
    }
    
    let temp = '';
    let parenDepth = 0;
    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];
      if (char === '(' || char === '[' || char === '{') parenDepth++;
      if (char === ')' || char === ']' || char === '}') parenDepth--;
      parenDepth = Math.max(0, parenDepth);
      
      if (parenDepth === 0 && (char === ',' || char === '.' || char === ';')) {
        temp += '|||';
      } else {
        temp += char;
      }
    }
    
    const rawSegments = temp.split(/(?:\|\|\||\bthen\b|\bproceed\s+to\b|\bmove\s+to\b|\bgo\s+to\b|\bout\s+by\b)/gi);
    const segments = rawSegments
      .map(s => s.trim())
      .filter(s => s.length > 2 && !s.toLowerCase().startsWith('overnight') && !s.toLowerCase().startsWith('dinner & overnight') && !s.toLowerCase().startsWith('dinner and overnight'));

    let currentTime = 9; 
    const activitiesList = [];

    const formatTime = (hour, min) => {
      let h = hour;
      if (h >= 24) h = h % 24;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    };

    const extractTimeFromString = (str) => {
      const timeMatch = str.match(/(\d{1,2}):(\d{2})\s*(am|pm|hrs|hours)?/i);
      if (timeMatch) {
        let h = parseInt(timeMatch[1]);
        const m = parseInt(timeMatch[2]);
        const marker = (timeMatch[3] || '').toLowerCase();
        if (marker === 'pm' && h < 12) h += 12;
        if (marker === 'am' && h === 12) h = 0;
        if ((marker === 'hrs' || marker === 'hours' || !marker) && h >= 12 && h < 24) {
          // 24h
        } else if (!marker && h < 12) {
          if (h >= 1 && h <= 6) h += 12; 
        }
        return { hour: h, min: m, formatted: formatTime(h, m) };
      }
      
      const milMatch = str.match(/\b(\d{2})(\d{2})\b/);
      if (milMatch) {
        const h = parseInt(milMatch[1]);
        const m = parseInt(milMatch[2]);
        if (h < 24 && m < 60) {
          return { hour: h, min: m, formatted: formatTime(h, m) };
        }
      }
      return null;
    };

    segments.forEach((seg) => {
      const segLower = seg.toLowerCase();
      const extracted = extractTimeFromString(seg);
      let timeStr = null;

      if (extracted) {
        timeStr = extracted.formatted;
        currentTime = extracted.hour + 1;
      }

      let title = seg;
      title = title.replace(/\b\d{1,2}:\d{2}\s*(?:am|pm|hrs|hours)?/gi, '');
      title = title.replace(/\b\d{2}\d{2}(?:\/\d{2}\d{2})?\b/g, '');
      title = title.replace(/^[\s\-\,\&\:\(\)\/]+|[\s\-\,\&\:\(\)\/]+$/g, '').trim();

      if (title.length < 2) return;

      title = title.charAt(0).toUpperCase() + title.slice(1);

      if (!timeStr) {
        if (segLower.includes('breakfast')) {
          timeStr = '08:00 AM';
          currentTime = 9;
        } else if (segLower.includes('lunch')) {
          timeStr = '01:30 PM';
          currentTime = 14;
        } else if (segLower.includes('dinner') || segLower.includes('overnight')) {
          timeStr = '07:30 PM';
          currentTime = 20;
        } else {
          timeStr = formatTime(currentTime, 0);
          currentTime += 2; 
        }
      }

      if (!activitiesList.some(act => act.title.toLowerCase() === title.toLowerCase())) {
        activitiesList.push({ time: timeStr, title });
      }
    });

    if (activitiesList.length === 0) {
      if (dayData.hotelName) {
        activitiesList.push({ time: '09:00 AM', title: `Pickup from ${dayData.hotelName}` });
        activitiesList.push({ time: '05:30 PM', title: `Drop back to ${dayData.hotelName}` });
      } else {
        activitiesList.push({ time: '09:00 AM', title: 'Start Day Transit' });
        activitiesList.push({ time: '05:30 PM', title: 'End Day Transit' });
      }
    } else {
      activitiesList.sort((a, b) => {
        const getVal = (t) => {
          const match = t.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
          if (match) {
            let h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const ap = match[3].toUpperCase();
            if (ap === 'PM' && h !== 12) h += 12;
            if (ap === 'AM' && h === 12) h = 0;
            return h * 60 + m;
          }
          return 0;
        };
        return getVal(a.time) - getVal(b.time);
      });
    }

    return activitiesList;
  };

  const handleAutoGenerateDriverPlanner = () => {
    const updatedDays = itineraryDays.map(day => {
      const uniqueActs = parseItineraryText(day.activities, day);
      return { ...day, activitiesList: uniqueActs };
    });
    setItineraryDays(updatedDays);
  };

  const handleAutoGenerateDriverPlannerForEditing = () => {
    if (!editingTour || !editingTour.itinerary) return;
    const updatedDays = editingTour.itinerary.map(day => {
      const uniqueActs = parseItineraryText(day.activities, day);
      return { ...day, activitiesList: uniqueActs };
    });
    setEditingTour({ ...editingTour, itinerary: updatedDays });
  };

  const handlePublishTour = async (e) => {
    e.preventDefault();
    if (!newTour.tourCode || !newTour.tourName || !newTour.clientName) {
      alert('Please fill out all tour details.');
      return;
    }

    const selectedGuideObj = guides.find(g => g.name === newTour.guideName);
    const selectedDriverObj = drivers.find(d => d.name === newTour.driverName);

    const tourData = {
      ...newTour,
      guideMobile: selectedGuideObj?.mobile || '',
      driverMobile: selectedDriverObj?.mobile || '',
      vehicleNo: selectedDriverObj?.carNumber || '',
      vehicleType: selectedDriverObj?.vehicleType || newTour.vehicleType || '',
      itinerary: itineraryDays
    };

    await publishTour(tourData);
    alert('Tour published successfully!');
    setNewTour({ tourCode: '', tourName: '', clientName: '', pax: 2, startDate: '', endDate: '', guideName: '', driverName: '', vehicleType: '', doubleRooms: 0, twinRooms: 0, singleRooms: 0, tripleRooms: 0 });
    setItineraryDays([]);
    setActiveTab('dashboard');
  };

  const handleSwapGuide = async (tourCode, guideName) => {
    const guideObj = guides.find(g => g.name === guideName);
    await updateTourResource(tourCode, 'guideName', guideName);
    if (guideObj) {
      await updateTourResource(tourCode, 'guideMobile', guideObj.mobile);
    }
  };

  const handleSwapDriver = async (tourCode, driverName) => {
    await updateTourResource(tourCode, 'driverName', driverName);
    const driverObj = drivers.find(d => d.name === driverName);
    if (driverObj) {
      await updateTourResource(tourCode, 'driverMobile', driverObj.mobile);
      await updateTourResource(tourCode, 'vehicleNo', driverObj.carNumber || '');
      await updateTourResource(tourCode, 'vehicleType', driverObj.vehicleType || '');
    }
  };

  const handleDeleteLocationData = async (tourCode) => {
    if (window.confirm(`Are you sure you want to delete all GPS and trace data for tour ${tourCode}?`)) {
      await deleteTourLocationData(tourCode);
      alert('Location data deleted successfully.');
    }
  };

  const handleSendDutyToWhatsApp = (tour, role = 'driver') => {
    const mobile = role === 'guide' ? tour.guideMobile : tour.driverMobile;
    const name = role === 'guide' ? tour.guideName : tour.driverName;
    
    if (!mobile) {
      alert(`No ${role} mobile number found! Please ensure the ${role} has a mobile number.`);
      return;
    }
    
    let message = `*Duty Assignment: ${tour.tourName}*\n`;
    message += `*Assigned To:* ${name} (${role.toUpperCase()})\n\n`;
    message += `*--- TOUR DETAILS ---*\n`;
    message += `*Tour Code:* ${tour.tourCode}\n`;
    message += `*Client Name:* ${tour.clientName}\n`;
    message += `*Total Pax:* ${tour.pax}\n`;
    message += `*Start Date:* ${tour.startDate}\n`;
    message += `*End Date:* ${tour.endDate}\n`;
    
    if (role === 'driver') {
      message += `*Vehicle Type:* ${tour.vehicleType || 'Any'}\n`;
    }
    
    message += `\n*--- ITINERARY DETAILS ---*\n`;
    
    if (tour.itinerary && tour.itinerary.length > 0) {
      tour.itinerary.forEach((day) => {
        message += `\n*Day ${day.day} (${day.dateStr}) - ${day.city}*\n`;
        message += `🏨 Hotel: ${day.hotelName || 'N/A'}\n`;
        if (day.activitiesList && day.activitiesList.length > 0) {
          day.activitiesList.forEach(act => {
            message += `- ${act.time}: ${act.title}\n`;
          });
        } else if (day.activities) {
          message += `Activities: ${day.activities}\n`;
        }
      });
    }

    message += `\n\n*For more info:*\n`;
    message += `Mobile phone: +91-9811430044\n`;
    message += `E Mail: ranjan@maru.travel\n`;

    const encodedMessage = encodeURIComponent(message);
    const numericMobile = mobile.replace(/\D/g, '');
    const finalMobile = numericMobile.length === 10 ? '91' + numericMobile : numericMobile;
    const whatsappUrl = `https://wa.me/${finalMobile}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Filter Data arrays based on search/filters
  const filteredCities = cities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredActivities = activities.filter(a => {
    const matchesCity = cityFilter ? a.city === cityFilter : true;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });
  const filteredHotels = hotels.filter(h => {
    const matchesCity = cityFilter ? h.city === cityFilter : true;
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCity && matchesSearch;
  });

  const activeTours = tours.filter(t => {
    if (!t.startDate || !t.endDate) return false;
    return selectedDate >= t.startDate && selectedDate <= t.endDate;
  });

  // Range-filtered tours for dashboard Part 2
  const rangeTours = tours.filter(t => {
    if (!t.startDate || !t.endDate) return false;
    const matchRange = (!rangeFrom || t.endDate >= rangeFrom) && (!rangeTo || t.startDate <= rangeTo);
    const matchCity = !rangeCityFilter || t.itinerary?.some(d => d.city === rangeCityFilter);
    return matchRange && matchCity;
  });

  // All unique cities across all tours for city filter dropdown
  const allTourCities = [...new Set(tours.flatMap(t => (t.itinerary || []).map(d => d.city)).filter(Boolean))];

  // Master Itinerary Templates
  const MASTER_ITINERARIES = [
    {
      id: 'golden-triangle-varanasi',
      name: 'MT HJ GT TOUR',
      days: [
        { city: 'New Delhi', activities: 'ICN to DEL by KE.18:30Hrs Dinner & Overnight at Hotel.', transport: 'By Flight', mealPlan: 'Dinner Only', hotelName: '' },
        { city: 'New Delhi', activities: 'New DEL SS(Akshardham, President palace, Parliament house) Tandoori Lunch at Nineteenth Hall Noida) then go to AGRA and proceed to sight of Taj Mahal Sunset view Dinner & overnight at Hotel', transport: 'By Surface', mealPlan: 'Lunch & Dinner', hotelName: '' },
        { city: 'Agra', activities: 'AGR SS( Agra fort) Fatehpur Sikri, Lunch at Lake View restaurant(Sikri)and move to JAI Dinner & Overnight at Hotel', transport: 'By Surface', mealPlan: 'Lunch & Dinner', hotelName: '' },
        { city: 'Jaipur', activities: 'Buffet breakfast . Full day JAI SS (Amber Fort-Jeep, Hawa Mahal, City palace, Virla Mandir), Hena, Lassi Rickshaw Ride Lunch & Dinner & Overnight at Hotel', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'New Delhi', activities: 'Packed breakfast at 05:30 am . JAI/DEL by flight- AI 1834 – 0830/0935 DEL SS (Agrasen ki baoli, India Gate, Gandi Smriti, Raj Ghat, Qutab Minar), Lunch at Gung green park and drop to Airport by KE 498 19:40 hrs.', transport: 'By Flight', mealPlan: 'Breakfast & Lunch (MAP LUNCH)', hotelName: '' },
      ]
    },
    {
      id: 'korea-golden-triangle-short',
      name: 'MT HJ CLASSICAL TOUR',
      days: [
        { city: 'New Delhi', activities: 'ICN/DEL by KE497(1245-1820), Dinner and Overnight at Hotel', transport: 'By Flight', mealPlan: 'Dinner Only', hotelName: '' },
        { city: 'Jaipur', activities: 'DEL-JAI SS(Amber Fort-Jeep, Hawa Mahal, City palace, Jantar Mantar, Virla Mandir) On arrival lunch at Hotel and Dinner Dinner at Hotel , Overnight Hotel', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'Agra', activities: 'JAI-Abaneri SS(Chand Baori)-F.Skri SS-AGR Lunch at local restaurant at Abhaneri and Dinner & Overnight Hotel', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'Agra', activities: 'SS(Taj Mahal, Agra Fort), Hena- Lunch and Dinner at Hotel and Overnight at Hotel', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'Khajuraho', activities: 'Train for Jhansi Shatabadi Express (0755-1045)-Orcha SS-Khajuraho, Yoga Lunch at Amar Palace Orcha Dinner & Overnight at Hotel', transport: 'By Train', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'Varanasi', activities: 'SS(East & West Temples), Flight for VNS by 6E2379(1145-1250), Chai, Lassi, Rickshaw, Pooja Lunch & Dinner at Hotel.', transport: 'By Flight', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'New Delhi', activities: 'Sunrise by boat on Ganga, SS(Sarnath, Museum), Flight for DEL by 6E5040(1555-1735) Lunch at Sarnath Varanasi and Dinner at Local Restaurant Aero city Delhi and Overnight at Hotel', transport: 'By Flight', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'New Delhi', activities: 'SS(Akshardham, India Gate, Gandi Smriti, President palace, Parliament house, Qutub Minar), Korean lunch at Gung Later drop at airport DEL/ICN by KE498(1950- )', transport: 'By Surface', mealPlan: 'Breakfast & Lunch (MAP LUNCH)', hotelName: '' },
      ]
    },
    {
      id: 'gt-tour',
      name: 'MT Classical Tour',
      days: [
        { city: 'New Delhi', activities: 'Arrival Delhi by KE 497 at 18:20. On arrival KSG meet/ greet at airport & proceed to hotel. Dinner & Overnight at Hotel', transport: 'By Flight', mealPlan: 'Dinner Only', hotelName: '' },
        { city: 'Varanasi', activities: 'After breakfast Drive to Delhi airport. Flight to Varanasi AI 1741 1040-1200 Hrs. .On arrival checkin Hotel .Buffet Lunch at hotel. Later afternoon visit to Banaras Hindu University,  local Temple tour and Evening visit to Ghat at Ganges river by Rickshaw ride for Aarti Pooja ceremony viewing.   Dinner & Overnight at Varanasi', transport: 'By Flight', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'Khajuraho', activities: 'Early morning visit to Ghat at Ganges river for morning sunrise view by Boatride. After breakfast at hotel, proceed to Sarnath/ Museum sightseeing, transfer to the airport for Flight to Khajuraho ( 6E 2083 – 1310/ 1405 hrs). On arrival check-in and Lunch at hotel. Afternoon visit to Western group of temple sightseeing tour. Dinner & Overnight stay at hotel.', transport: 'By Flight', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'Agra', activities: 'After Breakfast,  Drive to Jhansi  via Orcha fort sightseeing. Lunch at Orcha Palace hotel. Departure train JHANSI/AGRA : 22469/Vande Bharat Express ( 1825/2055 hrs ). On arrival check-in hotel. Dinner & Overnight at Hotel', transport: 'By Train', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'Agra', activities: 'After morning buffet Breakfast. Full day sightseeing of Taj Mahal & Agra Fort sightseeing.  Lunch at hotel.  Dinner &   Overnight at hotel', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'Jaipur', activities: 'After Buffet breakfast , checkout-  Drive to Jaipur   On arrival checkin hotel & Lunch at Jaipur Hotel. Proceed Sightseeing  City palace , Hawa Mahal & Albert hall ( Outside photo stop), Amer Fort by Jeep,  Henna/ lassi . Dinner & Overnight at Hotel', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'New Delhi', activities: 'After Buffet breakfast , checkout. -  Drive to Delhi Enroute Sightseeing Birla Temple,  Jal Mahal. Continue drive to Delhi. On arrival , Korea Lunch at Gung restaurant Gurgaon/Green Park. Afternoon city tour including Sikh Temple , India Gate , President house, Government Buildings. Dinner at Lazeez Affaire Checkin/ Overnight at Hotel.', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: '' },
        { city: 'New Delhi', activities: 'After morning buffet Breakfast. Full day sightseeing tour including Gandhi Smriti, Raj Ghat, Step well, Akshardham Temple & Lotus Temple. Indian Tandoori Lunch at Connaught Club House, Later if time permits visit to local Shopping shop of Souvenir. Departure to Delhi airport for flight for onward destination to Home.', transport: 'By Flight', mealPlan: 'Breakfast & Lunch (MAP LUNCH)', hotelName: '' },
      ]
    }
  ];

  // Apply master itinerary template
  const applyMasterItinerary = (templateId) => {
    const template = MASTER_ITINERARIES.find(m => m.id === templateId);
    if (!template || !newTour.startDate) return;
    
    const start = new Date(newTour.startDate);
    const daysCount = template.days.length;
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + daysCount - 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    setNewTour(prev => ({ ...prev, endDate: endDateStr }));
    
    const newDays = template.days.map((td, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      return {
        day: i + 1,
        dateStr,
        city: td.city,
        activities: td.activities,
        activitiesList: [{ time: '09:00 AM', title: '' }],
        hotelName: td.hotelName || '',
        hotelAddress: '',
        hotelMapLink: '',
        mealPlan: td.mealPlan || 'Breakfast & Dinner (MAP)',
        transport: td.transport || 'By Surface',
        flightNo: '',
        trainNo: '',
        localRestaurant: '',
        restaurantMealType: '',
        restaurantMapUrl: '',
        coverImage: ''
      };
    });
    setItineraryDays(newDays);
    setSelectedMasterItinerary(templateId);
  };

  // Helper to generate Sector codes DEL-JAI, etc.
  const getSectorCode = (day, idx, itinerary) => {
    if (idx === 0) {
      return `DEL`; 
    }
    const prevCity = itinerary[idx - 1].city;
    const currCity = day.city;
    if (prevCity !== currCity) {
      const getCode = (name) => {
        const n = name.trim().toUpperCase();
        if (n.includes('DELHI')) return 'DEL';
        if (n.includes('JAIPUR')) return 'JAI';
        if (n.includes('AGRA')) return 'AGR';
        if (n.includes('JODHPUR')) return 'JDH';
        if (n.includes('UDAIPUR')) return 'UDR';
        if (n.includes('JAISALMER')) return 'JSA';
        if (n.includes('KHAJURAHO')) return 'HJR';
        if (n.includes('VARANASI')) return 'VNS';
        if (n.includes('MUMBAI')) return 'BOM';
        if (n.includes('KOCHI')) return 'COK';
        return n.substring(0, 3);
      };
      return `${getCode(prevCity)}-${getCode(currCity)}`;
    }
    return currCity.trim().toUpperCase().substring(0, 3);
  };

  return (
    <div className="app-container">
      {/* Printable Tour Itinerary Sheet */}
      {printTour && (
        <div className="print-overlay print-preview-container">
          <style>{`
            @media screen {
              .print-preview-container {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                z-index: 9999 !important;
                background-color: #f1f5f9 !important;
                display: flex !important;
                flex-direction: column !important;
                height: 100vh !important;
                overflow: hidden !important;
              }
              .print-preview-body {
                display: flex !important;
                flex: 1 !important;
                overflow: hidden !important;
              }
              .print-preview-sidebar {
                width: 320px !important;
                background-color: #ffffff !important;
                border-right: 1px solid #e2e8f0 !important;
                padding: 20px !important;
                overflow-y: auto !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 16px !important;
                box-sizing: border-box !important;
              }
              .print-preview-pane {
                flex: 1 !important;
                overflow-y: auto !important;
                padding: 30px 10px !important;
                display: flex !important;
                justify-content: center !important;
              }
            }
            @media print {
              .print-preview-sidebar {
                display: none !important;
              }
              .print-preview-container {
                display: block !important;
                height: auto !important;
                overflow: visible !important;
              }
              .print-preview-body {
                display: block !important;
                height: auto !important;
                overflow: visible !important;
              }
              .print-preview-pane {
                display: block !important;
                padding: 0 !important;
                overflow: visible !important;
              }
            }
          `}</style>

          {/* Non-Printable Action Header */}
          <div className="no-print" style={{ height: '60px', backgroundColor: '#0B4F6C', color: '#FAF7F2', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem' }}>
                PDF Print Preview ({printTour.tourCode}) 
                {printTour.version ? <span style={{ color: '#FCD34D', marginLeft: '6px' }}>[Version {printTour.version}]</span> : ''}
              </span>
              
              {/* Format Dropdown Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Format:</span>
                <select 
                  value={printFormat} 
                  onChange={(e) => setPrintFormat(e.target.value)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FAF7F2', border: '1px solid rgba(255,255,255,0.25)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                  <option value="short" style={{ color: 'black' }}>Short Itinerary (Grid / Confirmation Table)</option>
                  <option value="brief" style={{ color: 'black' }}>Brief Itinerary (Narrative / Date Schedule List)</option>
                  <option value="hotelVoucher" style={{ color: 'black' }}>Hotel Voucher (Day-wise Hotel Booking Sheet)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  const originalTitle = document.title;
                  let formatName = 'Full_Itinerary';
                  if (printFormat === 'short') formatName = 'Short_Itinerary';
                  if (printFormat === 'hotelVoucher') formatName = `Hotel_Voucher_Day_${printTour.itinerary[voucherDayIndex]?.day || 1}`;
                  const vStr = printTour.version ? `_v${printTour.version}` : '';
                  document.title = `${printTour.tourCode}_${formatName}${vStr}`;
                  window.print();
                  setTimeout(() => { document.title = originalTitle; }, 1000);
                }} 
                style={{ backgroundColor: '#10B981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Printer size={16} /> Print Document
              </button>
              <button onClick={() => setPrintTour(null)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}>
                ✕ Close Preview
              </button>
            </div>
          </div>

          {/* Main Layout Area */}
          <div className="print-preview-body">
            
            {/* Sidebar for Hotel Voucher controls */}
            {printFormat === 'hotelVoucher' && (
              <div className="print-preview-sidebar no-print">
                <h4 style={{ margin: '0 0 4px 0', color: 'var(--navy)', borderBottom: '2px solid var(--primary)', paddingBottom: '6px', fontSize: '0.9rem', fontWeight: '800' }}>Voucher Customizer</h4>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Select Hotel Day</label>
                  <select 
                    value={voucherDayIndex} 
                    onChange={(e) => setVoucherDayIndex(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: '600' }}
                  >
                    {printTour.itinerary?.map((day, idx) => (
                      <option key={idx} value={idx}>
                        Day {day.day} - {day.hotelName || 'No Hotel'} ({day.city})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Group Name</label>
                  <input 
                    type="text" 
                    className="mgmt-input" 
                    style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                    value={voucherGrpName} 
                    onChange={(e) => setVoucherGrpName(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>File Code</label>
                  <input 
                    type="text" 
                    className="mgmt-input" 
                    style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                    value={voucherFileCode} 
                    onChange={(e) => setVoucherFileCode(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Room Type / Pax Details</label>
                  <input 
                    type="text" 
                    className="mgmt-input" 
                    style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                    value={voucherRoomType} 
                    onChange={(e) => setVoucherRoomType(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Room Note details</label>
                  <input 
                    type="text" 
                    className="mgmt-input" 
                    style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                    value={voucherRoomNote} 
                    onChange={(e) => setVoucherRoomNote(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Confirmation Status</label>
                  <input 
                    type="text" 
                    className="mgmt-input" 
                    style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                    value={voucherNote} 
                    onChange={(e) => setVoucherNote(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Check-in Time</label>
                    <input 
                      type="text" 
                      className="mgmt-input" 
                      style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                      value={voucherCheckInTime} 
                      onChange={(e) => setVoucherCheckInTime(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Check-out Time</label>
                    <input 
                      type="text" 
                      className="mgmt-input" 
                      style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                      value={voucherCheckOutTime} 
                      onChange={(e) => setVoucherCheckOutTime(e.target.value)} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Remarks</label>
                  <textarea 
                    className="mgmt-textarea" 
                    rows={3}
                    style={{ padding: '6px 8px', fontSize: '0.76rem', lineHeight: '1.4' }}
                    value={voucherRemarks} 
                    onChange={(e) => setVoucherRemarks(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Issue Date</label>
                    <input 
                      type="text" 
                      className="mgmt-input" 
                      style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                      value={voucherIssueDate} 
                      onChange={(e) => setVoucherIssueDate(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>Tel No</label>
                    <input 
                      type="text" 
                      className="mgmt-input" 
                      style={{ padding: '6px 8px', fontSize: '0.78rem', height: '32px' }}
                      value={voucherTelNo} 
                      onChange={(e) => setVoucherTelNo(e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Printable Area Page Wrapper */}
            <div className="print-preview-pane">
              <div id="printable-area" style={{ width: '794px', minHeight: '1123px', margin: '0 auto', padding: '40px', backgroundColor: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', boxSizing: 'border-box', color: '#000000', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', display: 'block' }}>
                {printFormat !== 'hotelVoucher' && <div className="print-page-border" />}
                
                {printFormat === 'hotelVoucher' ? (
                  // HOTEL VOUCHER SHEET
                  (() => {
                    const selectedDay = printTour.itinerary?.[voucherDayIndex];
                    
                    if (!selectedDay || !selectedDay.hotelName) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '500px', color: '#64748b', fontFamily: 'sans-serif' }}>
                          <HelpCircle size={48} style={{ marginBottom: '16px', color: '#94a3b8' }} />
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>No Hotel Assigned</h3>
                          <p style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: '350px', marginTop: '8px', lineHeight: '1.5' }}>
                            Day {selectedDay?.day || (voucherDayIndex + 1)} does not have a hotel assigned. Please select another day in the customizer panel on the left.
                          </p>
                        </div>
                      );
                    }

                    // Calculate consecutive days for the same hotel in the same city
                    const hotelStayDays = [selectedDay];
                    let lastStayDayIndex = voucherDayIndex;
                    for (let i = voucherDayIndex + 1; i < (printTour.itinerary?.length || 0); i++) {
                      const nextItinDay = printTour.itinerary[i];
                      if (nextItinDay.hotelName === selectedDay.hotelName && nextItinDay.city === selectedDay.city) {
                        hotelStayDays.push(nextItinDay);
                        lastStayDayIndex = i;
                      } else {
                        break;
                      }
                    }

                    // Calculate Checkout Date (next day after the last stay day)
                    const nextDay = printTour.itinerary?.[lastStayDayIndex + 1];
                    const checkoutDateStr = nextDay ? nextDay.dateStr : (() => {
                      const pts = (hotelStayDays[hotelStayDays.length - 1].dateStr || '').split('-');
                      if (pts.length === 3) {
                        const months = {
                          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
                        };
                        const m = months[pts[1].toLowerCase().substring(0,3)] || 0;
                        const d = new Date(parseInt(pts[2]), m, parseInt(pts[0]));
                        d.setDate(d.getDate() + 1);
                        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                      }
                      return 'TBA';
                    })();

                    const convertDateToSlash = (dStr) => {
                      if (!dStr) return '';
                      const pts = dStr.split('-');
                      if (pts.length === 3) {
                        const months = {
                          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
                        };
                        const m = months[pts[1].toLowerCase().substring(0,3)] || '01';
                        return `${pts[0].padStart(2, '0')}/${m}/${pts[2]}`;
                      }
                      return dStr;
                    };

                    const getShortMpName = (day) => {
                      const mp = (day.mealPlan || '').toLowerCase();
                      const mpType = (day.mapType || 'Dinner + Breakfast');
                      if (mp.startsWith('ap') || (mp.includes('(ap)') && !mp.includes('map')) || mp.includes('breakfast, lunch & dinner') || mp.includes('breakfast, lunch')) return 'AP';
                      if (!mp.startsWith('ap') && (mp.includes('map lunch') || (mp.includes('breakfast') && mp.includes('lunch') && !mp.includes('dinner')))) return 'MAP Lunch';
                      if (mp.startsWith('map') || mp.includes('(map') || (mp.includes('breakfast') && mp.includes('dinner') && !mp.includes('lunch'))) {
                        return mpType === 'Lunch + Breakfast' ? 'MAP Lunch' : 'MAP';
                      }
                      if (mp.startsWith('cp') || mp.includes('(cp)') || mp.includes('breakfast only')) return 'CP';
                      return 'EP';
                    };

                    const getOrdinal = (n) => {
                      const s = ["th", "st", "nd", "rd"];
                      const v = n % 100;
                      return n + (s[(v - 20) % 10] || s[v] || s[0]);
                    };

                    const checkinFormatted = convertDateToSlash(selectedDay.dateStr);
                    const checkoutFormatted = convertDateToSlash(checkoutDateStr);
                    
                    const prevDay = voucherDayIndex > 0 ? printTour.itinerary?.[voucherDayIndex - 1] : null;
                    const arrivalFrom = prevDay?.city || 'Delhi';
                    const departureTo = nextDay?.city || 'Jaipur';
                    const hotelObj = hotels.find(h => h.name === selectedDay.hotelName);

                    return (
                      <div style={{ padding: '0 10px' }}>
                        {/* Voucher Top Brand Header */}
                        <div style={{ textAlign: 'center', marginBottom: '20px', fontFamily: 'sans-serif' }}>
                          <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ height: '70px', width: 'auto', display: 'block', margin: '0 auto 8px auto' }} />
                          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, letterSpacing: '0.5px' }}>
                            6A, First Floor, Uttam Nagar Main Rd, Near Metro Pillar No. 666, New Delhi – 110059
                          </p>
                        </div>

                        {/* Main Outline Box Wrapper */}
                        <div style={{ border: '2.5px solid #000000', padding: '35px 25px', fontFamily: 'sans-serif', color: '#000000', boxSizing: 'border-box' }}>
                          {/* Centered underlined title */}
                          <h2 style={{ textAlign: 'center', fontSize: '1.4rem', fontWeight: 'bold', textDecoration: 'underline', margin: '0 0 25px 0', letterSpacing: '1.5px' }}>
                            HOTEL VOUCHER
                          </h2>

                          {/* Hotel Details */}
                          <div style={{ marginBottom: '22px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                              {selectedDay.hotelName}
                            </h3>
                            <p style={{ fontSize: '0.88rem', margin: 0, lineHeight: '1.5', color: '#000000' }}>
                              <strong>Address:</strong> {hotelObj?.address || selectedDay.hotelAddress || 'Hotel Address TBA'}
                            </p>
                          </div>

                          {/* Group & File Code */}
                          <div style={{ textAlign: 'center', margin: '25px 0', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div style={{ fontSize: '1.02rem', fontWeight: 'bold' }}>
                              Grp Name – {voucherGrpName}
                            </div>
                            <div style={{ fontSize: '1.02rem', fontWeight: 'bold' }}>
                              FILE CODE: {voucherFileCode}
                            </div>
                          </div>

                          {/* Requirement Info */}
                          <div style={{ margin: '22px 0', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>
                              Please provide - {voucherRoomType}– for the above said grp as per details given below:
                            </p>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>
                              Note: {voucherRoomNote ? `${voucherRoomNote}, ` : ''} 
                              <span style={{ backgroundColor: '#fef08a', padding: '2px 6px', borderRadius: '2px' }}>
                                {voucherNote}
                              </span>
                            </p>
                          </div>

                          {/* Timing & Transit details grid table */}
                          <table style={{ width: '100%', margin: '25px 0', borderCollapse: 'collapse', border: 'none', fontSize: '0.88rem', lineHeight: '2.2', color: '#000000' }}>
                            <tbody>
                              <tr>
                                <td style={{ fontWeight: 'bold', width: '90px', padding: '2px 0' }}>Check in:</td>
                                <td style={{ width: '110px', padding: '2px 0' }}>{checkinFormatted}</td>
                                <td style={{ fontWeight: 'bold', width: '90px', padding: '2px 0' }}>Arrival</td>
                                <td style={{ width: '120px', padding: '2px 0' }}>{selectedDay.transport || 'By Surface'}</td>
                                <td style={{ width: '140px', padding: '2px 0' }}>From {arrivalFrom}</td>
                                <td style={{ fontWeight: 'bold', width: '50px', padding: '2px 0' }}>Time</td>
                                <td style={{ padding: '2px 0' }}>{voucherCheckInTime}</td>
                              </tr>
                              <tr>
                                <td style={{ fontWeight: 'bold', width: '90px', padding: '2px 0' }}>Check out:</td>
                                <td style={{ width: '110px', padding: '2px 0' }}>{checkoutFormatted}</td>
                                <td style={{ fontWeight: 'bold', width: '90px', padding: '2px 0' }}>Departure</td>
                                <td style={{ width: '120px', padding: '2px 0' }}>{nextDay?.transport || 'By Surface'}</td>
                                <td style={{ width: '140px', padding: '2px 0' }}>To {departureTo}</td>
                                <td style={{ fontWeight: 'bold', width: '50px', padding: '2px 0' }}>Time</td>
                                <td style={{ padding: '2px 0' }}>{voucherCheckOutTime}</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Meal Plan & Schedule */}
                          <div style={{ margin: '22px 0', fontSize: '0.9rem' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                              Meal Plan- {(() => {
                                const mpNames = hotelStayDays.map(d => getShortMpName(d));
                                const allSame = mpNames.every(m => m === mpNames[0]);
                                if (allSame) {
                                  return mpNames[0];
                                } else {
                                  let parts = mpNames.map((m, idx) => `${getOrdinal(idx + 1)} Night on ${m}`);
                                  if (parts.length > 1) {
                                    const last = parts.pop();
                                    return parts.join(', ') + ' and ' + last;
                                  }
                                  return parts[0];
                                }
                              })()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '2px' }}>
                              {(() => {
                                const mealLines = [];
                                
                                // Check In Day
                                const firstMp = getShortMpName(hotelStayDays[0]);
                                let firstMeals = '';
                                if (firstMp === 'AP') firstMeals = 'Check In + Lunch + Dinner';
                                else if (firstMp === 'MAP Lunch') firstMeals = 'Check In + Lunch';
                                else if (firstMp === 'MAP') firstMeals = 'Check In + Dinner';
                                else if (firstMp === 'CP') firstMeals = 'Check In';
                                else firstMeals = 'Check In (No Meals)';
                                mealLines.push(<div key="checkin">{hotelStayDays[0].dateStr}: {firstMeals}</div>);

                                // Middle Days
                                for (let i = 1; i < hotelStayDays.length; i++) {
                                  const prevMp = getShortMpName(hotelStayDays[i-1]);
                                  const currMp = getShortMpName(hotelStayDays[i]);
                                  const hasBreakfast = prevMp !== 'EP';
                                  const hasLunch = currMp === 'AP' || currMp === 'MAP Lunch';
                                  const hasDinner = currMp === 'AP' || currMp === 'MAP';
                                  
                                  const meals = [];
                                  if (hasBreakfast) meals.push('Breakfast');
                                  if (hasLunch) meals.push('Lunch');
                                  if (hasDinner) meals.push('Dinner');
                                  
                                  const mealStr = meals.length > 0 ? meals.join(' + ') : 'No Meals';
                                  mealLines.push(<div key={`mid-${i}`}>{hotelStayDays[i].dateStr}: {mealStr}</div>);
                                }

                                // Check Out Day
                                const lastMp = getShortMpName(hotelStayDays[hotelStayDays.length - 1]);
                                const hasLastBreakfast = lastMp !== 'EP';
                                const lastMeals = hasLastBreakfast ? 'Breakfast + Check Out' : 'Check Out';
                                mealLines.push(<div key="checkout">{checkoutDateStr}: {lastMeals}</div>);

                                return mealLines;
                              })()}
                            </div>
                          </div>

                          {/* Remarks */}
                          <div style={{ margin: '25px 0', fontSize: '0.84rem', fontStyle: 'italic', lineHeight: '1.5', color: '#1e293b' }}>
                            <strong>Remark:</strong> {voucherRemarks}
                          </div>

                          {/* Bottom Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '35px', fontSize: '0.88rem' }}>
                            <div>
                              <strong>Date:</strong> {voucherIssueDate}
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ fontWeight: 'bold' }}>Authorised Signatory & Company Stamp</div>
                              <div style={{ fontSize: '0.92rem', fontWeight: 'bold', color: '#e28743' }}>Maru Travel</div>
                              <div style={{ fontSize: '0.8rem', color: '#475569' }}>Tel No {voucherTelNo}</div>
                            </div>
                          </div>

                          {/* Footer system disclaimer */}
                          <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#64748b', fontStyle: 'italic', marginTop: '30px' }}>
                            (This is system generated voucher hence does not require signature & stamp, treat the same as original for billing)
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // REGULAR ITINERARY FORMATS (SHORT / BRIEF)
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                    <thead>
                      <tr>
                        <td style={{ border: 'none', padding: '10px 15px 15px 15px' }}>
                          {/* Header Brand */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #d97706', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ height: '48px', marginBottom: '4px' }} />
                              <span style={{ fontSize: '0.62rem', letterSpacing: '2px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', margin: 0 }}>Making Travel an experience</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#d97706', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>“{printTour.tourName}”</h2>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: 'none', padding: '5px 15px' }}>
                          {printFormat === 'short' ? (
                            <>
                              {/* Metadata Fields */}
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: '10px 24px', 
                                fontSize: '0.85rem', 
                                color: '#334155', 
                                marginBottom: '20px',
                                padding: '14px',
                                backgroundColor: '#F8FAFC',
                                borderRadius: '8px',
                                border: '1px solid #E2E8F0'
                              }}>
                                <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                                  <strong style={{ color: '#0F172A', width: '120px' }}>File Code:</strong>
                                  <span>{printTour.tourCode}</span>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                                  <strong style={{ color: '#0F172A', width: '120px' }}>Group Name:</strong>
                                  <span>{printTour.clientName} ({printTour.pax} Pax)</span>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                                  <strong style={{ color: '#0F172A', width: '120px' }}>Arrival Date:</strong>
                                  <span>{printTour.startDate}</span>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                                  <strong style={{ color: '#0F172A', width: '120px' }}>Vehicle Type:</strong>
                                  <span>{printTour.vehicleType || 'SUV (Chauffeur Driven)'} (Reg: {printTour.vehicleNo || 'TBA'})</span>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                                  <strong style={{ color: '#0F172A', width: '120px' }}>Transport:</strong>
                                  <span>{Array.from(new Set(printTour.itinerary?.map(d => d.transport).filter(Boolean))).join(', ') || 'By Surface'}</span>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                                  <strong style={{ color: '#0F172A', width: '120px' }}>Guide / Escort:</strong>
                                  <span>{printTour.guideName || 'TBA'} ({printTour.guideMobile || 'N/A'})</span>
                                </div>
                                <div style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px', gridColumn: 'span 2' }}>
                                  <strong style={{ color: '#0F172A', width: '120px' }}>Accommodation:</strong>
                                  <span>{Array.from(new Set(printTour.itinerary?.map(d => d.hotelName).filter(Boolean))).join(' · ') || 'In Transit'}</span>
                                </div>
                              </div>

                              {/* Travel Program Table */}
                              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', marginTop: '10px' }}>
                                <thead>
                                  <tr>
                                    <th rowSpan="2" style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#f8f9fa' }}>Date</th>
                                    <th rowSpan="2" style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#f8f9fa' }}>Sector</th>
                                    <th rowSpan="2" style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#f8f9fa' }}>Arrival FLT/<br/>Train</th>
                                    <th rowSpan="2" style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#f8f9fa' }}>City</th>
                                    <th rowSpan="2" style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#f8f9fa' }}>Hotels</th>
                                    <th rowSpan="2" style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#f8f9fa' }}>Local Restaurant</th>
                                    <th colSpan="4" style={{ border: '1px solid #000000', padding: '6px', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#f8f9fa', textAlign: 'center' }}>Remark / Confirmation Number</th>
                                  </tr>
                                  <tr>
                                    <th style={{ border: '1px solid #000000', padding: '6px', fontSize: '0.72rem', fontWeight: '800', backgroundColor: '#f8f9fa', width: '90px' }}>Meal</th>
                                    <th style={{ border: '1px solid #000000', padding: '6px', fontSize: '0.72rem', fontWeight: '800', backgroundColor: '#f8f9fa', width: '45px' }}>ADV-</th>
                                    <th style={{ border: '1px solid #000000', padding: '6px', fontSize: '0.72rem', fontWeight: '800', backgroundColor: '#f8f9fa', width: '45px' }}>Vouch</th>
                                    <th style={{ border: '1px solid #000000', padding: '6px', fontSize: '0.72rem', fontWeight: '800', backgroundColor: '#f8f9fa', width: '85px' }}>Final P-Con</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {printTour.itinerary?.map((day, idx) => (
                                    <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.75rem', textAlign: 'center', fontWeight: '600' }}>
                                        {day.dateStr}
                                      </td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.75rem', textAlign: 'center', fontWeight: '700', color: '#1e3a8a' }}>
                                        {getSectorCode(day, idx, printTour.itinerary)}
                                      </td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.75rem', textAlign: 'center' }}>
                                        {day.transport === 'By Flight' ? (day.flightNo ? `By FLT - ${day.flightNo}` : 'By Flight') :
                                         day.transport === 'By Train' ? (day.trainNo ? `By TRN - ${day.trainNo}` : 'By Train') :
                                         day.transport || 'By Surface'}
                                      </td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.75rem', textAlign: 'center', fontWeight: '600' }}>
                                        {day.city}
                                      </td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.72rem', textAlign: 'center' }}>
                                        {day.hotelName || 'In Transit'}
                                      </td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.72rem', textAlign: 'center' }}>
                                        {day.localRestaurant || '-'}
                                      </td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.7rem', textAlign: 'center' }}>
                                        {(() => {
                                          const mp = day.mealPlan || '';
                                          const isAP = mp.startsWith('AP') || mp.includes('Breakfast, Lunch');
                                          const isMAP = !isAP && mp.startsWith('MAP');
                                          const isCP = !isAP && !isMAP && mp.startsWith('CP');
                                          if (isAP) return 'AP';
                                          if (isMAP) return `MAP (${day.mapType || 'Dinner + Breakfast'})`;
                                          if (isCP) return 'CP';
                                          return 'EP';
                                        })()}
                                      </td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.75rem', textAlign: 'center' }}></td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.75rem', textAlign: 'center' }}></td>
                                      <td style={{ border: '1px solid #000000', padding: '8px 6px', fontSize: '0.75rem', textAlign: 'center' }}></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          ) : (
                            <>
                              {/* Brief Narrative Itinerary Layout */}
                              <div style={{ padding: '0' }}>
                                <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000000', paddingBottom: '12px' }}>
                                  <div style={{ fontSize: '1.05rem', fontWeight: '800', textTransform: 'uppercase', color: '#000000', letterSpacing: '2px' }}>
                                    {Array.from(new Set(printTour.itinerary?.map(d => d.city).filter(Boolean))).join('  •  ')}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#333333', marginTop: '6px' }}>
                                    {String(printTour.itinerary?.length ? printTour.itinerary.length - 1 : 0).padStart(2, '0')} Nights / {String(printTour.itinerary?.length || 0).padStart(2, '0')} Days
                                  </div>
                                </div>

                                <div style={{ borderLeft: '3px solid #d97706', paddingLeft: '14px', margin: '16px 0' }}>
                                  <span style={{ backgroundColor: '#0B4F6C', color: '#ffffff', padding: '4px 12px', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '3px' }}>
                                    Detailed Itinerary
                                  </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '16px 0' }}>
                                  {printTour.itinerary?.map((day, idx) => (
                                    <div key={idx} className="brief-day-card" style={{ 
                                      pageBreakInside: 'avoid', 
                                      breakInside: 'avoid',
                                      border: '1.5px solid #cccccc',
                                      borderRadius: '0',
                                      padding: '14px 16px',
                                      backgroundColor: '#ffffff',
                                    }}>
                                      {/* Day Title Block */}
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #dddddd', paddingBottom: '8px', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <span style={{ backgroundColor: '#d97706', color: '#ffffff', padding: '3px 10px', borderRadius: '3px', fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                                            DAY {day.day}
                                          </span>
                                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#000000' }}>
                                            {day.dateStr}
                                          </span>
                                        </div>
                                        <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0B4F6C', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                          {day.city}
                                        </span>
                                      </div>

                                      {/* Day Activities */}
                                      <div style={{ 
                                        fontSize: '0.82rem', 
                                        color: '#222222', 
                                        lineHeight: '1.7', 
                                        marginBottom: '12px', 
                                        textAlign: 'justify',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                        whiteSpace: 'pre-wrap'
                                      }}>
                                        {day.activities || 'Leisure / Free time'} 
                                      </div>

                                      {/* Services Summary */}
                                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cccccc', fontSize: '0.78rem' }}>
                                        <tbody>
                                          <tr>
                                            {day.hotelName && (
                                              <td style={{ border: '1px solid #cccccc', padding: '8px 10px', verticalAlign: 'top' }}>
                                                <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: '#666666', marginBottom: '2px' }}>Hotel Accommodation</strong>
                                                <span style={{ fontWeight: '600', color: '#000000' }}>{day.hotelName}</span>
                                              </td>
                                            )}
                                            {day.mealPlan && (
                                              <td style={{ border: '1px solid #cccccc', padding: '8px 10px', verticalAlign: 'top' }}>
                                                <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: '#666666', marginBottom: '2px' }}>Meal Plan</strong>
                                                <span style={{ fontWeight: '600', color: '#000000' }}>{day.mealPlan}</span>
                                              </td>
                                            )}
                                            {day.localRestaurant && (
                                              <td style={{ border: '1px solid #cccccc', padding: '8px 10px', verticalAlign: 'top' }}>
                                                <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: '#666666', marginBottom: '2px' }}>🍽️ Local Restaurant</strong>
                                                <span style={{ fontWeight: '600', color: '#000000' }}>{day.localRestaurant}</span>
                                              </td>
                                            )}
                                            {(day.transport || day.flightNo || day.trainNo) && (
                                              <td style={{ border: '1px solid #cccccc', padding: '8px 10px', verticalAlign: 'top' }}>
                                                <strong style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', color: '#666666', marginBottom: '2px' }}>Transport</strong>
                                                <span style={{ fontWeight: '600', color: '#000000' }}>
                                                  {day.flightNo ? `Flight: ${day.flightNo}` : day.trainNo ? `Train: ${day.trainNo}` : day.transport || 'By Surface'}
                                                </span>
                                              </td>
                                            )}
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  ))}
                                </div>

                                <div style={{ textAlign: 'center', fontWeight: '800', fontSize: '0.85rem', margin: '30px 0 16px 0', letterSpacing: '3px', color: '#666666', borderTop: '1px solid #cccccc', borderBottom: '1px solid #cccccc', padding: '10px 0' }}>
                                  — END OF ITINERARY —
                                </div>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ border: 'none', padding: '15px 15px 10px 15px' }}>
                          {/* Structured Formal Footer */}
                          <div style={{ borderTop: '2px solid #d97706', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#334155', fontFamily: 'sans-serif' }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', color: '#000000', fontWeight: '800', fontSize: '0.9rem' }}>Maru Travel</h4>
                              <div style={{ fontSize: '0.62rem', letterSpacing: '1px', fontWeight: '800', color: '#d97706', textTransform: 'uppercase', marginBottom: '8px' }}>
                                INDIA &nbsp;|&nbsp; SOUTH KOREA
                              </div>
                              <strong style={{ fontSize: '0.72rem', color: '#000000' }}>DELHI OFFICE:</strong>
                              <p style={{ margin: '2px 0 0 0', lineHeight: '1.4', fontSize: '0.75rem', color: '#475569' }}>
                                6A, First Floor, Uttam Nagar Main Rd<br/>
                                Near Metro Pillar No. 666<br/>
                                New Delhi - 110059
                              </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', textAlign: 'right', gap: '2px', fontSize: '0.75rem', color: '#475569' }}>
                              <span><strong>Mobile phone:</strong> +91-9811430044</span>
                              <span><strong>E Mail:</strong> ranjan@maru.travel</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Live Tour Itinerary Editor */}
      {editingTour && (
        <div className="print-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f1f5f9', zIndex: 9999, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Editor Header Bar */}
          <div style={{ height: '60px', backgroundColor: '#0B4F6C', color: '#FAF7F2', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0 }}>
            <span style={{ fontWeight: '700', fontSize: '1rem' }}>✏️ Live Edit Tour Details & Itinerary ({editingTour.tourCode})</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={async () => {
                  await updateTour(editingTour.tourCode, editingTour);
                  setEditingTour(null);
                  alert('Tour updated successfully live!');
                }} 
                style={{ backgroundColor: '#10B981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                💾 Save Live Changes
              </button>
              <button onClick={() => setEditingTour(null)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}>
                ✕ Cancel
              </button>
            </div>
          </div>

          {/* Form Container */}
          <div style={{ maxWidth: '800px', width: '100%', margin: '30px auto', padding: '30px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: '800', color: 'var(--navy)', marginBottom: '20px' }}>General Information</h3>
            <div className="mgmt-form" style={{ gap: '20px' }}>
              <div className="mgmt-form-row">
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Tour Code (Cannot be changed)</label>
                  <input className="mgmt-input" required readOnly value={editingTour.tourCode} style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Tour Title / Name</label>
                  <input className="mgmt-input" required value={editingTour.tourName} onChange={(e) => setEditingTour({ ...editingTour, tourName: e.target.value })} />
                </div>
              </div>

              <div className="mgmt-form-row">
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Client Name</label>
                  <input className="mgmt-input" required value={editingTour.clientName} onChange={(e) => setEditingTour({ ...editingTour, clientName: e.target.value })} />
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>No. of Passengers (Pax)</label>
                  <input type="number" className="mgmt-input" required value={editingTour.pax} onChange={(e) => setEditingTour({ ...editingTour, pax: parseInt(e.target.value) })} />
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '10px' }}>
                <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: '800', color: 'var(--navy)', margin: '0 0 12px 0', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>🏨 Room Requirements</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Double Rooms</label>
                    <input type="number" className="mgmt-input" style={{ height: '36px' }} min="0" value={editingTour.doubleRooms || 0} onChange={(e) => setEditingTour({ ...editingTour, doubleRooms: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Twin Rooms</label>
                    <input type="number" className="mgmt-input" style={{ height: '36px' }} min="0" value={editingTour.twinRooms || 0} onChange={(e) => setEditingTour({ ...editingTour, twinRooms: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Single Rooms</label>
                    <input type="number" className="mgmt-input" style={{ height: '36px' }} min="0" value={editingTour.singleRooms || 0} onChange={(e) => setEditingTour({ ...editingTour, singleRooms: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Triple Rooms</label>
                    <input type="number" className="mgmt-input" style={{ height: '36px' }} min="0" value={editingTour.tripleRooms || 0} onChange={(e) => setEditingTour({ ...editingTour, tripleRooms: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              <div className="mgmt-form-row">
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Start Date</label>
                  <input type="date" className="mgmt-input" required value={editingTour.startDate} onChange={(e) => setEditingTour({ ...editingTour, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>End Date</label>
                  <input type="date" className="mgmt-input" required value={editingTour.endDate} onChange={(e) => setEditingTour({ ...editingTour, endDate: e.target.value })} />
                </div>
              </div>

              <div className="mgmt-form-row">
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Assigned Guide</label>
                  <select className="mgmt-select" required value={editingTour.guideName} onChange={(e) => {
                    const guideObj = guides.find(g => g.name === e.target.value);
                    setEditingTour({
                      ...editingTour,
                      guideName: e.target.value,
                      guideMobile: guideObj?.mobile || ''
                    });
                  }}>
                    <option value="">Select Guide</option>
                    {guides.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Assigned Driver & Car</label>
                  <select className="mgmt-select" required value={editingTour.driverName} onChange={(e) => {
                    const driverObj = drivers.find(d => d.name === e.target.value);
                    setEditingTour({
                      ...editingTour,
                      driverName: e.target.value,
                      driverMobile: driverObj?.mobile || '',
                      vehicleNo: driverObj?.carNumber || '',
                      vehicleType: driverObj?.vehicleType || ''
                    });
                  }}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.name}>{d.name} ({d.vehicleType})</option>
                    ))}
                  </select>
                </div>
              </div>

              <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: '800', marginTop: '24px', color: 'var(--navy)' }}>Itinerary Plan</h4>
              {editingTour.itinerary?.map((day, idx) => {
                const hotelsInCity = hotels.filter(h => h.city === day.city);
                const activitiesInCity = activities.filter(a => a.city === day.city);

                return (
                  <div key={idx} className="itin-day-card" style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', marginBottom: '16px', backgroundColor: '#f8fafc' }}>
                    <div style={{ fontWeight: '700', marginBottom: '10px' }}>Day {day.day} ({day.dateStr})</div>
                    
                    <div className="mgmt-form-row" style={{ marginBottom: '12px' }}>
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>City Location</label>
                        <select className="mgmt-select" value={day.city} onChange={(e) => {
                          const updated = [...editingTour.itinerary];
                          updated[idx].city = e.target.value;
                          updated[idx].hotelName = '';
                          const cityObj = cities.find(c => c.name === e.target.value);
                          updated[idx].coverImage = cityObj?.imageUrl || '';
                          setEditingTour({ ...editingTour, itinerary: updated });
                        }}>
                          {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Overnight Hotel</label>
                        <select className="mgmt-select" value={day.hotelName} onChange={(e) => {
                          const updated = [...editingTour.itinerary];
                          updated[idx].hotelName = e.target.value;
                          const h = hotels.find(hotel => hotel.name === e.target.value);
                          updated[idx].hotelAddress = h?.address || '';
                          updated[idx].hotelMapLink = h?.mapUrl || '';
                          setEditingTour({ ...editingTour, itinerary: updated });
                        }}>
                          <option value="">No Hotel / In-Transit</option>
                          {hotelsInCity.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Activities Checklist (Select for Client View)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                          {activitiesInCity.map(act => {
                            const isSelected = day.activitiesList?.some(item => item.title === act.title);
                            return (
                              <button
                                key={act.id}
                                type="button"
                                onClick={() => {
                                  const updated = [...editingTour.itinerary];
                                  const list = day.activitiesList ? [...day.activitiesList] : [];
                                  const matchIndex = list.findIndex(item => item.title === act.title);
                                  if (matchIndex > -1) {
                                    list.splice(matchIndex, 1);
                                  } else {
                                    list.push({ time: '09:00 AM', title: act.title });
                                  }
                                  updated[idx].activitiesList = list;
                                  setEditingTour({ ...editingTour, itinerary: updated });
                                }}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  backgroundColor: isSelected ? 'var(--primary-light)' : 'white',
                                  color: isSelected ? 'var(--primary-dark)' : 'var(--text-secondary)',
                                  cursor: 'pointer'
                                }}
                              >
                                {isSelected ? '✓ ' : ''}{act.title}
                              </button>
                            );
                          })}
                        </div>

                        {/* Time inputs for selected activities */}
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {day.activitiesList?.length > 0 && (
                            <>
                              <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: '700' }}>⏰ Set Activity Times (shown to Driver & Client)</label>
                              {day.activitiesList.map((act, actIdx) => (
                                <div key={actIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                                  {/* Custom 24-hour time input — avoids AM/PM browser locale issue */}
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', minWidth: '90px' }}>
                                    <input
                                      type="number"
                                      min="0" max="23"
                                      style={{ width: '32px', padding: '2px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                      value={(() => {
                                        const t = act.time || '09:00';
                                        const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                                        if (match) {
                                          let h = parseInt(match[1]);
                                          const ampm = match[3].toUpperCase();
                                          if (ampm === 'PM' && h !== 12) h += 12;
                                          if (ampm === 'AM' && h === 12) h = 0;
                                          return String(h).padStart(2, '0');
                                        }
                                        return t.split(':')[0] || '09';
                                      })()}
                                      onChange={(e) => {
                                        const updated = [...editingTour.itinerary];
                                        const t = act.time || '09:00';
                                        const mins = t.includes(':') ? t.replace(/\s*(AM|PM)$/i,'').split(':')[1] || '00' : '00';
                                        const h = Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
                                        updated[idx].activitiesList[actIdx].time = `${String(h).padStart(2,'0')}:${mins}`;
                                        setEditingTour({ ...editingTour, itinerary: updated });
                                      }}
                                    />
                                    <span style={{ fontWeight: '800', fontSize: '1rem', color: '#1e293b', lineHeight: 1 }}>:</span>
                                    <input
                                      type="number"
                                      min="0" max="59"
                                      style={{ width: '32px', padding: '2px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                      value={(() => {
                                        const t = act.time || '09:00';
                                        const clean = t.replace(/\s*(AM|PM)$/i, '');
                                        return clean.split(':')[1] || '00';
                                      })()}
                                      onChange={(e) => {
                                        const updated = [...editingTour.itinerary];
                                        const t = act.time || '09:00';
                                        const hrs = t.includes(':') ? (() => {
                                          const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                                          if (match) {
                                            let h = parseInt(match[1]);
                                            const ampm = match[3].toUpperCase();
                                            if (ampm === 'PM' && h !== 12) h += 12;
                                            if (ampm === 'AM' && h === 12) h = 0;
                                            return String(h).padStart(2, '0');
                                          }
                                          return t.split(':')[0];
                                        })() : '09';
                                        const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                        updated[idx].activitiesList[actIdx].time = `${hrs}:${String(m).padStart(2,'0')}`;
                                        setEditingTour({ ...editingTour, itinerary: updated });
                                      }}
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    className="mgmt-input"
                                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.82rem', fontWeight: '600' }}
                                    value={act.title}
                                    onChange={(e) => {
                                      const updated = [...editingTour.itinerary];
                                      updated[idx].activitiesList[actIdx].title = e.target.value;
                                      setEditingTour({ ...editingTour, itinerary: updated });
                                    }}
                                    placeholder="Stop Name / Destination"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...editingTour.itinerary];
                                      updated[idx].activitiesList.splice(actIdx, 1);
                                      setEditingTour({ ...editingTour, itinerary: updated });
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.9rem' }}
                                  >✕</button>
                                </div>
                              ))}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...editingTour.itinerary];
                              if (!updated[idx].activitiesList) updated[idx].activitiesList = [];
                              updated[idx].activitiesList.push({ time: '09:00 AM', title: 'New Stop' });
                              setEditingTour({ ...editingTour, itinerary: updated });
                            }}
                            style={{
                              alignSelf: 'flex-start',
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              color: 'var(--primary)',
                              background: 'white',
                              border: '1px dashed var(--primary)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              marginTop: '4px',
                              fontWeight: '700'
                            }}
                          >
                            ➕ Add Custom Stop / Destination
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mgmt-form-row">
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Transport Mode</label>
                        <select className="mgmt-select" value={day.transport} onChange={(e) => {
                          const updated = [...editingTour.itinerary];
                          updated[idx].transport = e.target.value;
                          if (e.target.value !== 'By Flight') updated[idx].flightNo = '';
                          if (e.target.value !== 'By Train') updated[idx].trainNo = '';
                          setEditingTour({ ...editingTour, itinerary: updated });
                        }}>
                          <option value="By Surface">By Surface (Chauffeur Car)</option>
                          <option value="By Train">By Train</option>
                          <option value="By Flight">By Flight</option>
                        </select>
                      </div>
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Meal Plan</label>
                        <select className="mgmt-select" value={day.mealPlan} onChange={(e) => {
                          const updated = [...editingTour.itinerary];
                          updated[idx].mealPlan = e.target.value;
                          setEditingTour({ ...editingTour, itinerary: updated });
                        }}>
                          {MEAL_PLAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        {(day.mealPlan || '').includes('MAP') && (
                          <select className="mgmt-select" value={day.mapType || 'Dinner + Breakfast'} onChange={(e) => {
                            const updated = [...editingTour.itinerary];
                            updated[idx].mapType = e.target.value;
                            setEditingTour({ ...editingTour, itinerary: updated });
                          }} style={{ marginTop: '8px' }}>
                            <option value="Dinner + Breakfast">Dinner + Breakfast</option>
                            <option value="Lunch + Breakfast">Lunch + Breakfast</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Meal Plan Info Box */}
                    {(() => {
                      const mp = (day.mealPlan || '');
                      const mpType = (day.mapType || 'Dinner + Breakfast');
                      const isAP = mp.startsWith('AP') || mp.includes('Breakfast, Lunch');
                      const isMAP = !isAP && mp.startsWith('MAP');
                      const isCP = !isAP && !isMAP && (mp.startsWith('CP') || mp.includes('Breakfast Only'));
                      const isEP = !isAP && !isMAP && !isCP;
                      if (!isAP && !isMAP && !isCP) return null;
                      const checkInDay = day.dateStr || `Day ${day.day}`;
                      const nextDayDate = day.dateStr ? (() => {
                        const d = new Date(day.dateStr.split('-').reverse().join('-'));
                        d.setDate(d.getDate() + 1);
                        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                      })() : `Day ${(day.day || 0) + 1}`;
                      let checkInMeals, checkOutMeals;
                      if (isAP) { checkInMeals = 'Check in + Lunch + Dinner'; checkOutMeals = 'Breakfast + Check Out'; }
                      else if (isMAP && mpType === 'Lunch + Breakfast') { checkInMeals = 'Check in + Lunch'; checkOutMeals = 'Breakfast + Check Out'; }
                      else if (isMAP) { checkInMeals = 'Check in + Dinner'; checkOutMeals = 'Breakfast + Check Out'; }
                      else { checkInMeals = 'Check in'; checkOutMeals = 'Breakfast + Check Out'; }
                      return (
                        <div style={{ marginTop: '10px', padding: '10px 14px', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fcd34d', borderRadius: '10px', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🍽️ Meal Breakdown — {day.mealPlan}
                          </div>
                          <div style={{ color: '#78350f', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div>📅 <strong>{checkInDay}:</strong> {checkInMeals}</div>
                            <div>📅 <strong>{nextDayDate}:</strong> {checkOutMeals}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {day.transport === 'By Flight' && (
                      <div style={{ marginTop: '12px' }}>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>✈️ Flight Number</label>
                        <input className="mgmt-input" placeholder="e.g. AI 302" value={day.flightNo || ''} onChange={(e) => {
                          const updated = [...editingTour.itinerary];
                          updated[idx].flightNo = e.target.value;
                          setEditingTour({ ...editingTour, itinerary: updated });
                        }} />
                      </div>
                    )}
                    {day.transport === 'By Train' && (
                      <div style={{ marginTop: '12px' }}>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>🚆 Train Number</label>
                        <input className="mgmt-input" placeholder="e.g. 12952 Rajdhani" value={day.trainNo || ''} onChange={(e) => {
                          const updated = [...editingTour.itinerary];
                          updated[idx].trainNo = e.target.value;
                          setEditingTour({ ...editingTour, itinerary: updated });
                        }} />
                      </div>
                    )}

                    {/* Local Restaurant Selection */}
                    <div className="mgmt-form-row" style={{ marginTop: '12px' }}>
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>🍽️ Local Restaurant</label>
                        <select className="mgmt-select" value={day.localRestaurant || ''} onChange={(e) => {
                          const updated = [...editingTour.itinerary];
                          const rest = restaurants.find(r => r.name === e.target.value);
                          updated[idx].localRestaurant = e.target.value;
                          updated[idx].restaurantMealType = rest?.mealType || '';
                          updated[idx].restaurantMapUrl = rest?.mapUrl || '';
                          setEditingTour({ ...editingTour, itinerary: updated });
                        }}>
                          <option value="">No Restaurant Assigned</option>
                          {restaurants.map(r => (
                            <option key={r.id} value={r.name}>{r.name} ({r.mealType} - {r.cuisine})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Day Notes / Description (Brief Itinerary Text)</label>
                      <textarea className="mgmt-textarea" rows={2} value={day.activities} onChange={(e) => {
                        const updated = [...editingTour.itinerary];
                        updated[idx].activities = e.target.value;
                        setEditingTour({ ...editingTour, itinerary: updated });
                      }} />
                    </div>
                  </div>
                );
              })}
              
              <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', marginBottom: '20px' }}>
                <h3 style={{ color: '#166534', margin: 0, fontSize: '1.1rem' }}>🤖 Smart Driver Planner</h3>
                <p style={{ color: '#166534', margin: 0, fontSize: '0.85rem', textAlign: 'center', maxWidth: '600px' }}>
                  Click below to automatically generate step-by-step driver timelines for all days based on your text descriptions, hotels, and meals. You can manually edit the times above after generation.
                </p>
                <button type="button" onClick={handleAutoGenerateDriverPlannerForEditing} style={{ padding: '10px 20px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={16} /> Auto-Generate Driver Route
                </button>
              </div>

              <button 
                type="button" 
                onClick={async () => {
                  await updateTour(editingTour.tourCode, editingTour);
                  setEditingTour(null);
                  alert('Tour updated successfully live!');
                }} 
                className="btn-primary" 
                style={{ width: '100%', padding: '14px', borderRadius: '8px', fontWeight: '700', fontSize: '1rem', marginTop: '20px' }}
              >
                💾 Save Live Changes & Update Sync
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="portal-header">
        <div className="portal-brand">
          <img src="/maru_logo_transparent.png" alt="Maru Travel" style={{ height: '32px' }} />
          <span className="brand-text">MARU TRAVEL</span>
          <span style={{ fontSize: '0.65rem', background: '#22c55e', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 'bold' }}>v1.5.0-smart-planner</span>
        </div>
        <button onClick={async () => { await signOutGoogle(); onLogout(); }} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
          {language === 'KO' ? '로그아웃' : 'Logout'}
        </button>
      </header>

      <div className="portal-content-body">
        {/* Navigation Tabs */}
        <div className="mgmt-tabs">
          <button className={`mgmt-tab ${activeTab === 'dashboard' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('dashboard'); setShowAddForm(false); setSearchQuery(''); }}>
            <BarChart2 size={16} /> {t('mgmtDashboard')}
          </button>
          <button className={`mgmt-tab ${activeTab === 'cities' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('cities'); setShowAddForm(false); setSearchQuery(''); }}>
            <MapPin size={16} /> {t('mgmtCities')}
          </button>
          <button className={`mgmt-tab ${activeTab === 'activities' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('activities'); setShowAddForm(false); setSearchQuery(''); }}>
            <Compass size={16} /> {t('mgmtActivities')}
          </button>
          <button className={`mgmt-tab ${activeTab === 'hotels' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('hotels'); setShowAddForm(false); setSearchQuery(''); }}>
            <Hotel size={16} /> {t('mgmtHotels')}
          </button>
          <button className={`mgmt-tab ${activeTab === 'guides' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('guides'); setShowAddForm(false); setSearchQuery(''); }}>
            <Award size={16} /> {t('mgmtGuides')}
          </button>
          <button className={`mgmt-tab ${activeTab === 'drivers' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('drivers'); setShowAddForm(false); setSearchQuery(''); }}>
            <Car size={16} /> {t('mgmtDrivers')}
          </button>
          <button className={`mgmt-tab ${activeTab === 'restaurants' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('restaurants'); setShowAddForm(false); setSearchQuery(''); }}>
            <UtensilsCrossed size={16} /> Restaurants
          </button>
                    <button className={`mgmt-tab ${activeTab === 'liveTracking' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('liveTracking'); setShowAddForm(false); setSearchQuery(''); }}>
            <Navigation size={16} /> Live Tracking
          </button>
          <button className={`mgmt-tab ${activeTab === 'tourBuilder' ? 'mgmt-tab-active' : ''}`} onClick={() => { setActiveTab('tourBuilder'); setShowAddForm(false); }}>
            <Clipboard size={16} /> {t('mgmtTourBuilder')}
          </button>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="mgmt-content">
            <div className="mgmt-stat-grid">
              <div 
                className="mgmt-stat-card" 
                style={{ backgroundColor: '#f0fdfa', borderColor: '#ccfbf1', cursor: 'pointer', transition: 'transform 0.2s ease' }}
                onClick={() => { setActiveTab('cities'); setShowAddForm(false); setSearchQuery(''); }}
                title="View Cities"
              >
                <div className="mgmt-stat-icon-wrap" style={{ backgroundColor: '#ccfbf1', color: '#0d9488' }}><Compass size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{cities.length}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>{t('totalCities')}</p>
                </div>
              </div>
              <div 
                className="mgmt-stat-card" 
                style={{ backgroundColor: '#eff6ff', borderColor: '#e0e7ff', cursor: 'pointer', transition: 'transform 0.2s ease' }}
                onClick={() => { setActiveTab('hotels'); setShowAddForm(false); setSearchQuery(''); }}
                title="View Hotels"
              >
                <div className="mgmt-stat-icon-wrap" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}><Hotel size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{hotels.length}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>{t('totalHotels')}</p>
                </div>
              </div>
              <div 
                className="mgmt-stat-card" 
                style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7', cursor: 'pointer', transition: 'transform 0.2s ease' }}
                onClick={() => { setActiveTab('guides'); setShowAddForm(false); setSearchQuery(''); }}
                title="View Guides"
              >
                <div className="mgmt-stat-icon-wrap" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}><Award size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{guides.length}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>{t('totalGuides')}</p>
                </div>
              </div>
              <div 
                className="mgmt-stat-card" 
                style={{ backgroundColor: '#f7fee7', borderColor: '#ecfccb', cursor: 'pointer', transition: 'transform 0.2s ease' }}
                onClick={() => { setActiveTab('tourBuilder'); setShowAddForm(false); }}
                title="View Tours"
              >
                <div className="mgmt-stat-icon-wrap" style={{ backgroundColor: '#ecfccb', color: '#65a30d' }}><Clipboard size={24} /></div>
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{tours.filter(t => t.startDate).length}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>Total Tours</p>
                </div>
              </div>
            </div>

            {/* Dashboard Sub-Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid var(--border)' }}>
              <button
                onClick={() => setDashboardView('daily')}
                style={{
                  padding: '10px 24px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
                  border: 'none', background: 'none', color: dashboardView === 'daily' ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: dashboardView === 'daily' ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                📅 Daily Moment
              </button>
              <button
                onClick={() => setDashboardView('range')}
                style={{
                  padding: '10px 24px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer',
                  border: 'none', background: 'none', color: dashboardView === 'range' ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: dashboardView === 'range' ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                📦 All Packages
              </button>
            </div>

            {/* ====== DAILY MOMENT VIEW ====== */}
            {dashboardView === 'daily' && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div className="mgmt-form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <Calendar size={18} color="var(--primary)" />
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('selectDate')}:</span>
                    <input type="date" className="mgmt-input" style={{ width: 'auto', padding: '6px 12px' }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  </div>
                  
                  <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1', margin: '0 8px' }}></div>
                  
                  <div className="mgmt-form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>City:</span>
                    <select className="mgmt-select" style={{ width: 'auto', padding: '6px 12px', margin: 0 }} value={dashboardFilterCity} onChange={(e) => setDashboardFilterCity(e.target.value)}>
                      <option value="">All Cities</option>
                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="mgmt-form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Duty Type:</span>
                    <select className="mgmt-select" style={{ width: 'auto', padding: '6px 12px', margin: 0 }} value={dashboardFilterDutyType} onChange={(e) => setDashboardFilterDutyType(e.target.value)}>
                      <option value="">All Duties</option>
                      <option value="Arrival">🛬 Arrival</option>
                      <option value="Sightseeing">🏛️ Sightseeing</option>
                      <option value="Intercity Drive">🚗 Intercity Drive</option>
                      <option value="Leisure">🌴 Leisure / Free Time</option>
                      <option value="Departure">🛫 Departure</option>
                    </select>
                  </div>

                  {(dashboardFilterCity || dashboardFilterDutyType) && (
                    <button 
                      onClick={() => { setDashboardFilterCity(''); setDashboardFilterDutyType(''); }}
                      style={{ padding: '6px 12px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '14px', color: 'var(--navy)' }}>
                  {t('activeTours')} ({activeTours.length})
                </h3>

                {activeTours.length === 0 ? (
                  <div className="mgmt-empty-state">
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>{t('noActiveTours')}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {activeTours.filter(tour => {
                      const startDateObj = new Date(tour.startDate);
                      const currDateObj = new Date(selectedDate);
                      const dayIndex = Math.floor((currDateObj - startDateObj) / (1000 * 3600 * 24));
                      const currentDayItinerary = tour.itinerary?.[dayIndex] || null;
                      
                      if (dashboardFilterCity && currentDayItinerary?.city !== dashboardFilterCity) return false;
                      if (dashboardFilterDutyType && currentDayItinerary?.dayNature !== dashboardFilterDutyType) return false;
                      return true;
                    }).map((tour) => {
                      const isExpanded = expandedTourCode === tour.tourCode;
                      const startDateObj = new Date(tour.startDate);
                      const currDateObj = new Date(selectedDate);
                      const dayIndex = Math.floor((currDateObj - startDateObj) / (1000 * 3600 * 24));
                      const currentDayItinerary = tour.itinerary?.[dayIndex] || null;

                      return (
                        <div key={tour.tourCode} className="mgmt-card" style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <div>
                              <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--navy)' }}>{tour.tourName} ({tour.tourCode})</h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Guest: {tour.clientName} ({tour.pax} Pax) {formatTourRooms(tour)}</p>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: '600' }}>
                                  📍 {currentDayItinerary?.city || 'Not Specified'}
                                </span>
                                {currentDayItinerary?.dayNature && (
                                  <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                                    {currentDayItinerary.dayNature}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.82rem' }} onClick={() => setPrintTour(tour)}>
                                <Printer size={14} /> Print PDF
                              </button>
                              <button className="btn-ghost" onClick={() => setExpandedTourCode(isExpanded ? null : tour.tourCode)}>
                                {isExpanded ? 'Collapse' : 'Manage Crew'}
                              </button>
                              <button className="btn-ghost" onClick={() => { if (confirm('Are you sure you want to delete this tour?')) handleDeleteTourItem(tour.tourCode); }} style={{ color: 'var(--danger)', padding: '6px' }} title="Delete Tour">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Flight Status Tracking & Instant Shift */}
                          {currentDayItinerary?.flightNo && (
                            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>FLIGHT TRACKING</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                  <span style={{ fontWeight: '800', color: 'var(--navy)' }}>{currentDayItinerary.flightNo}</span>
                                  <span style={{ fontSize: '0.8rem', color: '#10B981', background: '#10B98115', padding: '2px 8px', borderRadius: '12px', fontWeight: '800' }}>
                                    Live on FlightRadar24
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                  onClick={() => trackFlight(currentDayItinerary.flightNo)}
                                  style={{ padding: '6px 12px', backgroundColor: '#3B82F6', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'white', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
                                >
                                  ✈️ View on FlightRadar24
                                </button>
                                <button 
                                  onClick={() => openInstantShift(tour, dayIndex, currentDayItinerary.flightNo)}
                                  style={{ padding: '6px 12px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)' }}
                                >
                                  🚨 Instant Shift
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Inter-city Transfer Info & Driver Assignment */}
                          {currentDayItinerary?.interCityTransfer && (
                            <div style={{ marginTop: '12px', padding: '14px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #93c5fd', borderRadius: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                  <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>🔄 Inter-city Transfer Today</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <select
                                      value={currentDayItinerary.transferOrigin || ''}
                                      onChange={async (e) => {
                                        const updatedItinerary = tour.itinerary.map((d, i) =>
                                          i === dayIndex ? { ...d, transferOrigin: e.target.value } : d
                                        );
                                        await updateTour(tour.tourCode, { itinerary: updatedItinerary });
                                      }}
                                      style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e3a8a', border: '1px solid #93c5fd', borderRadius: '6px', padding: '4px 8px', width: '120px', background: 'white' }}
                                    >
                                      <option value="">Origin City</option>
                                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <span style={{ color: '#2563eb', fontSize: '1.2rem', fontWeight: '900' }}>→</span>
                                    <select
                                      value={currentDayItinerary.transferDestination || ''}
                                      onChange={async (e) => {
                                        const updatedItinerary = tour.itinerary.map((d, i) =>
                                          i === dayIndex ? { ...d, transferDestination: e.target.value } : d
                                        );
                                        await updateTour(tour.tourCode, { itinerary: updatedItinerary });
                                      }}
                                      style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e3a8a', border: '1px solid #93c5fd', borderRadius: '6px', padding: '4px 8px', width: '120px', background: 'white' }}
                                    >
                                      <option value="">Dest. City</option>
                                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div style={{ minWidth: '180px' }}>
                                  <label style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', color: '#1d4ed8', display: 'block', marginBottom: '4px' }}>🚗 Leg 1 Origin Driver</label>
                                  <select
                                    className="mgmt-select"
                                    value={currentDayItinerary.transferDriverName || ''}
                                    onChange={async (e) => {
                                      const driverName = e.target.value;
                                      const driverObj = drivers.find(d => d.name === driverName);
                                      const driverMobile = driverObj ? driverObj.mobile : '';
                                      const updatedItinerary = tour.itinerary.map((d, i) =>
                                        i === dayIndex ? { ...d, transferDriverName: driverName, transferDriverMobile: driverMobile } : d
                                      );
                                      await updateTour(tour.tourCode, { itinerary: updatedItinerary });
                                    }}
                                    style={{ marginBottom: '4px' }}
                                  >
                                    <option value="">Assign Leg 1 Driver...</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.name}>{d.name} ({d.vehicleType || d.type})</option>
                                    ))}
                                  </select>
                                  {currentDayItinerary.transferDriverName && (
                                    <button 
                                      onClick={() => {
                                        const t = { ...tour, driverName: currentDayItinerary.transferDriverName, driverMobile: currentDayItinerary.transferDriverMobile };
                                        handleSendDutyToWhatsApp(t, 'driver');
                                      }}
                                      style={{ padding: '4px 8px', backgroundColor: '#25D366', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}
                                      title="Send Leg 1 duty to WhatsApp"
                                    >
                                      📱 WhatsApp (Leg 1)
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Leg 1 Departure Status */}
                              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e3a8a' }}>Origin Leg Departure Status:</span>
                                {currentDayItinerary.transferDepartureDone ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#166534', background: '#dcfce7', padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <CheckCircle2 size={14} /> Completed
                                    </span>
                                    <button
                                      onClick={async () => {
                                        if (confirm(`Undo Leg 1 Departure Completion? This will restore the drop-off task for ${currentDayItinerary.transferDriverName || 'Origin Driver'} and hide the tour for ${currentDayItinerary.destTransferDriverName || 'Leg 2 Driver'}.`)) {
                                          const updatedItinerary = tour.itinerary.map((d, i) =>
                                            i === dayIndex ? { ...d, transferDepartureDone: false } : d
                                          );
                                          await updateTour(tour.tourCode, { itinerary: updatedItinerary });
                                        }
                                      }}
                                      style={{ padding: '4px 8px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      ↩️ Undo
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Mark Leg 1 Departure as Completed for ${currentDayItinerary.transferOrigin}? This will remove the tour from the Origin Driver's app.`)) {
                                        const updatedItinerary = tour.itinerary.map((d, i) =>
                                          i === dayIndex ? { ...d, transferDepartureDone: true, transferDepartureTime: new Date().toISOString() } : d
                                        );
                                        await updateTour(tour.tourCode, { itinerary: updatedItinerary });
                                      }
                                    }}
                                    style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}
                                  >
                                    Mark Departure Done
                                  </button>
                                )}
                              </div>
                              
                              {/* Leg 2 Destination Driver (Only visible if Leg 1 is completed) */}
                              {currentDayItinerary.transferDepartureDone && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                  <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: '800', textTransform: 'uppercase' }}>🛬 Leg 2 Pick-up Driver</div>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select
                                      className="mgmt-select"
                                      value={currentDayItinerary.destTransferDriverName || ''}
                                      onChange={async (e) => {
                                        const driverName = e.target.value;
                                        const driverObj = drivers.find(d => d.name === driverName);
                                        const driverMobile = driverObj ? driverObj.mobile : '';
                                        const updatedItinerary = tour.itinerary.map((d, i) =>
                                          i === dayIndex ? { ...d, destTransferDriverName: driverName, destTransferDriverMobile: driverMobile } : d
                                        );
                                        await updateTour(tour.tourCode, { itinerary: updatedItinerary });
                                      }}
                                      style={{ marginBottom: 0, minWidth: '150px' }}
                                    >
                                      <option value="">Assign Leg 2 Driver...</option>
                                      {drivers.map(d => (
                                        <option key={d.id} value={d.name}>{d.name} ({d.vehicleType || d.type})</option>
                                      ))}
                                    </select>
                                    {currentDayItinerary.destTransferDriverName && (
                                      <button 
                                        onClick={() => {
                                          const t = { ...tour, driverName: currentDayItinerary.destTransferDriverName, driverMobile: currentDayItinerary.destTransferDriverMobile };
                                          handleSendDutyToWhatsApp(t, 'driver');
                                        }}
                                        style={{ padding: '4px 8px', backgroundColor: '#25D366', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}
                                        title="Send Leg 2 duty to WhatsApp"
                                      >
                                        📱 WhatsApp
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isExpanded && (
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                  <label style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{t('guide')}</label>
                                  <select className="mgmt-select" value={tour.guideName} onChange={(e) => handleSwapGuide(tour.tourCode, e.target.value)}>
                                    <option value="">Select Guide</option>
                                    {guides.map(g => {
                                      const isBusy = isGuideBusyOnDates(g.name, tour.startDate, tour.endDate);
                                      return (
                                        <option key={g.id} value={g.name}>
                                          {g.name} {isBusy ? `(${t('busyStatus')})` : `(${t('availableStatus')})`}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  {tour.guideName && (
                                    <button 
                                      onClick={() => handleSendDutyToWhatsApp(tour, 'guide')}
                                      style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#25D366', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 'bold', width: '100%', justifyContent: 'center' }}
                                      title="Send full duty details directly via WhatsApp (Free)"
                                    >
                                      📱 Send Duty to WhatsApp
                                    </button>
                                  )}
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{t('driver')}</label>
                                  <select className="mgmt-select" value={tour.driverName} onChange={(e) => handleSwapDriver(tour.tourCode, e.target.value)}>
                                    <option value="">Select Driver</option>
                                    {drivers.map(d => (
                                      <option key={d.id} value={d.name}>
                                        {d.name} ({d.vehicleType || d.type})
                                      </option>
                                    ))}
                                  </select>
                                  {tour.driverName && (
                                    <button 
                                      onClick={() => handleSendDutyToWhatsApp(tour, 'driver')}
                                      style={{ marginTop: '8px', padding: '6px 12px', backgroundColor: '#25D366', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 'bold', width: '100%', justifyContent: 'center' }}
                                      title="Send full duty details directly via WhatsApp (Free)"
                                    >
                                      📱 Send Duty to WhatsApp
                                    </button>
                                  )}
                                </div>
                              </div>
                              <button 
                                className="btn-primary" 
                                style={{ marginTop: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
                                onClick={() => setEditingTour(JSON.parse(JSON.stringify(tour)))}
                              >
                                ✏️ Edit Tour Itinerary & Details
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ====== ALL PACKAGES (DATE RANGE + CITY FILTER) VIEW ====== */}
            {dashboardView === 'range' && (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', marginBottom: '20px', padding: '16px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>From:</span>
                    <input type="date" className="mgmt-input" style={{ width: '160px', padding: '6px 12px' }} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>To:</span>
                    <input type="date" className="mgmt-input" style={{ width: '160px', padding: '6px 12px' }} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>City:</span>
                    <select className="mgmt-select" style={{ width: '180px', padding: '6px 12px' }} value={rangeCityFilter} onChange={(e) => setRangeCityFilter(e.target.value)}>
                      <option value="">All Cities</option>
                      {allTourCities.sort().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: '0.82rem' }} onClick={() => { setRangeFrom(''); setRangeTo(''); setRangeCityFilter(''); }}>
                    Clear Filters
                  </button>
                </div>

                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '14px', color: 'var(--navy)' }}>
                  All Packages ({rangeTours.length})
                </h3>

                {rangeTours.length === 0 ? (
                  <div className="mgmt-empty-state">
                    <Clipboard size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No packages found for the selected filters.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {rangeTours.map((tour) => (
                      <div key={tour.tourCode} className="mgmt-card" style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--navy)' }}>{tour.tourName} ({tour.tourCode})</h4>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {tour.clientName} • {tour.pax} Pax {formatTourRooms(tour)} • {tour.startDate} → {tour.endDate}
                            </p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '4px' }}>
                              Cities: {[...new Set((tour.itinerary || []).map(d => d.city).filter(Boolean))].join(' → ')}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setPrintTour(tour)}>
                              <Printer size={14} /> Print
                            </button>
                            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => setEditingTour(JSON.parse(JSON.stringify(tour)))}>
                              ✏️ Edit
                            </button>
                            <button className="btn-ghost" onClick={() => { if (confirm('Are you sure you want to delete this tour?')) handleDeleteTourItem(tour.tourCode); }} style={{ color: 'var(--danger)', padding: '6px' }} title="Delete Tour">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: CITIES */}
        {activeTab === 'cities' && (
          <div className="mgmt-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div className="mgmt-search-bar" style={{ marginBottom: 0 }}>
                <Compass size={18} />
                <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={16} /> {showAddForm ? t('close') : t('addCity')}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddCity} className="mgmt-form">
                <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: '800' }}>{t('addCity')}</h3>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('cityName')}</label>
                    <input className="mgmt-input" required value={newCity.name} onChange={(e) => setNewCity({ ...newCity, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('cityTagline')}</label>
                    <input className="mgmt-input" value={newCity.tagline} onChange={(e) => setNewCity({ ...newCity, tagline: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('bestTime')}</label>
                    <input className="mgmt-input" value={newCity.bestTime} onChange={(e) => setNewCity({ ...newCity, bestTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('languages')}</label>
                    <input className="mgmt-input" value={newCity.language} onChange={(e) => setNewCity({ ...newCity, language: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('currencyLabel')}</label>
                    <input className="mgmt-input" value={newCity.currency} onChange={(e) => setNewCity({ ...newCity, currency: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('transportOptions')}</label>
                    <input className="mgmt-input" value={newCity.transport} onChange={(e) => setNewCity({ ...newCity, transport: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('cityDescription')}</label>
                  <textarea className="mgmt-textarea" rows={3} value={newCity.description} onChange={(e) => setNewCity({ ...newCity, description: e.target.value })} />
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('imageUrl')}</label>
                    <input className="mgmt-input" value={newCity.imageUrl} onChange={(e) => setNewCity({ ...newCity, imageUrl: e.target.value })} onPaste={(e) => handleImagePaste(e, (url) => setNewCity({ ...newCity, imageUrl: url }))} placeholder="Paste Image (Ctrl+V) or Enter URL" />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('googleMapsUrl')}</label>
                    <input className="mgmt-input" value={newCity.mapUrl} onChange={(e) => setNewCity({ ...newCity, mapUrl: e.target.value })} />
                  </div>
                </div>
                
<button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>{t('save')}</button>
              </form>
            )}

            <div className="mgmt-grid">
              {filteredCities.map((city) => (
                <div key={city.id} className="mgmt-card">
                  <div className="mgmt-card-img" style={{ backgroundImage: `url(${city.imageUrl || 'https://images.unsplash.com/photo-1596422847122-c3255789f9a3?w=800'})` }} />
                  <div className="mgmt-card-body">
                    <h4 className="mgmt-card-title">{city.name}</h4>
                    <p className="mgmt-card-subtitle">{city.tagline}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {city.description}
                    </p>
                    <div className="mgmt-card-actions">
                      <button className="btn-ghost" onClick={() => { if (confirm(t('confirmDelete'))) deleteCity(city.id); }} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVITIES */}
        {activeTab === 'activities' && (
          <div className="mgmt-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '500px' }}>
                <select className="mgmt-select" style={{ width: '180px' }} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="mgmt-search-bar" style={{ marginBottom: 0, flex: 1 }}>
                  <Compass size={18} />
                  <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={16} /> {showAddForm ? t('close') : t('addActivity')}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddActivity} className="mgmt-form">
                <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: '800' }}>{t('addActivity')}</h3>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('city')}</label>
                    <select className="mgmt-select" required value={newActivity.city} onChange={(e) => setNewActivity({ ...newActivity, city: e.target.value })}>
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('activityTitle')}</label>
                    <input className="mgmt-input" required value={newActivity.title} onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('estimatedTime')}</label>
                    <input className="mgmt-input" value={newActivity.time} onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('imageUrl')}</label>
                     <input className="mgmt-input" value={newActivity.imageUrl} onChange={(e) => setNewActivity({ ...newActivity, imageUrl: e.target.value })} onPaste={(e) => handleImagePaste(e, (url) => setNewActivity({ ...newActivity, imageUrl: url }))} placeholder="Paste Image (Ctrl+V) or Enter URL" />
                  </div>
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('activityDesc')}</label>
                  <textarea className="mgmt-textarea" rows={3} value={newActivity.description} onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })} />
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>{t('save')}</button>
              </form>
            )}

            <div className="mgmt-grid">
              {filteredActivities.map((act) => (
                <div key={act.id} className="mgmt-card">
                  <div className="mgmt-card-img" style={{ backgroundImage: `url(${act.imageUrl || 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800'})` }}>
                    <span className="mgmt-card-badge"><Calendar size={12} /> {act.time}</span>
                  </div>
                  <div className="mgmt-card-body">
                    <h4 className="mgmt-card-title">{act.title}</h4>
                    <p className="mgmt-card-subtitle">{act.city}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>{act.description}</p>
                    <div className="mgmt-card-actions">
                      <button className="btn-ghost" onClick={() => { if (confirm(t('confirmDelete'))) deleteActivity(act.id); }} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: HOTELS */}
        {activeTab === 'hotels' && (
          <div className="mgmt-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '500px' }}>
                <select className="mgmt-select" style={{ width: '180px' }} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="mgmt-search-bar" style={{ marginBottom: 0, flex: 1 }}>
                  <Compass size={18} />
                  <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={16} /> {showAddForm ? t('close') : t('addHotel')}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddHotel} className="mgmt-form">
                <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: '800' }}>{t('addHotel')}</h3>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('city')}</label>
                    <select className="mgmt-select" required value={newHotel.city} onChange={(e) => setNewHotel({ ...newHotel, city: e.target.value })}>
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('hotelName')}</label>
                    <input className="mgmt-input" required value={newHotel.name} onChange={(e) => setNewHotel({ ...newHotel, name: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('starRating')}</label>
                    <select className="mgmt-select" value={newHotel.stars} onChange={(e) => setNewHotel({ ...newHotel, stars: parseInt(e.target.value) })}>
                      <option value={3}>3 Star Comfort</option>
                      <option value={4}>4 Star Premium</option>
                      <option value={5}>5 Star Luxury</option>
                    </select>
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>{t('receptionPhone')}</label>
                    <input className="mgmt-input" value={newHotel.phone} onChange={(e) => setNewHotel({ ...newHotel, phone: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Address</label>
                    <input className="mgmt-input" value={newHotel.address} onChange={(e) => setNewHotel({ ...newHotel, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Check In/Out Times</label>
                    <input className="mgmt-input" value={newHotel.checkInOut} onChange={(e) => setNewHotel({ ...newHotel, checkInOut: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>{t('amenitiesLabel')}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {Object.keys(newHotel.amenities).map((am) => (
                      <label key={am} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        <input type="checkbox" checked={newHotel.amenities[am]} onChange={(e) => setNewHotel({
                          ...newHotel,
                          amenities: { ...newHotel.amenities, [am]: e.target.checked }
                        })} />
                        {am}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Image URL</label>
                     <input className="mgmt-input" value={newHotel.imageUrl} onChange={(e) => setNewHotel({ ...newHotel, imageUrl: e.target.value })} onPaste={(e) => handleImagePaste(e, (url) => setNewHotel({ ...newHotel, imageUrl: url }))} placeholder="Paste Image (Ctrl+V) or Enter URL" />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Google Maps URL</label>
                    <input className="mgmt-input" value={newHotel.mapUrl} onChange={(e) => setNewHotel({ ...newHotel, mapUrl: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>{t('save')}</button>
              </form>
            )}

            <div className="mgmt-grid">
              {filteredHotels.map((hotel) => (
                <div key={hotel.id} className="mgmt-card">
                  <div className="mgmt-card-img" style={{ backgroundImage: `url(${hotel.imageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800'})` }}>
                    <span className="mgmt-card-badge" style={{ color: '#eab308' }}>
                      <Star size={12} fill="currentColor" /> {hotel.stars} Stars
                    </span>
                  </div>
                  <div className="mgmt-card-body">
                    <h4 className="mgmt-card-title">{hotel.name}</h4>
                    <p className="mgmt-card-subtitle">{hotel.city}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Phone: {hotel.phone}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Address: {hotel.address}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                      {Array.isArray(hotel.amenities) && hotel.amenities.map(am => (
                        <span key={am} style={{ fontSize: '0.68rem', backgroundColor: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>{am}</span>
                      ))}
                    </div>

                    <div className="mgmt-card-actions">
                      <button className="btn-ghost" onClick={() => { if (confirm(t('confirmDelete'))) deleteHotel(hotel.id); }} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: GUIDES */}
        {activeTab === 'guides' && (
          <div className="mgmt-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div className="mgmt-search-bar" style={{ marginBottom: 0 }}>
                <Compass size={18} />
                <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={16} /> {showAddForm ? t('close') : 'Add New Guide'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddGuide} className="mgmt-form">
                <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: '800' }}>Add New Guide</h3>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Guide Name</label>
                    <input className="mgmt-input" required value={newGuide.name} onChange={(e) => setNewGuide({ ...newGuide, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Mobile Number</label>
                    <input className="mgmt-input" required value={newGuide.mobile} onChange={(e) => setNewGuide({ ...newGuide, mobile: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>{t('save')}</button>
              </form>
            )}

            <div className="mgmt-grid">
              {guides.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())).map((g) => {
                const busyList = guideBusyStates[g.name] || [];
                const isCurrentlyBusy = busyList.some(b => {
                  const now = new Date();
                  return now >= new Date(b.startDate) && now <= new Date(b.endDate);
                });

                return (
                  <div key={g.id} className="mgmt-card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontWeight: '700', color: 'var(--navy)' }}>{g.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Mobile: {g.mobile}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        {isCurrentlyBusy ? (
                          <span className="busy-badge">BUSY</span>
                        ) : (
                          <span className="available-badge">AVAILABLE</span>
                        )}
                        <button className="btn-ghost" onClick={() => { if (confirm(t('confirmDelete'))) deleteGuide(g.id); }} style={{ color: 'var(--danger)', padding: '4px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: DRIVERS */}
        {activeTab === 'drivers' && (
          <div className="mgmt-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div className="mgmt-search-bar" style={{ marginBottom: 0 }}>
                <Compass size={18} />
                <input type="text" placeholder={t('searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={16} /> {showAddForm ? t('close') : 'Add New Driver'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddDriver} className="mgmt-form">
                <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: '800' }}>Add New Driver</h3>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Driver Name</label>
                    <input className="mgmt-input" required value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Mobile Number</label>
                    <input className="mgmt-input" required value={newDriver.mobile} onChange={(e) => setNewDriver({ ...newDriver, mobile: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Vehicle Registration Number</label>
                    <input className="mgmt-input" required value={newDriver.carNumber} onChange={(e) => setNewDriver({ ...newDriver, carNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Vehicle Type</label>
                    <select className="mgmt-select" value={newDriver.vehicleType} onChange={(e) => setNewDriver({ ...newDriver, vehicleType: e.target.value })}>
                      <option value="Toyota Innova Crysta (SUV)">Toyota Innova Crysta (SUV)</option>
                      <option value="Tempo Traveller (Mini Bus)">Tempo Traveller (Mini Bus)</option>
                      <option value="Force Urbania (Luxury Van)">Force Urbania (Luxury Van)</option>
                      <option value="Toyota Etios (Sedan)">Toyota Etios (Sedan)</option>
                      <option value="Mercedes Benz (Luxury Sedan)">Mercedes Benz (Luxury Sedan)</option>
                      <option value="Maruti Ertiga (Hatchback)">Maruti Ertiga (Hatchback)</option>
                      <option value="Toyota Fortuner (Premium SUV)">Toyota Fortuner (Premium SUV)</option>
                      <option value="Volvo Bus (Large Coach)">Volvo Bus (Large Coach)</option>
                      <option value="Mini Coach (Medium Bus)">Mini Coach (Medium Bus)</option>
                      <option value="Swift Dzire (Sedan)">Swift Dzire (Sedan)</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>{t('save')}</button>
              </form>
            )}

            <div className="mgmt-grid">
              {drivers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map((d) => (
                <div key={d.id} className="mgmt-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontWeight: '700', color: 'var(--navy)' }}>{d.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Reg: {d.carNumber || d.reg}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type: {d.vehicleType || d.type}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mobile: {d.mobile}</p>
                    </div>
                    <button className="btn-ghost" onClick={() => { if (confirm(t('confirmDelete'))) deleteDriver(d.id); }} style={{ color: 'var(--danger)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: RESTAURANTS */}
        {activeTab === 'restaurants' && (
          <div className="mgmt-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '500px' }}>
                <select className="mgmt-select" style={{ width: '180px' }} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <div className="mgmt-search-bar" style={{ marginBottom: 0, flex: 1 }}>
                  <UtensilsCrossed size={18} />
                  <input type="text" placeholder="Search restaurants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={16} /> {showAddForm ? t('close') : 'Add Restaurant'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddRestaurant} className="mgmt-form">
                <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: '800' }}>Add Local Restaurant</h3>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>City</label>
                    <select className="mgmt-select" required value={newRestaurant.city} onChange={(e) => setNewRestaurant({ ...newRestaurant, city: e.target.value })}>
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Restaurant Name</label>
                    <input className="mgmt-input" required value={newRestaurant.name} onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Meal Type</label>
                    <select className="mgmt-select" value={newRestaurant.mealType} onChange={(e) => setNewRestaurant({ ...newRestaurant, mealType: e.target.value })}>
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Cuisine Type</label>
                    <input className="mgmt-input" placeholder="e.g. Indian, Korean, Chinese" value={newRestaurant.cuisine} onChange={(e) => setNewRestaurant({ ...newRestaurant, cuisine: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Address</label>
                    <input className="mgmt-input" value={newRestaurant.address} onChange={(e) => setNewRestaurant({ ...newRestaurant, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Phone</label>
                    <input className="mgmt-input" value={newRestaurant.phone} onChange={(e) => setNewRestaurant({ ...newRestaurant, phone: e.target.value })} />
                  </div>
                </div>
                <div className="mgmt-form-row">
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Google Maps URL</label>
                    <input className="mgmt-input" value={newRestaurant.mapUrl} onChange={(e) => setNewRestaurant({ ...newRestaurant, mapUrl: e.target.value })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)' }}>Image URL</label>
                    <input className="mgmt-input" value={newRestaurant.imageUrl} onChange={(e) => setNewRestaurant({ ...newRestaurant, imageUrl: e.target.value })} onPaste={(e) => handleImagePaste(e, (url) => setNewRestaurant({ ...newRestaurant, imageUrl: url }))} placeholder="Paste Image (Ctrl+V) or Enter URL" />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>{t('save')}</button>
              </form>
            )}

            <div className="mgmt-grid">
              {restaurants.filter(r => {
                const matchesCity = cityFilter ? r.city === cityFilter : true;
                const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesCity && matchesSearch;
              }).map((r) => (
                <div key={r.id} className="mgmt-card" style={{ padding: '16px' }}>
                  {r.imageUrl && <div className="mgmt-card-img" style={{ backgroundImage: `url(${r.imageUrl})` }}>
                    <span className="mgmt-card-badge"><UtensilsCrossed size={12} /> {r.mealType}</span>
                  </div>}
                  <div className="mgmt-card-body">
                    <h4 className="mgmt-card-title">{r.name}</h4>
                    <p className="mgmt-card-subtitle">{r.city} • {r.cuisine}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{r.address}</p>
                    {r.phone && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📞 {r.phone}</p>}
                    <div className="mgmt-card-actions">
                      {r.mapUrl && <a href={r.mapUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '0.75rem' }}>📍 Map</a>}
                      <button className="btn-ghost" onClick={() => { if (confirm(t('confirmDelete'))) deleteRestaurant(r.id); }} style={{ color: 'var(--danger)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: LIVE TRACKING */}
        {activeTab === 'liveTracking' && (() => {
          const activeToursList = tours.filter(t => {
            // Get today's date in IST (India Standard Time, +05:30)
            const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
            const today = nowIST.toISOString().split('T')[0];
            return t.startDate <= today && t.endDate >= today;
          });

          // Compile markers for LeafletMap
          const activeMarkers = [];
          activeToursList.forEach(tour => {
            const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
            const todayStr = nowIST.toISOString().split('T')[0];
            const startDateObj = new Date(tour.startDate);
            const todayDateObj = new Date(todayStr);
            const dayIndex = Math.floor((todayDateObj - startDateObj) / (1000 * 3600 * 24));
            const currentDayItinerary = tour.itinerary?.[dayIndex] || null;

            let activeDriverName = tour.driverName || 'Not Assigned';
            let activeDriverType = 'Main Driver';

            if (tour.itinerary && tour.itinerary.length > 0) {
              for (let i = 0; i < tour.itinerary.length; i++) {
                const day = tour.itinerary[i];
                if (day.interCityTransfer) {
                  if (dayIndex < i) {
                    if (day.transferDriverName) {
                      activeDriverName = day.transferDriverName;
                      activeDriverType = 'Leg 1 (Origin)';
                    }
                    break;
                  } else if (dayIndex === i) {
                    if (day.transferDepartureDone) {
                      if (day.destTransferDriverName) {
                        activeDriverName = day.destTransferDriverName;
                        activeDriverType = 'Leg 2 (Dest)';
                      }
                    } else {
                      if (day.transferDriverName) {
                        activeDriverName = day.transferDriverName;
                        activeDriverType = 'Leg 1 (Origin)';
                      }
                    }
                    break;
                  } else {
                    if (day.destTransferDriverName) {
                      activeDriverName = day.destTransferDriverName;
                      activeDriverType = 'Leg 2 (Dest)';
                    }
                  }
                }
              }
            }

            const locs = liveLocations[tour.tourCode] || {};
            const driverLoc = normalizeTrackingLocation(locs.driver);
            const guideLoc = normalizeTrackingLocation(locs.guide);

            if (driverLoc) {
              const driverGps = getGpsStatus(driverLoc, 'Driver');
              activeMarkers.push({
                id: `${tour.tourCode}_driver`,
                lat: driverLoc.lat,
                lng: driverLoc.lng,
                title: `${activeDriverName} (${activeDriverType} - ${tour.tourCode})`,
                subtitle: `${tour.tourName} | status: ${driverGps.badgeText}`,
                type: 'driver',
                status: driverGps.status
              });
            }

            if (guideLoc) {
              const guideGps = getGpsStatus(guideLoc, 'Guide');
              activeMarkers.push({
                id: `${tour.tourCode}_guide`,
                lat: guideLoc.lat,
                lng: guideLoc.lng,
                title: `${tour.guideName || 'Guide'} (Guide - ${tour.tourCode})`,
                subtitle: `${tour.tourName} | status: ${guideGps.badgeText}`,
                type: 'guide',
                status: guideGps.status
              });
            }
          });

          return (
            <div className="mgmt-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--navy)' }}>Live Fleet Tracking</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '20px' }}>
                  <span className="live-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginRight: '6px', animation: 'pulse 1.5s infinite' }}></span>
                  Real-time Sync Active
                </span>
              </div>

              {/* Leaflet Live Fleet Map */}
              <div style={{ height: '380px', marginBottom: '24px', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-md)', border: '1px solid #e2e8f0' }}>
                <LeafletMap markers={activeMarkers} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeToursList.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    <Navigation size={48} style={{ opacity: 0.2, margin: '0 auto 10px auto' }} />
                    <p style={{ fontWeight: '700' }}>No active tours happening today.</p>
                  </div>
                )}

                {activeToursList.map(tour => {
                  const nowIST = new Date(Date.now() + (5.5 * 60 * 60 * 1000));
                  const todayStr = nowIST.toISOString().split('T')[0];
                  const startDateObj = new Date(tour.startDate);
                  const todayDateObj = new Date(todayStr);
                  const dayIndex = Math.floor((todayDateObj - startDateObj) / (1000 * 3600 * 24));
                  const currentDayItinerary = tour.itinerary?.[dayIndex] || null;

                  let activeDriverName = tour.driverName || 'Not Assigned';
                  let activeDriverType = 'Main Driver';

                  if (tour.itinerary && tour.itinerary.length > 0) {
                    for (let i = 0; i < tour.itinerary.length; i++) {
                      const day = tour.itinerary[i];
                      if (day.interCityTransfer) {
                        if (dayIndex < i) {
                          if (day.transferDriverName) {
                            activeDriverName = day.transferDriverName;
                            activeDriverType = 'Leg 1 (Origin)';
                          }
                          break;
                        } else if (dayIndex === i) {
                          if (day.transferDepartureDone) {
                            if (day.destTransferDriverName) {
                              activeDriverName = day.destTransferDriverName;
                              activeDriverType = 'Leg 2 (Dest)';
                            }
                          } else {
                            if (day.transferDriverName) {
                              activeDriverName = day.transferDriverName;
                              activeDriverType = 'Leg 1 (Origin)';
                            }
                          }
                          break;
                        } else {
                          if (day.destTransferDriverName) {
                            activeDriverName = day.destTransferDriverName;
                            activeDriverType = 'Leg 2 (Dest)';
                          }
                        }
                      }
                    }
                  }

                  const locs = liveLocations[tour.tourCode] || {};
                  const driverLoc = normalizeTrackingLocation(locs.driver);
                  const guideLoc = normalizeTrackingLocation(locs.guide);
                  const driverGps = getGpsStatus(driverLoc, 'Driver');
                  const guideGps = getGpsStatus(guideLoc, 'Guide');
                  
                  return (
                    <div key={tour.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '1px' }}>{tour.tourCode}</span>
                          <h3 style={{ margin: '2px 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--navy)' }}>{tour.tourName}</h3>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}><Users size={12} style={{marginRight:'4px', verticalAlign:'middle'}}/>{tour.clientName} ({tour.pax} Pax)</span>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {dayIndex >= (tour.itinerary?.length || 0) - 2 && (
                            <button 
                              title="Delete saved location data for this tour"
                              onClick={() => handleDeleteLocationData(tour.tourCode)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#ef4444' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px' }}>Active Today</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Driver Status */}
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Car size={16} color="#059669" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span 
                                style={{ 
                                  fontSize: '0.8rem', 
                                  fontWeight: '800', 
                                  color: '#0f172a',
                                  cursor: driverLoc ? 'pointer' : 'default',
                                  textDecoration: driverLoc ? 'underline' : 'none'
                                }}
                                onClick={() => {
                                  if (driverLoc) {
                                    window.open(`https://maps.google.com/?q=${driverLoc.lat},${driverLoc.lng}`, '_blank');
                                  }
                                }}
                                title={driverLoc ? "Hovered: Click to open live location on Google Maps" : ""}
                              >
                                {activeDriverName}
                              </span>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>({activeDriverType})</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', background: driverGps.badgeBg, color: driverGps.badgeColor, padding: '3px 8px', borderRadius: '12px', display: 'inline-block', marginBottom: '8px' }}>
                            {driverGps.badgeText}
                          </span>
                          {driverLoc && driverGps.status !== 'waiting' ? (
                            <>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                                Lat: {driverLoc.lat.toFixed(6)} | Lng: {driverLoc.lng.toFixed(6)}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: driverGps.dotColor, fontWeight: '700', marginBottom: '6px' }}>{driverGps.detail}</div>
                              {driverGps.status !== 'offline' && (
                                <a href={`https://maps.google.com/?q=${driverLoc.lat},${driverLoc.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', background: '#059669', padding: '4px 12px', borderRadius: '6px', textDecoration: 'none' }}>
                                  View on Maps
                                </a>
                              )}
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '6px' }}>Last update: {formatLocationTime(driverLoc)}</div>
                            </>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>{driverGps.detail}</div>
                          )}
                        </div>

                        {/* Guide Status */}
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Award size={16} color="#d97706" />
                            <span 
                              style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: '800', 
                                color: '#0f172a',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                              onClick={() => {
                                setSelectedTraceTour({ tourCode: tour.tourCode, guideName: tour.guideName || 'Guide' });
                              }}
                              title="Click to view detailed trace history and auto-stops"
                            >
                              Guide: {tour.guideName || 'Not Assigned'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', background: guideGps.badgeBg, color: guideGps.badgeColor, padding: '3px 8px', borderRadius: '12px', display: 'inline-block', marginBottom: '8px' }}>
                            {guideGps.badgeText}
                          </span>
                          {guideLoc && guideGps.status !== 'waiting' ? (
                            <>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                                Lat: {guideLoc.lat.toFixed(6)} | Lng: {guideLoc.lng.toFixed(6)}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: guideGps.dotColor, fontWeight: '700', marginBottom: '6px' }}>{guideGps.detail}</div>
                              {guideGps.status !== 'offline' && (
                                <a href={`https://maps.google.com/?q=${guideLoc.lat},${guideLoc.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', background: '#d97706', padding: '4px 12px', borderRadius: '6px', textDecoration: 'none' }}>
                                  View on Maps
                                </a>
                              )}
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '6px' }}>Last update: {formatLocationTime(guideLoc)}</div>
                            </>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>{guideGps.detail}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        
        {/* TAB 8: TOUR BUILDER */}
        {activeTab === 'tourBuilder' && (
          <div className="mgmt-content">
            <form onSubmit={handlePublishTour} className="mgmt-form" style={{ gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontWeight: '800', color: 'var(--navy)' }}>Tour Information</h3>
              </div>

              <div className="mgmt-form-row">
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Tour Code</label>
                  <input className="mgmt-input" required value={newTour.tourCode} onChange={(e) => setNewTour({ ...newTour, tourCode: e.target.value.toUpperCase() })} placeholder="e.g. TAJ-HJ-RAJASTHAN-TOUR" />
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Tour Title / Name</label>
                  <input className="mgmt-input" required value={newTour.tourName} onChange={(e) => {
                    const title = e.target.value;
                    const code = title.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-');
                    setNewTour({ ...newTour, tourName: title, tourCode: code });
                  }} placeholder="e.g. Golden Triangle Deluxe" />
                </div>
              </div>

              <div className="mgmt-form-row">
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Client Name</label>
                  <input className="mgmt-input" required value={newTour.clientName} onChange={(e) => setNewTour({ ...newTour, clientName: e.target.value })} placeholder="e.g. John Doe Family" />
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>No. of Passengers (Pax)</label>
                  <input type="number" className="mgmt-input" required value={newTour.pax} onChange={(e) => setNewTour({ ...newTour, pax: parseInt(e.target.value) })} />
                </div>
              </div>

              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '10px' }}>
                <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: '800', color: 'var(--navy)', margin: '0 0 12px 0', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>🏨 Room Requirements</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Double Rooms</label>
                    <input type="number" className="mgmt-input" style={{ height: '36px' }} min="0" value={newTour.doubleRooms || 0} onChange={(e) => setNewTour({ ...newTour, doubleRooms: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Twin Rooms</label>
                    <input type="number" className="mgmt-input" style={{ height: '36px' }} min="0" value={newTour.twinRooms || 0} onChange={(e) => setNewTour({ ...newTour, twinRooms: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Single Rooms</label>
                    <input type="number" className="mgmt-input" style={{ height: '36px' }} min="0" value={newTour.singleRooms || 0} onChange={(e) => setNewTour({ ...newTour, singleRooms: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Triple Rooms</label>
                    <input type="number" className="mgmt-input" style={{ height: '36px' }} min="0" value={newTour.tripleRooms || 0} onChange={(e) => setNewTour({ ...newTour, tripleRooms: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              <div className="mgmt-form-row">
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Start Date</label>
                  <input type="date" className="mgmt-input" required value={newTour.startDate} onChange={(e) => setNewTour({ ...newTour, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>End Date</label>
                  <input type="date" className="mgmt-input" required value={newTour.endDate} onChange={(e) => setNewTour({ ...newTour, endDate: e.target.value })} />
                </div>
              </div>

              <div className="mgmt-form-row">
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Assigned Guide</label>
                  <select className="mgmt-select" value={newTour.guideName} onChange={(e) => setNewTour({ ...newTour, guideName: e.target.value })}>
                    <option value="">Select Guide (Optional)</option>
                    {guides.map(g => {
                      const isBusy = isGuideBusyOnDates(g.name, newTour.startDate, newTour.endDate);
                      return (
                        <option key={g.id} value={g.name}>
                          {g.name} {isBusy ? `(${t('busyStatus')})` : `(${t('availableStatus')})`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Assigned Driver & Car</label>
                  <select className="mgmt-select" value={newTour.driverName} onChange={(e) => setNewTour({ ...newTour, driverName: e.target.value })}>
                    <option value="">Select Driver (Optional)</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.name}>{d.name} ({d.vehicleType || d.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="login-label" style={{ color: 'var(--text-primary)' }}>Planned Vehicle Type</label>
                  <select className="mgmt-select" value={newTour.vehicleType} onChange={(e) => setNewTour({ ...newTour, vehicleType: e.target.value })}>
                    <option value="">Any Vehicle / TBA</option>
                    <option value="Toyota Innova Crysta (SUV)">Toyota Innova Crysta (SUV)</option>
                    <option value="Tempo Traveller (Mini Bus)">Tempo Traveller (Mini Bus)</option>
                    <option value="Force Urbania (Luxury Van)">Force Urbania (Luxury Van)</option>
                    <option value="Toyota Etios (Sedan)">Toyota Etios (Sedan)</option>
                    <option value="Mercedes Benz (Luxury Sedan)">Mercedes Benz (Luxury Sedan)</option>
                    <option value="Maruti Ertiga (Hatchback)">Maruti Ertiga (Hatchback)</option>
                    <option value="Toyota Fortuner (Premium SUV)">Toyota Fortuner (Premium SUV)</option>
                    <option value="Volvo Bus (Large Coach)">Volvo Bus (Large Coach)</option>
                    <option value="Mini Coach (Medium Bus)">Mini Coach (Medium Bus)</option>
                    <option value="Swift Dzire (Sedan)">Swift Dzire (Sedan)</option>
                  </select>
                </div>
              </div>

              {/* Master Itinerary Template Selector */}
              <div style={{ marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(200,160,60,0.06))', borderRadius: '12px', border: '1px solid rgba(200,160,60,0.25)' }}>
                <label className="login-label" style={{ color: 'var(--navy)', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📋 Load Master Itinerary Template
                </label>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 10px' }}>
                  Select a pre-built template to auto-fill the itinerary. You can then customize dates, flights, transport, driver, hotel etc.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {MASTER_ITINERARIES.map(mi => (
                    <button
                      key={mi.id}
                      type="button"
                      onClick={() => applyMasterItinerary(mi.id)}
                      disabled={!newTour.startDate}
                      style={{
                        padding: '10px 18px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer',
                        border: selectedMasterItinerary === mi.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: selectedMasterItinerary === mi.id ? 'var(--primary)' : 'white',
                        color: selectedMasterItinerary === mi.id ? '#fff' : 'var(--navy)',
                        opacity: !newTour.startDate ? 0.5 : 1, transition: 'all 0.2s'
                      }}
                    >
                      {mi.name}
                    </button>
                  ))}
                </div>
                {!newTour.startDate && <p style={{ fontSize: '0.75rem', color: '#d44', marginTop: '6px' }}>⚠️ Please set Start Date first before loading a template.</p>}
              </div>

              <h4 style={{ fontFamily: 'var(--font-title)', fontWeight: '800', marginTop: '16px', color: 'var(--navy)' }}>Itinerary Plan</h4>

              {itineraryDays.map((day, idx) => {
                const hotelsInCity = hotels.filter(h => h.city === day.city);
                const activitiesInCity = activities.filter(a => a.city === day.city);

                return (
                  <div key={idx} className="itin-day-card">
                    <div className="itin-day-header">
                      <span style={{ fontWeight: '700' }}>Day {day.day} ({day.dateStr})</span>
                    </div>

                    <div className="mgmt-form-row" style={{ marginBottom: '12px' }}>
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>City Location</label>
                        <select className="mgmt-select" value={day.city} onChange={(e) => {
                          const updated = [...itineraryDays];
                          updated[idx].city = e.target.value;
                          updated[idx].hotelName = ''; // Reset hotel when city changes
                          const cityObj = cities.find(c => c.name === e.target.value);
                          updated[idx].coverImage = cityObj?.imageUrl || '';
                          setItineraryDays(updated);
                        }}>
                          {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Overnight Hotel</label>
                        <select className="mgmt-select" value={day.hotelName} onChange={(e) => {
                          const updated = [...itineraryDays];
                          updated[idx].hotelName = e.target.value;
                          const h = hotels.find(hotel => hotel.name === e.target.value);
                          updated[idx].hotelAddress = h?.address || '';
                          updated[idx].hotelMapLink = h?.mapUrl || '';
                          setItineraryDays(updated);
                        }}>
                          <option value="">No Hotel / In-Transit</option>
                          {hotelsInCity.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Duty Nature</label>
                        <select className="mgmt-select" value={day.dayNature || ''} onChange={(e) => {
                          const updated = [...itineraryDays];
                          updated[idx].dayNature = e.target.value;
                          setItineraryDays(updated);
                        }}>
                          <option value="">Unspecified</option>
                          <option value="Arrival">🛬 Arrival</option>
                          <option value="Sightseeing">🏛️ Sightseeing</option>
                          <option value="Intercity Drive">🚗 Intercity Drive</option>
                          <option value="Leisure">🌴 Leisure / Free Time</option>
                          <option value="Departure">🛫 Departure</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Activities Checklist (Select for Client View)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                          {activitiesInCity.map(act => {
                            const isSelected = day.activitiesList.some(item => item.title === act.title);
                            return (
                              <button
                                key={act.id}
                                type="button"
                                onClick={() => {
                                  const updated = [...itineraryDays];
                                  const list = [...updated[idx].activitiesList];
                                  const matchIndex = list.findIndex(item => item.title === act.title);
                                  if (matchIndex > -1) {
                                    list.splice(matchIndex, 1);
                                  } else {
                                    list.push({ time: '09:00 AM', title: act.title });
                                  }
                                  updated[idx].activitiesList = list;
                                  setItineraryDays(updated);
                                }}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border)',
                                  backgroundColor: isSelected ? 'var(--primary-light)' : 'white',
                                  color: isSelected ? 'var(--primary-dark)' : 'var(--text-secondary)',
                                  cursor: 'pointer'
                                }}
                              >
                                {isSelected ? '✓ ' : ''}{act.title}
                              </button>
                            );
                          })}
                        </div>

                        {/* Time inputs for selected activities */}
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {day.activitiesList.length > 0 && (
                            <>
                              <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: '700' }}>⏰ Set Activity Times (shown to Driver & Client)</label>
                              {day.activitiesList.map((act, actIdx) => (
                                <div key={actIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                                  {/* Custom 24-hour time input — avoids AM/PM browser locale issue */}
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: '#fff', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', minWidth: '90px' }}>
                                    <input
                                      type="number"
                                      min="0" max="23"
                                      style={{ width: '32px', padding: '2px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                      value={(() => {
                                        const t = act.time || '09:00';
                                        const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                                        if (match) {
                                          let h = parseInt(match[1]);
                                          const ampm = match[3].toUpperCase();
                                          if (ampm === 'PM' && h !== 12) h += 12;
                                          if (ampm === 'AM' && h === 12) h = 0;
                                          return String(h).padStart(2, '0');
                                        }
                                        return t.split(':')[0] || '09';
                                      })()}
                                      onChange={(e) => {
                                        const updated = [...itineraryDays];
                                        const t = act.time || '09:00';
                                        const mins = t.includes(':') ? t.replace(/\s*(AM|PM)$/i,'').split(':')[1] || '00' : '00';
                                        const h = Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
                                        updated[idx].activitiesList[actIdx].time = `${String(h).padStart(2,'0')}:${mins}`;
                                        setItineraryDays(updated);
                                      }}
                                    />
                                    <span style={{ fontWeight: '800', fontSize: '1rem', color: '#1e293b', lineHeight: 1 }}>:</span>
                                    <input
                                      type="number"
                                      min="0" max="59"
                                      style={{ width: '32px', padding: '2px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                      value={(() => {
                                        const t = act.time || '09:00';
                                        const clean = t.replace(/\s*(AM|PM)$/i, '');
                                        return clean.split(':')[1] || '00';
                                      })()}
                                      onChange={(e) => {
                                        const updated = [...itineraryDays];
                                        const t = act.time || '09:00';
                                        const hrs = t.includes(':') ? (() => {
                                          const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                                          if (match) {
                                            let h = parseInt(match[1]);
                                            const ampm = match[3].toUpperCase();
                                            if (ampm === 'PM' && h !== 12) h += 12;
                                            if (ampm === 'AM' && h === 12) h = 0;
                                            return String(h).padStart(2, '0');
                                          }
                                          return t.split(':')[0];
                                        })() : '09';
                                        const m = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                                        updated[idx].activitiesList[actIdx].time = `${hrs}:${String(m).padStart(2,'0')}`;
                                        setItineraryDays(updated);
                                      }}
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    className="mgmt-input"
                                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.82rem', fontWeight: '600' }}
                                    value={act.title}
                                    onChange={(e) => {
                                      const updated = [...itineraryDays];
                                      updated[idx].activitiesList[actIdx].title = e.target.value;
                                      setItineraryDays(updated);
                                    }}
                                    placeholder="Stop Name / Destination"
                                  />
                                  {day.interCityTransfer && (
                                    <select
                                      className="mgmt-select"
                                      style={{ width: 'auto', padding: '6px', fontSize: '0.75rem', margin: 0, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8', fontWeight: '700' }}
                                      value={act.cityTag || 'Origin'}
                                      onChange={(e) => {
                                        const updated = [...itineraryDays];
                                        updated[idx].activitiesList[actIdx].cityTag = e.target.value;
                                        setItineraryDays(updated);
                                      }}
                                    >
                                      <option value="Origin">Origin City</option>
                                      <option value="Destination">Destination City</option>
                                    </select>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...itineraryDays];
                                      updated[idx].activitiesList.splice(actIdx, 1);
                                      setItineraryDays(updated);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.9rem' }}
                                  >✕</button>
                                </div>
                              ))}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...itineraryDays];
                              if (!updated[idx].activitiesList) updated[idx].activitiesList = [];
                              updated[idx].activitiesList.push({ time: '09:00 AM', title: 'New Stop' });
                              setItineraryDays(updated);
                            }}
                            style={{
                              alignSelf: 'flex-start',
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              color: 'var(--primary)',
                              background: 'white',
                              border: '1px dashed var(--primary)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              marginTop: '4px',
                              fontWeight: '700'
                            }}
                          >
                            ➕ Add Custom Stop / Destination
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mgmt-form-row">
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Transport Mode</label>
                        <select className="mgmt-select" value={day.transport} onChange={(e) => {
                          const updated = [...itineraryDays];
                          updated[idx].transport = e.target.value;
                          if (e.target.value !== 'By Flight') updated[idx].flightNo = '';
                          if (e.target.value !== 'By Train') updated[idx].trainNo = '';
                          setItineraryDays(updated);
                        }}>
                          <option value="By Surface">By Surface (Chauffeur Car)</option>
                          <option value="By Train">By Train</option>
                          <option value="By Flight">By Flight</option>
                        </select>
                      </div>
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Meal Plan</label>
                        <select className="mgmt-select" value={day.mealPlan} onChange={(e) => {
                          const updated = [...itineraryDays];
                          updated[idx].mealPlan = e.target.value;
                          setItineraryDays(updated);
                        }}>
                          {MEAL_PLAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        {(day.mealPlan || '').includes('MAP') && (
                          <select className="mgmt-select" value={day.mapType || 'Dinner + Breakfast'} onChange={(e) => {
                            const updated = [...itineraryDays];
                            updated[idx].mapType = e.target.value;
                            setItineraryDays(updated);
                          }} style={{ marginTop: '8px' }}>
                            <option value="Dinner + Breakfast">Dinner + Breakfast</option>
                            <option value="Lunch + Breakfast">Lunch + Breakfast</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Meal Plan Info Box */}
                    {(() => {
                      const mp = (day.mealPlan || '');
                      const mpType = (day.mapType || 'Dinner + Breakfast');
                      const isAP = mp.startsWith('AP') || mp.includes('Breakfast, Lunch');
                      const isMAP = !isAP && mp.startsWith('MAP');
                      const isCP = !isAP && !isMAP && (mp.startsWith('CP') || mp.includes('Breakfast Only'));
                      if (!isAP && !isMAP && !isCP) return null;
                      const checkInDay = day.dateStr || `Day ${day.day}`;
                      const nextDayDate = day.dateStr ? (() => {
                        const d = new Date(day.dateStr.split('-').reverse().join('-'));
                        d.setDate(d.getDate() + 1);
                        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
                      })() : `Day ${(day.day || 0) + 1}`;
                      let checkInMeals, checkOutMeals;
                      if (isAP) { checkInMeals = 'Check in + Lunch + Dinner'; checkOutMeals = 'Breakfast + Check Out'; }
                      else if (isMAP && mpType === 'Lunch + Breakfast') { checkInMeals = 'Check in + Lunch'; checkOutMeals = 'Breakfast + Check Out'; }
                      else if (isMAP) { checkInMeals = 'Check in + Dinner'; checkOutMeals = 'Breakfast + Check Out'; }
                      else { checkInMeals = 'Check in'; checkOutMeals = 'Breakfast + Check Out'; }
                      return (
                        <div style={{ marginTop: '10px', padding: '10px 14px', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fcd34d', borderRadius: '10px', fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🍽️ Meal Breakdown — {day.mealPlan}
                          </div>
                          <div style={{ color: '#78350f', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div>📅 <strong>{checkInDay}:</strong> {checkInMeals}</div>
                            <div>📅 <strong>{nextDayDate}:</strong> {checkOutMeals}</div>
                          </div>
                        </div>
                      );
                    })()}

                    {day.transport === 'By Flight' && (
                      <div style={{ marginTop: '12px' }}>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>✈️ Flight Number</label>
                        <input className="mgmt-input" placeholder="e.g. KE 497" value={day.flightNo || ''} onChange={(e) => {
                          const updated = [...itineraryDays];
                          updated[idx].flightNo = e.target.value;
                          setItineraryDays(updated);
                        }} />
                      </div>
                    )}
                    {day.transport === 'By Train' && (
                      <div style={{ marginTop: '12px' }}>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>🚆 Train Number</label>
                        <input className="mgmt-input" placeholder="e.g. 12952 Rajdhani" value={day.trainNo || ''} onChange={(e) => {
                          const updated = [...itineraryDays];
                          updated[idx].trainNo = e.target.value;
                          setItineraryDays(updated);
                        }} />
                      </div>
                    )}

                    {/* ── Inter-city Transfer Toggle (only Train/Flight) ── */}
                    {(day.transport === 'By Flight' || day.transport === 'By Train') && (
                      <div style={{ marginTop: '14px', padding: '14px', background: day.interCityTransfer ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : '#f8fafc', border: `1px solid ${day.interCityTransfer ? '#93c5fd' : '#e2e8f0'}`, borderRadius: '10px', transition: 'all 0.25s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>🔄</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: day.interCityTransfer ? '#1d4ed8' : 'var(--navy)' }}>
                              Inter-city Transfer on This Day
                            </span>
                            {day.interCityTransfer && (
                              <span style={{ fontSize: '0.65rem', background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>ACTIVE</span>
                            )}
                          </div>
                          {/* Toggle switch */}
                          <div
                            onClick={() => {
                              const updated = [...itineraryDays];
                              updated[idx].interCityTransfer = !updated[idx].interCityTransfer;
                              if (!updated[idx].interCityTransfer) {
                                updated[idx].transferOrigin = '';
                                updated[idx].transferDestination = '';
                              }
                              setItineraryDays(updated);
                            }}
                            style={{
                              width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', position: 'relative',
                              background: day.interCityTransfer ? '#2563eb' : '#cbd5e1',
                              transition: 'background 0.2s', flexShrink: 0
                            }}
                          >
                            <div style={{
                              position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%',
                              background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              left: day.interCityTransfer ? '23px' : '3px',
                              transition: 'left 0.2s'
                            }} />
                          </div>
                        </div>

                        {day.interCityTransfer && (
                          <div style={{ marginTop: '12px' }}>
                            <p style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '600', margin: '0 0 10px 0' }}>
                              ℹ️ Driver for this transfer leg will be assigned from the Daily Dashboard. Fill route details below:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
                              <div>
                                <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.75rem' }}>📍 Origin City</label>
                                <input
                                  className="mgmt-input"
                                  placeholder="e.g. Varanasi"
                                  value={day.transferOrigin || ''}
                                  onChange={(e) => {
                                    const updated = [...itineraryDays];
                                    updated[idx].transferOrigin = e.target.value;
                                    setItineraryDays(updated);
                                  }}
                                />
                              </div>
                              <div style={{ textAlign: 'center', paddingTop: '20px', fontSize: '1.2rem', color: '#2563eb', fontWeight: '800' }}>→</div>
                              <div>
                                <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.75rem' }}>🏁 Destination City</label>
                                <input
                                  className="mgmt-input"
                                  placeholder="e.g. Agra"
                                  value={day.transferDestination || ''}
                                  onChange={(e) => {
                                    const updated = [...itineraryDays];
                                    updated[idx].transferDestination = e.target.value;
                                    setItineraryDays(updated);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Local Restaurant */}
                    <div className="mgmt-form-row" style={{ marginTop: '12px' }}>
                      <div>
                        <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>🍽️ Local Restaurant</label>
                        <select className="mgmt-select" value={day.localRestaurant || ''} onChange={(e) => {
                          const updated = [...itineraryDays];
                          const rest = restaurants.find(r => r.name === e.target.value);
                          updated[idx].localRestaurant = e.target.value;
                          updated[idx].restaurantMealType = rest?.mealType || '';
                          updated[idx].restaurantMapUrl = rest?.mapUrl || '';
                          setItineraryDays(updated);
                        }}>
                          <option value="">No Restaurant Assigned</option>
                          {restaurants.map(r => (
                            <option key={r.id} value={r.name}>{r.name} ({r.mealType} - {r.cuisine})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <label className="login-label" style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>Day Notes / Description</label>
                      <textarea className="mgmt-textarea" rows={2} value={day.activities} onChange={(e) => {
                        const updated = [...itineraryDays];
                        updated[idx].activities = e.target.value;
                        setItineraryDays(updated);
                      }} />
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
                <h3 style={{ color: '#166534', margin: 0, fontSize: '1.1rem' }}>🤖 Smart Driver Planner</h3>
                <p style={{ color: '#166534', margin: 0, fontSize: '0.85rem', textAlign: 'center', maxWidth: '600px' }}>
                  Click below to automatically generate step-by-step driver timelines for all days based on your text descriptions, hotels, and meals. You can manually edit the times above after generation.
                </p>
                <button type="button" onClick={handleAutoGenerateDriverPlanner} style={{ padding: '10px 20px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={16} /> Auto-Generate Driver Route
                </button>
              </div>

              <button type="submit" className="btn-primary" style={{ alignSelf: 'center', width: '100%', maxWidth: '300px', padding: '14px', marginTop: '20px' }}>
                Publish Tour & Itinerary
              </button>
            </form>
          </div>
        )}
      </div>
          {/* Instant Shift Modal */}
          {shiftModalOpen && (
            <div className="mgmt-modal-overlay">
              <div className="mgmt-modal" style={{ maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🚨 Instant Transport Switcher
                  </h3>
                  <button onClick={() => setShiftModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                </div>

                {/* Active Flight Info */}
                <div style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: '800', marginBottom: '4px' }}>AFFECTED TOUR: {shiftTour?.tourCode}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b' }}>
                    {shiftFlightDetails}
                  </div>
                </div>

                {/* Transport Mode Switcher */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#475569', marginBottom: '8px' }}>Select New Transport Mode</label>
                  <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '6px', borderRadius: '8px' }}>
                    {['Train', 'Car', 'Flight'].map(mode => (
                      <button
                        key={mode}
                        onClick={() => setShiftMode(mode)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s',
                          backgroundColor: shiftMode === mode ? 'white' : 'transparent',
                          color: shiftMode === mode ? 'var(--primary)' : '#64748b',
                          boxShadow: shiftMode === mode ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        {mode === 'Train' ? '🚆 By Train' : mode === 'Car' ? '🚗 By Car (Surface)' : '✈️ New Flight'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Inputs */}
                <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  {shiftMode === 'Train' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Train Number & Details</label>
                      <input type="text" className="mgmt-input" placeholder="e.g. 22469/Vande Bharat Express" value={shiftTrainNo} onChange={(e) => setShiftTrainNo(e.target.value)} />
                    </div>
                  )}
                  {shiftMode === 'Car' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Select Replacement Driver</label>
                      <select className="mgmt-select" value={shiftDriver} onChange={(e) => setShiftDriver(e.target.value)}>
                        <option value="">-- Select Driver --</option>
                        {drivers.map(d => <option key={d.id} value={d.name}>{d.name} ({d.vehicleType || 'Car'})</option>)}
                      </select>
                    </div>
                  )}
                  {shiftMode === 'Flight' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>New Flight Number</label>
                      <input type="text" className="mgmt-input" placeholder="e.g. AI 889" value={shiftFlightNo} onChange={(e) => setShiftFlightNo(e.target.value)} />
                    </div>
                  )}
                </div>

                {/* Smart Automation */}
                <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--primary-light)', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: 'var(--navy)', marginBottom: '12px' }}>
                    🤖 Smart Next-Step Automation
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '12px' }}>Check actions to instantly broadcast to Guide & Driver apps:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                      <input type="checkbox" checked={shiftActionWait} onChange={(e) => setShiftActionWait(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                      Instruct current Guide/Driver to WAIT at airport/station
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                      <input type="checkbox" checked={shiftActionDismiss} onChange={(e) => setShiftActionDismiss(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                      Dismiss current Driver from duty
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                      <input type="checkbox" checked={shiftActionRoute} onChange={(e) => setShiftActionRoute(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                      Instruct current Driver to ROUTE to new station/airport immediately
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button className="btn-secondary" onClick={() => setShiftModalOpen(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleInstantShiftSubmit} style={{ backgroundColor: '#EF4444', border: 'none' }}>
                    🚨 Publish Live Update
                  </button>
                </div>
              </div>
            </div>
          )}

      {selectedTraceTour && (
        <GuideTraceMap 
          tourCode={selectedTraceTour.tourCode} 
          guideName={selectedTraceTour.guideName} 
          onClose={() => setSelectedTraceTour(null)} 
        />
      )}
    </div>
  );
}