const API_KEY = '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';
let referenceData = '';
let productsData = '';

// ========== 初期化 ==========
document.addEventListener('DOMContentLoaded', () => {
  loadReference();
  loadProducts();
  initTabs();
  loadHistory();
  updateHistoryCount();
});

// ========== 参考文献の読み込み ==========
async function loadReference() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/studio-poplar/wellspring/main/reference.md'
    );
    if (response.ok) {
      referenceData = await response.text();
    }
  } catch (error) {
    console.warn('参考文献の読み込みに失敗:', error);
  }
}

// ========== 製品情報の読み込み ==========
async function loadProducts() {
  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/studio-poplar/wellspring/main/products.md'
    );
    if (response.ok) {
      productsData = await response.text();
    }
  } catch (error) {
    console.warn('製品情報の読み込みに失敗:', error);
  }
}

// ========== タブ機能 ==========
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

// ========== AI相談機能 ==========
async function getAdvice() {
  const concern = document.getElementById('concern').value.trim();
  if (!concern) {
    alert('お悩みやキーワードを入力してください。');
    return;
  }

  const btn = document.getElementById('submitBtn');
  const loading = document.getElementById('loading');
  const resultCard = document.getElementById('resultCard');

  btn.style.display = 'none';
  loading.style.display = 'flex';
  resultCard.style.display = 'none';

  const systemPrompt = `あなたはスキンケア・美容・健康の専門家です。以下の参考文献と製品情報を参考にしながら、科学的で信頼性の高いアドバイスを提供してください。

【参考文献】
${referenceData}

【利用可能な製品】
${productsData}

【アドバイスの構成】
1. 【一般的な知識】：悩みの原因を科学的に説明（肌のしくみ、pH、皮脂など）
2. 【改善策】：生活習慣・スキンケアの具体的な改善方法
3. 【ニュースキン製品の提案】：悩みに最適な製品を2～3点（スキンケア）と1～2点（サプリメント）推奨

【製品推奨時の形式】
推奨製品は必ず以下の形式で記載してください：
"[製品名]（カテゴリ）"

例：
"[ageLOC RTSスキンセラム＋]（美容液）は、シワ・ハリに効果的です..."
"[ageLOC ジェニユース]（美容サプリメント）はコラーゲンをサポートします..."

最後に励ましのメッセージをお願いします。`;

  const userPrompt = `【お悩み】${concern}

以下の順で回答してください：
1. 【原因の科学的説明】：悩みの根本原因
2. 【スキンケア・生活習慣の改善策】：具体的なステップ
3. 【おすすめのニュースキン製品】：悩みに合った製品を厳選
4. 【励ましのメッセージ】`;

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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
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
    const formattedAdvice = formatAdviceWithProducts(text);
    document.getElementById('result').innerHTML = formattedAdvice;
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth' });

    saveToHistory(concern, text);
    updateHistoryCount();
    document.getElementById('concern').value = '';

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
    loading.style.display = 'none';
    btn.style.display = 'block';
  }
}

// ========== アドバイスをフォーマット（製品リンク自動化） ==========
function formatAdviceWithProducts(text) {
  let html = text
    .split('\n')
    .map(line => {
      if (line.match(/^【.+】/)) {
        return `<strong style="color: #c8102e; font-size: 1.1em;">${escapeHtml(line)}</strong>`;
      }
      return escapeHtml(line);
    })
    .join('<br>');

  // [製品名] を検出してリンク化
  html = linkifyProducts(html);

  return html;
}

// ========== 製品リンク自動化 ==========
function linkifyProducts(html) {
  // products.mdから製品情報を抽出
  const productRegex = /### (.+?)\n- \*\*URL\*\*: (.+?)\n/g;
  const products = {};
  
  let match;
  while ((match = productRegex.exec(productsData)) !== null) {
    products[match[1].trim()] = match[2].trim();
  }

  // HTMLで [製品名] を見つけてリンク化
  Object.keys(products).forEach(productName => {
    const pattern = new RegExp(`\\[${escapeRegex(productName)}\\]`, 'g');
    const url = products[productName];
    const link = `<a href="${url}" target="_blank" style="color: #c8102e; text-decoration: underline; font-weight: 600;">[${productName}]</a>`;
    html = html.replace(pattern, link);
  });

  return html;
}

// ========== 履歴管理 ==========
function saveToHistory(concern, advice) {
  const history = getHistory();
  const newEntry = {
    id: Date.now(),
    date: new Date().toLocaleString('ja-JP'),
    concern: concern,
    advice: advice
  };
  history.unshift(newEntry);
  localStorage.setItem('wellspring_history', JSON.stringify(history.slice(0, 50)));
}

function getHistory() {
  const stored = localStorage.getItem('wellspring_history');
  return stored ? JSON.parse(stored) : [];
}

function loadHistory() {
  const history = getHistory();
  const historyList = document.getElementById('historyList');

  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-message">まだ履歴がありません</p>';
    return;
  }

  historyList.innerHTML = history.map(entry => `
    <div class="history-item">
      <div class="history-item-date">${entry.date}</div>
      <div class="history-item-concern">Q: ${escapeHtml(entry.concern)}</div>
      <div class="history-item-preview">${escapeHtml(entry.advice.substring(0, 150))}...</div>
      <div class="history-item-actions">
        <button class="copy-history" onclick="copyHistoryItem(${entry.id})">📋 コピー</button>
        <button class="delete-history" onclick="deleteHistoryItem(${entry.id})">🗑️ 削除</button>
      </div>
    </div>
  `).join('');
}

function deleteHistoryItem(id) {
  if (confirm('この履歴を削除しますか？')) {
    let history = getHistory();
    history = history.filter(entry => entry.id !== id);
    localStorage.setItem('wellspring_history', JSON.stringify(history));
    loadHistory();
    updateHistoryCount();
  }
}

function resetHistory() {
  if (confirm('すべての履歴を削除しますか？この操作は取り消せません。')) {
    localStorage.removeItem('wellspring_history');
    loadHistory();
    updateHistoryCount();
  }
}

function updateHistoryCount() {
  const count = getHistory().length;
  const badge = document.getElementById('historyCount');
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

function copyHistoryItem(id) {
  const history = getHistory();
  const entry = history.find(e => e.id === id);
  if (entry) {
    const text = `Q: ${entry.concern}\n\nA:\n${entry.advice}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('コピーしました！');
    }).catch(() => {
      alert('コピーに失敗しました。');
    });
  }
}

// ========== コピー機能 ==========
function copyAdvice() {
  const resultElement = document.getElementById('result');
  const resultText = resultElement.textContent;
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

// ========== シェア機能 ==========
function shareTwitter() {
  const text = encodeURIComponent('Well Spring で美容・健康アドバイスをもらいました！\n#WellSpring #ニュースキン #美容 #健康');
  const url = `https://twitter.com/intent/tweet?text=${text}&url=https://wellspring-delta.vercel.app`;
  window.open(url, '_blank', 'width=550,height=420');
}

function shareLine() {
  const text = encodeURIComponent('Well Spring で美容・健康アドバイスをもらいました！\nhttps://wellspring-delta.vercel.app');
  window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
}

// ========== ユーティリティ ==========
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
