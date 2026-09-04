// api.js — calls OpenAI or Gemini directly from the browser using a
// user-supplied API key. Keys never leave the browser except in the
// direct request to the provider's own API.

import { Store } from "./storage.js";

const SYSTEM_PROMPT = `You are a German language exercise generator for learners at CEFR levels A1-B2.
Always respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{"prompt": "sentence with a blank shown as ___", "options": ["a","b","c","d"], "answer": "correct option text", "explanation": "one short sentence in English explaining why"}`;

function buildUserPrompt({ topic, level, grammarCase }) {
  let p = `Generate ONE new multiple-choice German grammar exercise for the topic "${topic}" at CEFR level ${level}.`;
  if (grammarCase) p += ` Focus specifically on the ${grammarCase} case.`;
  p += ` Provide exactly 4 plausible options with only one correct answer. Keep the sentence natural and useful for everyday German.`;
  return p;
}

async function callOpenAI(key, userPrompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return text;
}

async function callGemini(key, userPrompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }] }],
        generationConfig: { temperature: 0.9 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

function extractJson(text) {
  // Strip markdown fences if the model added them anyway.
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in AI response.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function isAiConfigured() {
  const s = Store.getSettings();
  return (s.provider === "openai" && s.openaiKey) || (s.provider === "gemini" && s.geminiKey);
}

export async function generateExercise({ topic, level, grammarCase }) {
  const s = Store.getSettings();
  const userPrompt = buildUserPrompt({ topic, level, grammarCase });

  let rawText;
  if (s.provider === "openai" && s.openaiKey) {
    rawText = await callOpenAI(s.openaiKey, userPrompt);
  } else if (s.provider === "gemini" && s.geminiKey) {
    rawText = await callGemini(s.geminiKey, userPrompt);
  } else {
    throw new Error("No AI provider configured. Add an API key in Settings.");
  }

  const parsed = extractJson(rawText);
  if (!parsed.prompt || !Array.isArray(parsed.options) || !parsed.answer) {
    throw new Error("AI response was missing required fields.");
  }
  parsed.id = `ai_${Date.now()}`;
  parsed.case = grammarCase || null;
  parsed.aiGenerated = true;
  return parsed;
}

export async function generateVocabBatch({ level, count = 6 }) {
  const s = Store.getSettings();
  const userPrompt = `Generate ${count} German vocabulary flashcards for CEFR level ${level}. Respond with ONLY a JSON array, no markdown, each item shaped exactly like:
{"de": "German word or short phrase", "en": "English translation", "example": "one natural German example sentence"}`;

  let rawText;
  if (s.provider === "openai" && s.openaiKey) {
    rawText = await callOpenAI(s.openaiKey, userPrompt);
  } else if (s.provider === "gemini" && s.geminiKey) {
    rawText = await callGemini(s.geminiKey, userPrompt);
  } else {
    throw new Error("No AI provider configured. Add an API key in Settings.");
  }

  const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in AI response.");
  const arr = JSON.parse(cleaned.slice(start, end + 1));
  return arr.map((item, i) => ({
    id: `ai_v_${Date.now()}_${i}`,
    de: item.de,
    en: item.en,
    example: item.example || "",
    level,
  }));
}
