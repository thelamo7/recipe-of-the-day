export const API_BASE = "https://www.themealdb.com/api/json/v1/1";

// TheMealDB has no lunch/dinner distinction, only a "Breakfast" category —
// so lunch/dinner groupings here are a reasonable heuristic split of the
// remaining main-dish categories, not something the API defines.
export const MEAL_CATEGORY_GROUPS = {
  Breakfast: ["Breakfast"],
  Lunch: ["Vegetarian", "Vegan", "Seafood", "Side", "Starter", "Pasta"],
  Dinner: ["Beef", "Chicken", "Pork", "Lamb", "Goat", "Miscellaneous"],
};

export const PANTRY_STAPLES = [
  "Eggs", "Milk", "Butter", "Cheese", "Yogurt", "Cream",
  "Rice", "Pasta", "Flour", "Sugar", "Bread", "Oats",
  "Onions", "Garlic", "Potatoes", "Carrots", "Tomatoes", "Bell Pepper",
  "Chicken", "Ground Beef", "Bacon", "Sausage",
  "Olive Oil", "Vegetable Oil", "Salt", "Black Pepper", "Soy Sauce", "Vinegar",
  "Lemon", "Onion Powder", "Garlic Powder", "Chicken Stock", "Honey", "Peanut Butter"
];
