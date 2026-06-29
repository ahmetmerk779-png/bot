const fs = require('fs');
const config = require('../config');

// Mevcut fonksiyonlar (loadMemory, saveMemory, addEvent, addKnowledge, loadDiscoveries, saveDiscoveries, addDiscovery, getDiscoveries, clearDiscoveries) zaten var
// Bunların altına ekle:

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
  // Aynı isimde waypoint varsa güncelle
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
  // ... mevcut fonksiyonlar
  loadWaypoints,
  saveWaypoints,
  addWaypoint,
  getWaypoint,
  getWaypoints,
  deleteWaypoint,
  clearWaypoints
};
