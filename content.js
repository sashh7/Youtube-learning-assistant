console.log("✅ content.js is loaded");

function extractTranscriptFromDOM() {
  const segments = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'));
  console.log(`[Transcript Debug] Found ${segments.length} segments`);

  if (segments.length === 0) {
    return null;
  }

  const transcript = segments.map((seg, i) => {
    const timestampEl = seg.querySelector('.segment-timestamp');
    const textEl = seg.querySelector('.segment-text');

    const timestamp = timestampEl?.innerText?.trim() || '[no timestamp]';
    const text = textEl?.innerText?.trim() || '[no text]';

    console.log(`[Segment ${i + 1}] ${timestamp} - ${text}`);
    return `${timestamp} ${text}`;
  }).join('\n');

  return transcript;
}

function getVideoIdFromUrl() {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("v") || url.pathname.split('/').pop();
  } catch (e) {
    return null;
  }
}

async function openTranscriptPanel() {
  // Try to find and click the transcript button
  const transcriptButton = document.querySelector('button[aria-label*="transcript" i], button[aria-label*="Show transcript" i]');
  
  if (transcriptButton) {
    console.log('[Transcript] Attempting to open transcript panel');
    transcriptButton.click();
    
    // Wait for the transcript to load
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20; // 4 seconds max
      
      const checkForTranscript = () => {
        const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
        if (segments.length > 0) {
          console.log('[Transcript] ✅ Transcript panel loaded');
          resolve(true);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkForTranscript, 200);
        } else {
          resolve(false);
        }
      };
      
      setTimeout(checkForTranscript, 200);
    });
  }
  
  return false;
}

async function fetchTranscriptViaAPI(videoId) {
  const apiUrl = `https://yt.lemnoslife.com/videos?part=transcript&id=${videoId}`;

  try {
    console.log('[Transcript] Attempting to fetch via API...');
    const res = await fetch(apiUrl);
    
    if (!res.ok) {
      throw new Error(`API responded with status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('[Transcript API Response]', data);

    const segments = data?.items?.[0]?.transcript || data?.video?.transcript?.segments;
    if (!segments || !Array.isArray(segments)) {
      return null;
    }

    const transcript = segments.map(seg => seg.text || seg.snippet?.text || '').join(' ').replace(/\n/g, ' ').trim();
    return transcript || null;
  } catch (err) {
    return null;
  }
}

// Alternative API endpoints to try
async function fetchTranscriptViaAlternativeAPIs(videoId) {
  const endpoints = [
    `https://yt.lemnoslife.com/videos?part=transcript&id=${videoId}`,
    `https://api.youtubetranscript.com/?video_id=${videoId}`, // hypothetical alternative
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        // Handle different response formats
        if (data.transcript) return data.transcript;
        if (data.items?.[0]?.transcript) return data.items[0].transcript;
      }
    } catch (err) {
      continue;
    }
  }
  
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_transcript') {
    const videoId = getVideoIdFromUrl();
    if (!videoId) {
      sendResponse({ transcript: null, error: 'No video ID found' });
      return;
    }

    console.log(`[Transcript] Processing video ID: ${videoId}`);

    // Strategy: Try multiple approaches in order
    (async () => {
      let transcript = null;
      let method = '';

      try {
        // 1. Try API first (fastest)
        transcript = await fetchTranscriptViaAPI(videoId);
        if (transcript) {
          method = 'API';
        } else {
          // 2. Try to get from DOM if transcript is already open
          transcript = extractTranscriptFromDOM();
          if (transcript) {
            method = 'DOM (already open)';
          } else {
            // 3. Try to open transcript panel and extract
            const panelOpened = await openTranscriptPanel();
            if (panelOpened) {
              transcript = extractTranscriptFromDOM();
              method = 'DOM (opened panel)';
            }
          }
        }

        if (transcript) {
          console.log(`[Transcript] ✅ Success via ${method}`);
          sendResponse({ transcript, method });
        } else {
          sendResponse({ 
            transcript: null, 
            error: 'Could not fetch transcript via API or DOM extraction' 
          });
        }
      } catch (error) {
        sendResponse({ 
          transcript: null, 
          error: error.message 
        });
      }
    })();

    return true; // keep the message channel open for async response
  }
});