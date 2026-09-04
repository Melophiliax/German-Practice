// speech.js — browser-native speech recognition & synthesis (Web Speech API).
// No external API needed; works offline-ish in supporting browsers (Chrome, Edge, Safari).

export function isRecognitionSupported() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

export function isSynthesisSupported() {
  return "speechSynthesis" in window;
}

export function speak(text, { rate = 0.9 } = {}) {
  if (!isSynthesisSupported()) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "de-DE";
  utter.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const deVoice = voices.find((v) => v.lang?.startsWith("de"));
  if (deVoice) utter.voice = deVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// Records one utterance and resolves with the recognized transcript.
export function recognizeOnce({ onInterim } = {}) {
  return new Promise((resolve, reject) => {
    if (!isRecognitionSupported()) {
      reject(new Error("Speech recognition is not supported in this browser."));
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizer = new SpeechRecognition();
    recognizer.lang = "de-DE";
    recognizer.interimResults = !!onInterim;
    recognizer.maxAlternatives = 1;

    let finalTranscript = "";

    recognizer.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interim += transcript;
      }
      if (onInterim) onInterim(interim);
    };

    recognizer.onerror = (event) => reject(new Error(`Recognition error: ${event.error}`));
    recognizer.onend = () => resolve(finalTranscript.trim());

    recognizer.start();
  });
}

// Levenshtein distance for word-level accuracy scoring.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[.,!?;:„“"']/g, "")
    .trim();
}

// Compares target sentence to what was recognized, word by word.
export function scorePronunciation(target, recognized) {
  const targetWords = normalize(target).split(/\s+/).filter(Boolean);
  const saidWords = normalize(recognized).split(/\s+/).filter(Boolean);

  const wordResults = targetWords.map((word, i) => {
    const candidate = saidWords[i] || "";
    const dist = levenshtein(word, candidate);
    const maxLen = Math.max(word.length, candidate.length, 1);
    const similarity = 1 - dist / maxLen;
    return { word, said: candidate, similarity, correct: similarity > 0.75 };
  });

  const overall =
    wordResults.length > 0
      ? wordResults.reduce((sum, w) => sum + w.similarity, 0) / wordResults.length
      : 0;

  return {
    overallScore: Math.round(overall * 100),
    words: wordResults,
  };
}
