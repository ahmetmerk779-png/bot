const mineflayer = require('mineflayer')
const http = require('http')

// 1. ADIM: Render'ın botu kapatmaması için basit bir web sunucusu
http.createServer((req, res) => {
  res.write("Bot aktif!");
  res.end();
}).listen(process.env.PORT || 3000);

// 2. ADIM: Bot Ayarları
const bot = mineflayer.createBot({
  host: 'play.aesirmc.com',
  username: 'myshoue',
  version: '1.21.1', // Senin kullandığın sürüm
  hideErrors: true
})

bot.on('spawn', () => {
  console.log('Bot sunucuya girdi!');
  setTimeout(() => { bot.chat('/login ShoueShoue'); }, 5000);
});

bot.on('error', (err) => console.log('Hata:', err));
bot.on('end', () => console.log('Bağlantı koptu.'));
