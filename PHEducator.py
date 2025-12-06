import streamlit as st
import ollama
import os

# --- APP CONFIGURATION ---
st.set_page_config(page_title="Public Health Educator", page_icon="🏥")
st.title("🏥 Public Health Educator")
st.caption("Powered by Multiple AI Providers")

# --- SIDEBAR: SETTINGS ---
with st.sidebar:
    st.header("Settings")

    # Provider Selection
    provider = st.selectbox(
        "Select Provider",
        ["Ollama (Local)", "OpenAI", "Anthropic", "Google Gemini"],
        index=0
    )

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
            selected_model = st.selectbox("Select Model", model_names, index=0)
            st.success(f"✅ Connected to {selected_model}")
        except Exception as e:
            st.error("❌ Could not connect to Ollama. Is it running?")
            selected_model = "llama3.2:latest"

    elif provider == "OpenAI":
        api_key = st.text_input("OpenAI API Key", type="password", value=os.getenv("OPENAI_API_KEY", ""))
        selected_model = st.selectbox(
            "Select Model",
            ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
            index=0
        )
        if api_key:
            st.success(f"✅ API Key provided for {selected_model}")
        else:
            st.warning("⚠️ Please enter your OpenAI API key")

    elif provider == "Anthropic":
        api_key = st.text_input("Anthropic API Key", type="password", value=os.getenv("ANTHROPIC_API_KEY", ""))
        selected_model = st.selectbox(
            "Select Model",
            [
                "claude-sonnet-4-5-20250929",
                "claude-sonnet-4-20250514",
                "claude-opus-4-5-20251120",
                "claude-opus-4-1-20250805",
                "claude-opus-4-20250514"
            ],
            index=0
        )
        if api_key:
            st.success(f"✅ API Key provided for {selected_model}")
        else:
            st.warning("⚠️ Please enter your Anthropic API key")

    elif provider == "Google Gemini":
        api_key = st.text_input("Google API Key", type="password", value=os.getenv("GOOGLE_API_KEY", ""))
        selected_model = st.selectbox(
            "Select Model",
            ["gemini-3-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
            index=0
        )
        if api_key:
            st.success(f"✅ API Key provided for {selected_model}")
        else:
            st.warning("⚠️ Please enter your Google API key")

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
        - Grade 8 reading level explanations

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
SYSTEM_PROMPT = """
You are a compassionate, accurate, and responsible Public Health Educator.
Your constraints:
1. Explain concepts simply (Grade 8 reading level).
2. Prioritize evidence-based guidelines (WHO, CDC).
3. ALWAYS verify facts before answering.
4. CRITICAL: You must include a disclaimer that you are an AI and not a doctor.
5. Do not provide personal medical diagnoses.
"""

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

                    response = chat.send_message(prompt, stream=True)

                    for chunk in response:
                        if chunk.text:
                            full_response += chunk.text
                            response_placeholder.markdown(full_response + "▌")

            response_placeholder.markdown(full_response)

        except Exception as e:
            st.error(f"Error generating response: {str(e)}")
            full_response = "Sorry, I encountered an error. Please check your API key and try again."
            response_placeholder.markdown(full_response)

    # 3. Save AI message to history
    if full_response:
        st.session_state.messages.append({"role": "assistant", "content": full_response})