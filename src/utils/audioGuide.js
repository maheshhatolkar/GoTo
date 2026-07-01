import { bearingToCardinal } from './locationGraph.js';

let isMuted = false;            // Global audio output setting
let synth = null;               // Reference to window.speechSynthesis
let currentUtterance = null;    // Holds active speech query entity
let voicePreference = null;     // Selected SpeechSynthesisVoice configuration
let isInitialized = false;      // Initialization flag

/**
 * Initialize the Speech Synthesis engine.
 * Resolves list of available voices. Should be triggered from a user click gesture
 * to satisfy browser autoplay security policies.
 */
export function init() {
  if (isInitialized) return;
  synth = window.speechSynthesis;
  if (!synth) {
    console.warn('[AudioGuide] SpeechSynthesis not supported by this browser');
    return;
  }

  // Select the best available voice (English focused)
  const pickVoice = () => {
    const voices = synth.getVoices();
    // Heuristic search: Google UK female is highly articulate, 
    // fallback to Google generic, then localized english, generic english, or index 0.
    voicePreference =
      voices.find(v => v.name.includes('Google UK English Female')) ||
      voices.find(v => v.name.includes('Google UK English')) ||
      voices.find(v => v.lang.startsWith('en') && v.localService) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0] || null;
  };

  pickVoice();
  
  // Chrome and other chromium browsers load voices asynchronously.
  // We register the onvoiceschanged callback to pick the voice once loaded.
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = pickVoice;
  }

  isInitialized = true;
}

/**
 * Speak a text sentence using Web Speech Synthesis.
 * Automatically clears previous sentences to play immediate updates.
 * @param {string} text - Message sentence to read
 * @param {object} [options] - Speed and Pitch parameters
 * @param {number} [options.rate=1.0] - Speech rate (0.5 to 2.0)
 * @param {number} [options.pitch=1.0] - Pitch (0 to 2)
 * @param {boolean} [options.force=false] - Speak even if navigation is muted (for scan confirmations)
 */
export function speak(text, options = {}) {
  if (!synth) init();
  if (!synth) return;
  if (isMuted && !options.force) return;

  // Interrupt any active announcement so directions are received immediately
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate || 1.0;
  utterance.pitch = options.pitch || 1.0;
  utterance.volume = 1.0;
  
  if (voicePreference) {
    utterance.voice = voicePreference;
  }

  currentUtterance = utterance;
  synth.speak(utterance);
}

/**
 * Announce the start of a route navigation sequence.
 * @param {string} sourceName
 * @param {string} destName
 * @param {number} totalDistance
 * @param {string} firstDirection - Cardinal string (e.g. 'North')
 */
export function announceStart(sourceName, destName, totalDistance, firstDirection) {
  const text = `Starting navigation from ${sourceName} to ${destName}. ` +
    `Total distance is ${totalDistance} meters. ` +
    `Head ${firstDirection} to begin.`;
  speak(text);
}

/**
 * Announce turn changes when transitioning nodes.
 * @param {string} direction - Turn value (e.g. 'left', 'slight right')
 * @param {string} nextLocationName
 * @param {number} distanceToNext
 */
export function announceTurn(direction, nextLocationName, distanceToNext) {
  let dirText;
  switch (direction) {
    case 'straight':
      dirText = 'Continue straight ahead';
      break;
    case 'slight left':
      dirText = 'Bear slightly left';
      break;
    case 'slight right':
      dirText = 'Bear slightly right';
      break;
    case 'left':
      dirText = 'Turn left';
      break;
    case 'right':
      dirText = 'Turn right';
      break;
    case 'u-turn':
      dirText = 'Make a U-turn';
      break;
    default:
      dirText = `Turn ${direction}`;
  }
  const text = `${dirText} toward ${nextLocationName}. ${distanceToNext} meters ahead.`;
  speak(text);
}

/**
 * Announce approaching a waypoint.
 * @param {string} locationName
 * @param {number} distance
 */
export function announceApproaching(locationName, distance) {
  speak(`In ${distance} meters, you will reach ${locationName}.`);
}

/**
 * Announce arrival at the target destination.
 * @param {string} destName
 */
export function announceArrival(destName) {
  // Speak at a slightly slower rate (0.9) to add a distinct ending tone
  speak(`You have arrived at ${destName}. Navigation complete.`, { rate: 0.9 });
}

/**
 * Announce step details of the route segment.
 * @param {object} step - Step object containing node properties
 * @param {boolean} isFirst - True if initial start segment
 */
export function announceStep(step, isFirst) {
  if (isFirst) {
    const cardinal = bearingToCardinal(step.bearing);
    speak(`Walk ${cardinal} toward ${step.to.name}. ${step.distance} meters.`);
  } else if (step.turn) {
    announceTurn(step.turn.direction, step.to.name, step.distance);
  }
}

/**
 * Toggle global volume output state.
 * @returns {boolean} New mute value
 */
export function toggleMute() {
  isMuted = !isMuted;
  if (isMuted && synth) {
    // Instantly cut off voice if user clicks mute button
    synth.cancel();
  }
  return isMuted;
}

/**
 * Set mute status directly.
 * @param {boolean} muted
 */
export function setMuted(muted) {
  isMuted = muted;
  if (isMuted && synth) {
    synth.cancel();
  }
}

/**
 * Get current mute status.
 * @returns {boolean}
 */
export function getMuted() {
  return isMuted;
}

/**
 * Halt all active and queued speech notifications.
 */
export function stop() {
  if (synth) synth.cancel();
}

const AudioGuide = {
  init,
  speak,
  announceStart,
  announceTurn,
  announceApproaching,
  announceArrival,
  announceStep,
  toggleMute,
  setMuted,
  getMuted,
  stop
};

export default AudioGuide;
