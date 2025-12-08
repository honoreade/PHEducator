// PHEducator Web - Complete Multi-Provider AI Chat
// Model configurations for each provider
const MODELS = {
    ollama: [], // Dynamically loaded from local Ollama instance
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514', 'claude-opus-4-5-20251120', 'claude-opus-4-1-20250805'],
    gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    github: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'meta/Llama-3.3-70B-Instruct', 'microsoft/Phi-4'],
    perplexity: ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro']
};

// System prompt for health education
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

// State variables
let currentProvider = 'ollama';
let currentModel = '';
let apiKey = '';
let messages = [];
let ollamaConnected = false;

// DOM Elements
const providerSelect = document.getElementById('provider');
const modelSelect = document.getElementById('model');
const apiKeyInput = document.getElementById('apiKey');
const apiKeyContainer = apiKeyInput ? apiKeyInput.closest('.setting-group') : null;
const statusDiv = document.getElementById('status');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const toggleApiKeyBtn = document.getElementById('toggleApiKey');

// Initialize app
async function init() {
    await loadFromLocalStorage();

    providerSelect.addEventListener('change', handleProviderChange);
    modelSelect.addEventListener('change', handleModelChange);
    if (apiKeyInput) apiKeyInput.addEventListener('input', handleApiKeyChange);
    sendBtn.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Clear chat button
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

    // Export chat button
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

    // Toggle API key visibility
    if (toggleApiKeyBtn && apiKeyInput) {
        toggleApiKeyBtn.addEventListener('click', () => {
            apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
            toggleApiKeyBtn.textContent = apiKeyInput.type === 'password' ? '👁️' : '🙈';
        });
    }

    updateApiKeyVisibility();
}

// Fetch Ollama models from local instance
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

// Update model dropdown based on provider
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


