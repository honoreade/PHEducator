// PHEducator Web - Complete Multi-Provider AI Chat
// Version: Fixed Models + Typewriter Effect + Friendly Error Messages + API Links

// -----------------------------------------------------------------------------
// CONFIGURATION & CONSTANTS
// -----------------------------------------------------------------------------

// Model configurations for each provider
// Note: GitHub models are specified by ID only (no vendor prefix) to prevent errors
const MODELS = {
    ollama: [], // Dynamically loaded from local Ollama instance
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514', 'claude-opus-4-5-20251120', 'claude-opus-4-1-20250805'],
    gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    github: ['gpt-4o', 'gpt-4o-mini', 'Llama-3.3-70B-Instruct', 'Phi-4'], 
    perplexity: ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro']
};

// System prompt enforcing the Health Educator persona and constraints
const SYSTEM_PROMPT = `You are a compassionate, accurate, and responsible Public Health Educator.
Your constraints:
1. Explain concepts simply and brief.
2. Prioritize evidence-based guidelines (WHO, CDC).
3. ALWAYS verify facts before answering.
4. Do not provide personal medical diagnoses.

CRITICAL RESTRICTION:
You MUST ONLY answer questions related to public health, medicine, healthcare, diseases, treatments,
prevention, nutrition, mental health, and wellness.

If asked about ANY topic outside of health/medicine (e.g., programming, math, history, entertainment, etc.), you MUST respond with:
"I apologize, but I am specifically designed as a Public Health Educator and can only answer questions
related to health, medicine, and wellness.
Please ask me a health-related question instead."

NEVER make exceptions. NEVER answer non-health questions even if the user insists.`;

// NEW FEATURE: Direct links to generate API keys for each provider
const API_KEY_URLS = {
    openai: 'https://platform.openai.com/api-keys',
    anthropic: 'https://console.anthropic.com/settings/keys',
    gemini: 'https://aistudio.google.com/app/apikey',
    github: 'https://github.com/settings/personal-access-tokens',
    perplexity: 'https://www.perplexity.ai/settings/api'
};

// -----------------------------------------------------------------------------
// STATE MANAGEMENT
// -----------------------------------------------------------------------------

let currentProvider = 'gemini'; // Default set to Gemini as requested
let currentModel = '';
let apiKey = '';
let messages = []; // Stores conversation history
let ollamaConnected = false;

// -----------------------------------------------------------------------------
// DOM ELEMENTS
// -----------------------------------------------------------------------------

const providerSelect = document.getElementById('provider');
const modelSelect = document.getElementById('model');
const apiKeyInput = document.getElementById('apiKey');
const apiKeyContainer = document.getElementById('apiKeyGroup'); // Container for toggling visibility
const statusDiv = document.getElementById('status');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');
const getApiKeyLink = document.getElementById('getApiKeyLink'); // Link to provider's key page

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------

