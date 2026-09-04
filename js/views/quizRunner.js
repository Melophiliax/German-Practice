import { h } from "../utils.js";
import { Store } from "../storage.js";
import { fetchAiQuestion } from "../quizEngine.js";
import { isAiConfigured } from "../api.js";

export function renderQuizRunner(mount, { questions, title, level, topicName, cases = [] }) {
  const state = {
    questions: [...questions],
    index: 0,
    correctCount: 0,
    answeredCount: 0,
    selected: null,
    revealed: false,
    aiLoading: false,
  };

  async function draw() {
    mount.innerHTML = "";

    if (state.index >= state.questions.length) {
      mount.appendChild(renderSummary());
      return;
    }

    const q = state.questions[state.index];
    const card = h("div", { class: "quiz-card" }, [
      h("div", { class: "quiz-meta" }, [
        h("span", { class: "level-tag" }, q.level || level),
        q.case ? h("span", { class: "case-tag" }, q.case) : null,
        q.aiGenerated ? h("span", { class: "ai-tag" }, "AI generated") : null,
        h("span", { class: "quiz-counter" }, `${state.index + 1} / ${state.questions.length}`),
      ]),
      h("p", { class: "quiz-prompt" }, q.prompt),
      h(
        "div",
        { class: "quiz-options" },
        q.options.map((opt) => optionButton(opt, q))
      ),
      state.revealed ? renderExplanation(q) : null,
      h("div", { class: "quiz-actions" }, [
        state.revealed
          ? h("button", { class: "btn btn-primary", onClick: next }, isLast() ? "Finish" : "Next question →")
          : h("button", { class: "btn btn-ghost", disabled: !state.selected, onClick: () => reveal(q) }, "Check answer"),
      ]),
    ]);

    mount.appendChild(card);
  }

  function isLast() {
    return state.index === state.questions.length - 1;
  }

  function optionButton(opt, q) {
    let cls = "option-btn";
    if (state.revealed) {
      if (opt === q.answer) cls += " option-correct";
      else if (opt === state.selected) cls += " option-wrong";
    } else if (opt === state.selected) {
      cls += " option-selected";
    }
    return h(
      "button",
      {
        class: cls,
        disabled: state.revealed,
        onClick: () => {
          state.selected = opt;
          draw();
        },
      },
      opt
    );
  }

  function renderExplanation(q) {
    const wasCorrect = state.selected === q.answer;
    return h("div", { class: `quiz-explanation ${wasCorrect ? "is-correct" : "is-wrong"}` }, [
      h("strong", {}, wasCorrect ? "Richtig!" : `Not quite — correct answer: ${q.answer}`),
      h("p", {}, q.explanation || ""),
    ]);
  }

  function reveal(q) {
    state.revealed = true;
    state.answeredCount += 1;
    const wasCorrect = state.selected === q.answer;
    if (wasCorrect) state.correctCount += 1;
    Store.recordGrammarAttempt(q.id, wasCorrect);
    draw();
  }

  function next() {
    state.index += 1;
    state.selected = null;
    state.revealed = false;
    draw();
  }

  function renderSummary() {
    const scorePct = state.answeredCount ? Math.round((state.correctCount / state.answeredCount) * 100) : 0;
    const box = h("div", { class: "quiz-summary" }, [
      h("h2", {}, "Session complete"),
      h("div", { class: "summary-score" }, `${scorePct}%`),
      h("p", {}, `${state.correctCount} of ${state.answeredCount} correct.`),
      h("div", { class: "quiz-actions" }, [
        h("button", { class: "btn btn-ghost", onClick: () => { state.index = 0; state.correctCount = 0; state.answeredCount = 0; draw(); } }, "Restart this set"),
      ]),
    ]);
    return box;
  }

  // Optional: "Generate more with AI" control, shown above the runner when configured.
  isAiConfigured().then((configured) => {
    if (!configured || !topicName) return;
    const aiBar = h("div", { class: "ai-bar" }, [
      h("span", {}, "Want more variety?"),
      h(
        "button",
        {
          class: "btn btn-outline btn-sm",
          onClick: async (e) => {
            e.target.disabled = true;
            e.target.textContent = "Generating…";
            try {
              const grammarCase = cases[0] || null;
              const newQ = await fetchAiQuestion({ topicName, level, grammarCase });
              state.questions.splice(state.index + 1, 0, newQ);
              draw();
            } catch (err) {
              alert("Could not generate a question: " + err.message);
            } finally {
              e.target.disabled = false;
              e.target.textContent = "Generate an AI question";
            }
          },
        },
        "Generate an AI question"
      ),
    ]);
    mount.parentElement.insertBefore(aiBar, mount);
  });

  draw();
}
