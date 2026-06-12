const fs = require('fs');
let content = fs.readFileSync('src/portals/OperatorPortal.jsx', 'utf8');

// 1. Add Navigation to lucide-react imports
if (!content.includes('Navigation,')) {
  content = content.replace(
    "import { \n  BarChart2, MapPin, Compass, Hotel, Award, Car, Clipboard, \n  Plus, Trash2, Calendar, Users, Phone, Shield, Star, Check, Globe, HelpCircle, Printer, UtensilsCrossed, Edit3\n} from 'lucide-react';",
    "import { \n  BarChart2, MapPin, Compass, Hotel, Award, Car, Clipboard, \n  Plus, Trash2, Calendar, Users, Phone, Shield, Star, Check, Globe, HelpCircle, Printer, UtensilsCrossed, Edit3, Navigation\n} from 'lucide-react';"
  );
}

// 2. Add listenToAllLocations to firebase imports
if (!content.includes('listenToAllLocations')) {
  content = content.replace(
    "listenToComplaints, signOutGoogle,",
    "listenToComplaints, signOutGoogle, listenToAllLocations,"
  );
}

// 3. Add state
if (!content.includes('liveLocations')) {
  content = content.replace(
    "const [restaurants, setRestaurants] = useState([]);",
    "const [restaurants, setRestaurants] = useState([]);\n  const [liveLocations, setLiveLocations] = useState({});"
  );
}

// 4. Add subscription
if (!content.includes('listenToAllLocations(setLiveLocations)')) {
  content = content.replace(
    "const unsubRestaurants = listenToRestaurants ? listenToRestaurants(setRestaurants) : () => {};",
    "const unsubRestaurants = listenToRestaurants ? listenToRestaurants(setRestaurants) : () => {};\n    const unsubLocations = listenToAllLocations(setLiveLocations);"
  );
  content = content.replace(
    "unsubRestaurants();\n    };",
    "unsubRestaurants();\n      unsubLocations();\n    };"
  );
}

// 5. Add Tab button
if (!content.includes("activeTab === 'liveTracking'")) {
  const tabButtonHTML = `          <button className={\`mgmt-tab \${activeTab === 'liveTracking' ? 'mgmt-tab-active' : ''}\`} onClick={() => { setActiveTab('liveTracking'); setShowAddForm(false); setSearchQuery(''); }}>
            <Navigation size={16} /> Live Tracking
          </button>
          <button className={\`mgmt-tab \${activeTab === 'tourBuilder'`;
  content = content.replace(
    "<button className={`mgmt-tab ${activeTab === 'tourBuilder'",
    tabButtonHTML
  );
}

// 6. Add Tab Content
if (!content.includes("TAB: LIVE TRACKING")) {
  const tabContentHTML = `        {/* TAB: LIVE TRACKING */}
        {activeTab === 'liveTracking' && (
          <div className="mgmt-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--navy)' }}>Live Fleet Tracking</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '20px' }}>
                <span className="live-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginRight: '6px', animation: 'pulse 1.5s infinite' }}></span>
                Real-time Sync Active
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tours.filter(t => {
                // simple filter for active tours: checking if today falls between start and end
                const today = new Date().toISOString().split('T')[0];
                return t.startDate <= today && t.endDate >= today;
              }).length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                  <Navigation size={48} style={{ opacity: 0.2, margin: '0 auto 10px auto' }} />
                  <p style={{ fontWeight: '700' }}>No active tours happening today.</p>
                </div>
              )}

              {tours.filter(t => {
                const today = new Date().toISOString().split('T')[0];
                return t.startDate <= today && t.endDate >= today;
              }).map(tour => {
                const locs = liveLocations[tour.tourCode] || {};
                const driverLoc = locs.driver;
                const guideLoc = locs.guide;
                
                return (
                  <div key={tour.id} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '1px' }}>{tour.tourCode}</span>
                        <h3 style={{ margin: '2px 0', fontSize: '1.1rem', fontWeight: '800', color: 'var(--navy)' }}>{tour.tourName}</h3>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}><Users size={12} style={{marginRight:'4px', verticalAlign:'middle'}}/>{tour.clientName} ({tour.pax} Pax)</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px' }}>Active Today</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {/* Driver Status */}
                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Car size={16} color="#059669" />
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>Driver: {tour.driverName || 'Not Assigned'}</span>
                        </div>
                        {driverLoc ? (
                          <>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                              Lat: {driverLoc.lat.toFixed(6)} | Lng: {driverLoc.lng.toFixed(6)}
                            </div>
                            <a href={\`https://maps.google.com/?q=\${driverLoc.lat},\${driverLoc.lng}\`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', background: '#059669', padding: '4px 12px', borderRadius: '6px', textDecoration: 'none' }}>
                              View on Maps
                            </a>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '6px' }}>Last Updated: {new Date(driverLoc.timestamp).toLocaleTimeString()}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Waiting for driver GPS signal...</div>
                        )}
                      </div>

                      {/* Guide Status */}
                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Award size={16} color="#d97706" />
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0f172a' }}>Guide: {tour.guideName || 'Not Assigned'}</span>
                        </div>
                        {guideLoc ? (
                          <>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                              Lat: {guideLoc.lat.toFixed(6)} | Lng: {guideLoc.lng.toFixed(6)}
                            </div>
                            <a href={\`https://maps.google.com/?q=\${guideLoc.lat},\${guideLoc.lng}\`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', background: '#d97706', padding: '4px 12px', borderRadius: '6px', textDecoration: 'none' }}>
                              View on Maps
                            </a>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '6px' }}>Last Updated: {new Date(guideLoc.timestamp).toLocaleTimeString()}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Waiting for guide GPS signal...</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* TAB 8: TOUR BUILDER */}`;
  
  content = content.replace("{/* TAB 8: TOUR BUILDER */}", tabContentHTML);
}

fs.writeFileSync('src/portals/OperatorPortal.jsx', content);
console.log('OperatorPortal.jsx updated successfully');
