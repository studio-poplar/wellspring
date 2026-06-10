const API_KEY = 'AQ.Ab8RN6Jamwx89nRe_KdLKW08Ppqku2C2nLsSKRQuyo-Cz3sA7g';

async function getAdvice() {
  const concern = document.getElementById('concern').value.trim();

  if (!concern) {
    alert('お悩みやキーワードを入力してください。');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '考え中...';

  const resultCard = document.getElementById('resultCard');
  const result = document.getElementById('result');
  resultCard.style.display = 'none';

  const prompt = `
あなたはニュースキン（Nu Skin）の美容・健康アドバイザーです。
以下のお悩みやキーワードに対して、日本語で丁寧にアドバイスをしてください。

【お悩み・キーワード】
${concern}

以下の3つの観点で具体的に回答してください：

1. 【スキンケア・生活習慣のアドバイス】
日々のケア方法や生活習慣の改善点を教えてください。

2. 【おすすめのニュースキン製品】
このお悩みに適したニュースキンのスキンケア製品を2〜3点、製品名と理由を添えて紹介してください。

3. 【おすすめのニュースキン サプリメント】
内側からのケアに役立つニュースキンのサプリメントを1〜2点、製品名と理由を添えて紹介してください。

最後に、一言励ましのメッセージを添えてください。
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    result.textContent = text;
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    alert('エラーが発生しました。もう一度お試しください。');
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
