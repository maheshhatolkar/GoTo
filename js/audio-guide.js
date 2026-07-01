/**
 * Audio Guide — Speech Synthesis Navigation
 * Provides spoken turn-by-turn directions using the Web Speech API.
 */
const AudioGuide = (() => {
  let isMuted = false;
  let synth = null;
  let currentUtterance = null;
  let voicePreference = null;
  let isInitialized = false;

  /**
   * Initialize the speech synthesis engine.
   * Must be called once (ideally from a user gesture).
   */
  function init() {
    if (isInitialized) return;
    synth = window.speechSynthesis;
    if (!synth) {
      console.warn('[AudioGuide] SpeechSynthesis not supported');
      return;
    }

    // Select a good English voice
    const pickVoice = () => {
      const voices = synth.getVoices();
      // Prefer Google UK English, then any English voice
      voicePreference =
        voices.find(v => v.name.includes('Google UK English Female')) ||
        voices.find(v => v.name.includes('Google UK English')) ||
        voices.find(v => v.lang.startsWith('en') && v.localService) ||
        voices.find(v => v.lang.startsWith('en')) ||
        voices[0] || null;
    };

    pickVoice();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = pickVoice;
    }

    isInitialized = true;
  }

  /**
   * Speak a text string.
   * Cancels any current speech before starting.
   * @param {string} text
   * @param {object} [options]
   * @param {number} [options.rate=1.0] Speech rate (0.5–2.0)
   * @param {number} [options.pitch=1.0] Speech pitch (0–2)
   * @param {boolean} [options.force=false] Speak even if muted
   */
  function speak(text, options = {}) {
    if (!synth) init();
    if (!synth) return;
    if (isMuted && !options.force) return;

    // Cancel current speech
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
   * Announce the start of navigation.
   * @param {string} sourceName
   * @param {string} destName
   * @param {number} totalDistance
   * @param {string} firstDirection - Cardinal direction of first step
   */
  function announceStart(sourceName, destName, totalDistance, firstDirection) {
    const text = `Starting navigation from ${sourceName} to ${destName}. ` +
      `Total distance is ${totalDistance} meters. ` +
      `Head ${firstDirection} to begin.`;
    speak(text);
  }

  /**
   * Announce a turn at a waypoint.
   * @param {string} direction - e.g., 'left', 'right', 'straight'
   * @param {string} nextLocationName
   * @param {number} distanceToNext
   */
  function announceTurn(direction, nextLocationName, distanceToNext) {
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
  function announceApproaching(locationName, distance) {
    speak(`In ${distance} meters, you will reach ${locationName}.`);
  }

  /**
   * Announce arrival at the destination.
   * @param {string} destName
   */
  function announceArrival(destName) {
    speak(`You have arrived at ${destName}. Navigation complete.`, { rate: 0.9 });
  }

  /**
   * Announce a step instruction.
   * @param {object} step - Step object from LocationGraph
   * @param {boolean} isFirst
   */
  function announceStep(step, isFirst) {
    if (isFirst) {
      const cardinal = LocationGraph.bearingToCardinal(step.bearing);
      speak(`Walk ${cardinal} toward ${step.to.name}. ${step.distance} meters.`);
    } else if (step.turn) {
      announceTurn(step.turn.direction, step.to.name, step.distance);
    }
  }

  /**
   * Toggle mute state.
   * @returns {boolean} New mute state
   */
  function toggleMute() {
    isMuted = !isMuted;
    if (isMuted && synth) {
      synth.cancel();
    }
    return isMuted;
  }

  /**
   * Set mute state directly.
   * @param {boolean} muted
   */
  function setMuted(muted) {
    isMuted = muted;
    if (isMuted && synth) {
      synth.cancel();
    }
  }

  /**
   * Get current mute state.
   * @returns {boolean}
   */
  function getMuted() {
    return isMuted;
  }

  /**
   * Stop current speech.
   */
  function stop() {
    if (synth) synth.cancel();
  }

  return {
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
})();
