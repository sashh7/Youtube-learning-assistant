// background.js (no embedding logic here — handled in popup.js)

const GROQ_KEYS = [
  "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",
  "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",
  "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"
];

const GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "deepseek-r1-distill-llama-70b";

let currentKeyIndex = 0;

function getNextKey() {
  const key = GROQ_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
  return key;
}

function extractResponse(response) {
  if (response.includes("</think>")) {
    return response.split("</think>")[1];
  } else if (response.includes("<think>")) {
    return response.split("<think>")[1];
  } else {
    return response.trim() || "No result returned";
  }
}

async function callGroqAPI(prompt, systemMessage, overrideKey = null, mod = MODEL) {
  const key = overrideKey || getNextKey();

  const res = await fetch(GROQ_CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: mod,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
    }),
  });

  const data = await res.json();
  console.log("API response:", data); // Debugging log
  const rawResponse = data.choices?.[0]?.message?.content || "";
  return extractResponse(rawResponse);
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

function chunkTranscript(text, maxWords = 800) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }
  return chunks;
}

// Store chunks and embeddings in localStorage for question answering
async function storeEmbeddings(chunks) {
  const entries = [];

  for (const chunk of chunks) {
    const embedding = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: "get_embedding", text: chunk }, resolve);
    });
    entries.push({ chunk, embedding });
  }

  chrome.storage.local.set({ video_chunks: entries });
}

async function findRelevantChunks(question, topK = 3) {
  const embedding = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: "get_embedding", text: question }, resolve);
  });

  const entries = await new Promise(resolve => {
    chrome.storage.local.get("video_chunks", result => {
      resolve(result.video_chunks || []);
    });
  });

  const ranked = entries.map(entry => ({
    chunk: entry.chunk,
    score: cosineSimilarity(entry.embedding, embedding)
  }));

  return ranked.sort((a, b) => b.score - a.score).slice(0, topK).map(r => r.chunk);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize") {
    const chunks = chunkTranscript(request.transcript);

    // If transcript is short — only one chunk — summarize directly
    if (chunks.length === 1) {
      const prompt = `Summarize the YouTube video based on its transcript:\n\n${request.transcript}`;
      callGroqAPI(prompt, "You are an expert educator summarizing YouTube videos.").then(sendResponse);
      return true;
    }

    // Multi-chunk flow
    Promise.all(
      chunks.map(chunk => callGroqAPI(
        `Summarize the following video section:\n\n${chunk}`,
        "You are an expert educator summarizing YouTube videos. Keep the summary concise and focused on key points keeping it strictly from 50 to 80 words.\nIn the summary, do not include phrases like 'In this video' or 'In this section'.\nMention the start time stamp of the section before starting the summary."
      ))
    ).then(partialSummaries => {
      storeEmbeddings(chunks); // Save embeddings in background
      const fullSummary = partialSummaries.join("\n\n");
      sendResponse(fullSummary);
    });

    return true;
  }

if (request.action === "questions") {
  const chunks = chunkTranscript(request.transcript);

  // ✅ For short transcript, ask directly
  if (chunks.length === 1) {
    const prompt = `Generate 5 questions to test a user (Q&A format) based on this transcript:\n\n${request.transcript}\n\n[MANDATORY] - Only generate the questions and answers, labeled like **Q1:** and **A1:**. No explanations.`;
    callGroqAPI(prompt, "You are a helpful tutor generating questions to help users assess themselves.").then(sendResponse);
    return true;
  }

  // ✅ For longer transcripts
  Promise.all(
    chunks.map(chunk => {
      const prompt = `Generate 3 questions to test a user (Q&A format) based on this part of the transcript:\n\n${chunk}\n\n[MANDATORY] - Only generate the questions and answers and they should be labelled like **Q1:** and **A1:**. No explanation.`;
      return callGroqAPI(prompt, "You are a helpful tutor generating concise Q&A flashcards.");
    })
  ).then(allQAs => {
    const mergedQAs = allQAs.join("\n\n");
    const finalPrompt = `From the following list of Q&A pairs, choose the most diverse and informative ones:\n\n${mergedQAs}\n\nOnly output them in the format:\n\n**Q1:** ...\n**A1:** ...\n... up to Q5. Do not add any explanations or commentary.`;
    return callGroqAPI(finalPrompt, "You are a helpful tutor selecting the best Q&A flashcards from a longer list.",null, "meta-llama/llama-4-maverick-17b-128e-instruct");
  }).then(sendResponse);

  return true;
}

  if (request.action === "ask_question") {
    findRelevantChunks(request.question, 3).then((topChunks) => {
      const context = topChunks.join("\n");
      const prompt = `Answer the following question using the video content:\n\n${context}\n\nQuestion: ${request.question}`;
      return callGroqAPI(prompt, "You are an expert answering questions from video transcript context.");
    }).then(sendResponse);
    return true;
  }
});