// Handle provider change
async function handleProviderChange() {
    await updateModels();
    updateApiKeyVisibility();

    // Load saved model for this provider
    const savedModel = localStorage.getItem(`ph_model_${currentProvider}`);
    if (savedModel && (currentProvider === 'ollama' ? MODELS.ollama.includes(savedModel) : MODELS[currentProvider].includes(savedModel))) {
        modelSelect.value = savedModel;
        currentModel = savedModel;
    }

    // Load saved API key for this provider
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

// Handle model change
function handleModelChange() {
    currentModel = modelSelect.value;
    saveToLocalStorage();
    updateStatus();
}

// Handle API key change
function handleApiKeyChange() {
    apiKey = apiKeyInput.value;
    saveToLocalStorage();
    updateStatus();
}

// Update API key visibility (hide for Ollama)
function updateApiKeyVisibility() {
    if (apiKeyContainer) {
        apiKeyContainer.style.display = currentProvider === 'ollama' ? 'none' : '';
    }
}

// Update status display
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

// Save settings to localStorage (per-provider)
function saveToLocalStorage() {
    localStorage.setItem('ph_provider', currentProvider);
    localStorage.setItem(`ph_model_${currentProvider}`, currentModel);
    if (currentProvider !== 'ollama') {
        localStorage.setItem(`ph_apikey_${currentProvider}`, apiKey);
    }
}

// Load settings from localStorage
async function loadFromLocalStorage() {
    const savedProvider = localStorage.getItem('ph_provider');

    if (savedProvider && document.querySelector(`option[value="${savedProvider}"]`)) {
        providerSelect.value = savedProvider;
        currentProvider = savedProvider;
    }

    // Populate model dropdown for the current provider
    await updateModels();

    // Load saved model for current provider
    const savedModel = localStorage.getItem(`ph_model_${currentProvider}`);
    if (savedModel) {
        const models = currentProvider === 'ollama' ? MODELS.ollama : MODELS[currentProvider];
        if (models.includes(savedModel)) {
            modelSelect.value = savedModel;
            currentModel = savedModel;
        }
    }

    // Load API key for current provider
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


// Send message
async function sendMessage() {
    const prompt = chatInput.value.trim();
    if (!prompt) return;

    // Check Ollama connection
    if (currentProvider === 'ollama' && !ollamaConnected) {
        alert('❌ Ollama is not connected. Please start Ollama and try again.');
        return;
    }

    // Check API key for non-Ollama providers
    if (currentProvider !== 'ollama' && !apiKey) {
        alert('Please enter your API key first');
        return;
    }

    // Hide welcome message when first message is sent
    const welcomeMsg = document.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.style.display = 'none';
    }

    // Add user message to chat
    addMessageToChat('user', prompt);
    chatInput.value = '';

    // Add to messages array
    messages.push({ role: 'user', content: prompt });

    // Create assistant message placeholder
    const assistantDiv = addMessageToChat('assistant', '');
    const contentDiv = assistantDiv.querySelector('.message-content');
    contentDiv.innerHTML = '<span class="typing">Thinking...</span>';

    try {
        let response;
        switch (currentProvider) {
            case 'ollama':
                response = await callOllama(prompt, contentDiv);
                break;
            case 'openai':
                response = await callOpenAI(prompt, contentDiv);
                break;
            case 'anthropic':
                response = await callAnthropic(prompt, contentDiv);
                break;
            case 'gemini':
                response = await callGemini(prompt, contentDiv);
                break;
            case 'github':
                response = await callGitHub(prompt, contentDiv);
                break;
            case 'perplexity':
                response = await callPerplexity(prompt, contentDiv);
                break;
        }

        if (response) {
            messages.push({ role: 'assistant', content: response });
        }
    } catch (error) {
        contentDiv.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}
// Helper to handle **bold** and *italics* inside lines
function parseInlineStyles(text) {
    // Convert **bold** to <strong>
    let boldParsed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    return boldParsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// Convert Markdown response to HTML
function formatResponse(text) {
    if (!text) return '';

    // Split text into lines to handle lists properly
    let lines = text.split('\n');
    let htmlOutput = '';
    let inList = false;

    lines.forEach(line => {
        let trimmed = line.trim();

        // Check for bullet points (starting with * or -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            if (!inList) {
                htmlOutput += '<ul>'; // Start a new list
                inList = true;
            }
            // Remove the bullet marker and wrap in <li>
            let content = trimmed.substring(2);
            htmlOutput += `<li>${parseInlineStyles(content)}</li>`;
        } else {
            // Close list if we were in one
            if (inList) {
                htmlOutput += '</ul>';
                inList = false;
            }
            // Handle regular paragraphs (skip empty lines)
            if (trimmed.length > 0) {
                htmlOutput += `<p>${parseInlineStyles(trimmed)}</p>`;
            }
        }
    });

    // Close any remaining open list
    if (inList) htmlOutput += '</ul>';

    return htmlOutput;
}

// Add message to chat display
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
        // Set content using formatter (converts markdown to HTML)
        if (content) {
            messageDiv.querySelector('.message-content').innerHTML = formatResponse(content);
        }

        // Add copy functionality
        const copyBtn = messageDiv.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            const textContent = messageDiv.querySelector('.message-content').textContent;
            navigator.clipboard.writeText(textContent).then(() => {
                copyBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>`;
                setTimeout(() => {
                    copyBtn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>`;
                }, 2000);
            });
        });
    } else {
        messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Add click-to-edit for user messages (only last one is editable)
    if (role === 'user') {
        const contentDiv = messageDiv.querySelector('.message-content');
        contentDiv.addEventListener('click', () => handleEditMessage(messageDiv, contentDiv));
        updateEditableMessages();
    }

    return messageDiv;
}

// Update which user message is editable (only the last one)
function updateEditableMessages() {
    const userMessages = chatMessages.querySelectorAll('.message.user .message-content');
    userMessages.forEach((el, index) => {
        if (index === userMessages.length - 1) {
            el.style.cursor = 'pointer';
            el.title = 'Click to edit and resend';
        } else {
            el.style.cursor = 'default';
            el.title = '';
        }
    });
}

