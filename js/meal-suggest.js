import { filterByCategory, lookupMealById } from "./api.js";
import { estimateNutrition, guessServings } from "./nutrition.js";
import { MEAL_CATEGORY_GROUPS } from "./config.js";

// How many recipes to pull detail+nutrition for per meal group — bounded to
// keep the number of API calls reasonable on a single page load.
const CANDIDATES_PER_GROUP = 14;
const RESULTS_PER_GROUP = 6;

async function collectCandidateIds(categories) {
  const results = await Promise.allSettled(categories.map((c) => filterByCategory(c)));
  const seen = new Set();
  const ids = [];
  results.forEach((r) => {
    if (r.status !== "fulfilled") return;
    r.value.forEach((m) => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        ids.push(m.id);
      }
    });
  });
  return ids;
}

// Deterministic-ish sample: take an evenly spaced slice rather than always
// the first N, so results aren't dominated by whichever category was queried
// first.
function sampleIds(ids, count) {
  if (ids.length <= count) return ids;
  const step = ids.length / count;
  const sample = [];
  for (let i = 0; i < count; i++) {
    sample.push(ids[Math.floor(i * step)]);
  }
  return sample;
}

// For one meal group, returns up to RESULTS_PER_GROUP recipes whose
// estimated calories are closest to `perMealCalorieTarget`.
async function suggestForGroup(categories, perMealCalorieTarget) {
  const ids = await collectCandidateIds(categories);
  if (ids.length === 0) return [];
  const sample = sampleIds(ids, CANDIDATES_PER_GROUP);

  const details = await Promise.allSettled(sample.map((id) => lookupMealById(id)));
  const scored = [];
  details.forEach((r) => {
    if (r.status !== "fulfilled" || !r.value) return;
    const meal = r.value;
    const servings = guessServings(meal.instructions);
    const nutrition = estimateNutrition(meal.ingredients, servings);
    if (!nutrition.hasEstimate || nutrition.perServingCalories <= 0) return;
    const distance = Math.abs(nutrition.perServingCalories - perMealCalorieTarget);
    scored.push({ meal, nutrition, distance });
  });

  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, RESULTS_PER_GROUP);
}

// Suggests recipes for each meal group (Breakfast/Lunch/Dinner), targeting
// roughly dailyCalorieTarget / 3 per meal.
export async function suggestMealsForTarget(dailyCalorieTarget) {
  const perMealTarget = Math.round(dailyCalorieTarget / 3);
  const groupNames = Object.keys(MEAL_CATEGORY_GROUPS);

  const groupResults = await Promise.allSettled(
    groupNames.map((name) => suggestForGroup(MEAL_CATEGORY_GROUPS[name], perMealTarget))
  );

  const byGroup = {};
  groupNames.forEach((name, i) => {
    byGroup[name] = groupResults[i].status === "fulfilled" ? groupResults[i].value : [];
  });

  return { perMealTarget, byGroup };
}
