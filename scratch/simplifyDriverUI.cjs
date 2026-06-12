const fs = require('fs');
let content = fs.readFileSync('src/portals/DriverPortal.jsx', 'utf8');

// Remove vehicle details
const vehicleDetailsStart = `        {/* Vehicle Details */}`;
const tourInfoStart = `        {/* Tour Info Summary */}`;
const fullTourStart = `        {/* Full Tour Days - Scrollable list */}`;

let startIndex = content.indexOf(vehicleDetailsStart);
let endIndex = content.indexOf(`        {/* Print Preview Mode */}`); // This is after Full Tour Days

if (startIndex !== -1 && endIndex !== -1) {
  content = content.slice(0, startIndex) + content.slice(endIndex);
}

// Ensure the buttons in the timeline are larger
content = content.replace(
  "style={{ padding: '4px 10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}",
  "style={{ padding: '12px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}"
);
content = content.replace(
  "style={{ padding: '4px 10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}",
  "style={{ padding: '12px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}"
);

// Make the Next Up card Title bigger
content = content.replace(
  "fontSize: '1.25rem',\n    fontWeight: '800',\n    margin: '8px 0 6px 0',\n    lineHeight: 1.2",
  "fontSize: '1.8rem',\n    fontWeight: '900',\n    margin: '8px 0 10px 0',\n    lineHeight: 1.2,\n    letterSpacing: '-0.5px'"
);

// We need to hide the dateSelectorWrap so they only see the current day
// Actually, let's keep the date selector but make it visually a timeline
// Or just let it be. The user said: "iskaa maain kaam honaa chayieee naa kii is din parrr jaisee live time chalgegaa"
// Let's remove the dateSelectorWrap entirely and force selectedDate to be TODAY always.

// Remove dateSelectorWrap
const dateSelectorStart = `      {/* Horizontal Date Scroller */}`;
const contentDivStart = `      {/* Main Content Area */}`;

let dsStart = content.indexOf(dateSelectorStart);
let cdStart = content.indexOf(contentDivStart);
if (dsStart !== -1 && cdStart !== -1) {
  content = content.slice(0, dsStart) + content.slice(cdStart);
}

// In useEffect for scroll to active day, we can remove it or keep it. It won't crash.

fs.writeFileSync('src/portals/DriverPortal.jsx', content);
console.log('DriverPortal.jsx simplified UI successfully');
