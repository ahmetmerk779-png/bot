require('dotenv').config();

module.exports = {
  botName: 'BenimAIBot',
  serverHost: 'oyna.aesirmc.com', // Değiştir!
  serverPort: 25565,
  version: '1.21.11', // Sunucu sürümüne göre
  renderDistance: 10,
  auth: 'offline',
  
  useGroq: true,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: 'llama-3.1-70b-versatile',
  groqUrl: 'https://api.groq.com/openai/v1/chat/completions',
  
  proxy: { enabled: false, type: 'socks5', host: '', port: 1080, username: '', password: '' },
  antiAFK: { enabled: true, interval: 45, action: 'jump' },
  memoryFile: './memory/memory.json',
  maxMemoryEntries: 100,
  dashboardPassword: process.env.DASHBOARD_PASSWORD || 'admin123',
  port: process.env.PORT || 3000
};
