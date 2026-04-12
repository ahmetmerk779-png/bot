const express = require('express');
const { spawn } = require('child_process');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const BLOCKMINE_PORT = 3001;

// UptimeRobot için ping endpoint'i
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// BlockMine'i arka planda başlat
const blockmineProcess = spawn('npx', ['blockmine'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: BLOCKMINE_PORT,
    HOST: '127.0.0.1'
  }
});

blockmineProcess.on('error', (err) => {
  console.error('❌ BlockMine başlatılamadı:', err);
});

// Tüm istekleri BlockMine'e yönlendir
app.use(
  '/',
  createProxyMiddleware({
    target: `http://127.0.0.1:${BLOCKMINE_PORT}`,
    changeOrigin: true,
    ws: true,
    logLevel: 'silent'
  })
);

app.listen(PORT, () => {
  console.log(`🌐 Proxy sunucusu ${PORT} portunda çalışıyor`);
  console.log(`📱 Panel: http://localhost:${PORT}`);
});
