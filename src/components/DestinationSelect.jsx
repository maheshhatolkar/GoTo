import React, { useState } from 'react';
import LocationGraph from '../utils/locationGraph.js';

/**
 * DestinationSelect Component
 * Renders starting waypoint summaries, destination select fields,
 * search filters, and action buttons.
 */
export default function DestinationSelect({ sourceLocation, onNavigate, onRescan }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [shouldShake, setShouldShake] = useState(false);

  const allLocations = LocationGraph.getAllLocations();
  
  // Filter other locations based on search query, excluding the current starting location
  const availableDestinations = allLocations.filter(loc => 
    loc.id !== sourceLocation?.id && 
    (loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     loc.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNavigateClick = () => {
    if (!selectedDest) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      return;
    }
    onNavigate(selectedDest);
  };

  return (
    <section id="view-destination" class="view destination active" aria-label="Select Destination">
      <div class="destination-container">
        {/* Source Location Summary Card */}
        <div id="source-info" class="source-card">
          <div class="source-card-header">
            <div class="source-card-icon">📍</div>
            <div>
              <div class="source-card-label">Your Location</div>
              <div id="source-name" class="source-card-name">
                {sourceLocation ? sourceLocation.name : '—'}
              </div>
            </div>
          </div>
          <code id="source-id" class="source-card-id">
            {sourceLocation ? sourceLocation.id : '—'}
          </code>
        </div>

        {/* Destination Selection Form */}
        <div class="dest-section">
          <h3>🎯 Where do you want to go?</h3>

          {/* Search box to filter options in real-time */}
          <div class="dest-search-box">
            <input
              type="text"
              id="dest-search"
              class="input-field"
              placeholder="🔍 Search locations..."
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Select dropdown list */}
          <select 
            id="dest-select" 
            class={`dest-select ${shouldShake ? 'shake' : ''}`}
            aria-label="Select destination"
            value={selectedDest}
            onChange={(e) => setSelectedDest(e.target.value)}
          >
            <option value="">— Select Destination —</option>
            {availableDestinations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.id})
              </option>
            ))}
          </select>
        </div>

        {/* Action button groupings */}
        <div class="dest-actions">
          <button id="btn-rescan" class="btn btn-secondary" onClick={onRescan}>
            🔄 Rescan
          </button>
          <button id="btn-navigate" class="btn btn-primary" onClick={handleNavigateClick}>
            🧭 Navigate
          </button>
        </div>
      </div>
    </section>
  );
}
