import { h, shapeIcon, pct } from "../utils.js";
import { loadTopics, getTopicById, buildPool, toQuestion } from "../quizEngine.js";
import { Store } from "../storage.js";
import { renderQuizRunner } from "./quizRunner.js";

export async function renderGrammarList(root, params, query) {
  const topics = await loadTopics();
  const progress = Store.getGrammarProgress();
  const levelFilter = query?.get("level");

  const page = h("div", { class: "page" }, [
    h("div", { class: "page-header" }, [
      h("h1", {}, "Grammar Topics"),
      h("p", { class: "page-sub" }, "Pick a topic to drill it in isolation, or combine several in the Custom Quiz Builder."),
    ]),
    h(
      "div",
      { class: "filter-row" },
      ["All", "A1", "A2", "B1", "B2"].map((lvl) =>
        h(
          "a",
          {
            class: `chip ${((!levelFilter && lvl === "All") || levelFilter === lvl) ? "chip-active" : ""}`,
            href: lvl === "All" ? "#/grammar" : `#/grammar?level=${lvl}`,
          },
          lvl
        )
      )
    ),
    h(
      "div",
      { class: "topic-grid" },
      topics
        .filter((t) => !levelFilter || t.level === levelFilter)
        .map((topic) => topicCard(topic, progress))
    ),
  ]);

  root.appendChild(page);
}

function topicCard(topic, progress) {
  const done = topic.exercises.filter((e) => progress[e.id]?.attempts > 0).length;
  const percent = pct(done, topic.exercises.length);
  return h("a", { class: "topic-card", href: `#/grammar/${topic.id}` }, [
    h("div", { class: "topic-card-icon" }, [shapeIcon(topic.shape)]),
    h("div", { class: "topic-card-body" }, [
      h("div", { class: "topic-card-top" }, [
        h("span", { class: "level-tag" }, topic.level),
        h("span", { class: "topic-percent" }, `${percent}%`),
      ]),
      h("h3", { class: "topic-card-title" }, topic.name),
      h("p", { class: "topic-card-desc" }, topic.description),
      topic.cases.length
        ? h("div", { class: "case-tags" }, topic.cases.map((c) => h("span", { class: "case-tag" }, c)))
        : null,
    ]),
  ]);
}

export async function renderGrammarTopic(root, params) {
  const topic = await getTopicById(params.topicId);
  if (!topic) {
    root.appendChild(h("div", { class: "page" }, "Topic not found."));
    return;
  }

  const page = h("div", { class: "page" }, [
    h("a", { class: "back-link", href: "#/grammar" }, "← All topics"),
    h("div", { class: "page-header" }, [
      h("div", { class: "page-header-icon" }, [shapeIcon(topic.shape, 30)]),
      h("div", {}, [
        h("h1", {}, topic.name),
        h("p", { class: "page-sub" }, topic.description),
      ]),
    ]),
    h("div", { id: "quiz-mount" }, []),
  ]);
  root.appendChild(page);

  const pool = await buildPool({ topicIds: [topic.id] });
  const questions = pool.map(toQuestion);
  renderQuizRunner(document.getElementById("quiz-mount"), {
    questions,
    title: topic.name,
    level: topic.level,
    topicName: topic.name,
  });
}
