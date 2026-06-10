const API_KEY = 'AQ.Ab8RN6LC5GZfrth0bhEswpJcE8jfY0ydi5LV3A8EebsABKJWqg';

async function getAdvice() {
  const concern = document.getElementById('concern').value.trim();
  if (!concern) { alert('お悩みやキーワードを入力してください。'); return; }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '考え中...';
  document.getElementById('resultCard').style.display = 'none';

  const prompt = `あなたはニュースキン（Nu Skin）の美容・健康アドバイザーです。以下のお悩みに日本語で丁寧にアドバイスしてください。

【お悩み】${concern}

以下の3つで回答してください：
1. 【スキンケア・生活習慣のアドバイス】
2. 【おすすめのニュースキン製品】（2〜3点、製品名と理由）
3. 【おすすめのニュースキン サプリメント】（1〜2点、製品名と理由）

最後に励ましのメッセージをお願いします。`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    if (data.error) { throw new Error(data.error.message); }
    const text = data.candidates[0].content.parts[0].text;
    document.getElementById('result').textContent = text;
    document.getElementById('resultCard').style.display = 'block';
    document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    alert('エラー: ' + error.message);
  }

  btn.disabled = false;
  btn.textContent = 'アドバイスを見る';
}

function shareTwitter() {
  const text = encodeURIComponent('Well Spring で美容・健康アドバイスをもらいました！ #WellSpring #ニュースキン #美容 #健康');
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
}

function shareLine() {
  const text = encodeURIComponent('Well Spring で美容・健康アドバイスをもらいました！');
  window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
}
