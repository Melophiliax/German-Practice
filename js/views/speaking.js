import { h } from "../utils.js";
import vocabData from "../vocabData.js";
import { loadTopics } from "../quizEngine.js";
import { Store } from "../storage.js";
import {
  isRecognitionSupported,
  isSynthesisSupported,
  speak,
  recognizeOnce,
  scorePronunciation,
} from "../speech.js";

export async function renderSpeaking(root) {
  const vocab = await vocabData();
  const topics = await loadTopics();
  const sentences = [
    ...vocab.map((v) => v.example).filter(Boolean),
    ...topics.flatMap((t) => t.exercises.map((e) => e.prompt.replace(/___/g, "..."))),
  ];

  let current = pickRandom(sentences);
  let listening = false;
  let lastResult = null;

  const page = h("div", { class: "page" }, [
    h("div", { class: "page-header" }, [
      h("h1", {}, "Speaking Practice"),
      h("p", { class: "page-sub" }, "Listen, then repeat the sentence into your microphone for instant word-level feedback."),
    ]),
    !isRecognitionSupported()
      ? h("div", { class: "warning-box" }, "Speech recognition isn't supported in this browser. Try Chrome, Edge, or Safari.")
      : null,
    h("div", { id: "speak-mount" }, []),
  ]);
  root.appendChild(page);

  draw();

  function draw() {
    const mount = document.getElementById("speak-mount");
    mount.innerHTML = "";

    const card = h("div", { class: "speak-card" }, [
      h("p", { class: "speak-target" }, current),
      h("div", { class: "speak-actions" }, [
        isSynthesisSupported()
          ? h("button", { class: "btn btn-ghost", onClick: () => speak(current) }, "🔊 Hear it")
          : null,
        h(
          "button",
          {
            class: `btn ${listening ? "btn-recording" : "btn-primary"}`,
            disabled: !isRecognitionSupported(),
            onClick: startListening,
          },
          listening ? "● Listening…" : "🎤 Speak"
        ),
        h("button", { class: "btn btn-outline", onClick: newSentence }, "Skip →"),
      ]),
      lastResult ? renderResult(lastResult) : null,
    ]);

    mount.appendChild(card);
  }

  function renderResult(result) {
    return h("div", { class: "speak-result" }, [
      h("div", { class: `speak-score score-${scoreBand(result.overallScore)}` }, [
        h("span", { class: "speak-score-num" }, `${result.overallScore}%`),
        h("span", { class: "speak-score-label" }, "accuracy"),
      ]),
      h(
        "div",
        { class: "speak-words" },
        result.words.map((w) =>
          h("span", { class: `speak-word ${w.correct ? "word-ok" : "word-off"}` }, w.word)
        )
      ),
      h("p", { class: "speak-recognized" }, `We heard: "${result.recognized}"`),
    ]);
  }

  function scoreBand(score) {
    if (score >= 85) return "great";
    if (score >= 60) return "ok";
    return "low";
  }

  async function startListening() {
    listening = true;
    lastResult = null;
    draw();
    try {
      const transcript = await recognizeOnce();
      const scored = scorePronunciation(current, transcript);
      lastResult = { ...scored, recognized: transcript };
      Store.addSpeakingAttempt({
        sentence: current,
        recognized: transcript,
        score: scored.overallScore,
        at: Date.now(),
      });
    } catch (err) {
      alert("Recognition failed: " + err.message);
    } finally {
      listening = false;
      draw();
    }
  }

  function newSentence() {
    current = pickRandom(sentences);
    lastResult = null;
    draw();
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
