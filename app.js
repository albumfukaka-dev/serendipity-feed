// ==================== Version Check ====================
// Clear saved & seen when data version changes (new season)
const storedVersion = localStorage.getItem('serendipity-version');
if (typeof DATA_VERSION !== 'undefined' && storedVersion !== DATA_VERSION) {
    localStorage.removeItem('serendipity-saved');
    localStorage.removeItem('serendipity-seen');
    localStorage.setItem('serendipity-version', DATA_VERSION);
}

// ==================== State ====================
let savedItems = JSON.parse(localStorage.getItem('serendipity-saved') || '[]');
let seenItems = JSON.parse(localStorage.getItem('serendipity-seen') || '[]');
let currentFeed = [];
const BATCH_SIZE = 12;

// ==================== Helpers ====================
function shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function markSeen(title) {
    if (!seenItems.includes(title)) {
        seenItems.push(title);
        localStorage.setItem('serendipity-seen', JSON.stringify(seenItems));
        updateProgress();
    }
}

function isSeen(title) {
    return seenItems.includes(title);
}

// ==================== Progress & Counter ====================
let currentCardIndex = 0;

function updateProgress() {
    const total = DATA.length;
    const seen = seenItems.filter(t => DATA.some(d => d.title === t)).length;
    const unseen = total - seen;
    const badge = document.getElementById('progressBadge');
    if (seen > 0) {
        const pct = Math.round((seen / total) * 100);
        badge.textContent = `已探索 ${pct}%`;
        badge.classList.add('visible');
    } else {
        badge.classList.remove('visible');
    }
    updateCounter();
}

function updateCounter() {
    const total = DATA.length;
    const seen = seenItems.filter(t => DATA.some(d => d.title === t)).length;
    const unseen = total - seen;
    const batchCount = Math.min(BATCH_SIZE, currentFeed.length);
    const counterEl = document.getElementById('counter');
    counterEl.textContent = `${currentCardIndex + 1}/${batchCount} · 剩余${unseen}条`;
}

// ==================== Card Rendering ====================
function createCard(item, index) {
    const isSaved = savedItems.some(s => s.title === item.title);
    const seen = isSeen(item.title);
    const hasDeepDive = item.deepDive && item.deepDive.length > 0;

    return `
        <article class="card ${seen ? 'seen' : ''}" data-domain="${item.domain}" data-index="${index}" data-title="${item.title.replace(/"/g, '&quot;')}">
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
                ${hasDeepDive ? `
                <button class="action-btn deepdive-btn" onclick="openDeepDive(${index})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L12 22M12 22L5 15M12 22L19 15"/>
                    </svg>
                    深潜
                </button>` : ''}
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
    currentCardIndex = 0;
    const feed = document.getElementById('feed');
    const batch = items.slice(0, BATCH_SIZE);
    feed.innerHTML = batch.map((item, i) => createCard(item, i)).join('');
    updateSavedCount();
    updateProgress();
    feed.scrollTop = 0;

    // Set up intersection observer for auto-marking seen + position tracking
    setupSeenObserver();
    setupScrollTracker();
}

// ==================== Seen Observer ====================
let seenObserver = null;
let scrollTracker = null;

function setupSeenObserver() {
    // Disconnect previous observer if exists
    if (seenObserver) seenObserver.disconnect();
    
    seenObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                const title = entry.target.dataset.title;
                if (title) {
                    markSeen(title);
                    entry.target.classList.add('seen');
                }
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.card').forEach(card => seenObserver.observe(card));
}

function setupScrollTracker() {
    // Disconnect previous tracker if exists
    if (scrollTracker) scrollTracker.disconnect();
    
    scrollTracker = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                const idx = parseInt(entry.target.dataset.index, 10);
                if (!isNaN(idx) && idx !== currentCardIndex) {
                    currentCardIndex = idx;
                    updateCounter();
                }
            }
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.card').forEach(card => scrollTracker.observe(card));
}

// ==================== Navigation ====================
function showFeed() {
    // Close saved panel if open
    const savedPanel = document.getElementById('savedPanel');
    if (savedPanel.classList.contains('open')) savedPanel.classList.remove('open');
    // Close deep dive if open
    closeDeepDive();
    // Scroll feed to top
    document.getElementById('feed').scrollTo({ top: 0, behavior: 'smooth' });
    // Update nav state
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('navExplore').classList.add('active');
}

function shuffleFeed() {
    // Prioritize unseen items
    const unseen = DATA.filter(d => !isSeen(d.title));
    const seen = DATA.filter(d => isSeen(d.title));

    let pool;
    if (unseen.length >= BATCH_SIZE) {
        pool = shuffle(unseen);
    } else {
        // Mix unseen first, then fill with seen
        pool = [...shuffle(unseen), ...shuffle(seen)];
    }
    renderFeed(pool);
    showToast(`已刷新 · 还有 ${unseen.length} 条未读`);
}

// ==================== Save / Unsave ====================
function toggleSave(index) {
    const item = currentFeed[index];
    const existingIndex = savedItems.findIndex(s => s.title === item.title);
    if (existingIndex >= 0) {
        savedItems.splice(existingIndex, 1);
        showToast('已取消收藏');
    } else {
        savedItems.push({
            title: item.title,
            domain: item.domain,
            subtitle: item.subtitle,
            hook: item.hook,
            connection: item.connection,
            keywords: item.keywords,
            savedAt: new Date().toISOString()
        });
        showToast('已收藏 ✓');
    }
    localStorage.setItem('serendipity-saved', JSON.stringify(savedItems));
    renderFeed(currentFeed);
}

// ==================== Search ====================
function searchItem(index) {
    const item = currentFeed[index];
    const query = item.keywords[0] + ' ' + item.title;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
}

// ==================== Saved Panel ====================
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
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">📚</span>
                还没有收藏<br>在探索页中点击收藏按钮
            </div>`;
        return;
    }
    list.innerHTML = savedItems.map((item, i) => `
        <div class="saved-item" onclick="navigateToSavedItem(${i})">
            <div class="saved-item-title">${item.title}</div>
            <div class="saved-item-domain">${item.domain} · ${new Date(item.savedAt).toLocaleDateString('zh-CN')}</div>
            ${item.subtitle ? `<div class="saved-item-subtitle">${item.subtitle}</div>` : ''}
            <button class="saved-item-remove" onclick="event.stopPropagation(); removeSaved(${i})" title="移除">✕</button>
        </div>
    `).join('');
}

