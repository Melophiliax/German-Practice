// storage.js — thin wrapper around localStorage, namespaced for this app.
const NS = "gm_";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("storage read failed", key, e);
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    console.warn("storage write failed", key, e);
  }
}

export const Store = {
  // ---- settings (API keys, provider, theme) ----
  getSettings() {
    return read("settings", {
      provider: "none", // "openai" | "gemini" | "none"
      openaiKey: "",
      geminiKey: "",
    });
  },
  saveSettings(settings) {
    write("settings", settings);
  },

  // ---- grammar progress: { [exerciseId]: { correct, attempts, lastSeen } } ----
  getGrammarProgress() {
    return read("grammar_progress", {});
  },
  recordGrammarAttempt(exerciseId, wasCorrect) {
    const progress = this.getGrammarProgress();
    const entry = progress[exerciseId] || { correct: 0, attempts: 0, lastSeen: null };
    entry.attempts += 1;
    if (wasCorrect) entry.correct += 1;
    entry.lastSeen = Date.now();
    progress[exerciseId] = entry;
    write("grammar_progress", progress);
    return entry;
  },

  // ---- flashcard SRS state: { [vocabId]: { box, dueAt, reps, lapses } } ----
  getSrsState() {
    return read("srs_state", {});
  },
  saveSrsState(state) {
    write("srs_state", state);
  },

  // ---- speaking history (last N attempts) ----
  getSpeakingHistory() {
    return read("speaking_history", []);
  },
  addSpeakingAttempt(attempt) {
    const history = this.getSpeakingHistory();
    history.unshift(attempt);
    write("speaking_history", history.slice(0, 50));
  },

  // ---- custom quiz last config, for convenience ----
  getCustomQuizConfig() {
    return read("custom_quiz_config", { levels: [], topics: [], cases: [] });
  },
  saveCustomQuizConfig(config) {
    write("custom_quiz_config", config);
  },

  addExtraVocab(newCards) {
    const settings = this.getSettings();
    const existing = settings.extraVocab || [];
    settings.extraVocab = [...existing, ...newCards];
    this.saveSettings(settings);
  },

  resetAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(NS))
      .forEach((k) => localStorage.removeItem(k));
  },
};