async function init() {
    // Load saved preferences (provider, model, key, theme)
    await loadFromLocalStorage();

    // Event Listeners for Settings
    providerSelect.addEventListener('change', handleProviderChange);
    modelSelect.addEventListener('change', handleModelChange);
    if (apiKeyInput) apiKeyInput.addEventListener('input', handleApiKeyChange);
    
    // Event Listeners for Chat
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Clear Chat Logic
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            messages = [];
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <h3>👋 Welcome to Public Health Educator!</h3>
                    <p>Ask me questions about health topics, disease prevention, nutrition, mental health, and more.</p>
                    <p class="disclaimer">⚠️ <strong>Remember:</strong> I'm an AI assistant for educational purposes only. Always consult healthcare professionals for medical advice.</p>
                </div>
            `;
        });
    }

    // Export Chat Logic
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (messages.length === 0) {
                alert('No messages to export');
                return;
            }
            const text = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pheducator-chat-${new Date().toISOString().slice(0,10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // API Key Show/Hide Toggle
    if (toggleApiKeyBtn && apiKeyInput) {
        toggleApiKeyBtn.addEventListener('click', () => {
            apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
            toggleApiKeyBtn.textContent = apiKeyInput.type === 'password' ? '👁️' : '🙈';
        });
    }

    // Initial UI Setup
    updateApiKeyVisibility();
}

// -----------------------------------------------------------------------------
// MODEL & PROVIDER LOGIC
// -----------------------------------------------------------------------------

// Fetch Ollama models from local instance (127.0.0.1:11434)
async function fetchOllamaModels() {
    try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        if (!res.ok) throw new Error('Ollama not running');
        const data = await res.json();
        if (data && data.models && data.models.length > 0) {
            MODELS.ollama = data.models.map(m => m.name);
            ollamaConnected = true;
            return MODELS.ollama;
        }
        ollamaConnected = false;
        return [];
    } catch (e) {
        ollamaConnected = false;
        return [];
    }
}

// Update model dropdown options based on selected provider
async function updateModels() {
    currentProvider = providerSelect.value;
    modelSelect.innerHTML = '';

    if (currentProvider === 'ollama') {
        modelSelect.innerHTML = '<option>Loading...</option>';
        const models = await fetchOllamaModels();
        modelSelect.innerHTML = '';

        if (ollamaConnected && models.length > 0) {
            models.forEach(model => {
                const opt = document.createElement('option');
                opt.value = model;
                opt.textContent = model;
                modelSelect.appendChild(opt);
            });
            modelSelect.disabled = false;
            currentModel = models[0];
        } else {
            modelSelect.innerHTML = '<option>No models available</option>';
            modelSelect.disabled = true;
            currentModel = '';
        }
    } else {
        // Standard providers (OpenAI, Gemini, etc.)
        MODELS[currentProvider].forEach(model => {
            const opt = document.createElement('option');
            opt.value = model;
            opt.textContent = model;
            modelSelect.appendChild(opt);
        });
        modelSelect.disabled = false;
        currentModel = MODELS[currentProvider][0];
    }
    updateStatus();
}

// -----------------------------------------------------------------------------
// EVENT HANDLERS
// -----------------------------------------------------------------------------

async function handleProviderChange() {
    await updateModels();
    updateApiKeyVisibility();

    // Restore saved model for this provider if exists
    const savedModel = localStorage.getItem(`ph_model_${currentProvider}`);
    if (savedModel && (currentProvider === 'ollama' ? MODELS.ollama.includes(savedModel) : MODELS[currentProvider].includes(savedModel))) {
        modelSelect.value = savedModel;
        currentModel = savedModel;
    }

    // Restore saved API key for this provider
    const savedApiKey = localStorage.getItem(`ph_apikey_${currentProvider}`);
    if (savedApiKey && apiKeyInput) {
        apiKeyInput.value = savedApiKey;
        apiKey = savedApiKey;
    } else if (apiKeyInput) {
        apiKeyInput.value = '';
        apiKey = '';
    }

    updateStatus();
    saveToLocalStorage();
}

function handleModelChange() {
    currentModel = modelSelect.value;
    saveToLocalStorage();
    updateStatus();
}

function handleApiKeyChange() {
    apiKey = apiKeyInput.value;
    saveToLocalStorage();
    updateStatus();
}

// NEW FEATURE: Update UI based on provider (Hide Key for Ollama, Update Link)
function updateApiKeyVisibility() {
    // Hide API key input for Ollama (local)
    if (apiKeyContainer) {
        apiKeyContainer.style.display = currentProvider === 'ollama' ? 'none' : '';
    }
    // Update the "Get API Key" link to the correct provider URL
    if (getApiKeyLink && API_KEY_URLS[currentProvider]) {
        getApiKeyLink.href = API_KEY_URLS[currentProvider];
        getApiKeyLink.style.display = '';
    } else if (getApiKeyLink) {
        getApiKeyLink.style.display = 'none';
    }
}

// Update connection status text
function updateStatus() {
    if (currentProvider === 'ollama') {
        if (ollamaConnected && currentModel) {
            statusDiv.className = 'status success';
            statusDiv.textContent = `✅ Connected to ${currentModel}`;
        } else {
            statusDiv.className = 'status error';
            statusDiv.textContent = '❌ Could not connect to Ollama. Is it running?';
        }
    } else {
        if (apiKey) {
            statusDiv.className = 'status success';
            statusDiv.textContent = `✅ API Key provided for ${currentModel}`;
        } else {
            statusDiv.className = 'status error';
            statusDiv.textContent = `⚠️ Please enter your ${currentProvider.toUpperCase()} API key`;
        }
    }
}

// -----------------------------------------------------------------------------
// STORAGE
// -----------------------------------------------------------------------------

function saveToLocalStorage() {
    localStorage.setItem('ph_provider', currentProvider);
    localStorage.setItem(`ph_model_${currentProvider}`, currentModel);
    if (currentProvider !== 'ollama') {
        localStorage.setItem(`ph_apikey_${currentProvider}`, apiKey);
    }
}

async function loadFromLocalStorage() {
    const savedProvider = localStorage.getItem('ph_provider');
    if (savedProvider && document.querySelector(`option[value="${savedProvider}"]`)) {
        providerSelect.value = savedProvider;
        currentProvider = savedProvider;
    } else {
        // Default to Gemini per requirements
        providerSelect.value = 'gemini';
        currentProvider = 'gemini';
    }

    await updateModels();

    const savedModel = localStorage.getItem(`ph_model_${currentProvider}`);
    if (savedModel) {
        const models = currentProvider === 'ollama' ? MODELS.ollama : MODELS[currentProvider];
        if (models.includes(savedModel)) {
            modelSelect.value = savedModel;
            currentModel = savedModel;
        }
    }

    if (currentProvider !== 'ollama') {
        const savedApiKey = localStorage.getItem(`ph_apikey_${currentProvider}`);
        if (savedApiKey && apiKeyInput) {
            apiKeyInput.value = savedApiKey;
            apiKey = savedApiKey;
        }
    }

    updateApiKeyVisibility();
    updateStatus();
}

// -----------------------------------------------------------------------------
// UI HELPERS (Visual Effects & Errors)
// -----------------------------------------------------------------------------

// NEW FEATURE: User Friendly Error Messages
// Converts raw API errors (JSON/HTML dumps) into clean, readable alerts
function formatFriendlyError(errorMessage) {
    const lowerMsg = errorMessage.toLowerCase();
    
    // Check for Rate Limit / Quota (429)
    if (lowerMsg.includes('quota') || lowerMsg.includes('rate limit') || lowerMsg.includes('429')) {
        return `<span style="color: #e65100; font-weight: bold;">⚠️ Usage Limit Exceeded</span><br>
                <span style="color: #666; font-size: 0.9em;">You've hit the rate limit for this provider. Please wait a moment or check your billing plan.</span>`;
    }
    
    // Check for Auth Errors (401/403)
    if (lowerMsg.includes('key') || lowerMsg.includes('auth') || lowerMsg.includes('401') || lowerMsg.includes('403')) {
        return `<span style="color: #d32f2f; font-weight: bold;">⚠️ Authentication Failed</span><br>
                <span style="color: #666; font-size: 0.9em;">Please check your API Key in the settings.</span>`;
    }
    
    // Check for Model Errors (404)
    if (lowerMsg.includes('model') || lowerMsg.includes('found') || lowerMsg.includes('404')) {
        return `<span style="color: #d32f2f; font-weight: bold;">⚠️ Model Unavailable</span><br>
                <span style="color: #666; font-size: 0.9em;">This model may be deprecated or unavailable. Please select a different one.</span>`;
    }
    
    // Check for Overload (503/529)
    if (lowerMsg.includes('overloaded') || lowerMsg.includes('capacity') || lowerMsg.includes('503')) {
        return `<span style="color: #e65100; font-weight: bold;">⚠️ Provider Overloaded</span><br>
                <span style="color: #666; font-size: 0.9em;">The AI service is currently busy. Please try again in a few seconds.</span>`;
    }

    // Default Fallback
    const displayMsg = errorMessage.length > 150 ? errorMessage.substring(0, 150) + '...' : errorMessage;
    return `<span style="color: #d32f2f;">⚠️ <strong>Error:</strong> ${displayMsg}</span>`;
}

