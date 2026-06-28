const express = require('express');
const http = require('http');
const mineflayer = require('mineflayer');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const pvp = require('mineflayer-pvp').plugin;
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
app.use(express.urlencoded({ extended: true }));

const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

let bot;

// YZ'nın oyun kurallarını anladığı ve JSON formatında komut ürettiği prompt
const AI_SYSTEM_PROMPT = `
Sen "AI Paul" seviyesinde, kendi kararlarını verebilen otonom bir Minecraft botusun.
Kullanıcı sana bir şey söylediğinde veya durum raporu verildiğinde SADECE ve SADECE aşağıdaki JSON formatında cevap vermelisin. Başka hiçbir düz metin, selamlama veya açıklama YAZMA! Sadece JSON!

Kullanabileceğin eylemler (action):
1. "chat" - Sadece konuşmak için. (Örnek: {"action": "chat", "message": "Merhaba!"})
2. "collect" - Bir bloğu kırmak/toplamak için. (Örnek: {"action": "collect", "target": "log"})
3. "move" - Rastgele veya birine gitmek için. (Örnek: {"action": "move", "target": "player_name"})
4. "stop" - Tüm işlemleri durdurmak için. (Örnek: {"action": "stop"})

Eğer bir blok bulman veya kırman istenirse "collect", yanına gelmem istenirse "move" kullan.
`;

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/connect', (req, res) => {
    const { host, username, version } = req.body;
    if (bot) bot.quit();

    bot = mineflayer.createBot({ host, username, version });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock.plugin);
    bot.loadPlugin(pvp);

    bot.on('spawn', () => console.log('Otonom Ajan Başlatıldı!'));

    bot.on('chat', async (user, message) => {
        if (user === bot.username) return;

        try {
            // Groq AI'dan JSON formatında komut istiyoruz
            const response = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: AI_SYSTEM_PROMPT },
                    { role: "user", content: `${user} diyor ki: ${message}` }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1 // AI'ın saçmalamasını engeller, net JSON verir
            });

            const aiResponse = response.choices[0].message.content.trim();
            console.log("AI Kararı:", aiResponse); // Render loglarında AI'ın ne düşündüğünü görebilirsin

            // AI'ın verdiği JSON'u ayrıştırıp oyuna döküyoruz
            const command = JSON.parse(aiResponse);

            if (command.action === 'chat') {
                bot.chat(command.message);
            } 
            
            else if (command.action === 'collect') {
                bot.chat(`Anlaşıldı, ${command.target} toplamaya gidiyorum...`);
                // İstenen bloğu etrafta bul
                const blockType = bot.registry.blocksByName[command.target];
                if (!blockType) {
                    bot.chat("Bu bloğun tam İngilizce kod adını bilmiyorum.");
                    return;
                }
                const targetBlock = bot.findBlock({ matching: blockType.id, maxDistance: 32 });
                
                if (targetBlock) {
                    bot.collectBlock.collect(targetBlock, err => {
                        if (err) bot.chat("Blok toplanırken bir sorun çıktı, yol kapalı olabilir.");
                    });
                } else {
                    bot.chat("Etrafta bu bloktan göremiyorum.");
                }
            } 
            
            else if (command.action === 'move') {
                bot.chat(`Hareket ediyorum...`);
                const targetPlayer = bot.players[user]?.entity;
                if (targetPlayer) {
                    bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer, 2), true);
                } else {
                    bot.chat("Seni göremiyorum, çok uzaktasın.");
                }
            } 
            
            else if (command.action === 'stop') {
                bot.pathfinder.setGoal(null);
                bot.chat("Durdum.");
            }

        } catch (error) {
            console.log("YZ İşlem Hatası veya JSON Parse Hatası:", error);
            bot.chat("Kafam karıştı, tekrar söyler misin?");
        }
    });

    res.send("Üst Düzey Ajan Bot Başlatıldı!");
});

server.listen(process.env.PORT || 3000);
