import React from 'react';

/**
 * Splash Screen Component
 * Renders welcoming visuals, branding logos, and prompts to start navigation.
 */
export default function Splash({ onStartScan, onOpenQRGenerator }) {
  return (
    <section id="view-splash" class="view splash active" aria-label="Welcome">
      <div class="splash-content">
        <div class="splash-logo">
          <div class="splash-logo-icon">🧭</div>
          <div class="splash-logo-ring"></div>
        </div>

        <h1>AR Wayfinder</h1>
        <p class="splash-subtitle">
          Scan a QR code at your current location, choose your destination,
          and follow augmented reality arrows with voice guidance.
        </p>

        <button id="btn-start-scan" class="btn btn-primary" onClick={onStartScan}>
          <span>📷</span> Start Scanning
        </button>

        <div style={{ marginTop: '24px' }}>
          <button id="btn-generate-qr" class="btn btn-secondary btn-sm" onClick={onOpenQRGenerator}>
            <span>📋</span> Generate QR Codes
          </button>
        </div>
      </div>
    </section>
  );
}
