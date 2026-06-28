const { OpenAI } = require('openai');
require('dotenv').config();

const client = new OpenAI({ 
    apiKey: process.env.AI_API_KEY, 
    baseURL: 'https://api.groq.com/openai/v1' 
});

async function getDecision(botName, status, prompt) {
    const systemPrompt = `Sen ${botName} isimli bir Minecraft ajanısın. 
    Mevcut Durum: ${JSON.stringify(status)}. 
    Hedefin: ${prompt}. 
    Sadece JSON döndür: { "action": "collect|move|attack|idle", "target": "item_or_player_name" }`;

    try {
        const response = await client.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }],
            model: "llama-3.3-70b-versatile"
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (e) { return { action: 'idle', target: null }; }
}

module.exports = { getDecision };
