/**
 * QR Generator — Printable QR Code Generator for Locations
 * Generates QR codes for all locations using qrcode.js library.
 */
const QRGenerator = (() => {

  /**
   * Generate QR codes for all locations and render them into a container.
   * @param {string} containerId - DOM element ID to render QR codes into
   */
  function generateAll(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    const locations = LocationGraph.getAllLocations();

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Printable QR Codes for All Locations';
    title.style.cssText = 'text-align:center; margin-bottom:24px; color:#00d4ff;';
    container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Print this page and place each QR code at its corresponding location.';
    subtitle.style.cssText = 'text-align:center; margin-bottom:32px; color:rgba(255,255,255,0.6); font-size:14px;';
    container.appendChild(subtitle);

    // Grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 24px;
      padding: 16px;
    `;
    container.appendChild(grid);

    for (const loc of locations) {
      const card = document.createElement('div');
      card.className = 'qr-card';
      card.style.cssText = `
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(0,212,255,0.15);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        break-inside: avoid;
      `;

      // QR code container
      const qrDiv = document.createElement('div');
      qrDiv.id = `qr-${loc.id}`;
      qrDiv.style.cssText = 'display:flex; justify-content:center; margin-bottom:16px;';
      card.appendChild(qrDiv);

      // Location name
      const name = document.createElement('h3');
      name.textContent = loc.name;
      name.style.cssText = 'color:#ffffff; margin:0 0 4px; font-size:16px;';
      card.appendChild(name);

      // Location ID
      const idLabel = document.createElement('code');
      idLabel.textContent = loc.id;
      idLabel.style.cssText = 'color:#00d4ff; font-family:"JetBrains Mono",monospace; font-size:13px;';
      card.appendChild(idLabel);

      // Description
      const desc = document.createElement('p');
      desc.textContent = loc.description;
      desc.style.cssText = 'color:rgba(255,255,255,0.5); font-size:12px; margin:8px 0 0;';
      card.appendChild(desc);

      grid.appendChild(card);

      // Generate QR code (use qrcode.js library)
      try {
        new QRCode(qrDiv, {
          text: loc.id,
          width: 160,
          height: 160,
          colorDark: '#0a0e27',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch (err) {
        qrDiv.textContent = 'QR library not loaded';
        qrDiv.style.color = '#ff006e';
      }
    }

    // Print button
    const printBtn = document.createElement('button');
    printBtn.textContent = '🖨️ Print QR Codes';
    printBtn.className = 'btn btn-primary';
    printBtn.style.cssText = `
      display: block;
      margin: 32px auto;
      padding: 14px 32px;
      font-size: 16px;
      cursor: pointer;
    `;
    printBtn.addEventListener('click', () => window.print());
    container.appendChild(printBtn);
  }

  return {
    generateAll
  };
})();
