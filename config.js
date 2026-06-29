// config.js - OpenRouter desteği eklendi
const fs = require('fs');
const path = require('path');

let config = {};

try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    config = {
      botName: 'BenimAIBot',
      serverHost: 'voidforge763.mcsh.i',
      serverPort: 25565,
      version: '1.8.9',
      renderDistance: 10,
      auth: 'offline'
    };
  }
} catch (err) {
  console.error('Config okuma hatası:', err);
  process.exit(1);
}

// ============ AI SAĞLAYICI SEÇİMİ ============
// "groq" veya "openrouter" olarak değiştirebilirsin
config.aiProvider = process.env.AI_PROVIDER || 'openrouter';

// OpenRouter ayarları
config.openRouterApiKey = process.env.OPENROUTER_API_KEY;
config.openRouterModel = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';

// Groq ayarları (yedek)
config.groqApiKey = process.env.GROQ_API_KEY;
config.groqModel = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
config.groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

// Proxy, anti-AFK, hafıza, dashboard
config.proxy = {
  enabled: false,
  type: 'socks5',
  host: '',
  port: 1080,
  username: '',
  password: ''
};
config.antiAFK = { enabled: true, interval: 45, action: 'jump' };
config.memoryFile = './memory/memory.json';
config.maxMemoryEntries = 100;
config.dashboardPassword = process.env.DASHBOARD_PASSWORD || 'admin123';
config.port = process.env.PORT || 3000;

module.exports = config;
