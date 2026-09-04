import { h } from "../utils.js";
import { Store } from "../storage.js";

export async function renderSettings(root) {
  const settings = Store.getSettings();

  const page = h("div", { class: "page page-narrow" }, [
    h("div", { class: "page-header" }, [
      h("h1", {}, "Settings"),
      h("p", { class: "page-sub" }, "Add an API key to unlock unlimited AI-generated exercises and vocabulary. Keys are stored only in this browser's localStorage — never sent anywhere except directly to the provider you choose."),
    ]),

    h("div", { class: "settings-card" }, [
      h("h3", {}, "AI Provider"),
      h("div", { class: "radio-row" }, [
        providerOption("none", "Off (static content only)"),
        providerOption("openai", "OpenAI"),
        providerOption("gemini", "Google Gemini"),
      ]),

      h("label", { class: "field-label" }, "OpenAI API key"),
      h("input", {
        id: "openai-key",
        class: "text-input",
        type: "password",
        placeholder: "sk-...",
        value: settings.openaiKey || "",
      }),

      h("label", { class: "field-label" }, "Gemini API key"),
      h("input", {
        id: "gemini-key",
        class: "text-input",
        type: "password",
        placeholder: "AIza...",
        value: settings.geminiKey || "",
      }),

      h("button", { class: "btn btn-primary", id: "save-settings" }, "Save settings"),
      h("span", { id: "save-confirm", class: "save-confirm" }, ""),
    ]),

    h("div", { class: "settings-card" }, [
      h("h3", {}, "Data"),
      h("p", { class: "muted" }, "Progress, flashcard mastery, and speaking history all live in this browser only."),
      h("button", { class: "btn btn-danger-outline", id: "reset-btn" }, "Reset all progress"),
    ]),

    h("div", { class: "settings-card" }, [
      h("h3", {}, "About"),
      h("p", { class: "muted" }, "Deutsch Üben is a static, client-side app — no backend, no tracking. Grammar and vocabulary content is bundled locally; AI features are optional and use your own API key."),
    ]),
  ]);

  root.appendChild(page);

  function providerOption(value, label) {
    return h("label", { class: "radio-option" }, [
      h("input", {
        type: "radio",
        name: "provider",
        value,
        checked: settings.provider === value ? "checked" : null,
      }),
      h("span", {}, label),
    ]);
  }

  document.getElementById("save-settings").addEventListener("click", () => {
    const provider = document.querySelector('input[name="provider"]:checked')?.value || "none";
    const openaiKey = document.getElementById("openai-key").value.trim();
    const geminiKey = document.getElementById("gemini-key").value.trim();
    const merged = { ...Store.getSettings(), provider, openaiKey, geminiKey };
    Store.saveSettings(merged);
    const confirm = document.getElementById("save-confirm");
    confirm.textContent = "Saved ✓";
    setTimeout(() => (confirm.textContent = ""), 2000);
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (confirm("This clears all local progress, flashcard mastery, and API keys. Continue?")) {
      Store.resetAll();
      location.reload();
    }
  });
}
