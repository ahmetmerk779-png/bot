const mineflayer = require('mineflayer')
const http = require('http')

// 1. ADIM: Render'ın botu kapatmasını engelleyen "Yaşam Sinyali" (PORT)
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("Bot 7/24 Aktif!");
  res.end();
}).listen(process.env.PORT || 3000); // Render bu portu görmezse botu kapatır!

// 2. ADIM: Bot Ayarların
const bot = mineflayer.createBot({
  host: 'play.aesirmc.com',
  username: 'myshoue', // Burayı istersen değiştirirsin
  version: '1.21.1',
  hideErrors: true
})

bot.on('spawn', () => {
  console.log('--- BOT SUNUCUYA BAŞARIYLA GİRDİ ---');
  // Login komutunu buraya ekle
  setTimeout(() => { 
    bot.chat('/login ShoueShoue'); 
  }, 5000);
});

// Hata ayıklama (Logların şişmemesi için kısa tuttuk)
bot.on('error', (err) => console.log('Hata oluştu.'));
bot.on('end', () => console.log('Bağlantı koptu, yeniden deneniyor...'));
