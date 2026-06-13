import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import LoadingAnim from './components/LoadingAnim';
import LoginPortal from './portals/LoginPortal';
import ClientPortal from './portals/ClientPortal';
import OperatorPortal from './portals/OperatorPortal';
import GuidePortal from './portals/GuidePortal';
import DriverPortal from './portals/DriverPortal';
import './styles/design-system.css';
import './styles/portals.css';
import './styles/print.css';

function AppContent() {
  const [isLoadingSplash, setIsLoadingSplash] = useState(true);
  const [userSession, setUserSession] = useState(null); // { role, tourCode, tourData }

  const handleLoginSuccess = (session) => {
    setUserSession(session);
  };

  const handleLogout = () => {
    setUserSession(null);
  };

  if (isLoadingSplash) {
    return <LoadingAnim onFinished={() => setIsLoadingSplash(false)} />;
  }

  if (!userSession) {
    return <LoginPortal onLoginSuccess={handleLoginSuccess} />;
  }

  switch (userSession.role) {
    case 'client':
      return <ClientPortal tourCode={userSession.tourCode} onLogout={handleLogout} />;
    case 'operator':
      return <OperatorPortal onLogout={handleLogout} />;
    case 'guide':
      return <GuidePortal tourCode={userSession.tourCode} onLogout={handleLogout} />;
    case 'driver':
      return <DriverPortal key={userSession.driverMobile} driverMobile={userSession.driverMobile} onLogout={handleLogout} />;
    default:
      return <LoginPortal onLoginSuccess={handleLoginSuccess} />;
  }
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
