const mineflayer = require('mineflayer');
const express = require('express');
const app = express();
const http = require('http').createServer(app);

// Logları tutmak için
let logHistory = [];
const originalLog = console.log;
console.log = (...args) => {
    const msg = args.join(' ');
    logHistory.push(msg);
    if(logHistory.length > 50) logHistory.shift();
    originalLog(...args);
};

app.use(express.urlencoded({ extended: true }));

let bot = null;
let currentTask = "Boşta";

// --- BOT LOGİĞİ ---
function createBot() {
    console.log("Bot oluşturuluyor...");
    bot = mineflayer.createBot({
        host: 'aesirmc.com',
        port: 25565,
        username: 'Bot',
        version: '1.21.1'
    });

    bot.on('login', () => console.log(">>> SUNUCUYA GİRİLDİ!"));
    bot.on('end', () => { console.log(">>> BOT DÜŞTÜ, 10sn sonra yeniden..."); setTimeout(createBot, 10000); });
    bot.on('chat', (u, m) => console.log(`${u}: ${m}`));
}

// --- WEB ARAYÜZÜ (KONSOL) ---
app.get('/', (req, res) => {
    res.send(`
        <html>
        <body style="background:#1a1a1a; color:#0f0; font-family:monospace; padding:20px;">
            <h3>🤖 BOT KONTROL MERKEZİ</h3>
            <p>GÖREV: <b>${currentTask}</b></p>
            
            <form action="/command" method="POST">
                <input name="cmd" placeholder="Komut yaz..." style="width:300px">
                <button type="submit">Gönder</button>
            </form>
            <br>
            <form action="/task" method="POST">
                <button name="task" value="Maden">Maden Kaz</button>
                <button name="task" value="Farm">Farm Yap</button>
                <button name="task" value="Dur">DUR</button>
            </form>
            <br>
            <textarea id="console" style="width:100%; height:300px; background:black; color:#0f0; border:1px solid #333;" readonly></textarea>
            
            <script>
                async function updateLogs() {
                    const res = await fetch('/logs');
                    const text = await res.text();
                    document.getElementById('console').value = text;
                }
                setInterval(updateLogs, 1000); // 1 saniyede bir logları güncelle
            </script>
        </body>
        </html>
    `);
});

app.get('/logs', (req, res) => res.send(logHistory.join('\n')));

app.post('/command', (req, res) => {
    if(bot) bot.chat(req.body.cmd);
    res.redirect('/');
});

app.post('/task', (req, res) => {
    currentTask = req.body.task;
    console.log("GÖREV DEĞİŞTİ: " + currentTask);
    res.redirect('/');
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Panel Başlatıldı.");
    createBot();
});
