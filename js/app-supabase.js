// Vocabulary Learning Dashboard Logic - Supabase Version

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function toast(msg, type) {
  const existing = document.querySelector('.toast-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.className = 'toast-container';
  container.innerHTML = `<div class="toast toast--${type || 'info'}"><span>${msg}</span></div>`;
  document.body.appendChild(container);
  requestAnimationFrame(() => container.querySelector('.toast').classList.add('toast--show'));

  setTimeout(() => {
    const t = container.querySelector('.toast');
    if (t) t.classList.remove('toast--show');
    setTimeout(() => container.remove(), 250);
  }, 2500);
}

const state = {
  words: [],
  filteredWords: [],
  bookmarks: new Set(),
  mastered: new Set(),
  filters: {
    search: '',
    category: '',
    subcategory: '',
    difficulty: '',
    letter: '',
    showOnly: 'all'
  },
  sorting: 'alpha-asc',
  _firstRender: true,
  visibleCount: 60,
  flashcards: {
    queue: [],
    currentIndex: 0,
    isFlipped: false
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  loadUserData();
  initTheme();
  showLoading(true);
  state.words = await loadWords();
  showLoading(false);
  initCategoryTabs();
  initFilters();
  initStats();
  initAlphabetScroller();
  initEventListeners();
  applyFiltersAndRender();
});

function loadUserData() {
  try {
    const savedBookmarks = localStorage.getItem('vocab_bookmarks');
    if (savedBookmarks) {
      JSON.parse(savedBookmarks).forEach(w => state.bookmarks.add(w.toLowerCase()));
    }
    const savedMastered = localStorage.getItem('vocab_mastered');
    if (savedMastered) {
      JSON.parse(savedMastered).forEach(w => state.mastered.add(w.toLowerCase()));
    }
  } catch (e) {
    console.error("Error loading user progress data:", e);
  }
}

function saveUserData() {
  try {
    localStorage.setItem('vocab_bookmarks', JSON.stringify(Array.from(state.bookmarks)));
    localStorage.setItem('vocab_mastered', JSON.stringify(Array.from(state.mastered)));
  } catch (e) {
    console.error("Error saving user progress data:", e);
    toast('Failed to save progress', 'error');
  }
}

function initTheme() {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('vocab_theme');
  const activeTheme = savedTheme || (systemDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', activeTheme);
  updateThemeIcon(activeTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('vocab_theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
}

function initStats() {
  const stats = {
    total: state.words.length,
    vocabulary: state.words.filter(w => w.category === 'Vocabulary').length,
    synonyms: state.words.filter(w => w.category === 'Synonyms').length,
    idioms: state.words.filter(w => w.category === 'Idioms & Phrases').length,
    topics: state.words.filter(w => w.category === 'Topic-Based Vocabulary').length,
    bookmarks: state.bookmarks.size,
    mastered: state.mastered.size
  };

  document.getElementById('count-all').textContent = stats.total;
  document.getElementById('count-vocab').textContent = stats.vocabulary;
  document.getElementById('count-synonyms').textContent = stats.synonyms;
  document.getElementById('count-idioms').textContent = stats.idioms;
  document.getElementById('count-topics').textContent = stats.topics;
  document.getElementById('count-bookmarks').textContent = stats.bookmarks;

  updateProgressBar();
}

function updateProgressBar() {
  const total = state.words.length;
  const mastered = state.mastered.size;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const fill = document.getElementById('progress-chip-fill');
  if (fill) fill.style.width = `${pct}%`;

  const text = document.getElementById('progress-chip-text');
  if (text) text.textContent = `${pct}% mastered`;
}

function initAlphabetScroller() {
  const container = document.getElementById('alphabet-scroller');
  if (!container) return;

  let html = `<div class="alpha-letter active" data-letter="">ALL</div>`;
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    html += `<div class="alpha-letter" data-letter="${letter}">${letter}</div>`;
  }
  container.innerHTML = html;

  container.querySelectorAll('.alpha-letter').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.alpha-letter').forEach(l => l.classList.remove('active'));
      el.classList.add('active');
      state.filters.letter = el.dataset.letter;
      applyFiltersAndRender();
    });
  });
}

