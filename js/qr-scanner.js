/**
 * QR Scanner — QR Code Scanning Module
 * Uses html5-qrcode library for camera-based QR code detection.
 */
const QRScanner = (() => {
  let scanner = null;
  let isScanning = false;
  let onScanCallback = null;
  let onErrorCallback = null;

  /**
   * Initialize the QR scanner on a container element.
   * @param {string} containerId - DOM element ID to render scanner in
   * @param {object} [options]
   * @param {function(string)} options.onScan - Callback with decoded QR data
   * @param {function(string)} options.onError - Callback for errors
   * @returns {Promise<void>}
   */
  async function start(containerId, options = {}) {
    if (isScanning) {
      await stop();
    }

    onScanCallback = options.onScan || null;
    onErrorCallback = options.onError || null;

    try {
      // eslint-disable-next-line no-undef
      scanner = new Html5Qrcode(containerId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      };

      await scanner.start(
        { facingMode: 'environment' }, // Use rear camera
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
   * Handle successful QR scan.
   */
  function onScanSuccess(decodedText, decodedResult) {
    console.log('[QRScanner] Decoded:', decodedText);

    // Validate against known location IDs
    if (LocationGraph.isValidLocation(decodedText)) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      if (onScanCallback) {
        onScanCallback(decodedText);
      }
    } else {
      console.warn('[QRScanner] Unknown location:', decodedText);
      // Still notify but with a flag
      if (onScanCallback) {
        onScanCallback(decodedText, false);
      }
    }
  }

  /**
   * Handle scan failure (called frequently when no QR is visible).
   */
  function onScanFailure(error) {
    // Silently ignore — this fires continuously when no QR is in view
  }

  /**
   * Stop the scanner and release camera.
   * @returns {Promise<void>}
   */
  async function stop() {
    if (scanner && isScanning) {
      try {
        await scanner.stop();
        scanner.clear();
        console.log('[QRScanner] Stopped');
      } catch (err) {
        console.warn('[QRScanner] Error stopping:', err);
      }
    }
    isScanning = false;
    scanner = null;
  }

  /**
   * Check if camera/scanner is active.
   * @returns {boolean}
   */
  function isActive() {
    return isScanning;
  }

  /**
   * Convert camera errors to user-friendly messages.
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

  return {
    start,
    stop,
    isActive
  };
})();
