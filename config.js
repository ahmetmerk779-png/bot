require('dotenv').config();

module.exports = {
  botName: 'BenimAIBot',
  serverHost: 'localhost',
  serverPort: 55916,
  version: '1.21.1',
  renderDistance: 10,
  auth: 'offline',
  
  // Groq API
  useGroq: true,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: 'llama-3.1-70b-versatile',
  groqUrl: 'https://api.groq.com/openai/v1/chat/completions',
  
  // Proxy
  proxy: {
    enabled: false,
    type: 'socks5',
    host: '',
    port: 1080,
    username: '',
    password: ''
  },
  
  // Anti-AFK
  antiAFK: {
    enabled: true,
    interval: 45,
    action: 'jump'
  },
  
  // Hafıza
  memoryFile: './memory/memory.json',
  maxMemoryEntries: 100,
  
  // Dashboard
  dashboardPassword: process.env.DASHBOARD_PASSWORD || 'admin123',
  port: process.env.PORT || 3000
};
