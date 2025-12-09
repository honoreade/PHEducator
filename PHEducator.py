# -*- coding: utf-8 -*-
import streamlit as st
from streamlit_local_storage import LocalStorage
import ollama
import os

# --- APP CONFIGURATION ---
st.set_page_config(page_title="Public Health Educator", page_icon="🏥")
st.title("🏥 Public Health Educator")
st.caption("Powered by Multiple AI Providers")

st.markdown(
    """
    <style>
        /* Sidebar icon buttons (edit/save API key, clear, export) */
        [data-testid="stSidebar"] .stButton > button {
            padding: 0.1rem 0.35rem !important;
            border-radius: 999px !important;
            min-height: 0 !important;
        }

        /* Make emoji-only buttons transparent (no outer card) */
        [data-testid="stSidebar"] .stButton > button:has(span:only-child) {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }

        /* Remove column gap between API input and its icon in the sidebar */
        [data-testid="stSidebar"] [data-testid="stHorizontalBlock"]:has(input[placeholder="Enter your API key"]) {
            column-gap: 0 !important;
            gap: 0 !important;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

# --- INITIALIZE LOCAL STORAGE ---
localS = LocalStorage()

# --- LOAD FROM LOCAL STORAGE (with unique keys for each component) ---
# Load saved provider from localStorage (like web version)
# Note: Models are loaded per-provider in render_model_select() function
saved_provider = localS.getItem("ph_provider")

# --- INITIALIZE SESSION STATE FOR API KEYS ---
if 'api_keys' not in st.session_state:
    # Try to load API keys from localStorage first, then fall back to env vars
    # Each getItem needs a unique key to avoid duplicate component errors
    st.session_state.api_keys = {
        'openai': localS.getItem("ph_apikey_openai") or os.getenv("OPENAI_API_KEY", ""),
        'anthropic': localS.getItem("ph_apikey_anthropic") or os.getenv("ANTHROPIC_API_KEY", ""),
        'gemini': localS.getItem("ph_apikey_gemini") or os.getenv("GOOGLE_API_KEY", ""),
        'github': localS.getItem("ph_apikey_github") or os.getenv("GITHUB_TOKEN", ""),
        'perplexity': localS.getItem("ph_apikey_perplexity") or os.getenv("PERPLEXITY_API_KEY", "")
    }

if 'editing_api_key' not in st.session_state:
    st.session_state.editing_api_key = {
        'openai': False,
        'anthropic': False,
        'gemini': False,
        'github': False,
        'perplexity': False
    }

# Initialize localStorage flag
if 'localStorage_initialized' not in st.session_state:
    st.session_state.localStorage_initialized = False

# Helper function to mask API key
def mask_api_key(key):
    if not key or len(key) < 8:
        return "••••••••••••••••"
    return f"{key[:4]}••••••••••••{key[-4:]}"

# Helper function to render model selection with localStorage persistence
def render_model_select(label, models, provider_key):
    """Render model selectbox with localStorage persistence (per-provider)"""
    default_index = 0
    storage_key = f"ph_model_{provider_key}"
    session_key = f"saved_model_{provider_key}"

    # Load saved model for THIS SPECIFIC PROVIDER (only once per session)
    # Cache in session_state to avoid multiple getItem calls
    if session_key not in st.session_state:
        saved_model = localS.getItem(storage_key)
        if saved_model:
            st.session_state[session_key] = saved_model

    # Try to use cached saved model
    saved_model = st.session_state.get(session_key)
    if saved_model and saved_model in models:
        try:
            default_index = models.index(saved_model)
        except ValueError:
            default_index = 0

    selected = st.selectbox(label, models, index=default_index, key=f"model_select_{provider_key}")

    # Save to localStorage when changed (update both localStorage and session cache)
    if st.session_state.get(session_key) != selected:
        st.session_state[session_key] = selected
        localS.setItem(storage_key, selected, key=f"set_model_{provider_key}")

    return selected

# API Key URLs for each provider
API_KEY_URLS = {
    "openai": "https://platform.openai.com/api-keys",
    "anthropic": "https://console.anthropic.com/settings/keys",
    "gemini": "https://aistudio.google.com/app/apikey",
    "github": "https://github.com/settings/personal-access-tokens",
    "perplexity": "https://www.perplexity.ai/settings/api"
}

# Helper function to render API key input with two-state design
def render_api_key_input(provider_key, label):
    has_key = bool(st.session_state.api_keys[provider_key])
    is_editing = st.session_state.editing_api_key[provider_key]

    # Label above columns
    st.text(label)
    # 3/4 width for input, 1/4 for icon
    col1, col2 = st.columns([4, 1], gap="small")

    if has_key and not is_editing:
        # State 1: Show masked key with Edit button
        with col1:
            st.text_input(
                label,
                value=mask_api_key(st.session_state.api_keys[provider_key]),
                disabled=True,
                key=f"{provider_key}_display",
                label_visibility="collapsed"
            )
        with col2:
            if st.button("✏️", key=f"{provider_key}_edit_btn"):
                st.session_state.editing_api_key[provider_key] = True
                st.rerun()
    else:
        # State 2: Show input field with Set/Save button
        with col1:
            new_key = st.text_input(
                label,
                value=st.session_state.api_keys[provider_key] if is_editing else "",
                type="password",
                placeholder="Enter your API key",
                key=f"{provider_key}_input",
                label_visibility="collapsed"
            )
        with col2:
            if st.button("✅" if not has_key else "💾", key=f"{provider_key}_set_btn"):
                if new_key:
                    st.session_state.api_keys[provider_key] = new_key
                    st.session_state.editing_api_key[provider_key] = False
                    # Save to localStorage (like web version) with unique key
                    localS.setItem(f"ph_apikey_{provider_key}", new_key, key=f"set_apikey_{provider_key}")
                    st.rerun()

    # Add "Get API Key" link below the input
    if provider_key in API_KEY_URLS:
        st.markdown(f"[Get API Key 🔑]({API_KEY_URLS[provider_key]})", unsafe_allow_html=True)

    return st.session_state.api_keys[provider_key]

# --- SIDEBAR: SETTINGS ---
with st.sidebar:
    st.header("Settings")

    # Provider Selection with localStorage persistence (Google Gemini as default)
    provider_options = ["Google Gemini", "Ollama (Local)", "OpenAI", "Anthropic", "GitHub Models", "Perplexity"]

    # Map provider names to match web version format
    provider_map = {
        "Google Gemini": "gemini",
        "Ollama (Local)": "ollama",
        "OpenAI": "openai",
        "Anthropic": "anthropic",
        "GitHub Models": "github",
        "Perplexity": "perplexity"
    }
    reverse_provider_map = {v: k for k, v in provider_map.items()}

    # Determine default index from localStorage (default to Google Gemini = index 0)
    default_index = 0
    if saved_provider and saved_provider in reverse_provider_map:
        try:
            default_index = provider_options.index(reverse_provider_map[saved_provider])
        except ValueError:
            default_index = 0

    provider = st.selectbox(
        "Select Provider",
        provider_options,
        index=default_index
    )

    # Save provider to localStorage when changed (use session_state to track)
    provider_key = provider_map[provider]
    if st.session_state.get("last_saved_provider") != provider_key:
        st.session_state["last_saved_provider"] = provider_key
        st.session_state["pending_save_provider"] = provider_key

    # Initialize variables
    selected_model = None
    api_key = None
    client = None

    # Provider-specific configuration
    if provider == "Ollama (Local)":
        try:
            # Initialize Ollama client with explicit host
            client = ollama.Client(host='http://127.0.0.1:11434')
            models_info = client.list()
            model_names = [m['model'] for m in models_info['models']]

            # Load saved model for Ollama from localStorage (cache in session_state)
            session_key = "saved_model_ollama"
            if session_key not in st.session_state:
                saved_ollama_model = localS.getItem("ph_model_ollama")
                if saved_ollama_model:
                    st.session_state[session_key] = saved_ollama_model

            default_index = 0
            saved_ollama_model = st.session_state.get(session_key)
            if saved_ollama_model and saved_ollama_model in model_names:
                try:
                    default_index = model_names.index(saved_ollama_model)
                except ValueError:
                    default_index = 0

            selected_model = st.selectbox("Select Model", model_names, index=default_index, key="model_select_ollama")

            # Save to localStorage when changed (update both localStorage and session cache)
            if st.session_state.get(session_key) != selected_model:
                st.session_state[session_key] = selected_model
                localS.setItem("ph_model_ollama", selected_model, key="set_model_ollama")

            st.success(f"✅ Connected to {selected_model}")
        except Exception as e:
            st.error("❌ Could not connect to Ollama. Is it running?")
            selected_model = "llama3.2:latest"

    elif provider == "OpenAI":
        api_key = render_api_key_input("openai", "OpenAI API Key")
        selected_model = render_model_select(
            "Select Model",
            ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
            "openai"
        )
        if api_key:
            st.success(f"✅ API Key set for {selected_model}")
        else:
            st.warning("⚠️ Please enter your OpenAI API key")

    elif provider == "Anthropic":
        api_key = render_api_key_input("anthropic", "Anthropic API Key")
        selected_model = render_model_select(
            "Select Model",
            [
                "claude-sonnet-4-5-20250929",
                "claude-sonnet-4-20250514",
                "claude-opus-4-5-20251120",
                "claude-opus-4-1-20250805",
                "claude-opus-4-20250514"
            ],
            "anthropic"
        )
        if api_key:
            st.success(f"✅ API Key set for {selected_model}")
        else:
            st.warning("⚠️ Please enter your Anthropic API key")

    elif provider == "Google Gemini":
        api_key = render_api_key_input("gemini", "Google API Key")
        selected_model = render_model_select(
            "Select Model",
            ["gemini-3-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
            "gemini"
        )
        if api_key:
            st.success(f"✅ API Key set for {selected_model}")
        else:
            st.warning("⚠️ Please enter your Google API key")

    elif provider == "GitHub Models":
        api_key = render_api_key_input("github", "GitHub Token")
        selected_model = render_model_select(
            "Select Model",
            [
                "openai/gpt-4o",
                "openai/gpt-4o-mini",
                "openai/gpt-4.1",
                "meta/Llama-3.3-70B-Instruct",
                "meta/Meta-Llama-3.1-405B-Instruct",
                "meta/Llama-3.2-90B-Vision-Instruct",
                "microsoft/Phi-4",
                "cohere/Cohere-command-r-plus-08-2024"
            ],
            "github"
        )
        if api_key:
            st.success(f"✅ GitHub Token set for {selected_model}")
        else:
            st.warning("⚠️ Please enter your GitHub Token (with models:read scope)")

    elif provider == "Perplexity":
        api_key = render_api_key_input("perplexity", "Perplexity API Key")
        selected_model = render_model_select(
            "Select Model",
            [
                "sonar",
                "sonar-pro",
                "sonar-reasoning",
                "sonar-reasoning-pro",
                "sonar-deep-research"
            ],
            "perplexity"
        )
        if api_key:
            st.success(f"✅ API Key set for {selected_model}")
        else:
            st.warning("⚠️ Please enter your Perplexity API key")

    st.divider()

    # Additional Settings
    st.subheader("Chat Settings")

    col1, col2 = st.columns(2)
    with col1:
        if st.button("🗑️ Clear", use_container_width=True):
            st.session_state.messages = []
            st.rerun()

    with col2:
        if st.session_state.get("messages"):
            # Create downloadable chat history
            import json
            from datetime import datetime

            chat_data = {
                "provider": provider,
                "model": selected_model,
                "timestamp": datetime.now().isoformat(),
                "messages": st.session_state.messages
            }

            chat_json = json.dumps(chat_data, indent=2)
            st.download_button(
                label="💾 Export",
                data=chat_json,
                file_name=f"health_chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json",
                use_container_width=True
            )

    # Display chat statistics
    if st.session_state.get("messages"):
        msg_count = len(st.session_state.messages)
        user_msgs = len([m for m in st.session_state.messages if m["role"] == "user"])
        st.caption(f"💬 Messages: {msg_count} ({user_msgs} questions)")

    st.divider()

    # Information section
    with st.expander("ℹ️ About This App"):
        st.markdown("""
        **Public Health Educator** is an AI-powered health education assistant.

        **Features:**
        - Multiple AI provider support (Ollama, OpenAI, Anthropic, Google Gemini)
        - Evidence-based health information
        - Privacy-focused (local Ollama option)

        **Important:**
        - This is NOT a substitute for professional medical advice
        - Always consult healthcare professionals for medical concerns
        - Information is for educational purposes only
        """)

    with st.expander("🔑 API Key Setup"):
        st.markdown("""
        **Option 1: Enter directly in the app** (above)

        **Option 2: Set environment variables:**
        ```bash
        # Windows (PowerShell)
        $env:OPENAI_API_KEY="your-key-here"
        $env:ANTHROPIC_API_KEY="your-key-here"
        $env:GOOGLE_API_KEY="your-key-here"

        # Linux/Mac
        export OPENAI_API_KEY="your-key-here"
        export ANTHROPIC_API_KEY="your-key-here"
        export GOOGLE_API_KEY="your-key-here"
        ```

        **Get API Keys:**
        - OpenAI: https://platform.openai.com/api-keys
        - Anthropic: https://console.anthropic.com/
        - Google: https://aistudio.google.com/app/apikey
        """)

    # Provider info
    st.divider()
    st.caption(f"🤖 Provider: {provider}")
    st.caption(f"📦 Model: {selected_model}")

# --- SYSTEM PERSONA ---
# This instruction forces the AI to behave as a health educator.
SYSTEM_PROMPT = """You are a compassionate, accurate, and responsible Public Health Educator.
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

NEVER make exceptions. NEVER answer non-health questions even if the user insists."""

# --- CHAT LOGIC ---
if "messages" not in st.session_state:
    st.session_state.messages = []

# Welcome message for new users
if not st.session_state.messages:
    st.info("""
    👋 **Welcome to Public Health Educator!**
""")

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Handle User Input
if prompt := st.chat_input("Ask a health question..."):
    # 1. Show user message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 2. Generate AI response
    with st.chat_message("assistant"):
        response_placeholder = st.empty()
        full_response = ""

        try:
            if provider == "Ollama (Local)":
                # Prepare the conversation history with System Prompt at the start
                history = [{'role': 'system', 'content': SYSTEM_PROMPT}] + st.session_state.messages

                # Stream the response from Ollama
                stream = client.chat(
                    model=selected_model,
                    messages=history,
                    stream=True,
                )

                for chunk in stream:
                    content = chunk['message']['content']
                    full_response += content
                    response_placeholder.markdown(full_response + "▌")

            elif provider == "OpenAI":
                if not api_key:
                    st.error("Please provide an OpenAI API key")
                else:
                    from openai import OpenAI
                    openai_client = OpenAI(api_key=api_key)

                    # Prepare messages with system prompt
                    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}] + st.session_state.messages

                    stream = openai_client.chat.completions.create(
                        model=selected_model,
                        messages=messages,
                        stream=True,
                        max_tokens=2000,
                        temperature=0.7
                    )

                    for chunk in stream:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            full_response += content
                            response_placeholder.markdown(full_response + "▌")

            elif provider == "Anthropic":
                if not api_key:
                    st.error("Please provide an Anthropic API key")
                else:
                    from anthropic import Anthropic
                    anthropic_client = Anthropic(api_key=api_key)

                    # Anthropic doesn't use system role in messages, uses system parameter
                    messages = st.session_state.messages

                    with anthropic_client.messages.stream(
                        model=selected_model,
                        max_tokens=4096,
                        system=SYSTEM_PROMPT,
                        messages=messages,
                    ) as stream:
                        for text in stream.text_stream:
                            full_response += text
                            response_placeholder.markdown(full_response + "▌")

            elif provider == "Google Gemini":
                if not api_key:
                    st.error("Please provide a Google API key")
                else:
                    import google.generativeai as genai
                    genai.configure(api_key=api_key)

                    model = genai.GenerativeModel(
                        model_name=selected_model,
                        system_instruction=SYSTEM_PROMPT
                    )

                    # Convert chat history to Gemini format
                    chat = model.start_chat(history=[
                        {"role": msg["role"] if msg["role"] == "user" else "model",
                         "parts": [msg["content"]]}
                        for msg in st.session_state.messages[:-1]  # Exclude the current user message
                    ])

                    # Configure generation settings
                    generation_config = genai.types.GenerationConfig(
                        max_output_tokens=2000,
                        temperature=0.7
                    )

                    response = chat.send_message(prompt, stream=True, generation_config=generation_config)

                    for chunk in response:
                        if chunk.text:
                            full_response += chunk.text
                            response_placeholder.markdown(full_response + "▌")

            elif provider == "GitHub Models":
                if not api_key:
                    st.error("Please provide a GitHub Token")
                else:
                    from openai import OpenAI
                    # GitHub Models uses OpenAI-compatible API
                    github_client = OpenAI(
                        base_url="https://models.github.ai/inference",
                        api_key=api_key
                    )

                    # Prepare messages with system prompt
                    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}] + st.session_state.messages

                    stream = github_client.chat.completions.create(
                        model=selected_model,
                        messages=messages,
                        stream=True,
                        max_tokens=2000,  # Increase token limit
                        temperature=0.7
                    )

                    for chunk in stream:
                        try:
                            if chunk.choices and len(chunk.choices) > 0:
                                delta = chunk.choices[0].delta
                                if hasattr(delta, 'content') and delta.content:
                                    content = delta.content
                                    full_response += content
                                    # Update display with every chunk for real-time streaming
                                    response_placeholder.markdown(full_response + "▌")
                        except (UnicodeEncodeError, IndexError, AttributeError):
                            # Handle encoding issues and index errors gracefully - silently continue
                            continue
                        except Exception:
                            # Catch any other errors but continue streaming - silently continue
                            continue

                    # Display final response without cursor
                    response_placeholder.markdown(full_response)

            elif provider == "Perplexity":
                if not api_key:
                    st.error("Please provide a Perplexity API key")
                else:
                    from openai import OpenAI
                    # Perplexity uses OpenAI-compatible API
                    perplexity_client = OpenAI(
                        base_url="https://api.perplexity.ai",
                        api_key=api_key
                    )

                    # Prepare messages with system prompt
                    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}] + st.session_state.messages

                    stream = perplexity_client.chat.completions.create(
                        model=selected_model,
                        messages=messages,
                        stream=True,
                        max_tokens=2000,
                        temperature=0.7
                    )

                    for chunk in stream:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            full_response += content
                            response_placeholder.markdown(full_response + "▌")

            response_placeholder.markdown(full_response)

        except Exception as e:
            error_msg = str(e)
            # Simplify quota exceeded errors
            if "quota" in error_msg.lower() or "rate" in error_msg.lower():
                st.error("Rate limit exceeded. Please wait a moment and try again.")
            else:
                st.error(f"Error: {error_msg}")
            full_response = "Sorry, I encountered an error. Please try again."
            response_placeholder.markdown(full_response)

    # 3. Save AI message to history
    if full_response:
        st.session_state.messages.append({"role": "assistant", "content": full_response})

# Footer Disclaimer - fixed bottom center (above chat input)
st.markdown(
    """
    <style>
        .footer-disclaimer {
            position: fixed;
            bottom: 0px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 12px;
            color: gray;
            z-index: 999;
        }
    </style>
    <div class='footer-disclaimer'>
        ⚠️ Disclaimer: I am an AI language model and not a medical professional.
    </div>
    """,
    unsafe_allow_html=True
)

# Deferred localStorage saves (to avoid UI spacing issues)
if st.session_state.get("pending_save_provider"):
    localS.setItem("ph_provider", st.session_state["pending_save_provider"], key="set_provider")
    del st.session_state["pending_save_provider"]