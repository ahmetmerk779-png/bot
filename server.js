const express = require('express');
const { spawn } = require('child_process');

const app = express();
// Render'ın atadığı PORT'u kullan
const EXPRESS_PORT = process.env.PORT || 3000;

// UptimeRobot için ping endpoint'i
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// BlockMine'i, Express'ten farklı bir portta başlat.
// BlockMine varsayılan olarak 3001'i kullanır.
// Render'da dışarıya sadece Express portu açık olacak,
// ama BlockMine'e localhost üzerinden erişilebilecek.
const blockmineProcess = spawn('npx', ['blockmine'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: '3001', // BlockMine'in dahili portu
    BLOCKMINE_HOST: '127.0.0.1' // Sadece localhost'tan erişilsin
  }
});

blockmineProcess.on('error', (err) => {
  console.error('BlockMine başlatılamadı:', err);
});

// Express sunucusunu Render'ın portunda başlat
app.listen(EXPRESS_PORT, () => {
  console.log(`🌐 Ping sunucusu ${EXPRESS_PORT} portunda çalışıyor`);
  console.log(`📱 BlockMine paneli aynı adreste olacak`);
});
