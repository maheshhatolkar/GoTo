import React, { useState, useEffect } from 'react';
import QRScanner from '../utils/qrScanner.js';
import LocationGraph from '../utils/locationGraph.js';

/**
 * QRScanner UI Component
 * Mounts camera frame overlay, executes scanner initialization,
 * and renders the manual ID input form fallback.
 */
export default function QRScannerComponent({ onScan }) {
  const [status, setStatus] = useState('Initializing camera...');
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    setStatus('Point camera at a location QR code...');
    setError('');

    // Start scanner using the ES module
    QRScanner.start('qr-reader', {
      onScan: (locationId, isValid) => {
        if (!isValid) {
          setError(`Unknown location: "${locationId}". Please scan a valid location QR code.`);
          return;
        }
        onScan(locationId);
      },
      onError: (message) => {
        setError(message);
      }
    });

    // Cleanup: stop camera streams when components switch views
    return () => {
      QRScanner.stop();
    };
  }, [onScan]);

  const handleManualSubmit = () => {
    const input = manualInput.trim().toUpperCase();
    if (!input) return;

    if (LocationGraph.isValidLocation(input)) {
      onScan(input);
    } else {
      setError(`"${input}" is not a valid location ID. Valid IDs: LOC_001 to LOC_010`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    }
  };

  return (
    <section id="view-scanner" class="view scanner active" aria-label="QR Scanner">
      <div class="scanner-container">
        <div class="scanner-header">
          <h2>📷 Scan Location QR</h2>
          <p id="scanner-status" class="scanner-status">{status}</p>
        </div>

        <div style={{ position: 'relative' }}>
          <div id="qr-reader"></div>
          <div class="scanner-overlay"></div>
          <div class="scanner-corners"></div>
          <div class="scanner-corners-bottom"></div>
        </div>

        <p id="scanner-error" class="scanner-error">{error}</p>

        <div class="scanner-actions">
          <button 
            id="btn-manual-id" 
            class="btn btn-secondary btn-sm"
            onClick={() => setShowManual(!showManual)}
          >
            ⌨️ Enter ID Manually
          </button>

          {showManual && (
            <div id="manual-id-section" class="manual-id-section" style={{ display: 'block' }}>
              <div class="manual-input-group">
                <input
                  type="text"
                  id="manual-location-input"
                  class="input-field"
                  placeholder="e.g. LOC_001"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <button 
                  id="btn-manual-submit" 
                  class="btn btn-primary btn-sm"
                  onClick={handleManualSubmit}
                >
                  Go
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
