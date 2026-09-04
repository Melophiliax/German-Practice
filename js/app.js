import { registerRoute, startRouter } from "./router.js";
import { renderHome } from "./views/home.js";
import { renderGrammarList, renderGrammarTopic } from "./views/grammar.js";
import { renderCustomQuiz } from "./views/customQuiz.js";
import { renderFlashcards } from "./views/flashcards.js";
import { renderSpeaking } from "./views/speaking.js";
import { renderSettings } from "./views/settings.js";

registerRoute("/", renderHome);
registerRoute("/grammar", renderGrammarList);
registerRoute("/grammar/:topicId", renderGrammarTopic);
registerRoute("/custom", renderCustomQuiz);
registerRoute("/flashcards", renderFlashcards);
registerRoute("/speaking", renderSpeaking);
registerRoute("/settings", renderSettings);

const appRoot = document.getElementById("app");

startRouter(appRoot, async (root) => {
  root.innerHTML = `<div class="page"><h1>Page not found</h1><p><a href="#/">Go home →</a></p></div>`;
});

// Close the mobile menu (if open) whenever navigation happens.
window.addEventListener("hashchange", () => {
  document.body.classList.remove("nav-open");
});
