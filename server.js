const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Render'ı uyanık tutmak için UptimeRobot'un ping atacağı endpoint
app.get('/ping', (req, res) => {
  res.status(200).send('OK');
});

// Ana sayfayı BlockMine'e yönlendir (opsiyonel)
app.get('/', (req, res) => {
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`🌐 Ping sunucusu ${port} portunda çalışıyor`);
  console.log(`📱 BlockMine paneli aynı adreste hazır olacak`);
});
