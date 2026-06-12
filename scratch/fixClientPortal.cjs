const fs = require('fs');
let content = fs.readFileSync('src/portals/ClientPortal.jsx', 'utf8');

content = content.replace(
  "import { listenToTour, listenToDriverLocation, submitComplaint, getHotels, getActivities } from \"../services/firebase\";",
  "import { listenToTour, listenToLocations, submitComplaint, getHotels, getActivities } from \"../services/firebase\";"
);

content = content.replace(
  "const unsubscribeDriver = listenToDriverLocation(tourCode, (loc) => {",
  "const unsubscribeDriver = listenToLocations(tourCode, (locs) => {"
);

content = content.replace(
  "if (loc) {",
  "const loc = locs?.driver;\n      if (loc) {"
);

fs.writeFileSync('src/portals/ClientPortal.jsx', content);
console.log('ClientPortal.jsx fixed');
