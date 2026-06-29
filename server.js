// server.js - Web sunucusu, Socket.io ve şifre koruması
const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// ============ ORTA KATMANLAR ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ STATİK DOSYALAR ============
// Public klasöründeki dosyaları sun (CSS, JS, resimler)
app.use(express.static(path.join(__dirname, 'public')));

// ============ ŞİFRE KORUMASI (BASİT) ============
// Dashboard'a giriş yapmak için şifre isteyen bir middleware
// Eğer şifre doğruysa devam et, değilse login sayfasını göster

app.use((req, res, next) => {
  // Eğer istek login sayfasına veya statik dosyaya ise şifre sorma
  if (req.path === '/login' || req.path.startsWith('/css') || req.path.startsWith('/js')) {
    return next();
  }

  // Cookie'de veya header'da şifre kontrolü
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
      <style>
        body { background: #0a0a1a; color: #e0e0e0; font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .login-box { background: #1a1a2e; padding: 40px; border-radius: 10px; border: 1px solid #2a2a4e; text-align: center; }
        input { background: #0d0d1a; border: 1px solid #2a2a4e; padding: 10px; border-radius: 5px; color: #e0e0e0; width: 200px; margin: 10px 0; }
        button { background: #00d4ff; border: none; padding: 10px 30px; border-radius: 5px; color: #000; cursor: pointer; font-weight: bold; }
        button:hover { background: #00bbee; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h2>🔐 Dashboard Girişi</h2>
        <p>Lütfen şifrenizi girin:</p>
        <form action="/login" method="POST">
          <input type="password" name="password" placeholder="Şifre" required />
          <br />
          <button type="submit">Giriş Yap</button>
        </form>
        ${req.query.error ? '<p style="color:red;">Yanlış şifre!</p>' : ''}
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
    res.cookie('dashboardPassword', password, { maxAge: 3600000, httpOnly: true }); // 1 saat geçerli
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
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    botName: config.botName,
    serverHost: config.serverHost,
    serverPort: config.serverPort,
    version: config.version,
    renderDistance: config.renderDistance,
    uptime: process.uptime()
  });
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('✅ Web istemcisi bağlandı.');

  // İstemciden gelen komutları dinle
  socket.on('command', (data) => {
    console.log(`📨 Komut alındı: ${data.command}`);
    // Komutu bot'a iletmek için io.emit kullanılabilir (index.js'de dinlenecek)
    io.emit('log', { type: 'komut', message: `📨 ${data.command}` });
    // Burada ek olarak bot'un işlemesi için bir event fırlatılabilir
    // Örneğin: io.emit('botCommand', { command: data.command });
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
  console.log(`🔐 Şifre: ${config.dashboardPassword}`);
});

// ============ DIŞA AKTAR ============
// io'yu index.js'de kullanabilmek için export et
module.exports = { io, app, server };
