// "Recipes From My Pantry": TheMealDB's free API reliably supports filtering
// by a single ingredient at a time (filter.php?i=X), not a comma-separated
// list. So instead we call it once per pantry item and aggregate: a recipe
// that shows up under N different pantry-ingredient filters overlaps that
// recipe by N ingredients. We rank candidates by that overlap count.

import { filterByIngredient, lookupMealById } from "./api.js";
import { parseQuantity, formatQuantity, UNIT_TO_GRAMS_GENERIC } from "./quantity.js";

// "clove" vs "cloves", "cup" vs "cups", etc. mean the same unit — compare by
// gram-equivalence rather than exact string so plurals don't block a match.
function sameUnitFamily(unitA, unitB) {
  if (!unitA && !unitB) return true; // both bare counts
  if (!unitA || !unitB) return false;
  return UNIT_TO_GRAMS_GENERIC[unitA] === UNIT_TO_GRAMS_GENERIC[unitB];
}
import {
  getFullPantry,
  setPantryQuantityByName,
} from "./storage.js";

// Cap how many pantry items we query against the API to keep this snappy.
const MAX_QUERY_ITEMS = 25;

function simplifyForQuery(name) {
  // TheMealDB's ingredient names are usually short/generic; strip common
  // qualifiers so e.g. "Ground Beef" -> "beef" has a better chance of matching.
  return name
    .toLowerCase()
    .replace(/\b(fresh|dried|ground|chopped|sliced|large|small|boneless|skinless)\b/g, "")
    .trim();
}

export async function findRecipesFromPantry() {
  const pantry = getFullPantry();
  if (pantry.length === 0) return { candidates: [], queriedCount: 0 };

  const items = pantry.slice(0, MAX_QUERY_ITEMS);
  const results = await Promise.allSettled(
    items.map((item) => filterByIngredient(simplifyForQuery(item.name) || item.name))
  );

  const scoreById = new Map(); // id -> { meal, matchedPantryItems: Set }
  results.forEach((r, idx) => {
    if (r.status !== "fulfilled") return;
    const pantryItemName = items[idx].name;
    r.value.forEach((meal) => {
      if (!scoreById.has(meal.id)) {
        scoreById.set(meal.id, { id: meal.id, name: meal.name, thumb: meal.thumb, matchedPantryItems: new Set() });
      }
      scoreById.get(meal.id).matchedPantryItems.add(pantryItemName);
    });
  });

  const candidates = Array.from(scoreById.values())
    .map((c) => ({ ...c, overlapCount: c.matchedPantryItems.size }))
    .sort((a, b) => b.overlapCount - a.overlapCount);

  return { candidates, queriedCount: items.length };
}

// For a candidate recipe, fetch full detail and compute which ingredients
// are covered by the pantry vs. missing (so "closest matches" — missing
// just 1-2 items — can be surfaced even if overlap-by-name was imperfect).
export async function annotateMissingIngredients(mealId) {
  const meal = await lookupMealById(mealId);
  if (!meal) return null;
  const pantry = getFullPantry().map((p) => p.name.toLowerCase());

  const missing = [];
  const have = [];
  meal.ingredients.forEach(({ ingredient }) => {
    const name = ingredient.toLowerCase();
    const isInPantry = pantry.some((p) => name.includes(p) || p.includes(name));
    if (isInPantry) have.push(ingredient);
    else missing.push(ingredient);
  });

  return { meal, have, missing };
}

// Attempts to deduct a cooked recipe's ingredients from the pantry.
// Returns a summary list of { name, action: 'deducted'|'unparsed'|'not-in-pantry', before, after }
export function deductRecipeFromPantry(meal) {
  const pantry = getFullPantry();
  const summary = [];

  meal.ingredients.forEach(({ ingredient, measure }) => {
    const recipeQty = parseQuantity(measure);
    const match = pantry.find((p) => {
      const pn = p.name.toLowerCase();
      const rn = ingredient.toLowerCase();
      return pn.includes(rn) || rn.includes(pn);
    });

    if (!match) {
      summary.push({ name: ingredient, action: "not-in-pantry" });
      return;
    }

    const pantryQty = parseQuantity(match.quantity);
    if (recipeQty.amount === null || pantryQty.amount === null) {
      summary.push({ name: ingredient, action: "unparsed", before: match.quantity || "(no quantity set)" });
      return;
    }

    // Only deduct when units are compatible (same unit family, or both bare counts).
    if (!sameUnitFamily(recipeQty.unit, pantryQty.unit)) {
      summary.push({ name: ingredient, action: "unparsed", before: match.quantity });
      return;
    }

    const newAmount = Math.max(0, pantryQty.amount - recipeQty.amount);
    const newQtyStr = formatQuantity(newAmount, pantryQty.unitLabel);
    setPantryQuantityByName(match.name, newQtyStr, match.source, match.extraIndex);
    summary.push({
      name: ingredient,
      action: "deducted",
      before: match.quantity,
      after: newQtyStr,
    });
  });

  return summary;
}
