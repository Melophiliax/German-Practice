import { h, pct, shapeIcon } from "../utils.js";
import { loadTopics } from "../quizEngine.js";
import { Store } from "../storage.js";
import vocabData from "../vocabData.js";

const LEVELS = ["A1", "A2", "B1", "B2"];

export async function renderHome(root) {
  const topics = await loadTopics();
  const progress = Store.getGrammarProgress();
  const srs = Store.getSrsState();
  const vocab = await vocabData();

  const totalExercises = topics.reduce((sum, t) => sum + t.exercises.length, 0);
  const attemptedIds = Object.keys(progress);
  const masteredVocab = Object.values(srs).filter((s) => s.box >= 5).length;

  const page = h("div", { class: "page" }, [
    h("section", { class: "hero" }, [
      h("div", { class: "hero-mark" }, [shapeIcon("circle", 40)]),
      h("div", {}, [
        h("h1", { class: "hero-title" }, "Deutsch üben."),
        h("p", { class: "hero-sub" }, "Grammar, vocabulary, and speaking — A1 through B2, tracked in one place."),
      ]),
    ]),

    h("section", { class: "stat-row" }, [
      statCard("Grammar exercises answered", `${attemptedIds.length}`, `of ${totalExercises} total`),
      statCard("Vocabulary mastered", `${masteredVocab}`, `of ${vocab.length} cards`),
      statCard("Levels covered", "A1–B2", "custom mix available"),
    ]),

    h("section", {}, [
      h("h2", { class: "section-title" }, "Levels"),
      h("div", { class: "level-grid" }, LEVELS.map((lvl) => levelCard(lvl, topics, progress))),
    ]),

    h("section", {}, [
      h("h2", { class: "section-title" }, "Jump in"),
      h("div", { class: "quick-links" }, [
        quickLink("Custom Quiz Builder", "Mix topics, levels & cases", "#/custom"),
        quickLink("Flashcards", "Spaced repetition vocab drills", "#/flashcards"),
        quickLink("Speaking Practice", "Live pronunciation feedback", "#/speaking"),
      ]),
    ]),
  ]);

  root.appendChild(page);
}

function statCard(label, value, sub) {
  return h("div", { class: "stat-card" }, [
    h("div", { class: "stat-value" }, value),
    h("div", { class: "stat-label" }, label),
    h("div", { class: "stat-sub" }, sub),
  ]);
}

function levelCard(level, topics, progress) {
  const levelTopics = topics.filter((t) => t.level === level);
  const totalEx = levelTopics.reduce((s, t) => s + t.exercises.length, 0);
  const done = levelTopics.reduce(
    (s, t) => s + t.exercises.filter((e) => progress[e.id]?.attempts > 0).length,
    0
  );
  return h(
    "a",
    { class: "level-card", href: `#/grammar?level=${level}` },
    [
      h("div", { class: "level-card-top" }, [
        h("span", { class: "level-tag" }, level),
        h("span", { class: "level-progress" }, `${pct(done, totalEx)}%`),
      ]),
      h("div", { class: "level-progress-bar" }, [
        h("div", { class: "level-progress-fill", style: `width:${pct(done, totalEx)}%` }),
      ]),
      h("div", { class: "level-topics" }, `${levelTopics.length} topics`),
    ]
  );
}

function quickLink(title, sub, href) {
  return h("a", { class: "quick-link", href }, [
    h("div", { class: "quick-link-title" }, title),
    h("div", { class: "quick-link-sub" }, sub),
    h("div", { class: "quick-link-arrow" }, "→"),
  ]);
}
