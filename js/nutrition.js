// Rough nutrition estimator. Not a substitute for real nutrition data —
// TheMealDB provides none, so we approximate using a small internal
// ingredient lookup table (per-100g density plus, where useful, a typical
// per-unit weight) and a generic measurement-unit-to-grams table.

import { UNIT_TO_GRAMS_GENERIC, parseQuantity } from "./quantity.js";

// Each entry: keywords to match against an ingredient string (checked as
// substrings, longest keyword wins), calories/protein per 100g, and an
// optional unitWeightGrams used when the recipe measure is a bare count
// (e.g. "2" eggs) or an explicit "whole" unit.
const INGREDIENT_DB = [
  { keywords: ["chicken breast"], cal100: 165, protein100: 31, unitWeightGrams: 174 },
  { keywords: ["chicken thigh"], cal100: 209, protein100: 26, unitWeightGrams: 110 },
  { keywords: ["chicken"], cal100: 239, protein100: 27, unitWeightGrams: 400 },
  { keywords: ["ground beef", "beef mince", "minced beef"], cal100: 254, protein100: 17 },
  { keywords: ["beef"], cal100: 250, protein100: 26 },
  { keywords: ["pork"], cal100: 242, protein100: 27 },
  { keywords: ["bacon"], cal100: 541, protein100: 37, unitWeightGrams: 8 },
  { keywords: ["sausage"], cal100: 301, protein100: 12, unitWeightGrams: 75 },
  { keywords: ["ham"], cal100: 145, protein100: 21 },
  { keywords: ["turkey"], cal100: 189, protein100: 29 },
  { keywords: ["lamb"], cal100: 294, protein100: 25 },
  { keywords: ["salmon"], cal100: 208, protein100: 20 },
  { keywords: ["tuna"], cal100: 132, protein100: 28 },
  { keywords: ["shrimp", "prawn"], cal100: 99, protein100: 24 },
  { keywords: ["cod", "fish fillet", "white fish", "fish"], cal100: 105, protein100: 23 },
  { keywords: ["egg"], cal100: 155, protein100: 13, unitWeightGrams: 50 },
  { keywords: ["milk"], cal100: 42, protein100: 3.4, cupGrams: 240 },
  { keywords: ["heavy cream", "double cream", "whipping cream"], cal100: 340, protein100: 2.1, cupGrams: 240 },
  { keywords: ["cream"], cal100: 195, protein100: 2.8, cupGrams: 240 },
  { keywords: ["butter"], cal100: 717, protein100: 0.9, cupGrams: 227 },
  { keywords: ["cream cheese"], cal100: 342, protein100: 6 },
  { keywords: ["cheddar", "parmesan", "mozzarella", "feta", "cheese"], cal100: 380, protein100: 24, cupGrams: 113 },
  { keywords: ["yogurt", "yoghurt"], cal100: 59, protein100: 10, cupGrams: 245 },
  { keywords: ["olive oil"], cal100: 884, protein100: 0, cupGrams: 218 },
  { keywords: ["vegetable oil", "sunflower oil", "canola oil", "oil"], cal100: 884, protein100: 0, cupGrams: 218 },
  { keywords: ["flour"], cal100: 364, protein100: 10, cupGrams: 120 },
  { keywords: ["sugar"], cal100: 387, protein100: 0, cupGrams: 200 },
  { keywords: ["brown sugar"], cal100: 380, protein100: 0, cupGrams: 220 },
  { keywords: ["honey"], cal100: 304, protein100: 0.3, cupGrams: 340 },
  { keywords: ["rice"], cal100: 130, protein100: 2.7, cupGrams: 195 },
  { keywords: ["pasta", "spaghetti", "noodle", "macaroni"], cal100: 131, protein100: 5, cupGrams: 140 },
  { keywords: ["bread"], cal100: 265, protein100: 9, unitWeightGrams: 30 },
  { keywords: ["tortilla"], cal100: 218, protein100: 6, unitWeightGrams: 45 },
  { keywords: ["oat"], cal100: 389, protein100: 17, cupGrams: 90 },
  { keywords: ["pastry", "puff pastry", "filo", "phyllo"], cal100: 558, protein100: 6 },
  { keywords: ["onion"], cal100: 40, protein100: 1.1, unitWeightGrams: 110 },
  { keywords: ["garlic"], cal100: 149, protein100: 6.4, unitWeightGrams: 3 },
  { keywords: ["tomato"], cal100: 18, protein100: 0.9, unitWeightGrams: 123 },
  { keywords: ["potato"], cal100: 77, protein100: 2, unitWeightGrams: 173 },
  { keywords: ["carrot"], cal100: 41, protein100: 0.9, unitWeightGrams: 61 },
  { keywords: ["bell pepper", "red pepper", "green pepper", "capsicum"], cal100: 31, protein100: 1, unitWeightGrams: 119 },
  { keywords: ["mushroom"], cal100: 22, protein100: 3.1, unitWeightGrams: 18 },
  { keywords: ["spinach"], cal100: 23, protein100: 2.9 },
  { keywords: ["lettuce"], cal100: 15, protein100: 1.4 },
  { keywords: ["broccoli"], cal100: 34, protein100: 2.8 },
  { keywords: ["cauliflower"], cal100: 25, protein100: 1.9 },
  { keywords: ["cucumber"], cal100: 15, protein100: 0.7 },
  { keywords: ["corn"], cal100: 86, protein100: 3.3 },
  { keywords: ["peas"], cal100: 81, protein100: 5.4 },
  { keywords: ["zucchini", "courgette"], cal100: 17, protein100: 1.2 },
  { keywords: ["eggplant", "aubergine"], cal100: 25, protein100: 1 },
  { keywords: ["lemon"], cal100: 29, protein100: 1.1, unitWeightGrams: 58 },
  { keywords: ["lime"], cal100: 30, protein100: 0.7, unitWeightGrams: 44 },
  { keywords: ["avocado"], cal100: 160, protein100: 2, unitWeightGrams: 150 },
  { keywords: ["banana"], cal100: 89, protein100: 1.1, unitWeightGrams: 118 },
  { keywords: ["apple"], cal100: 52, protein100: 0.3, unitWeightGrams: 182 },
  { keywords: ["black bean", "kidney bean", "bean"], cal100: 127, protein100: 8.7 },
  { keywords: ["chickpea", "garbanzo"], cal100: 164, protein100: 8.9 },
  { keywords: ["lentil"], cal100: 116, protein100: 9 },
  { keywords: ["almond", "walnut", "pecan", "cashew", "nut"], cal100: 600, protein100: 20 },
  { keywords: ["peanut butter"], cal100: 588, protein100: 25 },
  { keywords: ["soy sauce"], cal100: 53, protein100: 8, cupGrams: 255 },
  { keywords: ["vinegar"], cal100: 18, protein100: 0, cupGrams: 240 },
  { keywords: ["coconut milk"], cal100: 230, protein100: 2.3, cupGrams: 240 },
  { keywords: ["coconut"], cal100: 354, protein100: 3.3 },
  { keywords: ["stock", "broth", "bouillon"], cal100: 10, protein100: 1, cupGrams: 240 },
  { keywords: ["ginger"], cal100: 80, protein100: 1.8 },
  { keywords: ["chili", "chilli", "jalapeno"], cal100: 40, protein100: 1.9 },
  { keywords: ["tofu"], cal100: 76, protein100: 8 },
  { keywords: ["ketchup"], cal100: 112, protein100: 1.2 },
  { keywords: ["mayonnaise", "mayo"], cal100: 680, protein100: 1 },
  { keywords: ["mustard"], cal100: 66, protein100: 4 },
];

