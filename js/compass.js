/**
 * Compass — Device Orientation Handler
 * Abstracts device compass heading across browsers (Android Chrome, iOS Safari).
 * Provides smoothed heading via low-pass filter.
 */
const Compass = (() => {
  let currentHeading = 0;        // Raw heading in degrees
  let smoothedHeading = 0;       // Filtered heading
  let isActive = false;
  let permissionGranted = false;
  let listeners = [];
  const SMOOTHING = 0.25;        // Low-pass filter factor (0 = smooth, 1 = raw)

  /**
   * Request permission and start listening to device orientation.
   * On iOS 13+, must be called from a user gesture (click/tap).
   * @returns {Promise<boolean>} True if compass is available
   */
  async function start() {
    if (isActive) return true;

    // iOS 13+ requires explicit permission
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          console.warn('[Compass] Permission denied on iOS');
          return false;
        }
        permissionGranted = true;
      } catch (err) {
        console.error('[Compass] Permission request failed:', err);
        return false;
      }
    }

    // Check if DeviceOrientationEvent is supported
    if (typeof DeviceOrientationEvent === 'undefined') {
      console.warn('[Compass] DeviceOrientationEvent not supported');
      return false;
    }

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientationFallback, true);
    isActive = true;
    permissionGranted = true;
    return true;
  }

  /**
   * Stop listening to device orientation.
   */
  function stop() {
    window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
    window.removeEventListener('deviceorientation', handleOrientationFallback, true);
    isActive = false;
  }

  /**
   * Handle absolute orientation events (preferred, gives true north).
   */
  function handleOrientation(event) {
    if (event.alpha === null) return;
    // Remove fallback listener since we have absolute orientation
    window.removeEventListener('deviceorientation', handleOrientationFallback, true);
    processHeading(event);
  }

  /**
   * Fallback for non-absolute orientation.
   */
  function handleOrientationFallback(event) {
    if (event.alpha === null) return;
    processHeading(event);
  }

  /**
   * Process raw heading from orientation event.
   */
  function processHeading(event) {
    let heading;

    // iOS uses webkitCompassHeading (degrees from true north, clockwise)
    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android: alpha is degrees from north, but counterclockwise
      // For absolute events, heading = 360 - alpha
      heading = (360 - event.alpha) % 360;
    } else {
      return;
    }

    currentHeading = heading;

    // Smooth with low-pass filter (handle 360/0 wraparound)
    let delta = heading - smoothedHeading;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    smoothedHeading = (smoothedHeading + delta * SMOOTHING + 360) % 360;

    // Notify listeners
    for (const cb of listeners) {
      cb(smoothedHeading, currentHeading);
    }
  }

  /**
   * Get the current smoothed compass heading.
   * @returns {number} Heading in degrees [0, 360), 0 = North
   */
  function getHeading() {
    return smoothedHeading;
  }

  /**
   * Get the raw (unsmoothed) heading.
   * @returns {number}
   */
  function getRawHeading() {
    return currentHeading;
  }

  /**
   * Register a callback for heading changes.
   * @param {function(smoothed: number, raw: number)} callback
   */
  function onHeadingChange(callback) {
    listeners.push(callback);
  }

  /**
   * Remove a previously registered callback.
   * @param {function} callback
   */
  function offHeadingChange(callback) {
    listeners = listeners.filter(cb => cb !== callback);
  }

  /**
   * Check if compass is active and receiving data.
   * @returns {boolean}
   */
  function isAvailable() {
    return isActive && permissionGranted;
  }

  /**
   * Manually set heading (fallback for devices without compass).
   * @param {number} deg
   */
  function setManualHeading(deg) {
    currentHeading = deg % 360;
    smoothedHeading = currentHeading;
    for (const cb of listeners) {
      cb(smoothedHeading, currentHeading);
    }
  }

  return {
    start,
    stop,
    getHeading,
    getRawHeading,
    onHeadingChange,
    offHeadingChange,
    isAvailable,
    setManualHeading
  };
})();
