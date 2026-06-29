// server.js - Web sunucusu, Socket.io, şifre koruması ve 3D Viewer
const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ============ 3D VIEWER (prismarine-viewer) ============
// NOT: Bot spawn olduktan SONRA viewer başlatılacak (index.js'de)
// Burada sadece viewer için gerekli ayarları yapıyoruz

// ============ ŞİFRE KORUMASI ============
// ... (önceki şifre koruması aynen kalacak)

// ... (login, ana sayfa, API endpoint'leri aynen kalacak)

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('✅ Web istemcisi bağlandı.');
  // ... (önceki socket kodları aynen kalacak)
});

// Sunucuyu başlat
const PORT = config.port || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Web sunucusu http://localhost:${PORT}`);
  console.log(`🔐 Şifre: ${config.dashboardPassword}`);
});

module.exports = { io, app, server };
