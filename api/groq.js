export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { systemPrompt, userPrompt } = req.body;

  if (!systemPrompt || !userPrompt) {
    res.status(400).json({ error: 'systemPrompt and userPrompt are required' });
    return;
  }

  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    console.error('GROQ_API_KEY is not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || 'API error occurred';
      console.error('Groq API error:', errorMsg);
      res.status(response.status || 500).json({ error: errorMsg });
      return;
    }

    if (!data.choices || !data.choices[0]) {
      res.status(500).json({ error: 'Invalid response format' });
      return;
    }

    res.status(200).json({
      success: true,
      content: data.choices[0].message.content
    });

  } catch (error) {
    console.error('Error calling Groq API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