function initCategoryTabs() {
  const tabs = document.querySelectorAll('.cat-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      state.filters.category = tab.dataset.category || '';
      state.filters.subcategory = tab.dataset.subcategory || '';
      state.filters.showOnly = tab.dataset.show || 'all';

      populateSubcategoryDropdown(state.filters.category);
      resetLetterFilter();
      applyFiltersAndRender();
    });
  });
}

function updateMenuCounts() {
  document.getElementById('count-all').textContent = state.words.length;
  document.getElementById('count-vocab').textContent = state.words.filter(w => w.category === 'Vocabulary').length;
  document.getElementById('count-synonyms').textContent = state.words.filter(w => w.category === 'Synonyms').length;
  document.getElementById('count-idioms').textContent = state.words.filter(w => w.category === 'Idioms & Phrases').length;
  document.getElementById('count-topics').textContent = state.words.filter(w => w.category === 'Topic-Based Vocabulary').length;
  document.getElementById('count-bookmarks').textContent = state.bookmarks.size;
}

function getSubcategoriesForCategory(category) {
  if (category === 'Vocabulary') {
    return ['Academic Vocabulary', 'Advanced Vocabulary', 'Essential IELTS Vocabulary'];
  } else if (category === 'Synonyms') {
    return ['Common IELTS Synonyms', 'Writing Task 2 Synonyms'];
  } else if (category === 'Idioms & Phrases') {
    return ['Common IELTS Idioms', 'Essential Idioms', 'IELTS Speaking Idioms', 'Phrasal Verbs', 'Speaking Idioms', 'Useful Expressions'];
  } else if (category === 'Topic-Based Vocabulary') {
    return ['Education', 'Environment', 'Technology', 'Health', 'Business', 'Government', 'Society', 'Science', 'Media', 'Culture', 'Crime', 'Transportation'];
  } else {
    return [
      'Academic Vocabulary', 'Advanced Vocabulary', 'Essential IELTS Vocabulary',
      'Common IELTS Synonyms', 'Writing Task 2 Synonyms',
      'Common IELTS Idioms', 'Essential Idioms', 'IELTS Speaking Idioms', 'Phrasal Verbs', 'Speaking Idioms', 'Useful Expressions',
      'Education', 'Environment', 'Technology', 'Health', 'Business', 'Government', 'Society', 'Science', 'Media', 'Culture', 'Crime', 'Transportation'
    ];
  }
}

