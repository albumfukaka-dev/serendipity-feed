let savedItems = JSON.parse(localStorage.getItem('serendipity-saved') || '[]');
let currentFeed = [];
const BATCH_SIZE = 12;

function shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function createCard(item, index) {
    const isSaved = savedItems.some(s => s.title === item.title);
    return `
        <article class="card" data-domain="${item.domain}" data-index="${index}">
            <span class="card-domain">${item.domain}</span>
            <h2 class="card-title">${item.title}</h2>
            <p class="card-subtitle">${item.subtitle}</p>
            <p class="card-hook">${item.hook}</p>
            <div class="card-connection">
                <div class="card-connection-label">跟你的连接</div>
                <p class="card-connection-text">${item.connection}</p>
            </div>
            <div class="card-keywords">
                ${item.keywords.map(k => `<span class="keyword">${k}</span>`).join('')}
            </div>
            <div class="card-actions">
                <button class="action-btn ${isSaved ? 'saved' : ''}" onclick="toggleSave(${index})">
                    <svg viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    ${isSaved ? '已收藏' : '收藏'}
                </button>
                <button class="action-btn" onclick="searchItem(${index})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    搜索
                </button>
            </div>
        </article>
    `;
}

function renderFeed(items) {
    currentFeed = items;
    const feed = document.getElementById('feed');
    feed.innerHTML = items.slice(0, BATCH_SIZE).map((item, i) => createCard(item, i)).join('');
    document.getElementById('counter').textContent = `${BATCH_SIZE} / ${DATA.length}`;
    updateSavedCount();
    feed.scrollTop = 0;
}

function showFeed() {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.nav-btn')[0].classList.add('active');
}

function shuffleFeed() {
    renderFeed(shuffle(DATA));
}

function toggleSave(index) {
    const item = currentFeed[index];
    const existingIndex = savedItems.findIndex(s => s.title === item.title);
    if (existingIndex >= 0) {
        savedItems.splice(existingIndex, 1);
    } else {
        savedItems.push({
            title: item.title, domain: item.domain,
            subtitle: item.subtitle, savedAt: new Date().toISOString()
        });
    }
    localStorage.setItem('serendipity-saved', JSON.stringify(savedItems));
    renderFeed(currentFeed);
}

function searchItem(index) {
    const item = currentFeed[index];
    const query = item.keywords[0] + ' ' + item.title;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
}

function toggleSaved() {
    const panel = document.getElementById('savedPanel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) renderSavedList();
}

function updateSavedCount() {
    const el = document.getElementById('savedCount');
    el.textContent = savedItems.length > 0 ? `(${savedItems.length})` : '';
}

function renderSavedList() {
    const list = document.getElementById('savedList');
    if (savedItems.length === 0) {
        list.innerHTML = '<div class="empty-state">还没有收藏<br>在探索页中点击收藏按钮</div>';
        return;
    }
    list.innerHTML = savedItems.map(item => `
        <div class="saved-item">
            <div class="saved-item-title">${item.title}</div>
            <div class="saved-item-domain">${item.domain} · ${new Date(item.savedAt).toLocaleDateString('zh-CN')}</div>
        </div>
    `).join('');
}

// Init
renderFeed(shuffle(DATA));
