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

// ============ ŞİFRE KORUMASI ============
app.use((req, res, next) => {
  // /api, /login, /viewer ve statik dosyalar şifresiz
  const publicPaths = ['/login', '/css', '/js', '/images', '/favicon.ico', '/viewer', '/api'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  const password = req.cookies?.dashboardPassword || req.headers['authorization']?.split(' ')[1];
  if (password && password === config.dashboardPassword) {
    return next();
  }
  res.redirect('/login');
});

// Login sayfası
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Dashboard Giriş</title>
    <style>
      body { background: #0a0a1a; color: #e0e0e0; font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .login-box { background: #1a1a2e; padding: 40px; border-radius: 10px; border: 1px solid #2a2a4e; text-align: center; }
      input { background: #0d0d1a; border: 1px solid #2a2a4e; padding: 10px; border-radius: 5px; color: #e0e0e0; width: 200px; margin: 10px 0; }
      button { background: #00d4ff; border: none; padding: 10px 30px; border-radius: 5px; color: #000; cursor: pointer; font-weight: bold; }
      .error { color: #ff6b6b; }
    </style>
    </head>
    <body>
      <div class="login-box">
        <h2>🔐 Dashboard Girişi</h2>
        <form action="/login" method="POST">
          <input type="password" name="password" placeholder="Şifre" required />
          <br />
          <button type="submit">Giriş Yap</button>
        </form>
        ${req.query.error ? '<p class="error">❌ Yanlış şifre!</p>' : ''}
      </div>
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  if (req.body.password === config.dashboardPassword) {
    res.cookie('dashboardPassword', req.body.password, { maxAge: 3600000, httpOnly: true });
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ API ============
app.get('/api/config', (req, res) => {
  try {
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

app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
    res.json({ success: true, message: 'Ayarlar kaydedildi. Bot yeniden başlatılıyor...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    botName: config.botName,
    serverHost: config.serverHost,
    serverPort: config.serverPort,
    version: config.version,
    renderDistance: config.renderDistance,
    auth: config.auth
  });
});

app.get('/api/waypoints', (req, res) => {
  try {
    const { getWaypoints } = require('./memory/memoryManager');
    res.json(getWaypoints());
  } catch { res.json([]); }
});

app.get('/api/discoveries', (req, res) => {
  try {
    const { getDiscoveries } = require('./memory/memoryManager');
    res.json(getDiscoveries());
  } catch { res.json([]); }
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('✅ Web istemcisi bağlandı.');
  socket.on('command', (data) => {
    console.log(`📨 Komut alındı: ${data.command}`);
    io.emit('log', { type: 'komut', message: `📨 ${data.command}` });
    io.emit('botCommand', { command: data.command });
  });
  socket.on('disconnect', () => {
    console.log('❌ Web istemcisi ayrıldı.');
  });
});

const PORT = config.port || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Web sunucusu http://localhost:${PORT}`);
  console.log(`🔐 Şifre: ${config.dashboardPassword}`);
});

module.exports = { io, app, server };
