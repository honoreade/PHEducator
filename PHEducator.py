import streamlit as st
import ollama

# --- APP CONFIGURATION ---
st.set_page_config(page_title="Public Health Educator", page_icon="🏥")
st.title("🏥 Public Health Educator")
st.caption("Powered by Local AI (Ollama) - Private & Offline")

# Initialize Ollama client with explicit host
client = ollama.Client(host='http://127.0.0.1:11434')

# --- SIDEBAR: SETTINGS ---
with st.sidebar:
    st.header("Settings")
    try:
        # Fetch available models from local Ollama instance
        models_info = client.list()
        # Adjust key based on library version ('models' is standard)
        model_names = [m['model'] for m in models_info['models']]
        selected_model = st.selectbox("Select Model", model_names, index=0)
        st.success(f"Connected to {selected_model}")
    except Exception as e:
        st.error("Could not connect to Ollama. Is it running?")
        selected_model = "llama3.2:latest" # Fallback

    if st.button("Clear Chat History"):
        st.session_state.messages = []

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
            
        response_placeholder.markdown(full_response)
    
    # 3. Save AI message to history
    st.session_state.messages.append({"role": "assistant", "content": full_response})