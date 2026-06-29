// ai/openrouter.js - OpenRouter API ile iletişim
const axios = require('axios');
const config = require('../config');

async function askOpenRouter(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: config.openRouterModel || 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/your-repo', // İsteğe bağlı
          'X-Title': 'Minecraft AI Bot'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter hatası:', error.response?.data || error.message);
    return null;
  }
}

module.exports = { askOpenRouter };
