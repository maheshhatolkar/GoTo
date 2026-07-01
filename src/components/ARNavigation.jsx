import React, { useRef, useEffect } from 'react';
import Compass from '../utils/compass.js';
import ARRenderer from '../utils/arRenderer.js';
import AudioGuide from '../utils/audioGuide.js';
import LocationGraph from '../utils/locationGraph.js';

/**
 * ARNavigation Component
 * Renders the full-screen camera canvas, binds device orientation events,
 * and handles overlay control utilities.
 */
export default function ARNavigation({ currentRoute, destLocation, onStopNav, isMuted, onToggleMute }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    async function startNavigationSystem() {
      if (!canvasRef.current || !videoRef.current || !currentRoute) return;

      // Initialize drawing context configurations
      ARRenderer.init(canvasRef.current, videoRef.current);

      // Start compass orientation streams (request permissions on iOS Safari)
      const compassOk = await Compass.start();
      if (!compassOk) {
        console.warn('[ARNavigation] Compass not available on device, using default simulated heading');
      }

      // Start animation loop and media streams
      await ARRenderer.startNavigation(currentRoute);

      // Speak initial announcement
      const firstStep = currentRoute.steps[0];
      const firstDir = LocationGraph.bearingToCardinal(firstStep.bearing);
      AudioGuide.announceStart(
        currentRoute.steps[0].from.name,
        destLocation.name,
        currentRoute.totalDistance,
        firstDir
      );
    }

    startNavigationSystem();

    // Cleanup loops, camera references, and sensor streams when exiting
    return () => {
      ARRenderer.stop();
      Compass.stop();
      AudioGuide.stop();
    };
  }, [currentRoute, destLocation]);

  const simulateAdvance = () => {
    if (!currentRoute) return;
    const nextStep = ARRenderer.advanceStep();

    if (nextStep) {
      AudioGuide.announceStep(nextStep, false);
    } else if (ARRenderer.isArrived) {
      AudioGuide.announceArrival(destLocation.name);
    }
  };

  return (
    <section id="view-navigation" class="view navigation active" aria-label="AR Navigation">
      <div class="ar-wrapper">
        {/* Note: Autoplay and playsInline are critical for mobile Safari browser support */}
        <video 
          ref={videoRef} 
          id="ar-video" 
          autoPlay 
          playsInline 
          muted 
          style={{ display: 'none' }}
        />
        <canvas ref={canvasRef} id="ar-canvas" />

        <div class="nav-controls">
          <button 
            id="btn-stop-nav" 
            class="btn-icon btn" 
            title="Stop navigation" 
            aria-label="Stop navigation"
            onClick={onStopNav}
          >
            ✕
          </button>
          <button 
            id="btn-next-step" 
            class="btn-icon btn btn-next-step" 
            title="Simulate next waypoint (testing)" 
            aria-label="Next waypoint"
            onClick={simulateAdvance}
          >
            ⏭️
          </button>
          <button 
            id="btn-mute" 
            class="btn-icon btn" 
            title="Toggle audio" 
            aria-label="Toggle audio"
            onClick={onToggleMute}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </section>
  );
}
