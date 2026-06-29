const fs = require('fs');
const config = require('../config');

// Mevcut fonksiyonlar (loadMemory, saveMemory, addEvent, addKnowledge) zaten var
// Bunların altına ekle:

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

module.exports = {
  loadMemory,
  saveMemory,
  addEvent,
  addKnowledge,
  loadDiscoveries,
  saveDiscoveries,
  addDiscovery,
  getDiscoveries,
  clearDiscoveries
};
