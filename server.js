const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const { loadConfig, saveConfig } = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

// Şifre koruması
app.use((req, res, next) => {
  if (req.path === '/login') return next();
  const pwd = req.cookies?.dashboardPassword;
  if (pwd && pwd === DASHBOARD_PASSWORD) return next();
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Dashboard Giriş</title>
    <style>
      body { background: #0a0a1a; color: #e0e0e0; font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .login-box { background: #1a1a2e; padding: 40px; border-radius: 10px; border: 1px solid #2a2a4e; text-align: center; }
      input { background: #0d0d1a; border: 1px solid #2a2a4e; padding: 10px; border-radius: 5px; color: #e0e0e0; width: 200px; margin: 10px 0; }
      button { background: #00d4ff; border: none; padding: 10px 30px; border-radius: 5px; color: #000; font-weight: bold; cursor: pointer; }
      .error { color: #ff6b6b; }
    </style>
    </head>
    <body>
      <div class="login-box">
        <h2>🔐 Dashboard Girişi</h2>
        <form action="/login" method="POST">
          <input type="password" name="password" placeholder="Şifre" required />
          <br /><br />
          <button type="submit">Giriş Yap</button>
        </form>
        ${req.query.error ? '<p class="error">❌ Yanlış şifre!</p>' : ''}
      </div>
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  if (req.body.password === DASHBOARD_PASSWORD) {
    res.cookie('dashboardPassword', req.body.password, { maxAge: 3600000, httpOnly: true });
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Config
app.get('/api/config', (req, res) => {
  try {
    res.json(loadConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const saved = saveConfig(req.body);
    if (saved) {
      res.json({ success: true, message: 'Ayarlar kaydedildi. Bot yeniden başlatılıyor...' });
      io.emit('restartBot');
      setTimeout(() => process.exit(0), 1500);
    } else {
      res.status(500).json({ success: false, message: 'Kaydedilemedi.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Geçmiş ve istatistikler
app.get('/api/history', (req, res) => {
  try {
    const fs = require('fs');
    const historyPath = path.join(__dirname, 'history.json');
    if (fs.existsSync(historyPath)) {
      res.json(JSON.parse(fs.readFileSync(historyPath, 'utf8')));
    } else {
      res.json([]);
    }
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/discoveries', (req, res) => {
  try {
    const fs = require('fs');
    const discoveriesPath = path.join(__dirname, 'discoveries.json');
    if (fs.existsSync(discoveriesPath)) {
      res.json(JSON.parse(fs.readFileSync(discoveriesPath, 'utf8')));
    } else {
      res.json([]);
    }
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/chat-history', (req, res) => {
  try {
    const fs = require('fs');
    const chatPath = path.join(__dirname, 'chat_history.json');
    if (fs.existsSync(chatPath)) {
      res.json(JSON.parse(fs.readFileSync(chatPath, 'utf8')));
    } else {
      res.json([]);
    }
  } catch (err) {
    res.json([]);
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log('✅ Web bağlandı.');
  socket.on('command', (data) => {
    io.emit('botCommand', data);
  });
  socket.on('disconnect', () => {
    console.log('❌ Web ayrıldı.');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Web: http://localhost:${PORT}`);
  console.log(`🔐 Şifre: ${DASHBOARD_PASSWORD}`);
});

module.exports = { io };
