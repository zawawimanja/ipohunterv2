// Vercel Serverless Function — Groq API Proxy
// Key lives in Vercel Environment Variables, NEVER in the browser.
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) {
        return res.status(500).json({ error: 'API key not configured on server.' });
    }

    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are Hunter AI, a professional Malaysian IPO assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 512,
                temperature: 0.7
            })
        });

        const data = await groqRes.json();
        const text = data?.choices?.[0]?.message?.content || '';
        return res.status(200).json({ text });

    } catch (err) {
        console.error('Proxy error:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
