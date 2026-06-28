const express = require('express');
const { createBot } = require('./bot-logic');
const app = express();

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <h1>Bot Kontrol Paneli</h1>
                <form action="/connect" method="POST">
                    <input type="text" name="ip" placeholder="Sunucu IP" required><br>
                    <input type="text" name="port" placeholder="Port (Örn: 25565)" value="25565" required><br>
                    <input type="text" name="name" placeholder="Bot İsmi" required><br>
                    <button type="submit">BAĞLAN</button>
                </form>
            </body>
        </html>
    `);
});

app.post('/connect', (req, res) => {
    const { ip, port, name } = req.body;
    console.log(`Bağlanılıyor: ${name} -> ${ip}:${port}`);
    createBot(name, ip, port);
    res.send("Bot sunucuya bağlanmaya çalışıyor. Log ekranından takip et!");
});

app.listen(process.env.PORT || 3000, () => console.log("Site çalışıyor!"));
