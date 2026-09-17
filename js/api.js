import { API_BASE } from "./config.js";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TheMealDB request failed (${res.status})`);
  return res.json();
}

// Normalize a raw TheMealDB meal object into a simpler shape used throughout the app.
export function normalizeMeal(raw) {
  if (!raw) return null;
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = raw[`strIngredient${i}`];
    const measure = raw[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push({ ingredient: ing.trim(), measure: (measure || "").trim() });
    }
  }
  return {
    id: raw.idMeal,
    name: raw.strMeal,
    thumb: raw.strMealThumb,
    category: raw.strCategory || "",
    area: raw.strArea || "",
    instructions: raw.strInstructions || "",
    youtube: raw.strYoutube && raw.strYoutube.trim() ? raw.strYoutube.trim() : null,
    source: raw.strSource || null,
    tags: raw.strTags ? raw.strTags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    ingredients,
  };
}

export async function lookupMealById(id) {
  const data = await fetchJSON(`${API_BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  const meal = data.meals && data.meals[0];
  return normalizeMeal(meal);
}

export async function searchMealsByFirstLetter(letter) {
  const data = await fetchJSON(`${API_BASE}/search.php?f=${encodeURIComponent(letter)}`);
  return (data.meals || []).map(normalizeMeal);
}

export async function getCategories() {
  const data = await fetchJSON(`${API_BASE}/categories.php`);
  return (data.categories || []).map((c) => ({
    id: c.idCategory,
    name: c.strCategory,
    thumb: c.strCategoryThumb,
    description: c.strCategoryDescription,
  }));
}

export async function filterByCategory(category) {
  const data = await fetchJSON(`${API_BASE}/filter.php?c=${encodeURIComponent(category)}`);
  return (data.meals || []).map((m) => ({
    id: m.idMeal,
    name: m.strMeal,
    thumb: m.strMealThumb,
  }));
}

export async function filterByIngredient(ingredient) {
  const data = await fetchJSON(`${API_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`);
  return (data.meals || []).map((m) => ({
    id: m.idMeal,
    name: m.strMeal,
    thumb: m.strMealThumb,
  }));
}
