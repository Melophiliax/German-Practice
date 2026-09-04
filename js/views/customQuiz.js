import { h } from "../utils.js";
import { loadTopics, buildPool, toQuestion } from "../quizEngine.js";
import { Store } from "../storage.js";
import { renderQuizRunner } from "./quizRunner.js";

const ALL_LEVELS = ["A1", "A2", "B1", "B2"];
const ALL_CASES = ["Nominativ", "Akkusativ", "Dativ", "Genitiv"];

export async function renderCustomQuiz(root) {
  const topics = await loadTopics();
  const saved = Store.getCustomQuizConfig();
  const selection = {
    levels: new Set(saved.levels || []),
    topics: new Set(saved.topics || []),
    cases: new Set(saved.cases || []),
  };

  const page = h("div", { class: "page" }, [
    h("div", { class: "page-header" }, [
      h("h1", {}, "Custom Quiz Builder"),
      h("p", { class: "page-sub" }, "Combine any levels, topics, and cases into one mixed practice session."),
    ]),
    h("div", { class: "builder" }, [
      builderGroup("Levels", ALL_LEVELS, selection.levels, "level"),
      builderGroup(
        "Topics",
        topics.map((t) => ({ id: t.id, label: t.name })),
        selection.topics,
        "topic"
      ),
      builderGroup("Cases", ALL_CASES, selection.cases, "case"),
    ]),
    h("div", { class: "builder-actions" }, [
      h("span", { id: "pool-count", class: "pool-count" }, ""),
      h("button", { class: "btn btn-primary", id: "start-quiz-btn" }, "Start custom quiz"),
    ]),
    h("div", { id: "custom-quiz-mount" }, []),
  ]);

  root.appendChild(page);

  function builderGroup(title, items, selectedSet, kind) {
    const normalized = items.map((it) => (typeof it === "string" ? { id: it, label: it } : it));
    return h("div", { class: "builder-group" }, [
      h("h3", { class: "builder-group-title" }, title),
      h(
        "div",
        { class: "chip-grid" },
        normalized.map((item) =>
          h(
            "button",
            {
              class: `chip ${selectedSet.has(item.id) ? "chip-active" : ""}`,
              "data-kind": kind,
              "data-id": item.id,
              onClick: (e) => {
                if (selectedSet.has(item.id)) selectedSet.delete(item.id);
                else selectedSet.add(item.id);
                e.currentTarget.classList.toggle("chip-active");
                updatePoolCount();
              },
            },
            item.label
          )
        )
      ),
    ]);
  }

  async function updatePoolCount() {
    const pool = await buildPool({
      topicIds: [...selection.topics],
      levels: [...selection.levels],
      cases: [...selection.cases],
    });
    document.getElementById("pool-count").textContent = `${pool.length} exercises match your filters`;
  }

  document.getElementById("start-quiz-btn").addEventListener("click", async () => {
    Store.saveCustomQuizConfig({
      levels: [...selection.levels],
      topics: [...selection.topics],
      cases: [...selection.cases],
    });
    const pool = await buildPool({
      topicIds: [...selection.topics],
      levels: [...selection.levels],
      cases: [...selection.cases],
    });
    const mount = document.getElementById("custom-quiz-mount");
    mount.innerHTML = "";
    if (!pool.length) {
      mount.appendChild(h("p", { class: "empty-state" }, "No exercises match that combination — try widening your filters."));
      return;
    }
    renderQuizRunner(mount, {
      questions: pool.slice(0, 20).map(toQuestion),
      title: "Custom mix",
    });
    mount.scrollIntoView({ behavior: "smooth" });
  });

  updatePoolCount();
}
