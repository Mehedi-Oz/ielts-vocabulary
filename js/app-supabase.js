// Vocabulary Learning Dashboard Logic - Supabase Version

// State Management
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
  viewMode: 'grid',
  visibleCount: 60,
  flashcards: {
    queue: [],
    currentIndex: 0,
    isFlipped: false
  }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  loadUserData();
  initTheme();
  
  // Load words from Supabase
  state.words = await loadWords();
  
  initSidebar();
  initFilters();
  initStats();
  initAlphabetScroller();
  initEventListeners();
  applyFiltersAndRender();
});

// Load Bookmarks and Mastered words from localStorage
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

// Save Bookmarks and Mastered words to localStorage
function saveUserData() {
  try {
    localStorage.setItem('vocab_bookmarks', JSON.stringify(Array.from(state.bookmarks)));
    localStorage.setItem('vocab_mastered', JSON.stringify(Array.from(state.mastered)));
  } catch (e) {
    console.error("Error saving user progress data:", e);
  }
}

// Light / Dark Theme Support
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
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  }
}

// Calculate and Render Dashboard Statistics
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

  document.getElementById('stat-total-words').textContent = stats.total;
  document.getElementById('stat-synonyms').textContent = stats.synonyms;
  document.getElementById('stat-idioms').textContent = stats.idioms;
  document.getElementById('stat-categories').textContent = stats.topics;
  
  updateProgressBar();
}

function updateProgressBar() {
  const total = state.words.length;
  const mastered = state.mastered.size;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  
  const fill = document.getElementById('sidebar-progress-fill');
  if (fill) fill.style.width = `${pct}%`;
  
  const pctText = document.getElementById('sidebar-progress-pct');
  if (pctText) pctText.textContent = `${pct}%`;
  
  const countText = document.getElementById('sidebar-progress-count');
  if (countText) countText.textContent = mastered;
  
  const totalText = document.getElementById('sidebar-progress-total');
  if (totalText) totalText.textContent = total;
}

// Generate the A-Z Alphabet Scrollbar
function initAlphabetScroller() {
  const container = document.getElementById('alphabet-scroller');
  if (!container) return;
  
  let html = `<div class="alphabet-letter active" data-letter="">ALL</div>`;
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    html += `<div class="alphabet-letter" data-letter="${letter}">${letter}</div>`;
  }
  container.innerHTML = html;
  
  container.querySelectorAll('.alphabet-letter').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.alphabet-letter').forEach(l => l.classList.remove('active'));
      el.classList.add('active');
      state.filters.letter = el.dataset.letter;
      applyFiltersAndRender();
    });
  });
}

// Set up Collapsible lists or sidebar selection events
function initSidebar() {
  const sidebarItems = document.querySelectorAll('.sidebar-menu .menu-item');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      
      const category = item.dataset.category || '';
      const subcategory = item.dataset.subcategory || '';
      const showOnly = item.dataset.show || 'all';
      
      state.filters.category = category;
      state.filters.subcategory = subcategory;
      state.filters.showOnly = showOnly;
      
      populateSubcategoryDropdown(category);
      resetLetterFilter();
      applyFiltersAndRender();
      
      document.querySelector('.sidebar').classList.remove('active');
    });
  });
  
  updateMenuCounts();
}

function updateMenuCounts() {
  document.getElementById('count-vocab').textContent = state.words.filter(w => w.category === 'Vocabulary').length;
  document.getElementById('count-synonyms').textContent = state.words.filter(w => w.category === 'Synonyms').length;
  document.getElementById('count-idioms').textContent = state.words.filter(w => w.category === 'Idioms & Phrases').length;
  document.getElementById('count-topics').textContent = state.words.filter(w => w.category === 'Topic-Based Vocabulary').length;
  document.getElementById('count-bookmarks').textContent = state.bookmarks.size;
}