// Handle editing a user message
function handleEditMessage(messageDiv, contentDiv) {
    // Only allow editing the last user message
    const userMessages = chatMessages.querySelectorAll('.message.user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (messageDiv !== lastUserMessage) return;

    // Check if already editing
    if (contentDiv.classList.contains('editing')) return;

    const originalText = contentDiv.textContent;
    contentDiv.classList.add('editing');
    contentDiv.contentEditable = true;
    contentDiv.focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(contentDiv);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Handle key events
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
        // Small delay to allow Enter key to process first
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

// Resend edited message and regenerate response
async function resendEditedMessage(userMessageDiv, newText) {
    // Remove the last assistant message if it exists
    const allMessages = chatMessages.querySelectorAll('.message');
    const lastMessage = allMessages[allMessages.length - 1];
    if (lastMessage && lastMessage.classList.contains('assistant')) {
        lastMessage.remove();
        messages.pop(); // Remove from messages array
    }

    // Update the user message text
    const contentDiv = userMessageDiv.querySelector('.message-content');
    contentDiv.textContent = newText;

    // Update messages array (replace last user message)
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            messages[i].content = newText;
            break;
        }
    }

    // Create new assistant message placeholder
    const assistantDiv = addMessageToChat('assistant', '');
    const assistantContent = assistantDiv.querySelector('.message-content');
    assistantContent.innerHTML = '<span class="typing">Thinking...</span>';

    try {
        let response;
        switch (currentProvider) {
            case 'ollama':
                response = await callOllama(newText, assistantContent);
                break;
            case 'openai':
                response = await callOpenAI(newText, assistantContent);
                break;
            case 'anthropic':
                response = await callAnthropic(newText, assistantContent);
                break;
            case 'gemini':
                response = await callGemini(newText, assistantContent);
                break;
            case 'github':
                response = await callGitHub(newText, assistantContent);
                break;
            case 'perplexity':
                response = await callPerplexity(newText, assistantContent);
                break;
        }

        if (response) {
            messages.push({ role: 'assistant', content: response });
        }
    } catch (error) {
        assistantContent.innerHTML = `<span style="color: red;">Error: ${error.message}</span>`;
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Ollama API call
async function callOllama(prompt, displayElement) {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: currentModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages
                ],
                stream: false
            })
        });

        if (!response.ok) throw new Error('Ollama request failed');
        const data = await response.json();
        const content = data.message?.content || 'No response';
        displayElement.innerHTML = formatResponse(content);
        return content;
    } catch (error) {
        throw new Error(`Ollama: ${error.message}`);
    }
}

// OpenAI API call
async function callOpenAI(prompt, displayElement) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: currentModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'OpenAI request failed');
        }
        const data = await response.json();
        const content = data.choices[0]?.message?.content || 'No response';
        displayElement.innerHTML = formatResponse(content);
        return content;
    } catch (error) {
        throw new Error(`OpenAI: ${error.message}`);
    }
}

// Anthropic API call
async function callAnthropic(prompt, displayElement) {
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

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Anthropic request failed');
        }
        const data = await response.json();
        const content = data.content[0]?.text || 'No response';
        displayElement.innerHTML = formatResponse(content);
        return content;
    } catch (error) {
        throw new Error(`Anthropic: ${error.message}`);
    }
}

// Gemini API call
async function callGemini(prompt, displayElement) {
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

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gemini request failed');
        }
        const data = await response.json();
        const content = data.candidates[0]?.content?.parts[0]?.text || 'No response';
        displayElement.innerHTML = formatResponse(content);
        return content;
    } catch (error) {
        throw new Error(`Gemini: ${error.message}`);
    }
}

// GitHub Models API call
async function callGitHub(prompt, displayElement) {
    try {
        const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: currentModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'GitHub Models request failed');
        }
        const data = await response.json();
        const content = data.choices[0]?.message?.content || 'No response';
        displayElement.innerHTML = formatResponse(content);
        return content;
    } catch (error) {
        throw new Error(`GitHub Models: ${error.message}`);
    }
}

// Perplexity API call
async function callPerplexity(prompt, displayElement) {
    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: currentModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    ...messages
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Perplexity request failed');
        }
        const data = await response.json();
        const content = data.choices[0]?.message?.content || 'No response';
        displayElement.innerHTML = formatResponse(content);
        return content;
    } catch (error) {
        throw new Error(`Perplexity: ${error.message}`);
    }
}

// Theme management - 2 options (light/dark) with auto as default
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');

    // If no saved theme, use system preference (auto behavior)
    if (!savedTheme) {
        applyTheme(null); // null = auto
    } else {
        applyTheme(savedTheme);
    }

    themeToggle.addEventListener('click', () => {
        // Toggle between light and dark
        const root = document.documentElement;
        const currentIsDark = root.hasAttribute('data-theme');
        const newTheme = currentIsDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // Listen for system theme changes (only when no manual selection)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (!localStorage.getItem('theme')) {
            applyTheme(null);
        }
    });
}

function applyTheme(theme) {
    const root = document.documentElement;
    let isDark = false;

    // If theme is null, follow system (auto)
    if (theme === null) {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
        isDark = theme === 'dark';
    }

    if (isDark) {
        root.setAttribute('data-theme', 'dark');
    } else {
        root.removeAttribute('data-theme');
    }

    // Update button title
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}

// Sidebar resizer
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
        let newWidth = e.clientX - containerRect.left - 10; // 10px padding
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

    // Restore saved width
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
    initTheme();
    initSidebarResizer();
});