function populateDropdown(selectId, items, emptyLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = `<option value="">${emptyLabel}</option>`;
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

function populateSubcategoryDropdown(category) {
  populateDropdown('filter-subcategory', getSubcategoriesForCategory(category), 'All Topics');
  const select = document.getElementById('filter-subcategory');
  if (select) select.value = state.filters.subcategory;
}

function initFilters() {
  populateSubcategoryDropdown('');
}

function resetLetterFilter() {
  state.filters.letter = '';
  const container = document.getElementById('alphabet-scroller');
  if (container) {
    container.querySelectorAll('.alpha-letter').forEach(l => {
      l.classList.remove('active');
      if (l.dataset.letter === '') l.classList.add('active');
    });
  }
}

function initEventListeners() {
  const searchInput = document.getElementById('search-vocab');
  const debouncedRender = debounce(() => applyFiltersAndRender(), 200);
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      debouncedRender();
    });
  }

  const diffSelect = document.getElementById('filter-difficulty');
  if (diffSelect) {
    diffSelect.addEventListener('change', (e) => {
      state.filters.difficulty = e.target.value;
      applyFiltersAndRender();
    });
  }

  const subcatSelect = document.getElementById('filter-subcategory');
  if (subcatSelect) {
    subcatSelect.addEventListener('change', (e) => {
      state.filters.subcategory = e.target.value;
      applyFiltersAndRender();
    });
  }

  const sortSelect = document.getElementById('sort-vocab');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sorting = e.target.value;
      applyFiltersAndRender();
    });
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  const practiceBtn = document.getElementById('btn-practice');
  if (practiceBtn) {
    practiceBtn.addEventListener('click', startPracticeMode);
  }

  const addWordBtn = document.getElementById('btn-add-word');
  if (addWordBtn) {
    addWordBtn.addEventListener('click', openAddWordPanel);
  }

  const addWordForm = document.getElementById('add-word-form');
  if (addWordForm) {
    addWordForm.addEventListener('submit', handleAddWord);
  }

  const panelClose = document.getElementById('panel-close');
  if (panelClose) {
    panelClose.addEventListener('click', closeAddWordPanel);
  }

  const inputCat = document.getElementById('input-category');
  if (inputCat) {
    inputCat.addEventListener('change', () => {
      populateDropdown('input-subcategory', getSubcategoriesForCategory(inputCat.value), 'None');
    });
  }

  const practiceClose = document.getElementById('practice-close');
  if (practiceClose) {
    practiceClose.addEventListener('click', closePracticeMode);
  }

  const panelOverlay = document.getElementById('add-word-panel');
  if (panelOverlay) {
    panelOverlay.addEventListener('click', (e) => {
      if (e.target === panelOverlay) closeAddWordPanel();
    });
  }
}

function applyFiltersAndRender() {
  state.visibleCount = 60;

  const { search, category, subcategory, difficulty, letter, showOnly } = state.filters;
  const query = search.toLowerCase().trim();

  state.filteredWords = state.words.filter(w => {
    const wordLower = w.word.toLowerCase();

    const matchQuery = !query ||
      wordLower.includes(query) ||
      w.meaning.toLowerCase().includes(query) ||
      (w.example && w.example.toLowerCase().includes(query)) ||
      (w.ielts_example && w.ielts_example.toLowerCase().includes(query)) ||
      (w.synonyms && w.synonyms.some(s => s.toLowerCase().includes(query)));

    const matchCategory = !category || w.category === category;
    const matchSubcategory = !subcategory || w.subcategory === subcategory;
    const matchDiff = !difficulty || w.difficulty === difficulty;
    const matchLetter = !letter || wordLower.startsWith(letter.toLowerCase());

    let matchState = true;
    if (showOnly === 'bookmarks') {
      matchState = state.bookmarks.has(wordLower);
    } else if (showOnly === 'mastered') {
      matchState = state.mastered.has(wordLower);
    } else if (showOnly === 'unmastered') {
      matchState = !state.mastered.has(wordLower);
    }

    return matchQuery && matchCategory && matchSubcategory && matchDiff && matchLetter && matchState;
  });

  sortFilteredData();
  renderCards();
  updateResultHeader();
}

function sortFilteredData() {
  const method = state.sorting;
  state.filteredWords.sort((a, b) => {
    const wordA = a.word.toLowerCase();
    const wordB = b.word.toLowerCase();

    if (method === 'alpha-asc') return wordA.localeCompare(wordB);
    if (method === 'alpha-desc') return wordB.localeCompare(wordA);

    const diffWeight = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3 };
    if (method === 'difficulty-asc') {
      const d = diffWeight[a.difficulty] - diffWeight[b.difficulty];
      return d === 0 ? wordA.localeCompare(wordB) : d;
    }
    if (method === 'difficulty-desc') {
      const d = diffWeight[b.difficulty] - diffWeight[a.difficulty];
      return d === 0 ? wordA.localeCompare(wordB) : d;
    }
    return 0;
  });
}

function updateResultHeader() {
  const total = state.filteredWords.length;
  document.getElementById('stat-showing-count').textContent = `Showing ${total} of ${state.words.length}`;

  const practiceBtn = document.getElementById('btn-practice');
  if (practiceBtn) {
    practiceBtn.disabled = total === 0;
    practiceBtn.style.opacity = total === 0 ? '0.4' : '1';
  }
}