// NEW FEATURE: Client-side Typewriter Effect
// Simulates streaming visually without the risk of network stream errors
async function typeWriter(displayElement, text) {
    if (!text) return;
    const words = text.split(/(\s+)/); // Split keeping whitespace
    let currentText = '';
    displayElement.innerHTML = '<span class="cursor">▌</span>';
    
    for (const word of words) {
        currentText += word;
        displayElement.innerHTML = formatResponse(currentText) + '<span class="cursor">▌</span>';
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        if (word.trim()) await new Promise(r => setTimeout(r, 15)); // Delay for effect
    }
    
    // Final render without cursor
    displayElement.innerHTML = formatResponse(text);
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

// -----------------------------------------------------------------------------
// MESSAGING LOGIC
// -----------------------------------------------------------------------------

async function sendMessage() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    // Validation
    if (currentProvider === 'ollama' && !ollamaConnected) {
        alert('❌ Ollama is not connected. Please start Ollama and try again.');
        return;
    }

    if (currentProvider !== 'ollama' && !apiKey) {
        alert('Please enter your API key first');
        return;
    }

    // UI Updates
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.style.display = 'none';

    addMessageToChat('user', prompt);
    chatInput.value = '';
    messages.push({ role: 'user', content: prompt });

    // Create placeholder for AI response
    const assistantDiv = addMessageToChat('assistant', '');
    const contentDiv = assistantDiv.querySelector('.message-content');
    contentDiv.innerHTML = '<span class="typing">Thinking...</span>';

    try {
        let response;
        // Select API call based on provider
        switch (currentProvider) {
            case 'ollama': response = await callOllama(prompt); break;
            case 'openai': response = await callOpenAI(prompt); break;
            case 'anthropic': response = await callAnthropic(prompt); break;
            case 'gemini': response = await callGemini(prompt); break;
            case 'github': response = await callGitHub(prompt); break;
            case 'perplexity': response = await callPerplexity(prompt); break;
        }

        if (response) {
            messages.push({ role: 'assistant', content: response });
            // Apply visual typewriter effect
            await typeWriter(contentDiv, response);
        }
    } catch (error) {
        // Apply friendly error formatting
        contentDiv.innerHTML = formatFriendlyError(error.message);
    }
}

