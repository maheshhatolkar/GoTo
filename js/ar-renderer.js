/**
 * AR Renderer — Augmented Reality Overlay Engine
 * Draws directional arrows, distance badges, and navigation HUD
 * on a canvas overlaid on the device camera feed.
 */
const ARRenderer = (() => {
  let canvas = null;
  let ctx = null;
  let videoEl = null;
  let animFrameId = null;
  let isRunning = false;

  // Navigation state
  let route = null;         // Full route from LocationGraph.findShortestPath
  let currentStepIdx = 0;   // Current step index
  let targetBearing = 0;    // Bearing toward next waypoint
  let displayArrowAngle = 0; // Smoothed arrow angle for rendering
  let distToNext = 0;       // Distance to next waypoint
  let totalRemaining = 0;   // Total remaining distance
  let hasArrived = false;

  // Arrival animation
  let arrivalAnimStart = 0;
  let confettiParticles = [];

  // Colors
  const CYAN = '#00d4ff';
  const MAGENTA = '#ff006e';
  const WHITE = '#ffffff';
  const DARK_BG = 'rgba(10, 14, 39, 0.75)';
  const GLASS = 'rgba(255, 255, 255, 0.08)';

  /**
   * Initialize the AR renderer.
   * @param {HTMLCanvasElement} canvasEl
   * @param {HTMLVideoElement} videoElement
   */
  function init(canvasEl, videoElement) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    videoEl = videoElement;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  /**
   * Start the camera feed and AR rendering loop.
   * @param {object} routeData - From LocationGraph.findShortestPath
   */
  async function startNavigation(routeData) {
    route = routeData;
    currentStepIdx = 0;
    hasArrived = false;
    confettiParticles = [];

    if (route.steps.length > 0) {
      targetBearing = route.steps[0].bearing;
      distToNext = route.steps[0].distance;
    }
    calculateRemainingDistance();

    // Start camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      videoEl.srcObject = stream;
      await videoEl.play();
    } catch (err) {
      console.error('[ARRenderer] Camera error:', err);
      // Continue without camera — show arrows on dark background
    }

    isRunning = true;
    render();
  }

  /**
   * Stop the AR renderer and release camera.
   */
  function stop() {
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (videoEl && videoEl.srcObject) {
      videoEl.srcObject.getTracks().forEach(t => t.stop());
      videoEl.srcObject = null;
    }
  }

  /**
   * Advance to the next step in the route.
   * Called when user reaches a waypoint (e.g., scans intermediate QR).
   * @returns {object|null} The next step, or null if arrived
   */
  function advanceStep() {
    if (!route || currentStepIdx >= route.steps.length - 1) {
      hasArrived = true;
      arrivalAnimStart = performance.now();
      generateConfetti();
      return null;
    }
    currentStepIdx++;
    const step = route.steps[currentStepIdx];
    targetBearing = step.bearing;
    distToNext = step.distance;
    calculateRemainingDistance();
    return step;
  }

  /**
   * Manually skip to a specific step.
   * @param {number} idx
   */
  function goToStep(idx) {
    if (!route || idx < 0 || idx >= route.steps.length) return;
    currentStepIdx = idx;
    const step = route.steps[idx];
    targetBearing = step.bearing;
    distToNext = step.distance;
    calculateRemainingDistance();
  }

  /**
   * Get current step info.
   */
  function getCurrentStep() {
    if (!route || currentStepIdx >= route.steps.length) return null;
    return route.steps[currentStepIdx];
  }

  /**
   * Calculate total remaining distance from current step.
   */
  function calculateRemainingDistance() {
    if (!route) { totalRemaining = 0; return; }
    totalRemaining = 0;
    for (let i = currentStepIdx; i < route.steps.length; i++) {
      totalRemaining += route.steps[i].distance;
    }
  }

  /**
   * Resize canvas to fill container.
   */
  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
  }

  // ── Rendering ──────────────────────────────────────────────────────

  function render() {
    if (!isRunning) return;
    animFrameId = requestAnimationFrame(render);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw camera feed
    if (videoEl && videoEl.readyState >= 2) {
      ctx.save();
      const vw = videoEl.videoWidth;
      const vh = videoEl.videoHeight;
      const scale = Math.max(w / vw, h / vh);
      const dx = (w - vw * scale) / 2;
      const dy = (h - vh * scale) / 2;
      ctx.drawImage(videoEl, dx, dy, vw * scale, vh * scale);
      ctx.restore();
    } else {
      // Dark fallback
      ctx.fillStyle = '#0a0e27';
      ctx.fillRect(0, 0, w, h);
      // Grid pattern
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    if (hasArrived) {
      drawArrivalCelebration(w, h);
    } else {
      drawDirectionalArrow(w, h);
      drawDistanceBadge(w, h);
      drawProgressDots(w, h);
      drawCompassRing(w, h);
      drawInstructionBar(w, h);
    }
  }

  /**
   * Draw the main directional arrow.
   */
  function drawDirectionalArrow(w, h) {
    const compassHeading = Compass.getHeading();
    // Arrow angle = target bearing - compass heading
    // When device points toward target, arrow points up (0°)
    let arrowAngle = targetBearing - compassHeading;
    // Normalize to [-180, 180]
    while (arrowAngle > 180) arrowAngle -= 360;
    while (arrowAngle < -180) arrowAngle += 360;

    // Smooth arrow rotation
    let delta = arrowAngle - displayArrowAngle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    displayArrowAngle += delta * 0.12;

    const cx = w / 2;
    const cy = h * 0.42;
    const size = Math.min(w, h) * 0.18;
    const rad = (displayArrowAngle * Math.PI) / 180;
    const time = performance.now() / 1000;

    // Glow pulse
    const pulse = 0.6 + 0.4 * Math.sin(time * 2.5);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);

    // Outer glow
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 30 * pulse;

    // Arrow body (chevron shape)
    ctx.beginPath();
    ctx.moveTo(0, -size);                       // Tip
    ctx.lineTo(size * 0.6, size * 0.4);         // Right wing
    ctx.lineTo(size * 0.2, size * 0.1);         // Right inner
    ctx.lineTo(0, size * 0.5);                  // Bottom center
    ctx.lineTo(-size * 0.2, size * 0.1);        // Left inner
    ctx.lineTo(-size * 0.6, size * 0.4);        // Left wing
    ctx.closePath();

    // Gradient fill
    const grad = ctx.createLinearGradient(0, -size, 0, size * 0.5);
    grad.addColorStop(0, CYAN);
    grad.addColorStop(0.5, '#00a8cc');
    grad.addColorStop(1, MAGENTA);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Inner highlight
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(size * 0.3, size * 0.1);
    ctx.lineTo(0, size * 0.25);
    ctx.lineTo(-size * 0.3, size * 0.1);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw distance information badge.
   */
  function drawDistanceBadge(w, h) {
    const bx = w / 2;
    const by = h * 0.68;
    const bw = 200;
    const bh = 70;

    // Glass background
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, bx - bw / 2, by - bh / 2, bw, bh, 16);
    ctx.fillStyle = DARK_BG;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Distance text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = CYAN;
    ctx.fillText(`${distToNext}m`, bx, by - 10);

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`${totalRemaining}m total remaining`, bx, by + 18);

    ctx.restore();
  }

  /**
   * Draw route progress dots.
   */
  function drawProgressDots(w, h) {
    if (!route) return;
    const dotCount = route.path.length;
    const dotSize = 8;
    const gap = 20;
    const totalWidth = (dotCount - 1) * gap;
    const startX = w / 2 - totalWidth / 2;
    const y = h * 0.78;

    ctx.save();
    for (let i = 0; i < dotCount; i++) {
      const x = startX + i * gap;
      const isVisited = i <= currentStepIdx;
      const isCurrent = i === currentStepIdx;
      const isDestination = i === dotCount - 1;

      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? dotSize : dotSize * 0.6, 0, Math.PI * 2);

      if (isCurrent) {
        ctx.fillStyle = CYAN;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 10;
      } else if (isVisited) {
        ctx.fillStyle = MAGENTA;
        ctx.shadowBlur = 0;
      } else if (isDestination) {
        ctx.fillStyle = 'rgba(255, 0, 110, 0.5)';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();

      // Location name tooltip for current
      if (isCurrent && route.steps[currentStepIdx]) {
        ctx.shadowBlur = 0;
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = WHITE;
        ctx.textAlign = 'center';
        ctx.fillText(route.steps[currentStepIdx].from.name, x, y - 16);
      }
    }
    ctx.restore();
  }

  /**
   * Draw mini compass ring.
   */
  function drawCompassRing(w, h) {
    const cx = w - 50;
    const cy = 60;
    const r = 28;
    const heading = Compass.getHeading();

    ctx.save();
    ctx.translate(cx, cy);

    // Ring background
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = DARK_BG;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // North indicator (rotates with device)
    const northRad = (-heading * Math.PI) / 180;
    ctx.rotate(northRad);

    // N marker
    ctx.beginPath();
    ctx.moveTo(0, -r + 4);
    ctx.lineTo(-5, -r + 14);
    ctx.lineTo(5, -r + 14);
    ctx.closePath();
    ctx.fillStyle = MAGENTA;
    ctx.fill();

    // Cardinal letters
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = WHITE;
    ctx.fillText('N', 0, -r + 20);

    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('E', 0, -r + 20);

    ctx.rotate(Math.PI / 2);
    ctx.fillText('S', 0, -r + 20);

    ctx.rotate(Math.PI / 2);
    ctx.fillText('W', 0, -r + 20);

    ctx.restore();

    // Heading text
    ctx.save();
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(heading)}°`, cx, cy + r + 14);
    ctx.restore();
  }

  /**
   * Draw instruction bar at top.
   */
  function drawInstructionBar(w, h) {
    if (!route || !route.steps[currentStepIdx]) return;
    const step = route.steps[currentStepIdx];
    const barH = 60;

    ctx.save();
    // Glass bar
    ctx.beginPath();
    roundRect(ctx, 10, 10, w - 20, barH, 14);
    ctx.fillStyle = DARK_BG;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Turn icon
    const iconX = 40;
    const iconY = 10 + barH / 2;
    drawTurnIcon(ctx, iconX, iconY, step.turn ? step.turn.direction : 'straight', 16);

    // Instruction text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = WHITE;
    let instruction;
    if (currentStepIdx === 0) {
      instruction = `Head toward ${step.to.name}`;
    } else if (step.turn) {
      const dirLabel = step.turn.direction.charAt(0).toUpperCase() + step.turn.direction.slice(1);
      instruction = `${dirLabel} → ${step.to.name}`;
    } else {
      instruction = `Continue to ${step.to.name}`;
    }
    ctx.fillText(instruction, 65, iconY - 6);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`Step ${currentStepIdx + 1} of ${route.steps.length}  •  ${step.distance}m`, 65, iconY + 14);

    ctx.restore();
  }

  /**
   * Draw a turn direction icon.
   */
  function drawTurnIcon(c, x, y, direction, size) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = CYAN;
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    switch (direction) {
      case 'straight':
        c.beginPath();
        c.moveTo(0, size); c.lineTo(0, -size);
        c.moveTo(-size * 0.4, -size * 0.5); c.lineTo(0, -size); c.lineTo(size * 0.4, -size * 0.5);
        c.stroke();
        break;
      case 'left':
      case 'slight left':
        c.beginPath();
        c.moveTo(size * 0.3, size); c.lineTo(size * 0.3, 0); c.lineTo(-size * 0.5, -size * 0.7);
        c.moveTo(-size * 0.5, -size * 0.2); c.lineTo(-size * 0.5, -size * 0.7); c.lineTo(0, -size * 0.7);
        c.stroke();
        break;
      case 'right':
      case 'slight right':
        c.beginPath();
        c.moveTo(-size * 0.3, size); c.lineTo(-size * 0.3, 0); c.lineTo(size * 0.5, -size * 0.7);
        c.moveTo(size * 0.5, -size * 0.2); c.lineTo(size * 0.5, -size * 0.7); c.lineTo(0, -size * 0.7);
        c.stroke();
        break;
      case 'u-turn':
        c.beginPath();
        c.arc(0, -size * 0.2, size * 0.4, 0, Math.PI, true);
        c.lineTo(-size * 0.4, size);
        c.moveTo(-size * 0.7, size * 0.5); c.lineTo(-size * 0.4, size); c.lineTo(-size * 0.1, size * 0.5);
        c.stroke();
        break;
      default:
        c.beginPath();
        c.moveTo(0, size); c.lineTo(0, -size);
        c.stroke();
    }
    c.restore();
  }

  /**
   * Draw arrival celebration with confetti.
   */
  function drawArrivalCelebration(w, h) {
    const elapsed = (performance.now() - arrivalAnimStart) / 1000;
    const cx = w / 2;
    const cy = h * 0.4;

    // Pulsing circle
    const pulse = 1 + 0.15 * Math.sin(elapsed * 3);
    const radius = 60 * pulse;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
    grad.addColorStop(1, 'rgba(255, 0, 110, 0.1)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Checkmark
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx - 5, cy + 15);
    ctx.lineTo(cx + 25, cy - 20);
    ctx.stroke();

    // Text
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillStyle = WHITE;
    ctx.fillText('You Have Arrived!', cx, cy + radius + 40);

    if (route) {
      const dest = LocationGraph.getLocation(route.path[route.path.length - 1]);
      if (dest) {
        ctx.font = '16px Inter, sans-serif';
        ctx.fillStyle = CYAN;
        ctx.fillText(dest.name, cx, cy + radius + 65);
      }
    }

    // Confetti particles
    for (const p of confettiParticles) {
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.05; // gravity
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
      ctx.restore();
    }
    // Remove particles that fell off screen
    for (let i = confettiParticles.length - 1; i >= 0; i--) {
      if (confettiParticles[i].y > h + 20) confettiParticles.splice(i, 1);
    }

    ctx.restore();
  }

  /**
   * Generate confetti particles.
   */
  function generateConfetti() {
    const w = canvas.width;
    const colors = [CYAN, MAGENTA, '#00ff88', '#ffdd00', WHITE, '#8b5cf6'];
    for (let i = 0; i < 80; i++) {
      confettiParticles.push({
        x: w * Math.random(),
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  /**
   * Utility: draw rounded rectangle.
   */
  function roundRect(c, x, y, w, h, r) {
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
  }

  return {
    init,
    startNavigation,
    stop,
    advanceStep,
    goToStep,
    getCurrentStep,
    get currentStepIndex() { return currentStepIdx; },
    get isArrived() { return hasArrived; },
    get totalRemainingDistance() { return totalRemaining; }
  };
})();
