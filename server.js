const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ============ AYARLAR API ============
// Mevcut ayarları getir
app.get('/api/config', (req, res) => {
  res.json({
    serverHost: config.serverHost,
    serverPort: config.serverPort,
    version: config.version,
    botName: config.botName,
    auth: config.auth
  });
});

// Ayarları kaydet (config.js'yi güncelle)
app.post('/api/config', (req, res) => {
  const { serverHost, serverPort, version, botName, auth } = req.body;
  // config.js dosyasını oku ve güncelle
  const configPath = path.join(__dirname, 'config.js');
  let configContent = fs.readFileSync(configPath, 'utf8');
  // Basitçe regex ile değiştir (daha sağlam bir yöntem için JSON kullanılabilir)
  configContent = configContent.replace(/serverHost:.*,/g, `serverHost: '${serverHost}',`);
  configContent = configContent.replace(/serverPort:.*,/g, `serverPort: ${serverPort},`);
  configContent = configContent.replace(/version:.*,/g, `version: '${version}',`);
  configContent = configContent.replace(/botName:.*,/g, `botName: '${botName}',`);
  configContent = configContent.replace(/auth:.*,/g, `auth: '${auth}',`);
  fs.writeFileSync(configPath, configContent);
  res.json({ success: true });
});

// ============ LOGIN (isteğe bağlı, kaldırabilirsin) ============
// Burada basit şifre koruması varsa kaldırabilirsin, şimdilik direkt index.html sunuyoruz.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('✅ Web istemcisi bağlandı.');

  socket.on('command', (data) => {
    console.log(`📨 Komut: ${data.command}`);
    io.emit('log', { type: 'komut', message: `📨 ${data.command}` });
    // Bot'a ilet (index.js'de dinlenir)
    io.emit('botCommand', { command: data.command });
  });

  socket.on('reconnectBot', () => {
    console.log('🔄 Bot yeniden bağlanıyor...');
    io.emit('log', { type: 'sistem', message: '🔄 Bot yeniden bağlanıyor...' });
    // index.js'de bu event dinlenip bot yeniden başlatılabilir
    io.emit('restartBot');
  });

  socket.on('disconnect', () => {
    console.log('❌ İstemci ayrıldı.');
  });
});

const PORT = config.port || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Web sunucusu http://localhost:${PORT}`);
});
