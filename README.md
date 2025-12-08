# 🏥 Public Health Educator

An AI-powered health education assistant with multi-provider support. Available in both **Streamlit (Python)** and **Web (HTML/CSS/JS)** versions.

---

## ✨ Features

### 🤖 **Multi-Provider Support**
- **OpenAI** (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo)
- **Anthropic** (Claude Sonnet 4.5, Claude Opus 4.5, Claude Opus 4)
- **Google Gemini** (Gemini 3 Pro, Gemini 2.5 Pro/Flash)
- **GitHub Models** (OpenAI GPT-4o/4.1, Meta Llama 3.1/3.2/3.3, Microsoft Phi-4, Cohere Command R+)
- **Perplexity** (Sonar, Sonar Pro, Sonar Reasoning, Deep Research)
- **Ollama** (Local models - Streamlit only)

### 🎨 **Modern UX Features**

#### **Streamlit Version:**
- 🔒 **Two-State API Key Management** - Secure masked display with Edit button
- 💾 **Browser localStorage Persistence** - Provider, model, and API keys persist across sessions
- ✏️ **Easy Key Editing** - Click "Edit" to modify saved keys
- 🔄 **Auto-Restore Settings** - Automatically loads your last provider and model selection
- 🎯 **Clean Interface** - Professional, intuitive design

#### **Web Version:**
- 👁️ **API Key Toggle** - Show/hide your API key with one click
- ✏️ **Inline Edit & Regenerate** - Click your last message to edit and regenerate response
- ⌨️ **Typewriter Animation** - Smooth, natural response display
- 💾 **Export Chat** - Download conversation history as JSON
- 🗑️ **Clear Chat** - Start fresh anytime
- 📊 **Live Stats** - Track message count in real-time

### 🔒 **Health Domain Focus**
- Restricted to health, medicine, and wellness topics
- Evidence-based information (WHO, CDC guidelines)
- Grade 8 reading level explanations
- Built-in AI disclaimer for safety

---

## 🚀 Quick Start

### **Option 1: Web Version** (Recommended)

1. **Open the web app:**
   ```bash
   cd web
   # Open index.html in your browser
   ```

2. **Enter your API key** for any provider
   - Type your API key in the password field
   - Click the 👁️ icon to show/hide the key

3. **Start chatting!** Ask health-related questions

### **Option 2: Streamlit Version** (Python)

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the app:**
   ```bash
   streamlit run PHEducator.py
   ```

3. **Set up your API key:**
   - **First time:** Enter your API key and click "✅ Set"
   - **Key is saved:** You'll see a masked version (e.g., `sk-p••••••••••••z789`)
   - **To edit:** Click "✏️ Edit" button, modify, and click "💾 Save"

4. **Select a model and start chatting!**

---

## 🔑 Getting API Keys

| Provider | Get API Key | Environment Variable |
|----------|-------------|---------------------|
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | `OPENAI_API_KEY` |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com/) | `ANTHROPIC_API_KEY` |
| **Google Gemini** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | `GOOGLE_API_KEY` |
| **GitHub Models** | [github.com/settings/tokens](https://github.com/settings/tokens) | `GITHUB_TOKEN` |
| **Perplexity** | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) | `PERPLEXITY_API_KEY` |

**Note:** GitHub Token requires `models:read` scope.

---

## 🔐 API Key Security Features

### **Streamlit Version - Two-State Design:**

#### **State 1: Display Mode (Key Already Set)**
```
┌─────────────────────────────────────────┐
│ OpenAI API Key                          │
│ ┌─────────────────────────┐  ┌────────┐│
│ │ sk-p••••••••••••z789    │  │✏️ Edit ││
│ └─────────────────────────┘  └────────┘│
│ ✅ API Key set for gpt-4o               │
└─────────────────────────────────────────┘
```
- ✅ API key is **masked** (only first 4 and last 4 characters visible)
- ✅ Input field is **disabled** (read-only, prevents accidental changes)
- ✅ Click **"✏️ Edit"** to modify the key

#### **State 2: Input Mode (Entering/Editing Key)**
```
┌─────────────────────────────────────────┐
│ OpenAI API Key                          │
│ ┌─────────────────────────┐  ┌────────┐│
│ │ ••••••••••••••••••••    │  │✅ Set  ││
│ └─────────────────────────┘  └────────┘│
│ ⚠️ Please enter your OpenAI API key     │
└─────────────────────────────────────────┘
```
- ✅ Password-type input (characters hidden as dots)
- ✅ Click **"✅ Set"** (first time) or **"💾 Save"** (editing)
- ✅ Key is stored in **browser localStorage** (persists across sessions)
- ✅ Provider and model selections also persist

