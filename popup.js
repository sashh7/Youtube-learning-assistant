const outputBox = document.getElementById('outputBox');
const outputCards = document.getElementById('outputCards'); // Ensure this <div> exists
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');

// Embed the given text and return a float32 array
async function getEmbedding(text) {
  const res = await fetch("http://localhost:5005/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  return data.embedding;
}

function showTextarea(content) {
  outputBox.style.display = 'block';
  outputCards.style.display = 'none';
  outputBox.value = content;
}

function showCardsFromText(text) {
  outputBox.style.display = 'none';
  outputCards.style.display = 'block';
  copyBtn.style.display = 'none'; // Hide copy button
  outputCards.innerHTML = ''; // Clear any previous cards

  const qaPairs = text.trim().split(/\*\*Q\d+:|\n(?=\*\*Q\d+:)/).filter(p => p.trim());
  qaPairs.forEach((block, index) => {
    const match = block.match(/\*\*\s*(.*?)\n\*\*A\d+:?\*\*\s*(.*)/);
    if (match) {
      const [, question, answer] = match;

      const card = document.createElement('div');
      card.className = 'card';

      card.innerHTML = `
        <div class="card-question">${index + 1}. ${question}</div>
        <div class="card-answer hidden">${answer}</div>
      `;

      card.addEventListener('click', () => {
        const answerEl = card.querySelector('.card-answer');
        const isHidden = answerEl.classList.contains('hidden');

        answerEl.classList.toggle('hidden');
        card.classList.toggle('expanded', isHidden); // Apply .expanded if answer was hidden
      });

      outputCards.appendChild(card);
    }
  });
}

function resetToDefault() {
  outputCards.style.display = 'none';
  outputCards.innerHTML = '';
  outputBox.value = '';
  outputBox.style.display = 'block';
  outputBox.placeholder = 'Your results will appear here...';
  copyBtn.style.display = 'inline-block'; // Show copy button again
}

clearBtn.addEventListener('click', resetToDefault);

document.addEventListener('DOMContentLoaded', () => {
  const outputBox = document.getElementById('outputBox');
  const questionInput = document.getElementById('questionInput');

  function getTranscriptAndSend(action, extra = {}) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'get_transcript' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          outputBox.value = 'Transcript not found or content script not loaded.';
          return;
        }

        const message = { action, transcript: response.transcript, ...extra };

        chrome.runtime.sendMessage(message, (reply) => {
          if (action === 'questions') {
            showCardsFromText(reply);
          } else {
            showTextarea(reply || 'No response from Groq API.');
          }
        });
      });
    });
  }

  document.getElementById('summarizeBtn').onclick = () => getTranscriptAndSend('summarize');
  document.getElementById('TestBtn').onclick = () => getTranscriptAndSend('questions');
  document.getElementById('askBtn').onclick = () => {
    const question = questionInput.value;
    if (!question) return;
    getTranscriptAndSend('ask_question', { question });
  };

  // Theme toggle functionality
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;
  const themeIcon = document.querySelector('.theme-icon');

  const currentTheme = localStorage.getItem('theme') || 'light';
  body.classList.add(currentTheme + '-theme');
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener('click', () => {
    const isLight = body.classList.contains('light-theme');
    const newTheme = isLight ? 'dark' : 'light';

    body.classList.remove('light-theme', 'dark-theme');
    body.classList.add(newTheme + '-theme');

    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
  }

  // Copy and clear functionality
  document.getElementById('copyBtn').addEventListener('click', () => {
    outputBox.select();
    document.execCommand('copy');

    const copyBtn = document.getElementById('copyBtn');
    const originalContent = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span>✅</span>';
    setTimeout(() => {
      copyBtn.innerHTML = originalContent;
    }, 1000);
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    outputBox.value = '';
  });
});