function removeSaved(index) {
    savedItems.splice(index, 1);
    localStorage.setItem('serendipity-saved', JSON.stringify(savedItems));
    updateSavedCount();
    renderSavedList();
    showToast('已移除');
}

function navigateToSavedItem(index) {
    const savedItem = savedItems[index];
    // Find this item in DATA
    const dataItem = DATA.find(d => d.title === savedItem.title);
    if (!dataItem) {
        showToast('该条目不在当前库中');
        return;
    }
    // Put this item at position 0 of a new feed, fill the rest with random others
    const others = shuffle(DATA.filter(d => d.title !== savedItem.title)).slice(0, BATCH_SIZE - 1);
    const newFeed = [dataItem, ...others];
    // Close saved panel
    toggleSaved();
    // Render and scroll to top (where target item is)
    renderFeed(newFeed);
    showToast(`已定位到「${savedItem.title}」`);
}

// ==================== Export to Markdown ====================
function exportToMarkdown() {
    if (savedItems.length === 0) {
        showToast('没有可导出的收藏');
        return;
    }

    const date = new Date().toLocaleDateString('zh-CN');
    let md = `# 意外之喜 · 收藏导出\n`;
    md += `> 导出时间：${date}\n\n`;
    md += `---\n\n`;

    savedItems.forEach((item, i) => {
        md += `## ${i + 1}. ${item.title}\n\n`;
        md += `- **领域**：${item.domain}\n`;
        if (item.subtitle) md += `- **出处**：${item.subtitle}\n`;
        md += `- **收藏时间**：${new Date(item.savedAt).toLocaleDateString('zh-CN')}\n\n`;
        if (item.hook) md += `${item.hook}\n\n`;
        if (item.connection) md += `> **跟我的连接**：${item.connection}\n\n`;
        if (item.keywords && item.keywords.length > 0) {
            md += `**关键词**：${item.keywords.join(' · ')}\n\n`;
        }
        md += `---\n\n`;
    });

    // Create and trigger download
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `意外之喜_收藏_${date.replace(/\//g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`已导出 ${savedItems.length} 条收藏`);
}

// ==================== Deep Dive ====================
function openDeepDive(index) {
    const item = currentFeed[index];
    if (!item.deepDive) return;

    const panel = document.getElementById('deepdivePanel');
    const body = document.getElementById('deepdiveBody');

    let html = `
        <span class="deepdive-domain">${item.domain}</span>
        <h2 class="deepdive-title">${item.title}</h2>
        <p class="deepdive-subtitle">${item.subtitle}</p>
    `;

    item.deepDive.forEach(section => {
        if (section.type === 'section') {
            html += `
                <div class="deepdive-section">
                    <h3 class="deepdive-section-title">${section.title}</h3>
                    <p class="deepdive-text">${section.content}</p>
                </div>
            `;
        } else if (section.type === 'quote') {
            html += `<blockquote class="deepdive-quote">${section.content}</blockquote>`;
        }
    });

    if (item.readingList && item.readingList.length > 0) {
        html += `
            <div class="deepdive-reading">
                <div class="deepdive-reading-title">延伸阅读</div>
                <ul class="deepdive-reading-list">
                    ${item.readingList.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    body.innerHTML = html;
    panel.classList.add('open');

    // Close on backdrop click
    panel.onclick = (e) => {
        if (e.target === panel) closeDeepDive();
    };
}

function closeDeepDive() {
    document.getElementById('deepdivePanel').classList.remove('open');
}

// Close deep dive on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDeepDive();
        const savedPanel = document.getElementById('savedPanel');
        if (savedPanel.classList.contains('open')) toggleSaved();
    }
});

// ==================== Init ====================
renderFeed(shuffle(DATA));
