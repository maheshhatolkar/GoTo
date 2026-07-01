/**
 * App — Main Application Controller
 * Manages view transitions, application state, and coordinates all modules (AR, Compass, Audio, Scanning).
 */
const App = (() => {
  // ── State ──────────────────────────────────────────────────────────
  let currentView = 'splash';     // Currently active section ID (without 'view-' prefix)
  let sourceLocation = null;      // Starting waypoint node object (from QR scan or manual input)
  let destLocation = null;        // Target waypoint node object
  let currentRoute = null;        // Calculated route object holding total distance and step instructions

  // ── DOM Cache ──────────────────────────────────────────────────────
  // Quick shorthand for selecting a single DOM element
  const $ = (sel) => document.querySelector(sel);
  const views = {};               // Caches the main view container elements
  const els = {};                 // Caches interactive buttons, lists, and inputs

  /**
   * Initialize the application.
   * Caches DOM elements, binds event handlers, parses initial route hashes, and preps audio.
   */
  function init() {
    // Cache all screen view container sections
    views.splash = $('#view-splash');
    views.scanner = $('#view-scanner');
    views.destination = $('#view-destination');
    views.navigation = $('#view-navigation');
    views.qrGenerator = $('#view-qr-generator');

    // Cache interactive UI elements for quick access and performance
    els.startBtn = $('#btn-start-scan');
    els.scannerStatus = $('#scanner-status');
    els.scannerError = $('#scanner-error');
    els.sourceInfo = $('#source-info');
    els.sourceName = $('#source-name');
    els.sourceId = $('#source-id');
    els.destSelect = $('#dest-select');
    els.destSearch = $('#dest-search');
    els.navigateBtn = $('#btn-navigate');
    els.rescanBtn = $('#btn-rescan');
    els.arCanvas = $('#ar-canvas');
    els.arVideo = $('#ar-video');
    els.stopNavBtn = $('#btn-stop-nav');
    els.muteBtn = $('#btn-mute');
    els.nextStepBtn = $('#btn-next-step');
    els.generateQrBtn = $('#btn-generate-qr');
    els.backFromQrBtn = $('#btn-back-from-qr');
    els.qrContainer = $('#qr-codes-container');
    els.manualIdBtn = $('#btn-manual-id');
    els.manualInput = $('#manual-location-input');
    els.manualSubmit = $('#btn-manual-submit');
    els.manualIdSection = $('#manual-id-section');

    // Attach click and input listeners to interactive elements
    bindEvents();

    // Direct routing: If URL has '#generate-qr', skip splash and open QR generator immediately
    if (window.location.hash === '#generate-qr') {
      showView('qrGenerator');
      QRGenerator.generateAll('qr-codes-container');
    } else {
      showView('splash');
    }

    // Warm up the text-to-speech synthesis engine on user interaction preparation
    AudioGuide.init();

    console.log('[App] Initialized');
  }

  /**
   * Bind all event listeners to actions.
   */
  function bindEvents() {
    // Splash view trigger -> Opens camera stream and scanner screen
    els.startBtn?.addEventListener('click', startScanning);

    // Destination selection screen triggers -> Navigate or re-scan QR
    els.navigateBtn?.addEventListener('click', startNavigation);
    els.rescanBtn?.addEventListener('click', startScanning);

    // Live navigation control buttons
    els.stopNavBtn?.addEventListener('click', stopNavigation);
    els.muteBtn?.addEventListener('click', toggleMute);
    els.nextStepBtn?.addEventListener('click', simulateAdvance);

    // QR Code utility generator panel toggles
    els.generateQrBtn?.addEventListener('click', () => {
      showView('qrGenerator');
      QRGenerator.generateAll('qr-codes-container');
    });
    els.backFromQrBtn?.addEventListener('click', () => {
      showView('splash');
    });

    // Keyboard and click support for manual ID fallback
    els.manualIdBtn?.addEventListener('click', toggleManualInput);
    els.manualSubmit?.addEventListener('click', submitManualId);
    els.manualInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitManualId();
    });

    // Filters the destinations dropdown in real-time as the user types
    els.destSearch?.addEventListener('input', filterDestinations);

    // Handle back button / bookmarks directly checking the URL hash changes
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#generate-qr') {
        showView('qrGenerator');
        QRGenerator.generateAll('qr-codes-container');
      }
    });
  }

  // ── View Management ────────────────────────────────────────────────

  /**
   * Hide all screen sections and display the active one.
   * @param {string} name - View key (e.g. 'splash', 'scanner', 'destination')
   */
  function showView(name) {
    // Disable active classes to hide views
    Object.values(views).forEach(v => {
      if (v) v.classList.remove('active');
    });
    // Add active class to target container to display it via CSS
    if (views[name]) {
      views[name].classList.add('active');
      currentView = name;
    }
  }

  // ── QR Scanning ────────────────────────────────────────────────────

  /**
   * Activate camera stream and begin looking for QR codes.
   */
  async function startScanning() {
    showView('scanner');
    if (els.scannerError) els.scannerError.textContent = '';
    if (els.scannerStatus) els.scannerStatus.textContent = 'Point camera at a location QR code...';

    // Start scanner listener using custom wrappers around html5-qrcode
    await QRScanner.start('qr-reader', {
      onScan: handleQRScan,
      onError: handleScanError
    });
  }

  /**
   * Callback invoked when a QR code is detected and parsed.
   * @param {string} locationId - Parsed string payload from QR
   * @param {boolean} isValid - Library validation checks flag
   */
  function handleQRScan(locationId, isValid = true) {
    // Ensure scanned code is inside our pre-defined LocationGraph coordinates
    if (!isValid || !LocationGraph.isValidLocation(locationId)) {
      if (els.scannerError) {
        els.scannerError.textContent = `Unknown location: "${locationId}". Please scan a valid location QR code.`;
      }
      return;
    }

    // Shut down the camera stream to save hardware resources
    QRScanner.stop();

    // Cache the resolved starting node
    sourceLocation = LocationGraph.getLocation(locationId);

    // Update starting point visual cards on select destination screen
    if (els.sourceName) els.sourceName.textContent = sourceLocation.name;
    if (els.sourceId) els.sourceId.textContent = sourceLocation.id;

    // Refresh lists and dropdown menus excluding the starting location
    populateDestinations();

    // Switch view to select destination screen
    showView('destination');

    // Provide spoken audio feedback of scanned checkpoint
    AudioGuide.speak(`Source location: ${sourceLocation.name}`);
  }

  /**
   * Callback invoked if the scanner library fails to initialize the camera stream.
   */
  function handleScanError(message) {
    if (els.scannerError) {
      els.scannerError.textContent = message;
    }
  }

  // ── Manual ID Entry ────────────────────────────────────────────────

  /**
   * Toggle manual location input layout for desktop testing or devices without camera access.
   */
  function toggleManualInput() {
    if (!els.manualIdSection) return;
    const isHidden = els.manualIdSection.style.display === 'none' || !els.manualIdSection.style.display;
    els.manualIdSection.style.display = isHidden ? 'block' : 'none';
    if (isHidden && els.manualInput) {
      els.manualInput.focus();
    }
  }

  /**
   * Validates manual input value and triggers same callback as QR code scanned logic.
   */
  function submitManualId() {
    const input = els.manualInput?.value?.trim().toUpperCase();
    if (!input) return;

    if (LocationGraph.isValidLocation(input)) {
      handleQRScan(input, true);
    } else {
      if (els.scannerError) {
        els.scannerError.textContent = `"${input}" is not a valid location ID. Valid IDs: LOC_001 to LOC_010`;
      }
    }
  }

  // ── Destination Selection ──────────────────────────────────────────

  /**
   * Fills the dropdown select menu with available map locations (excluding current).
   */
  function populateDestinations() {
    if (!els.destSelect) return;
    els.destSelect.innerHTML = '<option value="">— Select Destination —</option>';

    const allLocations = LocationGraph.getAllLocations();
    for (const loc of allLocations) {
      if (loc.id === sourceLocation.id) continue; // Skip starting point
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = `${loc.name} (${loc.id})`;
      els.destSelect.appendChild(opt);
    }
  }

  /**
   * Filters select options based on text in the search input box.
   */
  function filterDestinations() {
    const query = els.destSearch?.value?.toLowerCase() || '';
    const options = els.destSelect?.querySelectorAll('option');
    if (!options) return;

    options.forEach(opt => {
      if (!opt.value) return; // Skip default selection prompt
      opt.style.display = opt.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────

  /**
   * Sets destination, invokes Dijkstra to calculate shortest path, starts compass and AR canvas overlays.
   */
  async function startNavigation() {
    const destId = els.destSelect?.value;
    if (!destId || !sourceLocation) {
      // Shake animation to alert the user to select destination
      if (els.destSelect) els.destSelect.classList.add('shake');
      setTimeout(() => els.destSelect?.classList.remove('shake'), 500);
      return;
    }

    destLocation = LocationGraph.getLocation(destId);

    // Call graph system to calculate path nodes, bearings, and segments
    currentRoute = LocationGraph.findShortestPath(sourceLocation.id, destId);
    if (!currentRoute) {
      AudioGuide.speak('No route found to that destination.');
      return;
    }

    // Display AR navigation screen containing video feed + canvas overlay
    showView('navigation');

    // Link AR overlays canvas to the device camera stream
    ARRenderer.init(els.arCanvas, els.arVideo);

    // Activate the device orientation listener (request permissions for iOS Safari)
    const compassOk = await Compass.start();
    if (!compassOk) {
      console.warn('[App] Compass not available, using simulated heading');
    }

    // Start video playback and overlay draw loop
    await ARRenderer.startNavigation(currentRoute);

    // Initial audio route details announcement
    const firstStep = currentRoute.steps[0];
    const firstDir = LocationGraph.bearingToCardinal(firstStep.bearing);
    AudioGuide.announceStart(
      sourceLocation.name,
      destLocation.name,
      currentRoute.totalDistance,
      firstDir
    );
  }

  /**
   * Stop rendering loops, orientation streams, and return to splash screen.
   */
  function stopNavigation() {
    ARRenderer.stop();
    Compass.stop();
    AudioGuide.stop();
    currentRoute = null;
    showView('splash');
  }

  /**
   * Toggles speech synthesis volume output.
   */
  function toggleMute() {
    const muted = AudioGuide.toggleMute();
    if (els.muteBtn) {
      els.muteBtn.textContent = muted ? '🔇' : '🔊';
      els.muteBtn.title = muted ? 'Unmute audio' : 'Mute audio';
    }
  }

  /**
   * Simulate advancing to next waypoint (for testing without physical QR codes).
   * In production, this would be triggered by scanning intermediate node QR codes.
   */
  function simulateAdvance() {
    if (!currentRoute) return;
    const nextStep = ARRenderer.advanceStep();

    if (nextStep) {
      // Speak next instruction
      AudioGuide.announceStep(nextStep, false);
    } else if (ARRenderer.isArrived) {
      // Speak arrival confirmation
      AudioGuide.announceArrival(destLocation.name);
    }
  }

  // ── Initialization ─────────────────────────────────────────────────

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    startScanning,
    startNavigation,
    stopNavigation,
    simulateAdvance,
    get currentView() { return currentView; },
    get source() { return sourceLocation; },
    get destination() { return destLocation; },
    get route() { return currentRoute; }
  };
})();
