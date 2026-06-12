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
1. 【原因と対策】：悩みの原因を簡潔に説明し、改善方法を箇条書きで列挙（全体で3～4行）
2. 【おすすめ製品】：悩みに合った製品を1～2点推奨（製品名とURL形式: [製品名](URL)）
3. 【まとめ】：このアドバイスの重要なポイントを箇条書き（3～5点）

【重要な制約】
- 励ましのメッセージは不要
- 文字数は簡潔に（全体で500字以内）
- 製品推奨は形式: [製品名](https://...)`;

  const userPrompt = `【お悩み】${concern}

以下の順で簡潔に答えてください：
1. 【原因と対策】：原因 + 改善策（箇条書き）
2. 【おすすめ製品】：推奨製品（1～2点、リンク付き）
3. 【まとめ】：重要なポイント（箇条書き3～5点）`;

  try {
    const response = await fetch(
      '/api/groq',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemPrompt: systemPrompt,
          userPrompt: userPrompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error || 'APIエラーが発生しました';
      throw new Error(errorMsg);
    }

    if (!data.success || !data.content) {
      throw new Error('応答形式が不正です');
    }

    const text = data.content;
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

// ========== アドバイスをフォーマット（製品リンク・画像自動化） ==========
function formatAdviceWithProducts(text) {
  let html = text
    .split('\n')
    .map(line => {
      if (line.match(/^【.+】/)) {
        return `<strong style="color: #c8102e; font-size: 1.1em;">${escapeHtml(line)}</strong>`;
      }
      if (line.match(/^-/)) {
        return `<li>${escapeHtml(line.substring(1).trim())}</li>`;
      }
      return escapeHtml(line);
    })
    .join('<br>');

  // リスト化
  html = html.replace(/(<li>.*?<\/li>)(<li>|$)/g, '<ul>$1</ul>$2');

  // [製品名](URL) をHTMLリンクに変換
  html = linkifyProductsWithImages(html);

  return html;
}

// ========== 製品リンク・画像自動化 ==========
function linkifyProductsWithImages(html) {
  // products.mdから製品情報を抽出
  const productRegex = /### (.+?)\n- \*\*URL\*\*: (.+?)\n- \*\*Image\*\*: (.+?)\n/g;
  const products = {};
  
  let match;
  while ((match = productRegex.exec(productsData)) !== null) {
    products[match[1].trim()] = {
      url: match[2].trim(),
      image: match[3].trim()
    };
  }

  // Markdown形式 [製品名](URL) をHTMLに変換
  const linkRegex = /\[(.+?)\]\((https?:\/\/.+?)\)/g;
  html = html.replace(linkRegex, (match, productName, url) => {
    const productInfo = products[productName];
    if (productInfo && productInfo.image) {
      // 製品カード表示
      return `<div class="product-card">
        <img src="${escapeHtml(productInfo.image)}" alt="${escapeHtml(productName)}" class="product-image">
        <h4>${escapeHtml(productName)}</h4>
        <a href="${escapeHtml(productInfo.url)}" target="_blank" class="product-link">公式ページへ →</a>
      </div>`;
    }
    return `<a href="${escapeHtml(url)}" target="_blank" style="color: #c8102e; text-decoration: underline;">${escapeHtml(productName)}</a>`;
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
