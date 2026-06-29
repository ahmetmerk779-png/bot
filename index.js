const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const { OpenAI } = require('openai');
const express = require('express');

const openai = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY, 
    baseURL: 'https://api.groq.com/openai/v1' 
});

const app = express();
app.use(express.urlencoded({ extended: true }));

// BOT DEPOSU (Burada birden fazla bot tutuyoruz)
const bots = new Map();

async function getAIResponse(username, message, bot) {
    const response = await openai.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [{ role: "system", content: "Kısa ve öz konuş. ACTION: JSON komutları için." }, { role: "user", content: `${username}: ${message}` }]
    });
    return response.choices[0].message.content;
}

function createBot(username, host, port, password) {
    // Eğer aynı isimde bot varsa önce onu kapat
    if (bots.has(username)) bots.get(username).quit();

    const bot = mineflayer.createBot({ host, port: parseInt(port), username, version: '1.21.1' });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);
    
    bots.set(username, bot); // Depoya ekle

    bot.on('login', () => console.log(`${username} sunucuya girdi!`));
    bot.on('end', () => { bots.delete(username); console.log(`${username} çıktı.`); });

    bot.on('chat', async (user, message) => {
        if (user === bot.username) return;

        // 1. PING SİSTEMİ (Bot yaşıyor mu?)
        if (message === '!ping') { bot.chat('Pong!'); return; }
        
        // 2. LOGIN
        if (password && message.toLowerCase().includes('login')) bot.chat('/login ' + password);
        
        // 3. AI CEVAP
        if (message.toLowerCase().includes(bot.username.toLowerCase()) || message.startsWith('!')) {
            const aiCevabi = await getAIResponse(user, message, bot);
            if (aiCevabi.includes('ACTION:')) {
                // ... (Aksiyon mantığın aynı)
            } else {
                bot.chat(aiCevabi);
            }
        }
    });
}

// WEB PANELİ
app.get('/', (req, res) => res.send(`
    <h3>Aktif Botlar: ${Array.from(bots.keys()).join(', ')}</h3>
    <form action="/spawn" method="POST">
        <input name="name" placeholder="Bot İsmi" required>
        <input name="ip" placeholder="IP" required>
        <input name="port" value="25565" required>
        <input type="password" name="password" placeholder="Şifre">
        <button type="submit">Botu Sok</button>
    </form>
`));

app.post('/spawn', (req, res) => {
    const { name, ip, port, password } = req.body;
    createBot(name, ip, port, password);
    res.send("Bot gönderildi: " + name);
});

app.listen(process.env.PORT || 3000);
