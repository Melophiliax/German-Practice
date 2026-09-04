// quizEngine.js — pulls exercises from the static topic pool and, optionally,
// blends in freshly AI-generated ones.

import { shuffle } from "./utils.js";
import { generateExercise } from "./api.js";

let topicsCache = null;

export async function loadTopics() {
  if (topicsCache) return topicsCache;
  const res = await fetch("data/grammar-topics.json");
  const data = await res.json();
  topicsCache = data.topics;
  return topicsCache;
}

export async function getTopicById(id) {
  const topics = await loadTopics();
  return topics.find((t) => t.id === id);
}

// Builds a static exercise pool filtered by topic ids / levels / cases.
export async function buildPool({ topicIds = [], levels = [], cases = [] } = {}) {
  const topics = await loadTopics();
  let pool = [];
  for (const topic of topics) {
    if (topicIds.length && !topicIds.includes(topic.id)) continue;
    if (levels.length && !levels.includes(topic.level)) continue;
    for (const ex of topic.exercises) {
      if (cases.length && ex.case && !cases.includes(ex.case)) continue;
      pool.push({ ...ex, topicId: topic.id, topicName: topic.name, level: topic.level });
    }
  }
  return shuffle(pool);
}

// Wraps a static exercise into a normalized quiz question shape.
export function toQuestion(ex) {
  return {
    id: ex.id,
    topicId: ex.topicId,
    topicName: ex.topicName,
    level: ex.level,
    case: ex.case || null,
    prompt: ex.prompt,
    options: shuffle(ex.options),
    answer: ex.answer,
    explanation: ex.explanation,
    aiGenerated: !!ex.aiGenerated,
  };
}

// Fetches one fresh AI-generated question for a given topic/level/case.
export async function fetchAiQuestion({ topicName, level, grammarCase }) {
  const ex = await generateExercise({ topic: topicName, level, grammarCase });
  return toQuestion({ ...ex, topicId: "ai", topicName, level });
}
