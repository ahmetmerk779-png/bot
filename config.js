const fs = require('fs');
const path = require('path');
const CONFIG_PATH = path.join(__dirname, 'config.json');

const defaults = {
  botName: 'AFK_Bot',
  serverHost: 'aesirmc.com',
  serverPort: 25565,
  version: '1.8.9',
  auth: 'offline',
  renderDistance: 10
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
    }
  } catch (e) {}
  return { ...defaults };
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
  return true;
}

module.exports = { loadConfig, saveConfig };
