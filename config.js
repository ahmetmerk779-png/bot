require('dotenv').config();

module.exports = {
  botName: 'BenimAIBot',
  // Render'da localhost KULLANMA! Gerçek bir sunucu IP'si yaz
  serverHost: 'aesirmc.com', // veya kendi sunucunun IP'si
  serverPort: 25565,
  version: '1.8.9', // Sunucunun sürümüne göre değiştir (AesirMC 1.8.x)
  renderDistance: 10,
  auth: 'offline',
  
  // Groq API
  useGroq: true,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: 'llama-3.1-70b-versatile',
  groqUrl: 'https://api.groq.com/openai/v1/chat/completions',
  
  // Proxy (isteğe bağlı)
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
