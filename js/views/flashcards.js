import { h } from "../utils.js";
import vocabData from "../vocabData.js";
import { Store } from "../storage.js";
import { nextState, masteryLabel } from "../srs.js";
import { speak, isSynthesisSupported } from "../speech.js";
import { generateVocabBatch, isAiConfigured } from "../api.js";

const LEVELS = ["A1", "A2", "B1", "B2"];

export async function renderFlashcards(root) {
  let vocab = await vocabData();
  let srs = Store.getSrsState();
  const filter = { level: "All" };
  let deck = [];
  let cursor = 0;
  let flipped = false;

  const page = h("div", { class: "page" }, [
    h("div", { class: "page-header" }, [
      h("h1", {}, "Flashcards"),
      h("p", { class: "page-sub" }, "Flip to reveal, then rate how well you knew it. Cards you rate lower come back sooner."),
    ]),
    h("div", { class: "filter-row", id: "fc-filter" }, []),
    h("div", { id: "fc-mount" }, []),
    h("div", { class: "fc-footer" }, [
      h("span", { id: "fc-progress" }, ""),
      h("button", { class: "btn btn-outline btn-sm", id: "fc-ai-btn" }, "Generate 6 new cards with AI"),
    ]),
  ]);
  root.appendChild(page);

  const filterBar = document.getElementById("fc-filter");
  ["All", ...LEVELS].forEach((lvl) => {
    const chip = h("button", { class: `chip ${lvl === "All" ? "chip-active" : ""}` }, lvl);
    chip.addEventListener("click", () => {
      filter.level = lvl;
      [...filterBar.children].forEach((c) => c.classList.remove("chip-active"));
      chip.classList.add("chip-active");
      buildDeck();
    });
    filterBar.appendChild(chip);
  });

  function buildDeck() {
    srs = Store.getSrsState();
    deck = vocab
      .filter((v) => filter.level === "All" || v.level === filter.level)
      .sort((a, b) => {
        const dueA = srs[a.id]?.dueAt || 0;
        const dueB = srs[b.id]?.dueAt || 0;
        return dueA - dueB;
      });
    cursor = 0;
    flipped = false;
    drawCard();
  }

  function drawCard() {
    const mount = document.getElementById("fc-mount");
    mount.innerHTML = "";
    document.getElementById("fc-progress").textContent = `Card ${Math.min(cursor + 1, deck.length)} of ${deck.length}`;

    if (!deck.length) {
      mount.appendChild(h("p", { class: "empty-state" }, "No vocabulary for this level yet."));
      return;
    }
    if (cursor >= deck.length) {
      mount.appendChild(
        h("div", { class: "quiz-summary" }, [
          h("h2", {}, "Deck finished!"),
          h("p", {}, "Nice work — come back later for cards that are due again."),
          h("button", { class: "btn btn-primary", onClick: buildDeck }, "Restart deck"),
        ])
      );
      return;
    }

    const card = deck[cursor];
    const state = srs[card.id];

    const cardEl = h("div", { class: `flashcard ${flipped ? "is-flipped" : ""}`, onClick: () => { flipped = !flipped; drawCard(); } }, [
      h("div", { class: "flashcard-inner" }, [
        h("div", { class: "flashcard-face flashcard-front" }, [
          h("span", { class: "level-tag" }, card.level),
          h("span", { class: "mastery-tag" }, masteryLabel(state)),
          h("div", { class: "flashcard-word" }, card.de),
          h("div", { class: "flashcard-hint" }, "Tap to flip"),
        ]),
        h("div", { class: "flashcard-face flashcard-back" }, [
          h("div", { class: "flashcard-translation" }, card.en),
          card.example ? h("div", { class: "flashcard-example" }, card.example) : null,
        ]),
      ]),
    ]);

    const speakBtn = isSynthesisSupported()
      ? h(
          "button",
          {
            class: "btn btn-ghost btn-sm",
            onClick: (e) => {
              e.stopPropagation();
              speak(card.de);
            },
          },
          "🔊 Listen"
        )
      : null;

    const rateRow = flipped
      ? h("div", { class: "rate-row" }, [
          rateBtn("Again", "again"),
          rateBtn("Hard", "hard"),
          rateBtn("Good", "good"),
          rateBtn("Easy", "easy"),
        ])
      : null;

    const wrap = h("div", { class: "flashcard-wrap" }, [cardEl, speakBtn, rateRow]);
    document.getElementById("fc-mount").appendChild(wrap);

    function rateBtn(label, quality) {
      return h(
        "button",
        {
          class: `rate-btn rate-${quality}`,
          onClick: (e) => {
            e.stopPropagation();
            const updated = nextState(srs[card.id], quality);
            srs[card.id] = updated;
            Store.saveSrsState(srs);
            cursor += 1;
            flipped = false;
            drawCard();
          },
        },
        label
      );
    }
  }

  document.getElementById("fc-ai-btn").addEventListener("click", async (e) => {
    if (!(await isAiConfigured())) {
      alert("Add an OpenAI or Gemini API key in Settings first.");
      return;
    }
    e.target.disabled = true;
    e.target.textContent = "Generating…";
    try {
      const level = filter.level === "All" ? "A2" : filter.level;
      const cards = await generateVocabBatch({ level, count: 6 });
      Store.addExtraVocab(cards);
      vocab = [...vocab, ...cards];
      buildDeck();
    } catch (err) {
      alert("Could not generate cards: " + err.message);
    } finally {
      e.target.disabled = false;
      e.target.textContent = "Generate 6 new cards with AI";
    }
  });

  buildDeck();
}
