const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

const defaults = {
  botName: 'BenimAIBot',
  serverHost: 'aesirmc.com',
  serverPort: 25565,
  version: '1.8.9',
  auth: 'offline',
  renderDistance: 10
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return { ...defaults, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Config okuma hatası:', err.message);
  }
  return { ...defaults };
}

function saveConfig(newConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    return true;
  } catch (err) {
    console.error('Config yazma hatası:', err.message);
    return false;
  }
}

module.exports = { loadConfig, saveConfig, defaults };