// -----------------------------------------------------------------------------
// TEXT FORMATTING HELPERS
// -----------------------------------------------------------------------------

function parseInlineStyles(text) {
    let boldParsed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return boldParsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function formatResponse(text) {
    if (!text) return '';
    let lines = text.split('\n');
    let htmlOutput = '';
    let inList = false;

    lines.forEach(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            if (!inList) { htmlOutput += '<ul>'; inList = true; }
            let content = trimmed.substring(2);
            htmlOutput += `<li>${parseInlineStyles(content)}</li>`;
        } else {
            if (inList) { htmlOutput += '</ul>'; inList = false; }
            if (trimmed.length > 0) htmlOutput += `<p>${parseInlineStyles(trimmed)}</p>`;
        }
    });
    if (inList) htmlOutput += '</ul>';
    return htmlOutput;
}

// -----------------------------------------------------------------------------
// MESSAGE COMPONENT CREATION
// -----------------------------------------------------------------------------

function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    if (role === 'assistant') {
        messageDiv.innerHTML = `
            <div class="message-wrapper">
                <div class="message-content"></div>
                <div class="message-actions">
                    <button class="copy-btn" title="Copy">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
            </div>`;
        if (content) messageDiv.querySelector('.message-content').innerHTML = formatResponse(content);

        // Copy button logic
        const copyBtn = messageDiv.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            const textContent = messageDiv.querySelector('.message-content').textContent;
            navigator.clipboard.writeText(textContent).then(() => {
                copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                }, 2000);
            });
        });
    } else {
        messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add click-to-edit logic
    if (role === 'user') {
        const contentDiv = messageDiv.querySelector('.message-content');
        contentDiv.addEventListener('click', () => handleEditMessage(messageDiv, contentDiv));
        updateEditableMessages();
    }
    return messageDiv;
}

// -----------------------------------------------------------------------------
// MESSAGE EDITING LOGIC
// -----------------------------------------------------------------------------

function updateEditableMessages() {
    const userMessages = chatMessages.querySelectorAll('.message.user .message-content');
    userMessages.forEach((el, index) => {
        // Only the last message is editable
        if (index === userMessages.length - 1) {
            el.style.cursor = 'pointer';
            el.title = 'Click to edit and resend';
        } else {
            el.style.cursor = 'default';
            el.title = '';
        }
    });
}

function handleEditMessage(messageDiv, contentDiv) {
    const userMessages = chatMessages.querySelectorAll('.message.user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (messageDiv !== lastUserMessage) return;

    if (contentDiv.classList.contains('editing')) return;

    const originalText = contentDiv.textContent;
    contentDiv.classList.add('editing');
    contentDiv.contentEditable = true;
    contentDiv.focus();

    // Select text
    const range = document.createRange();
    range.selectNodeContents(contentDiv);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const handleKeyDown = async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const newText = contentDiv.textContent.trim();
            contentDiv.contentEditable = false;
            contentDiv.classList.remove('editing');
            contentDiv.removeEventListener('keydown', handleKeyDown);
            contentDiv.removeEventListener('blur', handleBlur);

            if (newText && newText !== originalText) {
                await resendEditedMessage(messageDiv, newText);
            }
        } else if (e.key === 'Escape') {
            contentDiv.textContent = originalText;
            contentDiv.contentEditable = false;
            contentDiv.classList.remove('editing');
            contentDiv.removeEventListener('keydown', handleKeyDown);
            contentDiv.removeEventListener('blur', handleBlur);
        }
    };

    const handleBlur = () => {
        setTimeout(() => {
            if (contentDiv.classList.contains('editing')) {
                contentDiv.textContent = originalText;
                contentDiv.contentEditable = false;
                contentDiv.classList.remove('editing');
                contentDiv.removeEventListener('keydown', handleKeyDown);
            }
        }, 100);
    };

    contentDiv.addEventListener('keydown', handleKeyDown);
    contentDiv.addEventListener('blur', handleBlur);
}