function showLoading(loading) {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;
  if (loading) {
    grid.innerHTML = '<div class="loading-grid">'
      + '<div class="shimmer-card"></div><div class="shimmer-card"></div><div class="shimmer-card"></div>'
      + '</div>';
  } else {
    grid.innerHTML = '';
  }
}

function renderCards() {
  const container = document.getElementById('cards-grid');
  if (!container) return;

  if (state.filteredWords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>No results found</h3>
        <p>Try adjusting your filters or search terms.</p>
      </div>
    `;
    return;
  }

  const visibleWords = state.filteredWords.slice(0, state.visibleCount);

  let cardsHTML = visibleWords.map((wordObj) => {
    const wordLower = wordObj.word.toLowerCase();
    const isBookmarked = state.bookmarks.has(wordLower) ? 'bookmarked' : '';
    const isMastered = state.mastered.has(wordLower) ? 'mastered' : '';
    const diffClass = wordObj.difficulty.toLowerCase();

    const synHTML = wordObj.synonyms && wordObj.synonyms.length > 0
      ? `
        <div class="detail-block">
          <span class="detail-block-label">Synonyms</span>
          <div class="syn-tags">
            ${wordObj.synonyms.map(s => `<span class="syn-tag" onclick="searchSynonym(event, '${s}')">${s}</span>`).join('')}
          </div>
        </div>
      ` : '';

    const exHTML = wordObj.example
      ? `
        <div class="detail-block">
          <span class="detail-block-label">Example</span>
          <p class="example-text">"${wordObj.example}"</p>
        </div>
      ` : '';

    const ieltsHTML = wordObj.ielts_example
      ? `
        <div class="detail-block">
          <span class="detail-block-label">IELTS Context</span>
          <div class="ielts-block">
            <p class="ielts-text">"${wordObj.ielts_example}"</p>
          </div>
        </div>
      ` : '';

    return `
      <div class="vocab-card" onclick="toggleCardOpen(this)" data-word="${wordObj.word}">
        <div class="card-head">
          <div class="card-word-row">
            <span class="diff-dot ${diffClass}"></span>
            <span class="card-word">${wordObj.word}</span>
            <button class="audio-trigger" onclick="playAudio(event, '${wordObj.word}')" title="Listen">🔊</button>
          </div>
          <span class="card-sub">${wordObj.subcategory}</span>
        </div>
        <p class="card-meaning">${wordObj.meaning}</p>
        <div class="card-details">
          ${synHTML}
          ${exHTML}
          ${ieltsHTML}
        </div>
        <div class="card-actions">
          <button class="card-action-btn ${isBookmarked}" onclick="toggleBookmark(event, '${wordObj.word}')" title="Bookmark">★</button>
          <button class="card-action-btn ${isMastered}" onclick="toggleMastery(event, '${wordObj.word}')" title="Mark mastered">✓</button>
        </div>
      </div>
    `;
  }).join('');

  if (state.filteredWords.length > state.visibleCount) {
    cardsHTML += `
      <div class="load-more-wrap">
        <button id="btn-load-more" class="btn-primary" onclick="loadMoreCards(event)">Load more (+${state.visibleCount} items)</button>
      </div>
    `;
  }

  if (state._firstRender) {
    container.classList.add('animate');
    state._firstRender = false;
  }
  container.innerHTML = cardsHTML;
}

function loadMoreCards(event) {
  if (event) event.stopPropagation();
  state.visibleCount += 60;
  const grid = document.getElementById('cards-grid');
  grid.classList.add('animate');
  renderCards();
  requestAnimationFrame(() => setTimeout(() => grid.classList.remove('animate'), 800));
}

function searchSynonym(event, synonym) {
  event.stopPropagation();
  const searchInput = document.getElementById('search-vocab');
  if (searchInput) {
    searchInput.value = synonym;
    state.filters.search = synonym;
    state.filters.category = '';
    state.filters.subcategory = '';
    state.filters.difficulty = '';
    resetLetterFilter();

    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    const allTab = document.querySelector('.cat-tab[data-category=""]');
    if (allTab) allTab.classList.add('active');
    populateSubcategoryDropdown('');

    applyFiltersAndRender();
  }
}

function toggleCardOpen(cardElement) {
  const existing = document.querySelector('.card-modal-overlay');
  if (existing) existing.remove();

  const word = cardElement.dataset.word;
  const wordObj = state.filteredWords.find(w => w.word.toLowerCase() === word.toLowerCase());
  if (!wordObj) return;

  const wordLower = wordObj.word.toLowerCase();
  const isBookmarked = state.bookmarks.has(wordLower) ? 'bookmarked' : '';
  const isMastered = state.mastered.has(wordLower) ? 'mastered' : '';
  const diffClass = wordObj.difficulty.toLowerCase();

  const synHTML = wordObj.synonyms && wordObj.synonyms.length > 0
    ? `<div class="detail-block">
      <span class="detail-block-label">Synonyms</span>
      <div class="syn-tags">
        ${wordObj.synonyms.map(s => `<span class="syn-tag" onclick="searchSynonym(event, '${s}')">${s}</span>`).join('')}
      </div>
    </div>` : '';

  const exHTML = wordObj.example
    ? `<div class="detail-block">
      <span class="detail-block-label">Example</span>
      <p class="example-text">"${wordObj.example}"</p>
    </div>` : '';

  const ieltsHTML = wordObj.ielts_example
    ? `<div class="detail-block" style="margin-bottom:0">
      <span class="detail-block-label">IELTS Context</span>
      <div class="ielts-block">
        <p class="ielts-text">"${wordObj.ielts_example}"</p>
      </div>
    </div>` : '';

  const modal = document.createElement('div');
  modal.className = 'card-modal-overlay';
  modal.innerHTML = `
    <div class="card-modal">
      <button class="modal-close-btn" onclick="closeCardModal(event)">✕</button>
      <div class="card-head" style="padding:0">
        <div class="card-word-row">
          <span class="diff-dot ${diffClass}"></span>
          <span class="card-word">${wordObj.word}</span>
          <button class="audio-trigger" onclick="playAudio(event, '${wordObj.word}')" title="Listen">🔊</button>
        </div>
        <span class="card-sub">${wordObj.subcategory}</span>
      </div>
      <p class="card-meaning" style="-webkit-line-clamp:unset;font-size:15px">${wordObj.meaning}</p>
      ${synHTML}
      ${exHTML}
      ${ieltsHTML}
      <div class="card-actions" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
        <button class="card-action-btn ${isBookmarked}" onclick="toggleBookmark(event, '${wordObj.word}');closeCardModal(event)" title="Bookmark">★</button>
        <button class="card-action-btn ${isMastered}" onclick="toggleMastery(event, '${wordObj.word}');closeCardModal(event)" title="Mark mastered">✓</button>
      </div>
    </div>`;

  modal.addEventListener('click', function (e) {
    if (e.target === this) closeCardModal(e);
  });

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => modal.classList.add('visible'));
}

function closeCardModal(event) {
  if (event) event.stopPropagation();
  const modal = document.querySelector('.card-modal-overlay');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.addEventListener('transitionend', () => {
    if (document.body.contains(modal)) { modal.remove(); document.body.style.overflow = ''; }
  }, { once: true });
  setTimeout(() => {
    if (document.body.contains(modal)) { modal.remove(); document.body.style.overflow = ''; }
  }, 250);
}

function playAudio(event, word) {
  if (event) event.stopPropagation();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const usVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
      voices.find(v => v.lang.startsWith('en-US')) ||
      voices.find(v => v.lang.startsWith('en'));
    if (usVoice) utterance.voice = usVoice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

function toggleBookmark(event, word) {
  event.stopPropagation();
  const wordLower = word.toLowerCase();
  const wasBookmarked = state.bookmarks.has(wordLower);

  if (wasBookmarked) {
    state.bookmarks.delete(wordLower);
  } else {
    state.bookmarks.add(wordLower);
  }

  saveUserData();
  document.getElementById('count-bookmarks').textContent = state.bookmarks.size;

  if (state.filters.showOnly === 'bookmarks' && wasBookmarked) {
    applyFiltersAndRender();
    return;
  }

  event.currentTarget.classList.toggle('bookmarked');
  const gridCard = document.querySelector(`.vocab-card[data-word="${word}"]`);
  if (gridCard) {
    const btn = gridCard.querySelector('.card-action-btn');
    if (btn && btn !== event.currentTarget) btn.classList.toggle('bookmarked');
  }
}

function toggleMastery(event, word) {
  event.stopPropagation();
  const wordLower = word.toLowerCase();
  const wasMastered = state.mastered.has(wordLower);

  if (wasMastered) {
    state.mastered.delete(wordLower);
  } else {
    state.mastered.add(wordLower);
  }

  saveUserData();

  const pct = state.words.length > 0 ? Math.round((state.mastered.size / state.words.length) * 100) : 0;
  const fill = document.getElementById('progress-chip-fill');
  if (fill) fill.style.width = `${pct}%`;
  const text = document.getElementById('progress-chip-text');
  if (text) text.textContent = `${pct}% mastered`;

  if ((state.filters.showOnly === 'mastered' && wasMastered) ||
      (state.filters.showOnly === 'unmastered' && !wasMastered)) {
    applyFiltersAndRender();
    return;
  }

  event.currentTarget.classList.toggle('mastered');
  const gridCard = document.querySelector(`.vocab-card[data-word="${word}"]`);
  if (gridCard) {
    const btn = gridCard.querySelector('.card-action-btn');
    if (btn && btn !== event.currentTarget) btn.classList.toggle('mastered');
  }
}

function startPracticeMode() {
  if (state.filteredWords.length === 0) return;

  state.flashcards.queue = [...state.filteredWords];
  state.flashcards.queue.sort(() => Math.random() - 0.5);
  state.flashcards.currentIndex = 0;
  state.flashcards.isFlipped = false;

  renderFlashcard();
  const overlay = document.getElementById('practice-overlay');
  if (overlay) overlay.classList.add('active');
}

function closePracticeMode() {
  const overlay = document.getElementById('practice-overlay');
  if (overlay) overlay.classList.remove('active');
}

function flipFlashcard() {
  state.flashcards.isFlipped = !state.flashcards.isFlipped;
  const card = document.getElementById('practice-card');
  if (card) card.classList.toggle('flipped', state.flashcards.isFlipped);
}

function renderFlashcard() {
  const { queue, currentIndex } = state.flashcards;
  if (currentIndex >= queue.length) {
    const front = document.getElementById('flashcard-front-content');
    const back = document.getElementById('flashcard-back-content');
    front.innerHTML = `
      <div class="flashcard-word" style="font-size:28px">🎉 Done!</div>
      <p class="flashcard-hint">${queue.length} ${queue.length === 1 ? 'word' : 'words'} reviewed</p>
    `;
    back.innerHTML = `<p class="flashcard-def">Great work! Keep practicing.</p>`;
    document.getElementById('btn-practice-master').style.display = 'none';
    document.getElementById('btn-practice-next').textContent = 'Restart';
    return;
  }

  const wordObj = queue[currentIndex];
  const front = document.getElementById('flashcard-front-content');
  const back = document.getElementById('flashcard-back-content');
  const indexDisplay = document.getElementById('flashcard-index-display');

  state.flashcards.isFlipped = false;
  const card = document.getElementById('practice-card');
  if (card) card.classList.remove('flipped');

  front.innerHTML = `
    <div class="flashcard-word">${wordObj.word}</div>
    <span class="flashcard-hint">Tap to reveal</span>
    <button class="audio-trigger" onclick="playAudio(event, '${wordObj.word}')">🔊</button>
  `;

  const synHTML = wordObj.synonyms && wordObj.synonyms.length > 0
    ? `<div class="flashcard-syn"><strong>Alternatives:</strong> ${wordObj.synonyms.join(', ')}</div>`
    : '';
  const exHTML = wordObj.example || wordObj.ielts_example
    ? `<p class="flashcard-ex">"${wordObj.example || wordObj.ielts_example}"</p>`
    : '';

  back.innerHTML = `
    <p class="flashcard-def">${wordObj.meaning}</p>
    ${synHTML}
    ${exHTML}
  `;

  indexDisplay.textContent = `${currentIndex + 1} / ${queue.length}`;
  document.getElementById('btn-practice-master').style.display = 'flex';
  document.getElementById('btn-practice-next').textContent = 'Next →';

  const pct = ((currentIndex + 1) / queue.length) * 100;
  const fill = document.getElementById('practice-progress-fill');
  if (fill) fill.style.width = `${pct}%`;
}

function handlePracticeMaster() {
  const { queue, currentIndex } = state.flashcards;
  if (currentIndex < queue.length) {
    const wordObj = queue[currentIndex];
    state.mastered.add(wordObj.word.toLowerCase());
    saveUserData();
    initStats();
    applyFiltersAndRender();
    state.flashcards.currentIndex++;
    renderFlashcard();
  }
}

function handlePracticeNext() {
  const { queue, currentIndex } = state.flashcards;
  if (currentIndex >= queue.length) {
    startPracticeMode();
  } else {
    state.flashcards.currentIndex++;
    renderFlashcard();
  }
}

function openAddWordPanel() {
  const panel = document.getElementById('add-word-panel');
  if (panel) {
    panel.classList.add('active');
    populateDropdown('input-subcategory', getSubcategoriesForCategory(document.getElementById('input-category').value), 'None');
    document.getElementById('input-word').focus();
  }
}

function closeAddWordPanel() {
  const panel = document.getElementById('add-word-panel');
  if (!panel || panel.classList.contains('closing')) return;
  panel.classList.add('closing');
  setTimeout(() => {
    panel.classList.remove('active', 'closing');
    const form = document.getElementById('add-word-form');
    form.reset();
    form.classList.remove('was-validated');
  }, 260);
}

async function handleAddWord(event) {
  event.preventDefault();
  event.target.classList.add('was-validated');

  const word = document.getElementById('input-word').value.trim();
  const meaning = document.getElementById('input-meaning').value.trim();
  const synonymsInput = document.getElementById('input-synonyms').value.trim();
  const example = document.getElementById('input-example').value.trim();
  const ieltsExample = document.getElementById('input-ielts-example').value.trim();
  const category = document.getElementById('input-category').value;
  const subcategory = document.getElementById('input-subcategory').value.trim();
  const difficulty = document.getElementById('input-difficulty').value;

  const synonyms = synonymsInput
    ? synonymsInput.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];

  const newWord = {
    word,
    meaning,
    synonyms,
    example: example || null,
    ielts_example: ieltsExample || null,
    category,
    subcategory: subcategory || null,
    difficulty,
    approved: true
  };

  try {
    const { data, error } = await db
      .from('vocabulary')
      .insert([newWord])
      .select();

    if (error) {
      console.error('Error adding word:', error);
      toast('Failed to add word. Please try again.', 'error');
      return;
    }

    if (data && data.length > 0) {
      state.words.push(data[0]);
      closeAddWordPanel();
      initStats();
      updateMenuCounts();
      applyFiltersAndRender();
      toast(`Successfully added "${word}"!`, 'success');
    }
  } catch (err) {
    console.error('Error adding word:', err);
    toast('An error occurred. Please try again.', 'error');
  }
}
