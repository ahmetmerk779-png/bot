const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bot durumu API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    botName: config.botName,
    serverHost: config.serverHost,
    serverPort: config.serverPort
  });
});

// Socket.io bağlantıları
io.on('connection', (socket) => {
  console.log('✅ Web istemcisi bağlandı.');
  
  socket.on('command', (data) => {
    console.log(`📨 Komut alındı: ${data.command}`);
    // Bot'a komut gönder (index.js'de işlenecek)
    io.emit('log', { type: 'komut', message: `Komut: ${data.command}` });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Web istemcisi ayrıldı.');
  });
});

// Sunucuyu başlat
server.listen(config.port, () => {
  console.log(`🌐 Web sunucusu http://localhost:${config.port} adresinde çalışıyor.`);
});

module.exports = { io };
