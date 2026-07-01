/**
 * QR Generator — Printable QR Code Generator for Locations
 * Generates QR codes for all database locations using the qrcode.js library.
 */
const QRGenerator = (() => {

  /**
   * Generate QR codes for all locations and render them into a container grid.
   * Useful for administrative setups and physical deployment testing.
   * @param {string} containerId - DOM ID where QR cards will be generated
   */
  function generateAll(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear any previously generated elements
    container.innerHTML = '';
    const locations = LocationGraph.getAllLocations();

    // Section Header Title
    const title = document.createElement('h2');
    title.textContent = 'Printable QR Codes for All Locations';
    title.style.cssText = 'text-align:center; margin-bottom:24px; color:#00d4ff;';
    container.appendChild(title);

    // Explanatory Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Print this page and place each QR code at its corresponding location.';
    subtitle.style.cssText = 'text-align:center; margin-bottom:32px; color:rgba(255,255,255,0.6); font-size:14px;';
    container.appendChild(subtitle);

    // Grid Layout container for printed cards
    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 24px;
      padding: 16px;
    `;
    container.appendChild(grid);

    // Loop through each location node to build card layouts
    for (const loc of locations) {
      const card = document.createElement('div');
      card.className = 'qr-card';
      card.style.cssText = `
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(0,212,255,0.15);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        break-inside: avoid; /* Prevent card splitting across pages when printing */
      `;

      // Nested element where the QR canvas/image will be injected
      const qrDiv = document.createElement('div');
      qrDiv.id = `qr-${loc.id}`;
      qrDiv.style.cssText = 'display:flex; justify-content:center; margin-bottom:16px;';
      card.appendChild(qrDiv);

      // Node Name Label
      const name = document.createElement('h3');
      name.textContent = loc.name;
      name.style.cssText = 'color:#ffffff; margin:0 0 4px; font-size:16px;';
      card.appendChild(name);

      // Node ID Label
      const idLabel = document.createElement('code');
      idLabel.textContent = loc.id;
      idLabel.style.cssText = 'color:#00d4ff; font-family:"JetBrains Mono",monospace; font-size:13px;';
      card.appendChild(idLabel);

      // Node Description
      const desc = document.createElement('p');
      desc.textContent = loc.description;
      desc.style.cssText = 'color:rgba(255,255,255,0.5); font-size:12px; margin:8px 0 0;';
      card.appendChild(desc);

      grid.appendChild(card);

      // Initialize the external QRCode library targeting our qrDiv container
      try {
        // eslint-disable-next-line no-undef
        new QRCode(qrDiv, {
          text: loc.id,                  // The QR payload (the unique location ID string)
          width: 160,
          height: 160,
          colorDark: '#0a0e27',          // Hex value of dark code modules
          colorLight: '#ffffff',         // Hex value of background space
          correctLevel: QRCode.CorrectLevel.H // High error correction level (withstands up to 30% damage)
        });
      } catch (err) {
        qrDiv.textContent = 'QR library not loaded';
        qrDiv.style.color = '#ff006e';
      }
    }

    // Print Action Button triggering native browser print preview overlays
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