async function resendEditedMessage(userMessageDiv, newText) {
    // Remove last assistant response
    const allMessages = chatMessages.querySelectorAll('.message');
    const lastMessage = allMessages[allMessages.length - 1];
    if (lastMessage && lastMessage.classList.contains('assistant')) {
        lastMessage.remove();
        messages.pop();
    }

    const contentDiv = userMessageDiv.querySelector('.message-content');
    contentDiv.textContent = newText;

    // Update message history
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            messages[i].content = newText;
            break;
        }
    }

    const assistantDiv = addMessageToChat('assistant', '');
    const assistantContent = assistantDiv.querySelector('.message-content');
    assistantContent.innerHTML = '<span class="typing">Thinking...</span>';

    try {
        let response;
        switch (currentProvider) {
            case 'ollama': response = await callOllama(newText); break;
            case 'openai': response = await callOpenAI(newText); break;
            case 'anthropic': response = await callAnthropic(newText); break;
            case 'gemini': response = await callGemini(newText); break;
            case 'github': response = await callGitHub(newText); break;
            case 'perplexity': response = await callPerplexity(newText); break;
        }

        if (response) {
            messages.push({ role: 'assistant', content: response });
            await typeWriter(assistantContent, response);
        }
    } catch (error) {
        assistantContent.innerHTML = formatFriendlyError(error.message);
    }
}

// -----------------------------------------------------------------------------
// API CALL FUNCTIONS
// Note: Code is compacted here for efficiency. Logic returns full strings.
// -----------------------------------------------------------------------------

async function callOllama(prompt) {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
                stream: false
            })
        });
        if (!response.ok) throw new Error('Ollama request failed');
        const data = await response.json();
        return data.message?.content || 'No response';
    } catch (error) { throw new Error(`Ollama: ${error.message}`); }
}

async function callOpenAI(prompt) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: currentModel,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
            })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'OpenAI request failed'); }
        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response';
    } catch (error) { throw new Error(`OpenAI: ${error.message}`); }
}

async function callAnthropic(prompt) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: currentModel,
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                messages: messages.map(m => ({ role: m.role, content: m.content }))
            })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Anthropic request failed'); }
        const data = await response.json();
        return data.content[0]?.text || 'No response';
    } catch (error) { throw new Error(`Anthropic: ${error.message}`); }
}

async function callGemini(prompt) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
            })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Gemini request failed'); }
        const data = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || 'No response';
    } catch (error) { throw new Error(`Gemini: ${error.message}`); }
}

async function callGitHub(prompt) {
    try {
        const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: currentModel,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
            })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'GitHub Models request failed'); }
        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response';
    } catch (error) { throw new Error(`GitHub Models: ${error.message}`); }
}

async function callPerplexity(prompt) {
    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: currentModel,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
            })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Perplexity request failed'); }
        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response';
    } catch (error) { throw new Error(`Perplexity: ${error.message}`); }
}

// -----------------------------------------------------------------------------
// SIDEBAR RESIZER & THEME
// -----------------------------------------------------------------------------

function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) applyTheme(null);
    else applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const root = document.documentElement;
        const currentIsDark = root.hasAttribute('data-theme');
        const newTheme = currentIsDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!localStorage.getItem('theme')) applyTheme(null);
    });
}

function applyTheme(theme) {
    const root = document.documentElement;
    let isDark = theme === null ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme === 'dark';
    if (isDark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

function initSidebarResizer() {
    const resizer = document.getElementById('sidebarResizer');
    const sidebar = document.querySelector('.sidebar');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const containerRect = document.querySelector('.container').getBoundingClientRect();
        let newWidth = e.clientX - containerRect.left - 10;
        newWidth = Math.max(200, Math.min(400, newWidth));
        sidebar.style.width = newWidth + 'px';
        localStorage.setItem('sidebarWidth', newWidth);
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });

    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) sidebar.style.width = savedWidth + 'px';
}

// -----------------------------------------------------------------------------
// APP ENTRY POINT
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    init();
    initTheme();
    initSidebarResizer();
});