// ── State variables ────────────────────────────────────────────────
let currentHeading = 0;        // Raw heading in degrees (0 = North, clockwise)
let smoothedHeading = 0;       // Filtered heading (reduces jitter/noise)
let isActive = false;          // Whether the window listeners are active
let permissionGranted = false;  // Permission status for accessing sensors
let listeners = [];            // Registered callbacks that need heading updates
const SMOOTHING = 0.25;        // Low-pass filter factor (closer to 0 is smoother, 1 is raw/instant)

/**
 * Request permission and start listening to device orientation.
 * On iOS 13+, must be called from a user gesture (click/tap) due to security policies.
 * @returns {Promise<boolean>} True if compass sensor is available and accessible
 */
export async function start() {
  if (isActive) return true;

  // iOS 13+ requires explicit user permission to access DeviceOrientation events.
  // We check if requestPermission exists on the DeviceOrientationEvent constructor.
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

  // Check if the browser actually supports DeviceOrientationEvent at all
  if (typeof DeviceOrientationEvent === 'undefined') {
    console.warn('[Compass] DeviceOrientationEvent not supported');
    return false;
  }

  // Listen to deviceorientationabsolute first (provides true north coordinates).
  // Fall back to deviceorientation if absolute is not supported on this device.
  window.addEventListener('deviceorientationabsolute', handleOrientation, true);
  window.addEventListener('deviceorientation', handleOrientationFallback, true);
  isActive = true;
  permissionGranted = true;
  return true;
}

/**
 * Stop listening to device orientation events to save battery / release resources.
 */
export function stop() {
  window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
  window.removeEventListener('deviceorientation', handleOrientationFallback, true);
  isActive = false;
}

/**
 * Handle absolute orientation events (preferred, gives true north).
 * Once received, we remove the fallback listener to avoid duplicate calculations.
 */
function handleOrientation(event) {
  if (event.alpha === null) return;
  // Remove fallback listener since we have confirmed absolute orientation is working
  window.removeEventListener('deviceorientation', handleOrientationFallback, true);
  processHeading(event);
}

/**
 * Fallback for non-absolute orientation events.
 */
function handleOrientationFallback(event) {
  if (event.alpha === null) return;
  processHeading(event);
}

/**
 * Process raw heading from orientation event.
 * Handles OS-specific formats (iOS webkitCompassHeading vs Android alpha).
 */
function processHeading(event) {
  let heading;

  // iOS uses webkitCompassHeading (degrees from true north, clockwise [0 to 360])
  if (event.webkitCompassHeading !== undefined) {
    heading = event.webkitCompassHeading;
  } else if (event.alpha !== null) {
    // Android: alpha is degrees of rotation around the z-axis (facing up), 
    // but is counterclockwise. To make it clockwise relative to true north:
    // For absolute events, heading = 360 - alpha
    heading = (360 - event.alpha) % 360;
  } else {
    return;
  }

  currentHeading = heading;

  // Smooth with low-pass filter: smoothed = smoothed + (raw - smoothed) * SMOOTHING
  // However, we must handle the 360/0 degree wraparound (e.g. going from 359° to 1°).
  // Without wraparound handling, the filter would try to slide through 180° instead of crossing 0°.
  let delta = heading - smoothedHeading;
  if (delta > 180) delta -= 360;   // Shortest path clockwise crossing north
  if (delta < -180) delta += 360;  // Shortest path counterclockwise crossing north
  
  // Apply filter factor and ensure result is positive [0, 360)
  smoothedHeading = (smoothedHeading + delta * SMOOTHING + 360) % 360;

  // Notify all registered listener callbacks with the new heading
  for (const cb of listeners) {
    cb(smoothedHeading, currentHeading);
  }
}

/**
 * Get the current smoothed compass heading.
 * @returns {number} Heading in degrees [0, 360), 0 = North
 */
export function getHeading() {
  return smoothedHeading;
}

/**
 * Get the raw (unsmoothed) heading.
 * @returns {number}
 */
export function getRawHeading() {
  return currentHeading;
}

/**
 * Register a callback for heading changes.
 * @param {function(smoothed: number, raw: number)} callback
 */
export function onHeadingChange(callback) {
  listeners.push(callback);
}

/**
 * Remove a previously registered callback.
 * @param {function} callback
 */
export function offHeadingChange(callback) {
  listeners = listeners.filter(cb => cb !== callback);
}

/**
 * Check if compass is active and receiving data.
 * @returns {boolean}
 */
export function isAvailable() {
  return isActive && permissionGranted;
}

/**
 * Manually set heading (fallback / simulation mode for testing or devices without compass).
 * @param {number} deg
 */
export function setManualHeading(deg) {
  currentHeading = deg % 360;
  smoothedHeading = currentHeading;
  for (const cb of listeners) {
    cb(smoothedHeading, currentHeading);
  }
}

const Compass = {
  start,
  stop,
  getHeading,
  getRawHeading,
  onHeadingChange,
  offHeadingChange,
  isAvailable,
  setManualHeading
};

export default Compass;
