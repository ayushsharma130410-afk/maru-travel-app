import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

async function fixTours() {
  console.log("Checking for corrupted tours...");
  const snapshot = await get(ref(database, 'tours'));
  if (snapshot.exists()) {
    const tours = snapshot.val();
    let fixedCount = 0;
    
    for (const [tourCode, tourData] of Object.entries(tours)) {
      if (!tourData.startDate || !tourData.endDate || !tourData.tourName) {
        console.log(`Fixing corrupted tour: ${tourCode}`);
        const updates = {};
        if (!tourData.startDate) updates['startDate'] = new Date().toISOString().split('T')[0];
        if (!tourData.endDate) {
           const end = new Date();
           end.setDate(end.getDate() + 2);
           updates['endDate'] = end.toISOString().split('T')[0];
        }
        if (!tourData.tourName) updates['tourName'] = "Corrupted Tour (Recovered)";
        if (!tourData.clientName) updates['clientName'] = "Unknown Client";
        if (!tourData.pax) updates['pax'] = 1;
        
        await update(ref(database, `tours/${tourCode}`), updates);
        fixedCount++;
      }
    }
    console.log(`Fixed ${fixedCount} corrupted tours! They should now appear in the dashboard.`);
  } else {
    console.log("No tours found.");
  }
  process.exit(0);
}

fixTours().catch(err => {
  console.error(err);
  process.exit(1);
});
