// srs.js — a simplified SM-2 style scheduler.
// Boxes 0..5 map to increasing intervals (in days). Box 5 = "mastered".
const INTERVALS_DAYS = [0, 1, 2, 4, 8, 16];

export function nextState(prevState, quality) {
  // quality: "again" | "hard" | "good" | "easy"
  const state = prevState
    ? { ...prevState }
    : { box: 0, dueAt: Date.now(), reps: 0, lapses: 0 };

  state.reps += 1;

  if (quality === "again") {
    state.box = 0;
    state.lapses += 1;
  } else if (quality === "hard") {
    state.box = Math.max(0, state.box - 1);
  } else if (quality === "good") {
    state.box = Math.min(5, state.box + 1);
  } else if (quality === "easy") {
    state.box = Math.min(5, state.box + 2);
  }

  const days = INTERVALS_DAYS[state.box];
  state.dueAt = Date.now() + days * 24 * 60 * 60 * 1000;
  return state;
}

export function isDue(state) {
  if (!state) return true;
  return Date.now() >= state.dueAt;
}

export function masteryLabel(state) {
  if (!state || state.reps === 0) return "New";
  if (state.box >= 5) return "Mastered";
  if (state.box >= 3) return "Learning";
  return "Fresh";
}
