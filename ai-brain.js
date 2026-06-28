const { OpenAI } = require('openai');

// Render'ın Environment Variables kısmından okur
// Render Dashboard -> Environment -> Add Environment Variable kısmına 
// KEY: AI_API_KEY
// VALUE: gsk_senin_anahtarin
// şeklinde eklemeyi unutma!
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
        
        // JSON cevabını temizle
        const content = response.choices[0].message.content.replace(/```json|```/g, '').trim();
        return JSON.parse(content);
    } catch (e) { 
        console.error("AI Karar hatası:", e);
        return { action: 'idle', target: null }; 
    }
}

module.exports = { getDecision };
