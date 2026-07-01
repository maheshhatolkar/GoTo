import React, { useRef, useEffect } from 'react';
import LocationGraph from '../utils/locationGraph.js';

/**
 * QRCard Component
 * Wraps individual qr cards, rendering layout details and generating 
 * image outputs via the global QRCode constructor.
 */
function QRCard({ loc }) {
  const qrRef = useRef(null);

  useEffect(() => {
    if (!qrRef.current) return;

    // Clear previous QR renderings to avoid duplicate canvas stacks on mount/update
    qrRef.current.innerHTML = '';

    try {
      const QRCodeLib = window.QRCode;
      if (!QRCodeLib) {
        throw new Error('QRCode library is not loaded on window.');
      }

      // Generate QR code targeting the local ref container
      new QRCodeLib(qrRef.current, {
        text: loc.id,
        width: 160,
        height: 160,
        colorDark: '#0a0e27',
        colorLight: '#ffffff',
        correctLevel: QRCodeLib.CorrectLevel.H
      });
    } catch (err) {
      console.error('[QRCard] QR generation failed:', err);
      qrRef.current.textContent = 'QR library not loaded';
      qrRef.current.style.color = '#ff006e';
    }
  }, [loc.id]);

  return (
    <div 
      className="qr-card" 
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(0,212,255,0.15)',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        breakInside: 'avoid'
      }}
    >
      {/* Target container for barcode canvas insertion */}
      <div 
        ref={qrRef} 
        style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}
      />
      <h3 style={{ color: '#ffffff', margin: '0 0 4px', fontSize: '16px' }}>
        {loc.name}
      </h3>
      <code style={{ color: '#00d4ff', fontFamily: '"JetBrains Mono",monospace', fontSize: '13px' }}>
        {loc.id}
      </code>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '8px 0 0' }}>
        {loc.description}
      </p>
    </div>
  );
}

/**
 * QRGenerator Component
 * Renders print preview control buttons and grids containing location cards.
 */
export default function QRGenerator({ onBack }) {
  const locations = LocationGraph.getAllLocations();

  return (
    <section id="view-qr-generator" class="view qr-generator active" aria-label="QR Code Generator">
      <div class="qr-generator-header">
        <button id="btn-back-from-qr" class="btn btn-secondary btn-sm" style={{ marginBottom: '16px' }} onClick={onBack}>
          ← Back
        </button>
        <h2>📋 Location QR Codes</h2>
        <p class="text-dim">Print and place these QR codes at each location</p>
      </div>

      <div id="qr-codes-container">
        <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#00d4ff' }}>
          Printable QR Codes for All Locations
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '32px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
          Print this page and place each QR code at its corresponding location.
        </p>

        {/* Printable Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '24px',
          padding: '16px'
        }}>
          {locations.map(loc => (
            <QRCard key={loc.id} loc={loc} />
          ))}
        </div>

        {/* Trigger browser native print layouts */}
        <button 
          className="btn btn-primary" 
          style={{
            display: 'block',
            margin: '32px auto',
            padding: '14px 32px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
          onClick={() => window.print()}
        >
          🖨️ Print QR Codes
        </button>
      </div>
    </section>
  );
}