// Populate Subcategory dropdown filters based on Category
function populateSubcategoryDropdown(category) {
  const select = document.getElementById('filter-subcategory');
  if (!select) return;
  
  select.innerHTML = '<option value="">All Subcategories</option>';
  
  let subcategories = [];
  if (category === 'Vocabulary') {
    subcategories = ['Core Vocabulary', 'Academic Vocabulary', 'Advanced Vocabulary'];
  } else if (category === 'Synonyms') {
    subcategories = ['Common Synonyms', 'Academic Synonyms', 'Formal Alternatives'];
  } else if (category === 'Idioms & Phrases') {
    subcategories = ['Common Expressions', 'Professional Idioms', 'Useful Phrases'];
  } else if (category === 'Topic-Based Vocabulary') {
    subcategories = ['Education', 'Environment', 'Technology', 'Health', 'Business', 'Government', 'Society', 'Science', 'Media', 'Culture'];
  } else {
    subcategories = [
      'Core Vocabulary', 'Academic Vocabulary', 'Advanced Vocabulary',
      'Common Synonyms', 'Academic Synonyms', 'Formal Alternatives',
      'Common Expressions', 'Professional Idioms', 'Useful Phrases',
      'Education', 'Environment', 'Technology', 'Health', 'Business', 'Government', 'Society', 'Science', 'Media', 'Culture'
    ];
  }
  
  subcategories.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    select.appendChild(opt);
  });
  
  select.value = state.filters.subcategory;
}

function initFilters() {
  populateSubcategoryDropdown('');
}

// Reset Alphabet Navigation
function resetLetterFilter() {
  state.filters.letter = '';
  const container = document.getElementById('alphabet-scroller');
  if (container) {
    container.querySelectorAll('.alphabet-letter').forEach(l => {
      l.classList.remove('active');
      if (l.dataset.letter === '') l.classList.add('active');
    });
  }
}

// Attach general listeners
function initEventListeners() {
  const searchInput = document.getElementById('search-vocab');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      applyFiltersAndRender();
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
  
  const gridToggle = document.getElementById('btn-view-grid');
  const listToggle = document.getElementById('btn-view-list');
  
  if (gridToggle && listToggle) {
    gridToggle.addEventListener('click', () => {
      gridToggle.classList.add('active');
      listToggle.classList.remove('active');
      state.viewMode = 'grid';
      document.getElementById('cards-grid').classList.remove('list-view');
    });
    
    listToggle.addEventListener('click', () => {
      listToggle.classList.add('active');
      gridToggle.classList.remove('active');
      state.viewMode = 'list';
      document.getElementById('cards-grid').classList.add('list-view');
    });
  }
  
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    });
  }
  
  const practiceBtn = document.getElementById('btn-practice');
  if (practiceBtn) {
    practiceBtn.addEventListener('click', startPracticeMode);
  }
  
  const addWordBtn = document.getElementById('btn-add-word');
  if (addWordBtn) {
    addWordBtn.addEventListener('click', openAddWordModal);
  }
  
  const addWordForm = document.getElementById('add-word-form');
  if (addWordForm) {
    addWordForm.addEventListener('submit', handleAddWord);
  }
}

// core data filter, sort, and render engine
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

// Sort Helper
function sortFilteredData() {
  const method = state.sorting;
  state.filteredWords.sort((a, b) => {
    const wordA = a.word.toLowerCase();
    const wordB = b.word.toLowerCase();
    
    if (method === 'alpha-asc') {
      return wordA.localeCompare(wordB);
    } else if (method === 'alpha-desc') {
      return wordB.localeCompare(wordA);
    } else if (method === 'difficulty-asc') {
      const diffWeight = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3 };
      const diffDiff = diffWeight[a.difficulty] - diffWeight[b.difficulty];
      return diffDiff === 0 ? wordA.localeCompare(wordB) : diffDiff;
    } else if (method === 'difficulty-desc') {
      const diffWeight = { 'Basic': 1, 'Intermediate': 2, 'Advanced': 3 };
      const diffDiff = diffWeight[b.difficulty] - diffWeight[a.difficulty];
      return diffDiff === 0 ? wordA.localeCompare(wordB) : diffDiff;
    }
    return 0;
  });
}

// Update Result Header text details
function updateResultHeader() {
  const total = state.filteredWords.length;
  const text = `Showing ${total} of ${state.words.length} Vocabulary Items`;
  document.getElementById('stat-showing-count').textContent = text;
  
  const practiceBtn = document.getElementById('btn-practice');
  if (practiceBtn) {
    practiceBtn.disabled = total === 0;
    practiceBtn.style.opacity = total === 0 ? '0.5' : '1';
  }
}