// Ingredients we intentionally treat as calorie/protein-negligible so they
// don't get silently "skipped" and reported as unmatched (salt, spices, etc).
const NEGLIGIBLE = [
  "salt", "pepper", "black pepper", "paprika", "cumin", "oregano", "basil",
  "thyme", "rosemary", "parsley", "cilantro", "coriander", "cinnamon",
  "nutmeg", "vanilla", "baking powder", "baking soda", "yeast", "water",
  "bay leaf", "chili flake", "cayenne", "turmeric", "clove", "food colouring",
  "food coloring", "zest",
];

function matchIngredient(ingredientName) {
  const name = ingredientName.toLowerCase();
  let best = null;
  for (const entry of INGREDIENT_DB) {
    for (const kw of entry.keywords) {
      if (name.includes(kw)) {
        if (!best || kw.length > best.kwLen) {
          best = { entry, kwLen: kw.length };
        }
      }
    }
  }
  return best ? best.entry : null;
}

function isNegligible(ingredientName) {
  const name = ingredientName.toLowerCase();
  return NEGLIGIBLE.some((kw) => name.includes(kw));
}

// Estimates total calories/protein for a recipe's ingredient list.
// Returns { calories, protein, servings, perServingCalories, perServingProtein,
//           matchedCount, totalCount }
export function estimateNutrition(ingredients, servings) {
  let totalCal = 0;
  let totalProtein = 0;
  let matchedCount = 0;

  ingredients.forEach(({ ingredient, measure }) => {
    if (isNegligible(ingredient)) {
      matchedCount += 1; // counted as "handled", contributes ~0
      return;
    }
    const entry = matchIngredient(ingredient);
    if (!entry) return; // unmatched — skip rather than error

    const { amount, unit } = parseQuantity(measure);
    let grams = null;

    if (unit && unit in UNIT_TO_GRAMS_GENERIC) {
      if (unit === "cup" || unit === "cups") {
        grams = (amount ?? 1) * (entry.cupGrams || UNIT_TO_GRAMS_GENERIC.cup);
      } else {
        grams = (amount ?? 1) * UNIT_TO_GRAMS_GENERIC[unit];
      }
    } else if (amount !== null && entry.unitWeightGrams) {
      // bare count with a known typical unit weight (e.g. "2" for eggs, "1" for onion)
      grams = amount * entry.unitWeightGrams;
    } else if (amount === null && entry.unitWeightGrams) {
      // no parseable amount at all — assume one typical unit
      grams = entry.unitWeightGrams;
    }

    if (grams === null || !isFinite(grams) || grams <= 0) return;

    totalCal += (grams / 100) * entry.cal100;
    totalProtein += (grams / 100) * entry.protein100;
    matchedCount += 1;
  });

  const servingCount = servings && servings > 0 ? servings : 1;

  return {
    calories: Math.round(totalCal),
    protein: Math.round(totalProtein * 10) / 10,
    servings: servingCount,
    perServingCalories: Math.round(totalCal / servingCount),
    perServingProtein: Math.round((totalProtein / servingCount) * 10) / 10,
    matchedCount,
    totalCount: ingredients.length,
    hasEstimate: matchedCount > 0,
  };
}

// TheMealDB doesn't expose a serving count field, so we look for a hint like
// "serves 4" in the instructions text; otherwise nutrition is reported for
// the whole recipe.
export function guessServings(instructions) {
  if (!instructions) return null;
  const m = instructions.match(/serves?\s+(\d+)/i) || instructions.match(/(\d+)\s+servings/i);
  if (m) {
    const n = Number(m[1]);
    if (n > 0 && n < 50) return n;
  }
  return null;
}
