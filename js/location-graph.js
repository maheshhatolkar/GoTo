/**
 * Location Graph — Database & Dijkstra Pathfinding
 * Manages all locations, their connections, and shortest-path routing.
 */
const LocationGraph = (() => {
  // ── Demo Campus Locations ──────────────────────────────────────────
  // Coordinates are in meters relative to an origin (Main Entrance).
  // Connections define walkable paths between locations.
  const locations = {
    LOC_001: {
      id: 'LOC_001',
      name: 'Main Entrance',
      description: 'Front gate and welcome area',
      x: 0, y: 0, floor: 0,
      connections: ['LOC_002', 'LOC_010', 'LOC_007']
    },
    LOC_002: {
      id: 'LOC_002',
      name: 'Reception Hall',
      description: 'Information desk and lobby',
      x: 20, y: 0, floor: 0,
      connections: ['LOC_001', 'LOC_003', 'LOC_004', 'LOC_007']
    },
    LOC_003: {
      id: 'LOC_003',
      name: 'Library',
      description: 'Central library and reading rooms',
      x: 20, y: 40, floor: 0,
      connections: ['LOC_002', 'LOC_005']
    },
    LOC_004: {
      id: 'LOC_004',
      name: 'Cafeteria',
      description: 'Food court and dining hall',
      x: 50, y: 0, floor: 0,
      connections: ['LOC_002', 'LOC_005', 'LOC_008', 'LOC_009']
    },
    LOC_005: {
      id: 'LOC_005',
      name: 'Lecture Hall A',
      description: 'Main lecture theater',
      x: 50, y: 30, floor: 0,
      connections: ['LOC_003', 'LOC_004', 'LOC_006']
    },
    LOC_006: {
      id: 'LOC_006',
      name: 'Lab Building',
      description: 'Science and computer labs',
      x: 80, y: 30, floor: 0,
      connections: ['LOC_005', 'LOC_008']
    },
    LOC_007: {
      id: 'LOC_007',
      name: 'Admin Office',
      description: 'Administrative and HR offices',
      x: 20, y: -20, floor: 0,
      connections: ['LOC_001', 'LOC_002', 'LOC_009']
    },
    LOC_008: {
      id: 'LOC_008',
      name: 'Sports Complex',
      description: 'Gymnasium and sports fields',
      x: 80, y: 0, floor: 0,
      connections: ['LOC_004', 'LOC_006']
    },
    LOC_009: {
      id: 'LOC_009',
      name: 'Auditorium',
      description: 'Events and conference hall',
      x: 50, y: -20, floor: 0,
      connections: ['LOC_004', 'LOC_007']
    },
    LOC_010: {
      id: 'LOC_010',
      name: 'Parking Lot',
      description: 'Visitor and staff parking',
      x: -20, y: 0, floor: 0,
      connections: ['LOC_001']
    }
  };

  /**
   * Get a location by its ID.
   * @param {string} id
   * @returns {object|null}
   */
  function getLocation(id) {
    return locations[id] || null;
  }

  /**
   * Check if a location ID exists.
   * @param {string} id
   * @returns {boolean}
   */
  function isValidLocation(id) {
    return id in locations;
  }

  /**
   * Return all locations as an array.
   * @returns {object[]}
   */
  function getAllLocations() {
    return Object.values(locations);
  }

  /**
   * Calculate Euclidean distance between two locations.
   * @param {string} idA
   * @param {string} idB
   * @returns {number} Distance in meters
   */
  function distance(idA, idB) {
    const a = locations[idA];
    const b = locations[idB];
    if (!a || !b) return Infinity;
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  }

  /**
   * Calculate bearing (angle in degrees) from location A to location B.
   * 0° = North (+Y), 90° = East (+X), 180° = South, 270° = West.
   * @param {string} idA
   * @param {string} idB
   * @returns {number} Bearing in degrees [0, 360)
   */
  function bearing(idA, idB) {
    const a = locations[idA];
    const b = locations[idB];
    if (!a || !b) return 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // atan2 with Y as north: angle from north clockwise
    let angle = Math.atan2(dx, dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }

  /**
   * Compute the turn direction between three consecutive waypoints.
   * @param {string} prevId
   * @param {string} currentId
   * @param {string} nextId
   * @returns {{ direction: string, angle: number }}
   */
  function getTurnDirection(prevId, currentId, nextId) {
    const bearingIn = bearing(prevId, currentId);
    const bearingOut = bearing(currentId, nextId);
    let turn = bearingOut - bearingIn;
    if (turn > 180) turn -= 360;
    if (turn < -180) turn += 360;

    let direction;
    const absTurn = Math.abs(turn);
    if (absTurn < 20) {
      direction = 'straight';
    } else if (absTurn > 160) {
      direction = 'u-turn';
    } else if (turn > 0 && turn <= 70) {
      direction = 'slight right';
    } else if (turn > 70) {
      direction = 'right';
    } else if (turn < 0 && turn >= -70) {
      direction = 'slight left';
    } else {
      direction = 'left';
    }

    return { direction, angle: turn };
  }

  /**
   * Dijkstra's shortest path algorithm.
   * @param {string} sourceId
   * @param {string} destId
   * @returns {{ path: string[], totalDistance: number, steps: object[] }|null}
   */
  function findShortestPath(sourceId, destId) {
    if (!isValidLocation(sourceId) || !isValidLocation(destId)) return null;
    if (sourceId === destId) {
      return { path: [sourceId], totalDistance: 0, steps: [] };
    }

    const dist = {};
    const prev = {};
    const visited = new Set();
    const queue = new Set(Object.keys(locations));

    for (const id of queue) {
      dist[id] = Infinity;
      prev[id] = null;
    }
    dist[sourceId] = 0;

    while (queue.size > 0) {
      // Find unvisited node with smallest distance
      let u = null;
      let minDist = Infinity;
      for (const id of queue) {
        if (!visited.has(id) && dist[id] < minDist) {
          minDist = dist[id];
          u = id;
        }
      }
      if (u === null || u === destId) break;

      visited.add(u);
      queue.delete(u);

      const loc = locations[u];
      for (const neighborId of loc.connections) {
        if (visited.has(neighborId)) continue;
        const alt = dist[u] + distance(u, neighborId);
        if (alt < dist[neighborId]) {
          dist[neighborId] = alt;
          prev[neighborId] = u;
        }
      }
    }

    // Reconstruct path
    if (dist[destId] === Infinity) return null; // No path found

    const path = [];
    let current = destId;
    while (current !== null) {
      path.unshift(current);
      current = prev[current];
    }

    // Build step-by-step instructions
    const steps = [];
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const segDist = distance(from, to);
      const segBearing = bearing(from, to);

      let turnInfo = null;
      if (i > 0) {
        turnInfo = getTurnDirection(path[i - 1], from, to);
      }

      steps.push({
        from: locations[from],
        to: locations[to],
        distance: Math.round(segDist),
        bearing: Math.round(segBearing),
        turn: turnInfo,
        stepIndex: i
      });
    }

    return {
      path,
      totalDistance: Math.round(dist[destId]),
      steps
    };
  }

  /**
   * Get a human-readable direction string.
   * @param {number} bearingDeg - Bearing in degrees
   * @returns {string}
   */
  function bearingToCardinal(bearingDeg) {
    const dirs = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    const index = Math.round(bearingDeg / 45) % 8;
    return dirs[index];
  }

  // ── Public API ─────────────────────────────────────────────────────
  return {
    getLocation,
    isValidLocation,
    getAllLocations,
    distance,
    bearing,
    getTurnDirection,
    findShortestPath,
    bearingToCardinal
  };
})();
