import LocationGraph from './locationGraph.js';

let scanner = null;             // Active instance of Html5Qrcode
let isScanning = false;         // Tracking state of camera streams
let onScanCallback = null;      // Callback invoked upon successful decode
let onErrorCallback = null;     // Callback invoked upon initialization errors

/**
 * Initialize the camera scan viewport inside a target container.
 * @param {string} containerId - DOM ID where camera canvas will be rendered
 * @param {object} [options]
 * @param {function(string, boolean)} options.onScan - Callback with decoded location ID and valid flag
 * @param {function(string)} options.onError - Callback with error messages
 * @returns {Promise<void>}
 */
export async function start(containerId, options = {}) {
  // If a scan session is active, stop it before starting a new one
  if (isScanning) {
    await stop();
  }

  onScanCallback = options.onScan || null;
  onErrorCallback = options.onError || null;

  try {
    // Instantiate html5-qrcode library wrapper on target DOM container
    // The library must be loaded globally from CDN (window.Html5Qrcode)
    const Html5QrcodeLib = window.Html5Qrcode;
    if (!Html5QrcodeLib) {
      throw new Error('Html5Qrcode library is not loaded on window.');
    }
    
    scanner = new Html5QrcodeLib(containerId);

    const config = {
      fps: 10,                                              // Scan rate: 10 frames per second
      qrbox: { width: 250, height: 250 },                   // Overlay box coordinates dimension
      aspectRatio: 1.0,                                     // Square camera view window
      formatsToSupport: [window.Html5QrcodeSupportedFormats.QR_CODE] // Restrict matching to QR Codes only
    };

    // Request back camera stream ('environment') and run scanner loop
    await scanner.start(
      { facingMode: 'environment' },
      config,
      onScanSuccess,
      onScanFailure
    );

    isScanning = true;
    console.log('[QRScanner] Started successfully');
  } catch (err) {
    console.error('[QRScanner] Failed to start:', err);
    if (onErrorCallback) {
      onErrorCallback(getCameraErrorMessage(err));
    }
  }
}

/**
 * Callback triggered when a QR code signature is found and resolved.
 */
function onScanSuccess(decodedText, decodedResult) {
  console.log('[QRScanner] Decoded text:', decodedText);

  // Verify whether the parsed code belongs to the node database map
  if (LocationGraph.isValidLocation(decodedText)) {
    // Trigger double-haptic pulse feedback if mobile device vibration is supported
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    if (onScanCallback) {
      onScanCallback(decodedText, true);
    }
  } else {
    console.warn('[QRScanner] Scanned code is not a registered location:', decodedText);
    if (onScanCallback) {
      onScanCallback(decodedText, false);
    }
  }
}

/**
 * Callback triggered on scan frames failure.
 */
function onScanFailure(error) {
  // Silently ignore to avoid console logging spam
}

/**
 * Turn off the camera stream, clean up canvas overlays, and reset states.
 * @returns {Promise<void>}
 */
export async function stop() {
  if (scanner && isScanning) {
    try {
      await scanner.stop();
      scanner.clear();
      console.log('[QRScanner] Stopped and cleared');
    } catch (err) {
      console.warn('[QRScanner] Error stopping scanner session:', err);
    }
  }
  isScanning = false;
  scanner = null;
}

/**
 * Check if camera scanner stream is active.
 * @returns {boolean}
 */
export function isActive() {
  return isScanning;
}

/**
 * Map standard navigator userMedia exception profiles into clean, readable warnings.
 */
function getCameraErrorMessage(error) {
  const msg = String(error);
  if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
    return 'Camera permission denied. Please allow camera access in your browser settings.';
  }
  if (msg.includes('NotFoundError') || msg.includes('DevicesNotFound')) {
    return 'No camera found. Please ensure your device has a camera.';
  }
  if (msg.includes('NotReadableError') || msg.includes('TrackStartError')) {
    return 'Camera is in use by another application. Please close other camera apps.';
  }
  if (msg.includes('OverconstrainedError')) {
    return 'Camera does not meet the required constraints.';
  }
  return 'Unable to access camera. Please check permissions and try again.';
}

const QRScanner = {
  start,
  stop,
  isActive
};

export default QRScanner;
