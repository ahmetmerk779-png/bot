const fs = require('fs');
const config = require('../config');

// ============ ANA HAFIZA ============
function loadMemory() {
  try {
    const data = fs.readFileSync(config.memoryFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return { events: [], knowledge: [] };
  }
}

function saveMemory(memory) {
  fs.writeFileSync(config.memoryFile, JSON.stringify(memory, null, 2));
}

function addEvent(memory, eventText) {
  memory.events.push({
    time: Date.now(),
    text: eventText
  });
  if (memory.events.length > config.maxMemoryEntries) {
    memory.events.shift();
  }
  saveMemory(memory);
}

function addKnowledge(memory, fact) {
  memory.knowledge.push(fact);
  saveMemory(memory);
}

// ============ KEŞİF ============
function loadDiscoveries() {
  try {
    const data = fs.readFileSync('./memory/discoveries.json', 'utf8');
    return JSON.parse(data);
  } catch {
    return { discoveries: [] };
  }
}

function saveDiscoveries(discoveriesData) {
  fs.writeFileSync('./memory/discoveries.json', JSON.stringify(discoveriesData, null, 2));
}

function addDiscovery(type, coords, name) {
  const data = loadDiscoveries();
  data.discoveries.push({
    type: type,
    coords: coords,
    name: name || type,
    timestamp: Date.now()
  });
  saveDiscoveries(data);
  return data.discoveries;
}

function getDiscoveries() {
  const data = loadDiscoveries();
  return data.discoveries;
}

function clearDiscoveries() {
  saveDiscoveries({ discoveries: [] });
}

// ============ WAYPOINT ============
function loadWaypoints() {
  try {
    const data = fs.readFileSync('./memory/waypoints.json', 'utf8');
    return JSON.parse(data);
  } catch {
    return { waypoints: [] };
  }
}

function saveWaypoints(waypointsData) {
  fs.writeFileSync('./memory/waypoints.json', JSON.stringify(waypointsData, null, 2));
}

function addWaypoint(name, coords) {
  const data = loadWaypoints();
  const existingIndex = data.waypoints.findIndex(w => w.name === name);
  if (existingIndex !== -1) {
    data.waypoints[existingIndex].coords = coords;
    data.waypoints[existingIndex].timestamp = Date.now();
  } else {
    data.waypoints.push({
      name: name,
      coords: coords,
      timestamp: Date.now()
    });
  }
  saveWaypoints(data);
  return data.waypoints;
}

function getWaypoint(name) {
  const data = loadWaypoints();
  return data.waypoints.find(w => w.name === name) || null;
}

function getWaypoints() {
  const data = loadWaypoints();
  return data.waypoints;
}

function deleteWaypoint(name) {
  const data = loadWaypoints();
  data.waypoints = data.waypoints.filter(w => w.name !== name);
  saveWaypoints(data);
  return data.waypoints;
}

function clearWaypoints() {
  saveWaypoints({ waypoints: [] });
}

module.exports = {
  loadMemory,
  saveMemory,
  addEvent,
  addKnowledge,
  loadDiscoveries,
  saveDiscoveries,
  addDiscovery,
  getDiscoveries,
  clearDiscoveries,
  loadWaypoints,
  saveWaypoints,
  addWaypoint,
  getWaypoint,
  getWaypoints,
  deleteWaypoint,
  clearWaypoints
};
