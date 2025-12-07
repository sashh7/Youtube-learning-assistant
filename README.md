# YouTube Learning Assistant

A Chrome extension that intelligently summarizes YouTube videos, generates interactive flashcards, and answers user questions based on video content.

## Features

### 🎯 Core Capabilities

- **Video Summarization** - Automatically summarize YouTube video transcripts with intelligent chunking for longer videos
- **Flashcard Generation** - Generate Q&A flashcards from video content to test your knowledge
- **Question Answering** - Ask specific questions about the video and get contextual answers using semantic search
- **Dark/Light Theme** - Toggle between dark and light themes for comfortable viewing

### 🔄 Smart Processing

- **Multi-chunk Processing** - Automatically chunks long transcripts for better handling
- **Semantic Search** - Uses embeddings to find the most relevant parts of the video for your questions
- **Multiple Data Sources** - Retrieves transcripts via API, DOM extraction, or by opening the transcript panel
- **Key Rotation** - Supports multiple Groq API keys for reliability

## Installation

### Prerequisites

- Chrome browser
- Python 3.8+ (for the embedding server)
- pip (Python package manager)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Youtube-learning-assistant.git
   cd Youtube-learning-assistant
   ```

2. **Install Python dependencies**
   ```bash
   pip install flask flask-cors sentence-transformers
   ```

3. **Start the embedding server**
   ```bash
   python app.py
   ```
   The server will run on `http://localhost:5005`

4. **Load the Chrome extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory
   - The extension icon should now appear in your toolbar

5. **Add Groq API Keys** (Optional - for better results)
   - Edit the `GROQ_KEYS` array in [background.js](background.js)
   - Get free keys from [Groq Console](https://console.groq.com)

## Usage

### 1. Summarize a Video
- Open a YouTube video
- Click the extension icon
- Click **"Summarize Video"** button
- Wait for the AI to analyze and summarize the content

### 2. Generate Flashcards
- Open a YouTube video
- Click the extension icon
- Click **"Test Yourself"** button
- Interactive Q&A cards will appear
- Click each card to reveal the answer

### 3. Ask Questions
- Open a YouTube video
- Click the extension icon
- Type your question in the input field
- Click the **"❓"** button or press Enter
- Get AI-powered answers based on the video content

## Architecture

### File Structure

| File | Purpose |
|------|---------|
| [popup.html](popup.html) | Extension popup UI |
| [popup.js](popup.js) | Popup logic and UI interactions |
| [content.js](content.js) | YouTube page script for transcript extraction |
| [background.js](background.js) | Service worker handling API calls and processing |
| [style.css](style.css) | Styling and theming |
| [app.py](app.py) | Flask server for text embeddings |
| [manifest.json](manifest.json) | Extension configuration |

### Data Flow

```
User Action (popup.js)
    ↓
Content Script (content.js) - Extract Transcript
    ↓
Background Worker (background.js) - Process with Groq API
    ↓
Embedding Server (app.py) - Generate embeddings for semantic search
    ↓
Display Results (popup.js)
```

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Flask, Python
- **AI/ML**: 
  - Groq API for text generation (deepseek-r1-distill-llama-70b)
  - Sentence Transformers for embeddings (all-MiniLM-L6-v2)
- **Chrome Extensions API**: Tabs, Storage, Messaging, Content Scripts

## Configuration

### Groq API Models

Currently using `deepseek-r1-distill-llama-70b` for most tasks and `meta-llama/llama-4-maverick-17b-128e-instruct` for flashcard selection.

You can modify the `MODEL` variable in [background.js](background.js).

### Embedding Model

The extension uses `all-MiniLM-L6-v2` from Sentence Transformers. To change it, modify [app.py](app.py):

```python
model = SentenceTransformer("your-model-name")
```




## Troubleshooting

### Transcript not found
- Ensure the video has captions enabled
- Try opening the transcript panel manually first

### "No response from Groq API"
- Check your internet connection
- Verify Groq API keys are valid
- Check rate limits haven't been exceeded

### Embedding server not responding
- Ensure Flask server is running: `python app.py`
- Verify server is accessible at `http://localhost:5005`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For issues and feature requests, please open an [issue](https://github.com/sashh7/Youtube-learning-assistant/issues).



**Note**: Keep your Groq API keys secure and never commit them to public repositories.
