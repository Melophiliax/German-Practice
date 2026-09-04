// vocabData.js — fetches and caches data/vocab.json, and merges in any
// AI-generated vocab the user has saved locally.
import { Store } from "./storage.js";

let cache = null;

export default async function vocabData() {
  if (cache) return cache;
  const res = await fetch("data/vocab.json");
  const base = await res.json();
  const extra = Store.getSettings().extraVocab || [];
  cache = [...base, ...extra];
  return cache;
}

export function invalidateVocabCache() {
  cache = null;
}
