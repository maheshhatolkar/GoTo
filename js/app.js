/**
 * App — Main Application Controller
 * Manages view transitions, state, and orchestrates all modules.
 */
const App = (() => {
  // ── State ──────────────────────────────────────────────────────────
  let currentView = 'splash';
  let sourceLocation = null;
  let destLocation = null;
  let currentRoute = null;

  // ── DOM Cache ──────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const views = {};
  const els = {};

  /**
   * Initialize the application.
   */
  function init() {
    // Cache view elements
    views.splash = $('#view-splash');
    views.scanner = $('#view-scanner');
    views.destination = $('#view-destination');
    views.navigation = $('#view-navigation');
    views.qrGenerator = $('#view-qr-generator');

    // Cache interactive elements
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

    // Bind events
    bindEvents();

    // Check URL hash for QR generator
    if (window.location.hash === '#generate-qr') {
      showView('qrGenerator');
      QRGenerator.generateAll('qr-codes-container');
    } else {
      showView('splash');
    }

    // Initialize audio (prep)
    AudioGuide.init();

    console.log('[App] Initialized');
  }

  /**
   * Bind all event listeners.
   */
  function bindEvents() {
    // Splash → Scanner
    els.startBtn?.addEventListener('click', startScanning);

    // Destination selection
    els.navigateBtn?.addEventListener('click', startNavigation);
    els.rescanBtn?.addEventListener('click', startScanning);

    // Navigation controls
    els.stopNavBtn?.addEventListener('click', stopNavigation);
    els.muteBtn?.addEventListener('click', toggleMute);
    els.nextStepBtn?.addEventListener('click', simulateAdvance);

    // QR Generator
    els.generateQrBtn?.addEventListener('click', () => {
      showView('qrGenerator');
      QRGenerator.generateAll('qr-codes-container');
    });
    els.backFromQrBtn?.addEventListener('click', () => {
      showView('splash');
    });

    // Manual ID entry
    els.manualIdBtn?.addEventListener('click', toggleManualInput);
    els.manualSubmit?.addEventListener('click', submitManualId);
    els.manualInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitManualId();
    });

    // Destination search filter
    els.destSearch?.addEventListener('input', filterDestinations);

    // Hash change for QR generator route
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#generate-qr') {
        showView('qrGenerator');
        QRGenerator.generateAll('qr-codes-container');
      }
    });
  }

  // ── View Management ────────────────────────────────────────────────

  function showView(name) {
    // Hide all views
    Object.values(views).forEach(v => {
      if (v) v.classList.remove('active');
    });
    // Show target view
    if (views[name]) {
      views[name].classList.add('active');
      currentView = name;
    }
  }

  // ── QR Scanning ────────────────────────────────────────────────────

  async function startScanning() {
    showView('scanner');
    if (els.scannerError) els.scannerError.textContent = '';
    if (els.scannerStatus) els.scannerStatus.textContent = 'Point camera at a location QR code...';

    await QRScanner.start('qr-reader', {
      onScan: handleQRScan,
      onError: handleScanError
    });
  }

  function handleQRScan(locationId, isValid = true) {
    if (!isValid || !LocationGraph.isValidLocation(locationId)) {
      if (els.scannerError) {
        els.scannerError.textContent = `Unknown location: "${locationId}". Please scan a valid location QR code.`;
      }
      return;
    }

    // Stop scanner
    QRScanner.stop();

    // Set source
    sourceLocation = LocationGraph.getLocation(locationId);

    // Update destination view
    if (els.sourceName) els.sourceName.textContent = sourceLocation.name;
    if (els.sourceId) els.sourceId.textContent = sourceLocation.id;

    // Populate destination dropdown
    populateDestinations();

    // Show destination view
    showView('destination');

    // Audio feedback
    AudioGuide.speak(`Source location: ${sourceLocation.name}`);
  }

  function handleScanError(message) {
    if (els.scannerError) {
      els.scannerError.textContent = message;
    }
  }

  // ── Manual ID Entry ────────────────────────────────────────────────

  function toggleManualInput() {
    if (!els.manualIdSection) return;
    const isHidden = els.manualIdSection.style.display === 'none' || !els.manualIdSection.style.display;
    els.manualIdSection.style.display = isHidden ? 'block' : 'none';
    if (isHidden && els.manualInput) {
      els.manualInput.focus();
    }
  }

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

  function populateDestinations() {
    if (!els.destSelect) return;
    els.destSelect.innerHTML = '<option value="">— Select Destination —</option>';

    const allLocations = LocationGraph.getAllLocations();
    for (const loc of allLocations) {
      if (loc.id === sourceLocation.id) continue; // Skip source
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = `${loc.name} (${loc.id})`;
      els.destSelect.appendChild(opt);
    }
  }

  function filterDestinations() {
    const query = els.destSearch?.value?.toLowerCase() || '';
    const options = els.destSelect?.querySelectorAll('option');
    if (!options) return;

    options.forEach(opt => {
      if (!opt.value) return; // Skip placeholder
      opt.style.display = opt.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────

  async function startNavigation() {
    const destId = els.destSelect?.value;
    if (!destId || !sourceLocation) {
      if (els.destSelect) els.destSelect.classList.add('shake');
      setTimeout(() => els.destSelect?.classList.remove('shake'), 500);
      return;
    }

    destLocation = LocationGraph.getLocation(destId);

    // Calculate route
    currentRoute = LocationGraph.findShortestPath(sourceLocation.id, destId);
    if (!currentRoute) {
      AudioGuide.speak('No route found to that destination.');
      return;
    }

    // Show navigation view
    showView('navigation');

    // Initialize AR renderer
    ARRenderer.init(els.arCanvas, els.arVideo);

    // Start compass
    const compassOk = await Compass.start();
    if (!compassOk) {
      console.warn('[App] Compass not available, using simulated heading');
    }

    // Start AR navigation
    await ARRenderer.startNavigation(currentRoute);

    // Audio announcement
    const firstStep = currentRoute.steps[0];
    const firstDir = LocationGraph.bearingToCardinal(firstStep.bearing);
    AudioGuide.announceStart(
      sourceLocation.name,
      destLocation.name,
      currentRoute.totalDistance,
      firstDir
    );
  }

  function stopNavigation() {
    ARRenderer.stop();
    Compass.stop();
    AudioGuide.stop();
    currentRoute = null;
    showView('splash');
  }

  function toggleMute() {
    const muted = AudioGuide.toggleMute();
    if (els.muteBtn) {
      els.muteBtn.textContent = muted ? '🔇' : '🔊';
      els.muteBtn.title = muted ? 'Unmute audio' : 'Mute audio';
    }
  }

  /**
   * Simulate advancing to next waypoint (for testing without physical QR codes).
   * In production, this would be triggered by scanning an intermediate QR code.
   */
  function simulateAdvance() {
    if (!currentRoute) return;
    const nextStep = ARRenderer.advanceStep();

    if (nextStep) {
      AudioGuide.announceStep(nextStep, false);
    } else if (ARRenderer.isArrived) {
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
