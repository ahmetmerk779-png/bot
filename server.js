const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const { loadConfig, saveConfig } = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/login') return next();
  const pwd = req.cookies?.dashboardPassword;
  if (pwd === PASSWORD) return next();
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.send(`
    <html><body style="background:#0a0a1a;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
      <div style="background:#1a1a2e;padding:40px;border-radius:10px;text-align:center;">
        <h2>🔐 Giriş</h2>
        <form action="/login" method="POST">
          <input type="password" name="password" placeholder="Şifre" style="padding:10px;width:200px;border-radius:5px;border:1px solid #333;background:#0d0d1a;color:#fff;">
          <br><br>
          <button type="submit" style="padding:10px 30px;background:#00d4ff;border:none;border-radius:5px;color:#000;font-weight:bold;">Giriş</button>
        </form>
        ${req.query.error ? '<p style="color:red;">❌ Yanlış şifre</p>' : ''}
      </div>
    </body></html>
  `);
});

app.post('/login', (req, res) => {
  if (req.body.password === PASSWORD) {
    res.cookie('dashboardPassword', PASSWORD, { maxAge: 3600000, httpOnly: true });
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/config', (req, res) => res.json(loadConfig()));
app.post('/api/config', (req, res) => {
  saveConfig(req.body);
  res.json({ success: true });
});

io.on('connection', (socket) => {
  console.log('✅ Web bağlandı.');
  socket.on('command', (cmd) => io.emit('botCommand', cmd));
});

server.listen(PORT, () => {
  console.log(`🌐 Web: http://localhost:${PORT}`);
  console.log(`🔐 Şifre: ${PASSWORD}`);
});

module.exports = { io };
