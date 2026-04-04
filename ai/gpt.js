const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function askGPT(message) {
    try {
        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "Sen Minecraft sunucusunda bir oyuncu botusun. Adın myshoue. Kısa ve havalı cevaplar ver."
                },
                { role: "user", content: message }
            ],
            max_tokens: 60
        });
        return response.choices[0].message.content;
    } catch (err) {
        return null;
    }
}

module.exports = askGPT;