### **Web Version:**
- Password input field with show/hide toggle (👁️ icon)
- LocalStorage persistence across sessions
- Click eye icon to temporarily reveal key

### **Persistence Comparison:**

| Feature | Streamlit Version | Web Version |
|---------|------------------|-------------|
| **API Keys** | ✅ localStorage (persistent) | ✅ localStorage (persistent) |
| **Provider Selection** | ✅ localStorage (persistent) | ✅ localStorage (persistent) |
| **Model Selection** | ✅ localStorage (per-provider) | ✅ localStorage (per-provider) |
| **Chat Messages** | ❌ Session only | ❌ Memory only |
| **Survives Refresh** | ✅ YES (settings) | ✅ YES (settings) |

### **localStorage Keys Used (Harmonized):**

| Key | Purpose |
|-----|---------|
| `ph_provider` | Current provider selection |
| `ph_model_openai` | Last selected model for OpenAI |
| `ph_model_anthropic` | Last selected model for Anthropic |
| `ph_model_gemini` | Last selected model for Google Gemini |
| `ph_model_github` | Last selected model for GitHub Models |
| `ph_model_perplexity` | Last selected model for Perplexity |
| `ph_model_ollama` | Last selected model for Ollama (Python only) |
| `ph_apikey` | API key (Web version - single key) |
| `ph_apikey_*` | API keys per provider (Python version) |

---

## 📁 Project Structure

```
PHEducator/
├── PHEducator.py          # Streamlit Python app
├── requirements.txt       # Python dependencies
├── README.md             # This file
└── web/                  # Web version
    ├── index.html        # Main HTML
    ├── app.js            # JavaScript logic
    └── style.css         # Styling
```

---

## 🗂️ Documentation

All project documentation is now consolidated into this README.
The previous separate document `LOCALSTORAGE_IMPLEMENTATION.md` has been removed.
Its essential content is covered in:
- 🔐 API Key Security Features
- localStorage Keys Used (Harmonized)
- Persistence Comparison

This consolidation reduces duplication and keeps docs in one place.


## 🎯 Usage Examples

### **Good Questions:**
- "What are the symptoms of diabetes?"
- "How do vaccines work?"
- "What are healthy eating habits?"
- "How can I manage stress?"
- "What is high blood pressure?"

### **Non-Health Questions:**
The bot will politely refuse questions about:
- Programming, math, history
- Sports, entertainment, politics
- General knowledge outside health domain

---

## 🛠️ Technical Details

### **Web Version:**
- Pure HTML/CSS/JavaScript (no frameworks)
- Direct API calls from browser
- LocalStorage for settings persistence
- Responsive design
- Password-type input with show/hide toggle

### **Streamlit Version:**
- Python 3.8+
- Streamlit for UI
- Support for local Ollama models
- Chat history export
- **Browser localStorage Persistence:**
  - Provider selection persists across sessions
  - Model selection persists across sessions
  - API keys persist across sessions (stored in browser)
  - Uses `streamlit-local-storage` library
- **Two-State API Key Management:**
  - Session state storage for API keys
  - Masked display: Shows first 4 and last 4 characters (e.g., `sk-p••••••••••••z789`)
  - Edit mode: Password input with save functionality
  - Prevents accidental key exposure or modification

---

## ⚠️ Important Disclaimers

- **NOT a substitute for professional medical advice**
- **Always consult healthcare professionals** for medical concerns
- **Information is for educational purposes only**
- **AI responses may contain errors** - verify with trusted sources

---

## 📝 System Prompt

Both versions use the same system prompt to ensure consistent behavior:

```
You are a compassionate, accurate, and responsible Public Health Educator.
Your constraints:
1. Explain concepts simply (Grade 8 reading level).
2. Prioritize evidence-based guidelines (WHO, CDC).
3. ALWAYS verify facts before answering.
4. CRITICAL: You must include a disclaimer that you are an AI and not a doctor.
5. Do not provide personal medical diagnoses.

CRITICAL RESTRICTION:
You MUST ONLY answer questions related to public health, medicine, healthcare,
diseases, treatments, prevention, nutrition, mental health, and wellness.
```

---

## 🤝 Contributing

Feel free to submit issues or pull requests to improve the app!

---

## 📄 License

MIT License - Feel free to use and modify as needed.

