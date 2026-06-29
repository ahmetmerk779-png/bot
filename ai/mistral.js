const axios = require('axios');
const config = require('../config');

async function askMistral(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: config.mistralModel || 'mistral-small-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.mistralApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Mistral hatası:', error.response?.data || error.message);
    return null;
  }
}

module.exports = { askMistral };
