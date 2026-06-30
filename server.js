import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { loadConfig, saveConfig } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

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

// Login
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html><head><title>Giriş</title>
    <style>body{background:#0a0a1a;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
    .box{background:#1a1a2e;padding:40px;border-radius:10px;text-align:center;}
    input{padding:10px;width:200px;border-radius:5px;border:1px solid #333;background:#0d0d1a;color:#fff;}
    button{padding:10px 30px;background:#00d4ff;border:none;border-radius:5px;color:#000;font-weight:bold;cursor:pointer;}
    .error{color:red;}
    </style></head>
    <body>
      <div class="box">
        <h2>🔐 Giriş</h2>
        <form action="/login" method="POST">
          <input type="password" name="password" placeholder="Şifre" required>
          <br><br>
          <button type="submit">Giriş</button>
        </form>
        ${req.query.error ? '<p class="error">❌ Yanlış şifre</p>' : ''}
      </div>
    </body></html>
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

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Config
app.get('/api/config', (req, res) => {
  res.json(loadConfig());
});

app.post('/api/config', (req, res) => {
  const saved = saveConfig(req.body);
  if (saved) {
    res.json({ success: true, message: 'Ayarlar kaydedildi. Bot yeniden başlatılıyor...' });
    io.emit('restartBot');
  } else {
    res.status(500).json({ success: false, message: 'Kaydedilemedi.' });
  }
});

// API: History
app.get('/api/history', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('./data/history.json', 'utf8'));
    res.json(data);
  } catch { res.json([]); }
});

// API: Discoveries
app.get('/api/discoveries', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('./data/discoveries.json', 'utf8'));
    res.json(data);
  } catch { res.json([]); }
});

// API: Chat History
app.get('/api/chat-history', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('./data/chat_history.json', 'utf8'));
    res.json(data);
  } catch { res.json([]); }
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

export { io };
