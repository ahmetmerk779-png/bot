const mineflayer = require('mineflayer');
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

let bot = null;
let logs = ["Sistem hazır, ayarları girip Başlat'a bas."];
let autoTaskInterval = null;

// --- Konsolu Sitede Gösterme ---
const originalLog = console.log;
console.log = (...args) => {
    logs.push(args.join(' '));
    if (logs.length > 50) logs.shift();
    originalLog(...args);
};

// --- Bot Başlatma ---
function startBot(config) {
    if (bot) bot.quit();
    console.log(`>>> Bağlanılıyor: ${config.ip}:${config.port} (${config.version})`);
    
    bot = mineflayer.createBot({
        host: config.ip, port: parseInt(config.port),
        username: config.name, version: config.version
    });

    bot.on('login', () => {
        console.log(">>> GİRİŞ YAPILDI!");
        if (config.pass) bot.chat('/login ' + config.pass);
    });
    bot.on('chat', (u, m) => console.log(`${u}: ${m}`));
    bot.on('end', () => console.log(">>> BOT DÜŞTÜ!"));
}

// --- Web Paneli ---
app.get('/', (req, res) => {
    res.send(`
    <html><body style="background:#1a1a1a; color:#fff; font-family:sans-serif; padding:15px;">
        <h2 style="color:#0f0;">🤖 AESİR BOT PANELİ</h2>
        
        <form action="/setup" method="POST" style="background:#333; padding:10px; border-radius:5px;">
            <input name="ip" placeholder="Server IP" value="aesirmc.com" required>
            <input name="port" placeholder="Port" value="25565" style="width:60px">
            <input name="version" placeholder="Versiyon" value="1.21.1" style="width:80px">
            <br><input name="name" placeholder="Bot İsmi" required>
            <input name="pass" placeholder="Şifre">
            <button type="submit">AYARLA VE BAŞLAT</button>
        </form>

        <div style="margin:15px 0;">
            <form action="/cmd" method="POST">
                <button name="msg" value="/warp market">Market</button>
                <button name="msg" value="/kit">Kit Al</button>
                <button name="msg" value="/spawn">Spawn</button>
                <input name="msg" placeholder="Özel komut...">
                <button>GÖNDER</button>
            </form>
        </div>

        <form action="/task" method="POST" style="border:1px solid #0f0; padding:10px;">
            <input name="cmd" placeholder="Oto komut (örn: /eat)">
            <input name="time" placeholder="Saniye (örn: 60)" type="number">
            <button name="action" value="start">GÖREVİ BAŞLAT</button>
            <button name="action" value="stop">DURDUR</button>
        </form>

        <h3 style="color:#0f0;">CANLI KONSOL</h3>
        <div id="logs" style="background:#000; height:250px; overflow-y:scroll; font-family:monospace; color:#0f0; padding:10px; border:1px solid #555;"></div>
        
        <script>
            setInterval(async () => {
                const r = await fetch('/logs');
                document.getElementById('logs').innerText = await r.text();
            }, 1000);
        </script>
    </body></html>`);
});

// --- İşlemler ---
app.post('/setup', (req, res) => { startBot(req.body); res.redirect('/'); });
app.post('/cmd', (req, res) => { if(bot) bot.chat(req.body.msg); res.redirect('/'); });
app.post('/task', (req, res) => {
    if (autoTaskInterval) clearInterval(autoTaskInterval);
    if (req.body.action === 'start') {
        autoTaskInterval = setInterval(() => { if(bot) bot.chat(req.body.cmd); }, req.body.time * 1000);
        console.log(">>> Oto görev başlatıldı: " + req.body.cmd);
    }
    res.redirect('/');
});
app.get('/logs', (req, res) => res.send(logs.join('\n')));

app.listen(process.env.PORT || 3000, () => console.log("Panel Hazır."));
