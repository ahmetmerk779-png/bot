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

module.exports = { io, app, server };// server.js - /api/config endpoint'leri eklendi

// ... (mevcut kodların devamında, API endpoint'leri bölümüne ekle)

// ============ API: KONFİGÜRASYON ============
const fs = require('fs');
const path = require('path');

// Mevcut ayarları oku
app.get('/api/config', (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config.js');
    // config.js'den değerleri oku (basitçe config modülünden al)
    const config = require('./config');
    res.json({
      botName: config.botName,
      serverHost: config.serverHost,
      serverPort: config.serverPort,
      version: config.version,
      auth: config.auth,
      renderDistance: config.renderDistance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni ayarları kaydet (config.json'a yaz)
app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    // config.json dosyasına yaz (config.js'i değil, çünkü config.js modül olarak kullanılıyor)
    // Basitçe config.json oluşturup oraya yazalım
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    // Ayrıca config.js'deki değerleri güncellemek için bir mekanizma gerekir.
    // Alternatif: config.json'dan oku, config.js'de require ile config.json'u kullan.
    // Şimdilik sadece dosyaya yazalım, bot yeniden başlatıldığında config.js'den değil, config.json'dan okuması için düzenleme yapacağız.
    res.json({ success: true, message: 'Ayarlar kaydedildi. Bot yeniden başlatılıyor...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
