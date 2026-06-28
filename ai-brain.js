const { OpenAI } = require('openai');
const client = new OpenAI({ 
    apiKey: process.env.AI_API_KEY, 
    baseURL: 'https://api.groq.com/openai/v1' 
});
// ... (Karar mekanizman burada aynı kalabilir)
