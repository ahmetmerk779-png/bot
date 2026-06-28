require('dotenv').config();
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { OpenAI } = require('openai');

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

const bot = mineflayer.createBot({
  host: 'SUNUCU_IP', // Buraya Sunucu IP adresini yaz
  port: 25565,       // Port
  username: 'AI_Asistan',
  version: '1.21.8'
});

bot.loadPlugin(pathfinder);

bot.on('spawn', () => {
  console.log('Bot dünyada!');
  bot.chat('Sisteme bağlandım! Seninle oynamaya hazırım.');
});

async function getAIResponse(userMessage) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Sen Minecraft dünyasında yaşayan, yardımcı ve zeki bir asistansın. Kısa, oyun içi duruma uygun, samimi cevaplar ver." },
        { role: "user", content: userMessage }
      ],
      model: "llama-3.3-70b-versatile",
    });
    return chatCompletion.choices[0].message.content;
  } catch (err) {
    return "Üzgünüm, Groq ile bağlantı kuramadım.";
  }
}

bot.on('chat', async (username, message) => {
  if (username === bot.username) return;

  // Örnek Komut: AI ile konuşma
  if (message.startsWith('!ai ')) {
    const query = message.replace('!ai ', '');
    const response = await getAIResponse(query);
    bot.chat(response);
  }
});

// Otomatik Yeniden Bağlanma
bot.on('end', () => {
  console.log('Sunucudan atıldım, 5 saniye sonra tekrar deniyorum...');
  setTimeout(() => {
    // Yeniden başlama mantığı
  }, 5000);
});