// Render the grid/list cards
function renderCards() {
  const container = document.getElementById('cards-grid');
  if (!container) return;
  
  if (state.filteredWords.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>No results found</h3>
        <p>Try adjusting your filters or search terms to find what you're looking for.</p>
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
    
    const synonymsHTML = wordObj.synonyms && wordObj.synonyms.length > 0 
      ? `
        <div class="detail-section">
          <span class="detail-title">Synonyms</span>
          <div class="synonyms-tag-group">
            ${wordObj.synonyms.map(s => `<span class="synonym-tag" onclick="searchSynonym(event, '${s}')">${s}</span>`).join('')}
          </div>
        </div>
      ` : '';
      
    const exampleHTML = wordObj.example 
      ? `
        <div class="detail-section">
          <span class="detail-title">General Example</span>
          <p class="example-sentence">"${wordObj.example}"</p>
        </div>
      ` : '';
      
    const ieltsExampleHTML = wordObj.ielts_example 
      ? `
        <div class="detail-section">
          <span class="detail-title">IELTS Context Example</span>
          <div class="ielts-example-box">
            <p class="ielts-example-sentence">"${wordObj.ielts_example}"</p>
          </div>
        </div>
      ` : '';
      
    return `
      <div class="vocab-card" onclick="toggleCardOpen(this)" data-word="${wordObj.word}">
        <div class="card-header-row">
          <div class="card-title-group">
            <span class="card-word">${wordObj.word}</span>
            <button class="btn-audio" onclick="playAudio(event, '${wordObj.word}')" title="Listen Pronunciation">🔊</button>
          </div>
          <div class="card-badges">
            <span class="badge-difficulty ${diffClass}">${wordObj.difficulty}</span>
            <span class="badge-subcategory">${wordObj.subcategory}</span>
          </div>
        </div>
        <div class="card-meaning">${wordObj.meaning}</div>
        
        <div class="card-details-expand">
          ${synonymsHTML}
          ${exampleHTML}
          ${ieltsExampleHTML}
        </div>
        
        <div class="card-actions-row">
          <button class="btn-card-action ${isBookmarked}" onclick="toggleBookmark(event, '${wordObj.word}')" title="Bookmark Word">
            ★
          </button>
          <button class="btn-card-action ${isMastered}" onclick="toggleMastery(event, '${wordObj.word}')" title="Mark as Mastered">
            ✓
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  if (state.filteredWords.length > state.visibleCount) {
    cardsHTML += `
      <div class="load-more-container" style="grid-column: 1 / -1; display: flex; justify-content: center; padding: 25px 0 10px 0;">
        <button id="btn-load-more" class="btn-primary" onclick="loadMoreCards(event)" style="padding: 12px 30px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
          Load More (+60 items)
        </button>
      </div>
    `;
  }
  
  container.innerHTML = cardsHTML;
}

// Load more action
function loadMoreCards(event) {
  if (event) event.stopPropagation();
  state.visibleCount += 60;
  renderCards();
}

// Click on Synonym Tag searches that word
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
    
    const sidebarItems = document.querySelectorAll('.sidebar-menu .menu-item');
    sidebarItems.forEach(el => el.classList.remove('active'));
    document.querySelector('[data-category=""]').classList.add('active');
    populateSubcategoryDropdown('');
    
    applyFiltersAndRender();
  }
}

// Expand Card Details
function toggleCardOpen(cardElement) {
  cardElement.classList.toggle('open');
}

// Audio Pronunciation Engine
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
  } else {
    console.warn("Text-to-speech is not supported on this browser.");
  }
}

// Toggle Bookmark state
function toggleBookmark(event, word) {
  event.stopPropagation();
  const wordLower = word.toLowerCase();
  
  if (state.bookmarks.has(wordLower)) {
    state.bookmarks.delete(wordLower);
  } else {
    state.bookmarks.add(wordLower);
  }
  
  saveUserData();
  updateMenuCounts();
  applyFiltersAndRender();
}

// Toggle Mastery status
function toggleMastery(event, word) {
  event.stopPropagation();
  const wordLower = word.toLowerCase();
  
  if (state.mastered.has(wordLower)) {
    state.mastered.delete(wordLower);
  } else {
    state.mastered.add(wordLower);
  }
  
  saveUserData();
  initStats();
  applyFiltersAndRender();
}

// Flashcard Practice Mode Logic
function startPracticeMode() {
  if (state.filteredWords.length === 0) return;
  
  state.flashcards.queue = [...state.filteredWords];
  state.flashcards.queue.sort(() => Math.random() - 0.5);
  
  state.flashcards.currentIndex = 0;
  state.flashcards.isFlipped = false;
  
  renderFlashcard();
  
  const modal = document.getElementById('practice-modal');
  if (modal) modal.classList.add('active');
}

function closePracticeMode() {
  const modal = document.getElementById('practice-modal');
  if (modal) modal.classList.remove('active');
}

function flipFlashcard() {
  state.flashcards.isFlipped = !state.flashcards.isFlipped;
  const cardElement = document.getElementById('practice-card');
  if (cardElement) {
    cardElement.classList.toggle('flipped', state.flashcards.isFlipped);
  }
}

function renderFlashcard() {
  const { queue, currentIndex } = state.flashcards;
  if (currentIndex >= queue.length) {
    const front = document.getElementById('flashcard-front-content');
    const back = document.getElementById('flashcard-back-content');
    
    front.innerHTML = `
      <div class="flashcard-word">🎉 Session Complete!</div>
      <p class="flashcard-prompt">You reviewed ${queue.length} ${queue.length === 1 ? 'word' : 'words'}</p>
    `;
    back.innerHTML = `
      <div class="flashcard-definition">Great work! Continue practicing to reinforce your learning.</div>
    `;
    
    document.getElementById('btn-practice-master').style.display = 'none';
    document.getElementById('btn-practice-next').textContent = 'Restart';
    return;
  }
  
  const wordObj = queue[currentIndex];
  const front = document.getElementById('flashcard-front-content');
  const back = document.getElementById('flashcard-back-content');
  const indexDisplay = document.getElementById('flashcard-index-display');
  
  state.flashcards.isFlipped = false;
  const cardElement = document.getElementById('practice-card');
  if (cardElement) cardElement.classList.remove('flipped');
  
  front.innerHTML = `
    <div class="flashcard-word">${wordObj.word}</div>
    <span class="badge-difficulty ${wordObj.difficulty.toLowerCase()}" style="margin-top: 10px">${wordObj.difficulty}</span>
    <p class="flashcard-prompt">Tap to reveal meaning</p>
    <button class="btn-audio" style="margin-top: 12px" onclick="playAudio(event, '${wordObj.word}')">🔊</button>
  `;
  
  const synHTML = wordObj.synonyms && wordObj.synonyms.length > 0 
    ? `<div style="margin-top: 8px; font-size: 13px; color: var(--text-secondary)"><strong>Alternatives:</strong> ${wordObj.synonyms.join(', ')}</div>` 
    : '';
  const exHTML = wordObj.example || wordObj.ielts_example
    ? `<p class="flashcard-example">"${wordObj.example || wordObj.ielts_example}"</p>`
    : '';
    
  back.innerHTML = `
    <div class="flashcard-definition">${wordObj.meaning}</div>
    ${synHTML}
    ${exHTML}
  `;
  
  indexDisplay.textContent = `${currentIndex + 1} / ${queue.length}`;
  
  document.getElementById('btn-practice-master').style.display = 'flex';
  document.getElementById('btn-practice-next').textContent = 'Next ➔';
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

// Add Word Modal Functions
function openAddWordModal() {
  const modal = document.getElementById('add-word-modal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('input-word').focus();
  }
}

function closeAddWordModal() {
  const modal = document.getElementById('add-word-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('add-word-form').reset();
  }
}

async function handleAddWord(event) {
  event.preventDefault();
  
  const word = document.getElementById('input-word').value.trim();
  const meaning = document.getElementById('input-meaning').value.trim();
  const synonymsInput = document.getElementById('input-synonyms').value.trim();
  const example = document.getElementById('input-example').value.trim();
  const ieltsExample = document.getElementById('input-ielts-example').value.trim();
  const category = document.getElementById('input-category').value;
  const subcategory = document.getElementById('input-subcategory').value.trim();
  const difficulty = document.getElementById('input-difficulty').value;
  
  // Parse synonyms (comma-separated)
  const synonyms = synonymsInput 
    ? synonymsInput.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];
  
  // Create word object
  const newWord = {
    word,
    meaning,
    synonyms,
    example: example || null,
    ielts_example: ieltsExample || null,
    category,
    subcategory: subcategory || null,
    difficulty
  };
  
  try {
    // Add to Supabase
    const { data, error } = await db
      .from('vocabulary')
      .insert([newWord])
      .select();
    
    if (error) {
      console.error('Error adding word:', error);
      alert('Failed to add word. Please try again.');
      return;
    }
    
    // Add to local state
    if (data && data.length > 0) {
      state.words.push(data[0]);
      
      // Close modal and reset form
      closeAddWordModal();
      
      // Refresh the display
      initStats();
      updateMenuCounts();
      applyFiltersAndRender();
      
      // Show success message
      alert(`✅ Successfully added "${word}"!`);
    }
  } catch (err) {
    console.error('Error adding word:', err);
    alert('An error occurred. Please try again.');
  }
}
