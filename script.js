const API_KEY = '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';

// ========== 初期化 ==========
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadHistory();
  updateHistoryCount();
});

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
  // タブボタンの状態更新
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // コンテンツの表示/非表示
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

    // 履歴に保存
    saveToHistory(concern, text);
    updateHistoryCount();

    // 入力をクリア
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

// ========== 履歴管理 ==========
function saveToHistory(concern, advice) {
  const history = getHistory();
  const newEntry = {
    id: Date.now(),
    date: new Date().toLocaleString('ja-JP'),
    concern: concern,
    advice: advice
  };
  history.unshift(newEntry); // 最新順
  localStorage.setItem('wellspring_history', JSON.stringify(history.slice(0, 50))); // 最大50件
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
