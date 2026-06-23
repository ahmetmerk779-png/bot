require('dotenv').config();
const express = require('express');
const Groq = require('groq-sdk');
const app = express();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(express.static('public'));

app.post('/api/composer', async (req, res) => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: req.body.task }],
            model: "llama-3.3-70b-versatile",
        });
        res.json({ success: true, message: completion.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Sistem Llama ile aktif!'));
