import React, { useState, useEffect } from 'react';
import Splash from './components/Splash.jsx';
import QRScannerComponent from './components/QRScanner.jsx';
import DestinationSelect from './components/DestinationSelect.jsx';
import ARNavigation from './components/ARNavigation.jsx';
import QRGenerator from './components/QRGenerator.jsx';

import LocationGraph from './utils/locationGraph.js';
import AudioGuide from './utils/audioGuide.js';

/**
 * App — Root Coordinator Component
 * Tracks application state (active view, routing, navigation nodes, volume)
 * and switches view render layers.
 */
export default function App() {
  const [currentView, setCurrentView] = useState('splash');
  const [sourceLocation, setSourceLocation] = useState(null);
  const [destLocation, setDestLocation] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // Initialize Speech synthesis configuration on app mount
  useEffect(() => {
    AudioGuide.init();

    // Check routing hashes on page load
    const checkHashRoute = () => {
      if (window.location.hash === '#generate-qr') {
        setCurrentView('qrGenerator');
      }
    };
    checkHashRoute();

    // Listen to hash changes in browser url history (e.g. back button clicks)
    window.addEventListener('hashchange', checkHashRoute);
    return () => {
      window.removeEventListener('hashchange', checkHashRoute);
    };
  }, []);

  // Synchronize component mute settings with singleton utility
  const handleToggleMute = () => {
    const muted = AudioGuide.toggleMute();
    setIsMuted(muted);
  };

  const handleStartScanning = () => {
    setCurrentView('scanner');
  };

  const handleOpenQRGenerator = () => {
    window.location.hash = '#generate-qr';
    setCurrentView('qrGenerator');
  };

  const handleBackToSplash = () => {
    // Clear route hash
    if (window.location.hash === '#generate-qr') {
      window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    setCurrentView('splash');
  };

  const handleScanSuccess = (locationId) => {
    const resolvedLoc = LocationGraph.getLocation(locationId);
    setSourceLocation(resolvedLoc);
    setCurrentView('destination');
    
    // Provide audio feedback
    AudioGuide.speak(`Source location: ${resolvedLoc.name}`);
  };

  const handleStartNavigation = (destinationId) => {
    if (!sourceLocation) return;
    const resolvedDest = LocationGraph.getLocation(destinationId);
    setDestLocation(resolvedDest);

    // Calculate Dijkstra path routing
    const calculatedRoute = LocationGraph.findShortestPath(sourceLocation.id, destinationId);
    if (!calculatedRoute) {
      AudioGuide.speak('No route found to that destination.');
      return;
    }

    setCurrentRoute(calculatedRoute);
    setCurrentView('navigation');
  };

  const handleStopNavigation = () => {
    setCurrentRoute(null);
    setSourceLocation(null);
    setDestLocation(null);
    setCurrentView('splash');
  };

  return (
    <>
      {currentView === 'splash' && (
        <Splash 
          onStartScan={handleStartScanning} 
          onOpenQRGenerator={handleOpenQRGenerator} 
        />
      )}

      {currentView === 'scanner' && (
        <QRScannerComponent 
          onScan={handleScanSuccess} 
        />
      )}

      {currentView === 'destination' && (
        <DestinationSelect 
          sourceLocation={sourceLocation}
          onNavigate={handleStartNavigation}
          onRescan={handleStartScanning}
        />
      )}

      {currentView === 'navigation' && (
        <ARNavigation 
          currentRoute={currentRoute}
          destLocation={destLocation}
          onStopNav={handleStopNavigation}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {currentView === 'qrGenerator' && (
        <QRGenerator 
          onBack={handleBackToSplash} 
        />
      )}
    </>
  );
}
