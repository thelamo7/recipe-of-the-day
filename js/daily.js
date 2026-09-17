import { searchMealsByFirstLetter, lookupMealById } from "./api.js";
import { getMealPoolCache, setMealPoolCache, getDailyCache, setDailyCache } from "./storage.js";

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const POOL_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // rebuild pool monthly

function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysSinceEpoch(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

async function buildMealPool() {
  // TheMealDB has no bulk "list all recipes" endpoint, so we build a pool once
  // by querying every first letter and cache the resulting ID list.
  const results = await Promise.allSettled(LETTERS.map((l) => searchMealsByFirstLetter(l)));
  const ids = new Set();
  results.forEach((r) => {
    if (r.status === "fulfilled") {
      r.value.forEach((meal) => meal && ids.add(meal.id));
    }
  });
  const sorted = Array.from(ids).sort((a, b) => Number(a) - Number(b));
  if (sorted.length === 0) throw new Error("Could not build recipe pool");
  setMealPoolCache(sorted);
  return sorted;
}

async function getMealPool() {
  const cached = getMealPoolCache();
  if (cached && cached.ids && cached.ids.length > 0) {
    const age = Date.now() - new Date(cached.builtAt).getTime();
    if (age < POOL_MAX_AGE_MS) return cached.ids;
  }
  try {
    return await buildMealPool();
  } catch (e) {
    if (cached && cached.ids && cached.ids.length > 0) return cached.ids; // stale is better than nothing
    throw e;
  }
}

// Returns the normalized meal object for today, consistent across visitors/refreshes.
export async function getTodaysRecipe() {
  const dateStr = todayDateString();
  const cached = getDailyCache();
  if (cached && cached.date === dateStr && cached.meal) {
    return cached.meal;
  }
  const pool = await getMealPool();
  const dayNum = daysSinceEpoch(dateStr);
  const index = ((dayNum % pool.length) + pool.length) % pool.length;
  const mealId = pool[index];
  const meal = await lookupMealById(mealId);
  if (meal) setDailyCache(dateStr, meal);
  return meal;
}
