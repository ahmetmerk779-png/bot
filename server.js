// server.js - Web sunucusu, Socket.io ve şifre koruması
const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser'); // Çerez okumak için
const config = require('./config');

// ============ EXPRESS UYGULAMASI ============
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// ============ ORTA KATMANLAR ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Çerezleri okumak için

// ============ STATİK DOSYALAR ============
app.use(express.static(path.join(__dirname, 'public')));

// ============ ŞİFRE KORUMASI (BASİT) ============
// Dashboard'a giriş yapmak için şifre isteyen middleware
// Login sayfası ve statik dosyalar hariç tüm isteklerde şifre kontrolü yap

app.use((req, res, next) => {
  // Şifre kontrolü yapılmayacak yollar
  const publicPaths = ['/login', '/css', '/js', '/images', '/favicon.ico'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }

  // Çerez veya header'dan şifreyi al
  const password = req.cookies?.dashboardPassword || req.headers['authorization']?.split(' ')[1];
  
  if (password && password === config.dashboardPassword) {
    // Şifre doğru, devam et
    return next();
  }

  // Şifre yok veya yanlış → login sayfasına yönlendir
  res.redirect('/login');
});

// ============ LOGIN SAYFASI ============
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard Giriş</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          background: #0a0a1a; 
          color: #e0e0e0; 
          font-family: 'Segoe UI', Arial, sans-serif; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0; 
        }
        .login-box { 
          background: #1a1a2e; 
          padding: 40px; 
          border-radius: 12px; 
          border: 1px solid #2a2a4e; 
          text-align: center; 
          width: 320px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .login-box h2 { 
          color: #00d4ff; 
          margin-bottom: 20px;
          font-size: 24px;
        }
        .login-box p { 
          color: #aaa; 
          margin-bottom: 20px;
          font-size: 14px;
        }
        .login-box input { 
          background: #0d0d1a; 
          border: 1px solid #2a2a4e; 
          padding: 12px 15px; 
          border-radius: 6px; 
          color: #e0e0e0; 
          width: 100%; 
          margin: 10px 0; 
          font-size: 16px;
          transition: border-color 0.3s;
        }
        .login-box input:focus {
          outline: none;
          border-color: #00d4ff;
        }
        .login-box button { 
          background: #00d4ff; 
          border: none; 
          padding: 12px 30px; 
          border-radius: 6px; 
          color: #000; 
          cursor: pointer; 
          font-weight: bold; 
          font-size: 16px;
          width: 100%;
          margin-top: 10px;
          transition: background 0.3s;
        }
        .login-box button:hover { 
          background: #00bbee; 
        }
        .error { 
          color: #ff6b6b; 
          margin-top: 10px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h2>🔐 Dashboard Girişi</h2>
        <p>Lütfen şifrenizi girin:</p>
        <form action="/login" method="POST">
          <input type="password" name="password" placeholder="Şifre" required autofocus />
          <button type="submit">Giriş Yap</button>
        </form>
        ${req.query.error ? '<p class="error">❌ Yanlış şifre! Tekrar deneyin.</p>' : ''}
        <p style="margin-top:20px; font-size:12px; color:#555;">Yetkisiz erişim yasaktır.</p>
      </div>
    </body>
    </html>
  `);
});

// Login formunu işle
app.post('/login', (req, res) => {
  const password = req.body.password;
  if (password === config.dashboardPassword) {
    // Başarılı – çerez oluştur ve ana sayfaya yönlendir
    res.cookie('dashboardPassword', password, { 
      maxAge: 3600000, // 1 saat
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

// ============ ANA SAYFA ============
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ API ENDPOINT'LERİ ============
// Bot durumu
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    botName: config.botName,
    serverHost: config.serverHost,
    serverPort: config.serverPort,
    version: config.version,
    renderDistance: config.renderDistance,
    uptime: Math.floor(process.uptime())
  });
});

// Waypoint listesi (API)
app.get('/api/waypoints', (req, res) => {
  try {
    const { getWaypoints } = require('./memory/memoryManager');
    res.json(getWaypoints());
  } catch {
    res.json([]);
  }
});

// Keşif listesi (API)
app.get('/api/discoveries', (req, res) => {
  try {
    const { getDiscoveries } = require('./memory/memoryManager');
    res.json(getDiscoveries());
  } catch {
    res.json([]);
  }
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('✅ Web istemcisi bağlandı.');

  // İstemciden gelen komutları dinle
  socket.on('command', (data) => {
    console.log(`📨 Komut alındı: ${data.command}`);
    // Log'u tüm istemcilere gönder
    io.emit('log', { type: 'komut', message: `📨 ${data.command}` });
    
    // Komutu bot'a ilet (index.js'de dinlenecek)
    // Bot tarafında bu event'i dinleyip işleyebiliriz
    io.emit('botCommand', { command: data.command });
  });

  // İstemci bağlantısı kesildiğinde
  socket.on('disconnect', () => {
    console.log('❌ Web istemcisi ayrıldı.');
  });
});

// ============ SUNUCUYU BAŞLAT ============
const PORT = config.port || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Web sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
  console.log(`🔐 Dashboard şifresi: ${config.dashboardPassword}`);
  console.log(`📌 Giriş yapmak için /login adresine gidin.`);
});

// ============ DIŞA AKTAR ============
// io'yu ve server'ı index.js'de kullanabilmek için export et
module.exports = { io, app, server };
