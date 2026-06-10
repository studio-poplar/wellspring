const API_KEY = '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';

async function getAdvice() {
  const concern = document.getElementById('concern').value.trim();
  if (!concern) {
    alert('お悩みやキーワードを入力してください。');
    return;
  }

  const btn = document.getElementById('submitBtn');
  const loading = document.getElementById('loading');
  const resultCard = document.getElementById('resultCard');

  // ローディング表示開始
  btn.style.display = 'none';
  loading.style.display = 'flex';
  resultCard.style.display = 'none';

  const prompt = `あなたはニュースキン（Nu Skin）の美容・健康アドバイザーです。以下のお悩みに日本語で丁寧にアドバイスしてください。

【お悩み】${concern}

以下の3つで回答してください：
1. 【スキンケア・生活習慣のアドバイス】
2. 【おすすめのニュースキン製品】（2〜3点、製品名と理由）
3. 【おすすめのニュースキン サプリメント】（1〜2点、製品名と理由）

最後に励ましのメッセージをお願いします。`;

  try {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || 'APIエラーが発生しました';
      throw new Error(errorMsg);
    }

    if (!data.choices || !data.choices[0]) {
      throw new Error('応答形式が不正です');
    }

    const text = data.choices[0].message.content;
    document.getElementById('result').textContent = text;
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    let userMessage = 'エラーが発生しました。';
    
    if (error.message.includes('401')) {
      userMessage = 'APIキーが無効です。設定を確認してください。';
    } else if (error.message.includes('429')) {
      userMessage = 'リクエスト数が多すぎます。しばらく待ってから再度お試しください。';
    } else if (error.message.includes('fetch')) {
      userMessage = 'ネットワークエラーです。インターネット接続を確認してください。';
    } else {
      userMessage = `エラー: ${error.message}`;
    }
    
    alert(userMessage);
    console.error('API Error:', error);

  } finally {
    // ローディング表示終了
    loading.style.display = 'none';
    btn.style.display = 'block';
  }
}

function copyAdvice() {
  const resultText = document.getElementById('result').textContent;
  if (!resultText) {
    alert('コピーするアドバイスがありません。');
    return;
  }

  navigator.clipboard.writeText(resultText).then(() => {
    const btn = document.querySelector('.copy-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ コピーしました！';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(() => {
    alert('コピーに失敗しました。');
  });
}

function shareTwitter() {
  const text = encodeURIComponent('Well Spring で美容・健康アドバイスをもらいました！\n#WellSpring #ニュースキン #美容 #健康');
  const url = `https://twitter.com/intent/tweet?text=${text}&url=https://wellspring-delta.vercel.app`;
  window.open(url, '_blank', 'width=550,height=420');
}

function shareLine() {
  const text = encodeURIComponent('Well Spring で美容・健康アドバイスをもらいました！\nhttps://wellspring-delta.vercel.app');
  window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
}
