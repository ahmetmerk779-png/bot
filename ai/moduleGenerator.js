const fs = require('fs');
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function createModule(task) {
    try {
        const response = await client.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "Sadece Mineflayer JS kodu yaz. Format: module.exports = function(bot) { ... }"
                },
                { role: "user", content: task }
            ]
        });

        let code = response.choices[0].message.content.replace(/```javascript/g, "").replace(/```/g, "").trim();
        const fileName = `mod_${Date.now()}.js`;
        
        // Modülleri yine bir klasöre toplasın (yoksa oluşturur)
        if (!fs.existsSync('./modules')) fs.mkdirSync('./modules');
        fs.writeFileSync(`./modules/${fileName}`, code);
        
        return fileName;
    } catch (err) {
        return null;
    }
}

module.exports = createModule;
