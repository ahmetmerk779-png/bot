const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: true }));

let logs = ["Sistem Başlatıldı..."];
let bot = null;

// Console.log'u Siteye Bağlama
const originalLog = console.log;
console.log = (...args) => {
    logs.push(args.join(' '));
    if (logs.length > 50) logs.shift();
    originalLog(...args);
};

// Bot Logic
function startBot(name, pass) {
    if (bot) bot.quit();
    console.log(`Bot bağlanıyor: ${name}`);
    bot = mineflayer.createBot({
        host: 'aesirmc.com',
        port: 25565,
        username: name,
        version: '1.21.1'
    });

    bot.on('login', () => console.log("Giriş Başarılı!"));
    bot.on('chat', (u, m) => console.log(`${u}: ${m}`));
    bot.on('end', () => console.log("Bot düştü! Yeniden başlatılıyor..."));
}

// Web Arayüzü
app.get('/', (req, res) => {
    res.send(`
    <html><body style="background:#111; color:#0f0; font-family:monospace; padding:20px;">
        <h3>🤖 MANAGER KONSOLU</h3>
        <form action="/start" method="POST">
            <input name="name" placeholder="İsim" required>
            <input name="pass" placeholder="Şifre">
            <button>BAŞLAT</button>
        </form>
        <form action="/cmd" method="POST">
            <input name="msg" placeholder="Komut yaz (örn: /warp)">
            <button>GÖNDER</button>
        </form>
        <div id="logs" style="background:#000; height:300px; overflow-y:scroll; border:1px solid #333; margin-top:10px;"></div>
        <script>
            setInterval(async () => {
                const r = await fetch('/get-logs');
                document.getElementById('logs').innerText = await r.text();
            }, 1000);
        </script>
    </body></html>`);
});

app.get('/get-logs', (req, res) => res.send(logs.join('\n')));

app.post('/start', (req, res) => {
    startBot(req.body.name, req.body.pass);
    res.redirect('/');
});

app.post('/cmd', (req, res) => {
    if(bot) bot.chat(req.body.msg);
    res.redirect('/');
});

app.listen(process.env.PORT || 3000, () => console.log("Panel Hazır."));
