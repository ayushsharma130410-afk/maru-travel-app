const fs = require('fs');
let content = fs.readFileSync('src/portals/OperatorPortal.jsx', 'utf8');

// 1. Rename existing template
content = content.replace(
  "name: 'Golden Triangle With Varanasi (08N/09D)',",
  "name: 'HJ classical',"
);

// 2. Add GT tour template
const newTemplate = `    },
    {
      id: 'gt-tour',
      name: 'GT tour',
      days: [
        { city: 'New Delhi', activities: 'ICN to DEL by KE.18:30Hrs Dinner & Overnight at Hotel Welcome Toll Plaza Delhi.', transport: 'By Flight', mealPlan: 'Dinner', hotelName: 'Hotel Welcome Toll Plaza Delhi' },
        { city: 'New Delhi', activities: 'New DEL SS(Akshardham, President palace, Parliament house) Tandoori Lunch at Nineteenth Hall Noida) then go to AGRA and proceed to sight of Taj Mahal Sunset view Dinner & overnight at Grand Mercure Agra (Taj View Room).', transport: 'By Surface', mealPlan: 'Lunch & Dinner', hotelName: 'Grand Mercure Agra' },
        { city: 'Agra', activities: 'AGR SS( Agra fort) Fatehpur Sikri, Lunch at Lake View restaurant(Sikri)and move to JAI Dinner & Overnight at Radisson Jaipur', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: 'Radisson Jaipur' },
        { city: 'Jaipur', activities: 'Buffet breakfast . Full day JAI SS (Amber Fort-Jeep, Hawa Mahal, City palace, Virla Mandir), Hena, Lassi Rickshaw Ride Lunch & Dinner & Overnight at Radisson Jaipur', transport: 'By Surface', mealPlan: 'Breakfast, Lunch & Dinner (AP)', hotelName: 'Radisson Jaipur' },
        { city: 'New Delhi', activities: 'Packed breakfast at 05:30 am . JAI/DEL by flight- AI 1834 – 0830/0935 DEL SS (Agrasen ki baoli, India Gate, Gandi Smriti, Raj Ghat, Qutab Minar), Lunch at Gung green park. out by KE 498 19:40 hrs.', transport: 'By Flight', mealPlan: 'Breakfast & Lunch (AP Lunch)', hotelName: '' }
      ]
    }`;

// Inject new template before the closing bracket of MASTER_ITINERARIES
content = content.replace(
  "    }\n  ];\n\n  // Apply master itinerary template",
  newTemplate + "\n  ];\n\n  // Apply master itinerary template"
);

fs.writeFileSync('src/portals/OperatorPortal.jsx', content);
console.log('OperatorPortal.jsx updated successfully for templates');
