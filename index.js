const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const { Vec3 } = require('vec3');
const { OpenAI } = require('openai');
const express = require('express');

// Groq API Kurulumu (Render'da GROQ_API_KEY olarak ekle!)
const openai = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY, 
    baseURL: 'https://api.groq.com/openai/v1' 
});

const app = express();
app.use(express.urlencoded({ extended: true }));

let bot = null;
let isMuted = false;
let chatHistory = []; // Token tasarrufu için geçmişi tutuyoruz

// --- EYLEMLER ---
const actions = {
    kir: async (bot, block) => { 
        const b = bot.findBlock({ matching: (bl) => bl.name === block });
        if (b) await bot.collectBlock.collect(b);
    },
    saldir: async (bot, isim) => { 
        const e = Object.values(bot.entities).find(e => e.type === 'player' && e.username.toLowerCase().includes(isim.toLowerCase()));
        if (e) bot.attack(e);
    },
    npcBul: async (bot, isim) => {
        const npc = Object.values(bot.entities).find(e => e.type === 'player' && e.username.toLowerCase().includes(isim.toLowerCase()));
        if (npc) bot.pathfinder.setGoal(new goals.GoalFollow(npc, 1), true);
    },
    sagTikla: async (bot, isim) => {
        const npc = Object.values(bot.entities).find(e => e.type === 'player' && e.username.toLowerCase().includes(isim.toLowerCase()));
        if (npc) bot.activateEntity(npc);
    },
    tiklaSlot: async (bot, slot) => {
        if (bot.currentWindow) await bot.clickWindow(parseInt(slot), 0, 0);
    },
    komutKullan: async (bot, komut) => { bot.chat(`/${komut}`); }
};

// --- AI BEYİN ---
async function getAIResponse(username, message) {
    chatHistory.push({ role: "user", content: `${username}: ${message}` });
    if (chatHistory.length > 6) chatHistory.shift(); 

    const response = await openai.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [
            { role: "system", content: "Sen bir Minecraft botusun. Kısa ve öz konuş. Komut çalıştırman gerekirse mesajının başına 'ACTION:' koy ve JSON yaz: ACTION: {\"action\": \"kir\", \"args\": [\"stone\"]}. Sohbet edeceksen normal konuş." },
            ...chatHistory
        ]
    });

    const aiCevabi = response.choices[0].message.content;
    chatHistory.push({ role: "assistant", content: aiCevabi });
    return aiCevabi;
}

// --- BOT LOGİC ---
function createBot(username, host, port) {
    bot = mineflayer.createBot({ host, port: parseInt(port), username, version: '1.21.1' });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bot.on('end', () => setTimeout(() => createBot(username, host, port), 5000));

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;

        // Komutlar
        if (message.includes('!sessiz')) { isMuted = true; bot.chat("Sessiz moda geçtim."); return; }
        if (message.includes('!konus')) { isMuted = false; bot.chat("Geri döndüm."); return; }
        if (message.toLowerCase().includes('login')) bot.chat('/login ŞİFREN'); // ŞİFRENİ BURAYA YAZ
        
        if (isMuted) return;

        // Botun ismi geçiyorsa cevap ver
        if (message.toLowerCase().includes(bot.username.toLowerCase()) || message.startsWith('!')) {
            const aiCevabi = await getAIResponse(username, message);
            console.log("AI:", aiCevabi);

            if (aiCevabi.includes('ACTION:')) {
                try {
                    const jsonPart = aiCevabi.split('ACTION:')[1].trim();
                    const data = JSON.parse(jsonPart);
                    if (actions[data.action]) await actions[data.action](bot, ...data.args);
                } catch (e) { bot.chat("Komutu anlamadım."); }
            } else {
                bot.chat(aiCevabi);
            }
        }
    });
}

// --- WEB PANELİ ---
app.get('/', (req, res) => res.send('<form action="/connect" method="POST"><input name="ip" placeholder="IP"><input name="port" value="25565"><input name="name" placeholder="Bot İsmi"><button>Başlat</button></form>'));
app.post('/connect', (req, res) => {
    createBot(req.body.name, req.body.ip, req.body.port);
    res.send("Bot bağlandı!");
});

app.listen(process.env.PORT || 3000);
