# 📚 VocabHub - IELTS Vocabulary Learning Platform

A comprehensive, modern vocabulary learning platform designed to help students master IELTS academic vocabulary through an intuitive, feature-rich interface.

## 🌐 Live Demo

**[Launch App](https://your-username.github.io/ielts-vocabulary/)** (Update this URL after deployment)

> **Note**: This is a fully functional demo with a live Supabase database. You can browse 3000+ words, practice with flashcards, and even contribute new vocabulary!

## ✨ Features

### 🎯 Core Functionality
- **3000+ Curated Words** - Extensive vocabulary database with meanings, synonyms, and contextual examples
- **Smart Categorization** - Organized into Core Vocabulary, Synonyms, Idioms & Phrases, and Topic-Based sections
- **Advanced Filtering** - Filter by category, subcategory, difficulty level, and alphabetical navigation
- **Real-time Search** - Instant search across words, meanings, synonyms, and example sentences
- **Flexible Sorting** - Sort alphabetically or by difficulty level

### 🧠 Learning Tools
- **Flashcard Practice Mode** - Interactive flip cards for effective memorization
- **Progress Tracking** - Mark words as mastered and monitor your learning journey
- **Bookmark System** - Save important words for quick access and review
- **Audio Pronunciation** - Text-to-speech integration for proper pronunciation

### 🎨 User Experience
- **Responsive Design** - Seamless experience across desktop, tablet, and mobile devices
- **Dark/Light Theme** - Eye-friendly theme switching for comfortable studying
- **Grid/List View** - Switch between card grid and list layouts
- **Add Custom Words** - Expand your vocabulary with personalized entries

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Styling**: Custom CSS with CSS Variables for theming
- **APIs**: Web Speech API for pronunciation
- **Hosting**: GitHub Pages ready (static site)
- **Dependencies**: Supabase JS Client (CDN)

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required! Just open the HTML file or visit the live demo

### Quick Start (Local)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ielts-vocabulary.git
   cd ielts-vocabulary
   ```

2. **Open in browser**
   ```bash
   # Option 1: Direct open
   open ielts_vocabulary.html
   
   # Option 2: Use a local server
   python -m http.server 8000
   # Visit http://localhost:8000
   ```

### For Your Own Database (Optional)

If you want to create your own instance:

1. **Create Supabase project** at [supabase.com](https://supabase.com)

2. **Set up the database table**
   ```sql
   CREATE TABLE vocabulary (
     id BIGSERIAL PRIMARY KEY,
     word TEXT NOT NULL,
     meaning TEXT NOT NULL,
     synonyms TEXT[] DEFAULT '{}',
     example TEXT,
     ielts_example TEXT,
     category TEXT,
     subcategory TEXT,
     difficulty TEXT,
     approved BOOLEAN DEFAULT false,
     added_on TIMESTAMP DEFAULT NOW()
   );
   
   -- Enable RLS
   ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
   
   -- Public read approved words
   CREATE POLICY "Public read approved"
   ON vocabulary FOR SELECT
   TO public
   USING (approved = true);
   
   -- Public insert (needs approval)
   CREATE POLICY "Public insert pending"
   ON vocabulary FOR INSERT
   TO public
   WITH CHECK (true);
   ```

3. **Update credentials** in `js/supabase.js`:
   ```javascript
   const SUPABASE_URL = 'your-project-url';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

## 📖 Usage Guide

### Browsing Vocabulary
- Use the sidebar to navigate between categories
- Click the A-Z alphabet scroller for quick letter navigation
- Apply filters for difficulty and subcategory refinement

### Studying Words
- Click any card to expand and view full details
- Click the 🔊 icon to hear pronunciation
- Star ★ to bookmark important words
- Checkmark ✓ to mark words as mastered

### Practice Mode
- Click **Practice** button to start flashcard session
- Tap cards to flip and reveal meanings
- Mark words as mastered during practice
- Sessions include randomized word order

### Adding New Words
- Click **Add New Word** button
- Fill in word details and examples
- Select appropriate category and difficulty
- Save to instantly update your vocabulary

## 📂 Project Structure

```
vocabulary/
├── css/
│   └── styles.css           # Application styling
├── js/
│   ├── app-supabase.js      # Main application logic
│   ├── supabase.js          # Supabase configuration
│   └── db-helpers.js        # Database helper functions
├── ielts_vocabulary.html    # Main HTML entry point
└── README.md                # Documentation
```

## 🎨 Customization

### Theming
Modify CSS variables in `styles.css` to customize colors:
```css
[data-theme="light"] {
  --bg-primary: #f8f9fa;
  --text-primary: #1a1a1a;
  --accent-color: #4f46e5;
  /* ... more variables */
}
```

### Data Categories
Add or modify categories in the sidebar menu and filter dropdowns in `ielts_vocabulary.html`.

## 💾 Data Management

### Local Storage
- Bookmarks and mastered words are stored locally
- Progress persists across browser sessions
- Data syncs with Supabase for backup

### Database Operations
- All vocabulary data is stored in Supabase
- Supports up to 10,000 words per load
- Real-time updates when adding new words

## 🔒 Security & Database

### Public Database Access
This project uses **Supabase with Row Level Security (RLS)** policies:

- ✅ **Public Read**: Anyone can view approved vocabulary words
- ✅ **Public Insert**: Anyone can contribute new words (requires approval)
- ❌ **Public Update/Delete**: Blocked - only authenticated admins can modify data

### Supabase Credentials
The `SUPABASE_ANON_KEY` included in this repo is safe to be public. It only allows:
- Reading approved vocabulary
- Submitting new words for approval

Your data is protected by RLS policies. Learn more: [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

## 🔒 Security Notes

- Never commit Supabase credentials to version control
- Use environment variables or config files excluded from git
- Implement Row Level Security (RLS) policies in Supabase for production

## 📱 Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Vocabulary content curated for IELTS preparation
- Built with modern web technologies
- Powered by Supabase

## 📧 Support

For issues, questions, or suggestions, please open an issue in the repository.

---

**Happy Learning! 🎓**
