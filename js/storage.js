// localStorage-backed data access: favorites, cooked log, pantry.

const KEYS = {
  FAVORITES: "rotd.favorites",
  COOKED: "rotd.cooked",
  PANTRY_CHECKED: "rotd.pantry.checked",
  PANTRY_EXTRAS: "rotd.pantry.extras",
  MEAL_POOL: "rotd.mealPool",
  DAILY_CACHE: "rotd.dailyCache",
  DIET_PROFILE: "rotd.dietProfile",
  LEARNED_SKILLS: "rotd.learnedSkills",
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // storage unavailable or full — fail silently, app still works this session
  }
}

// ---- Favorites ----
// { [mealId]: { id, name, thumb, addedAt } }
export function getFavorites() {
  return readJSON(KEYS.FAVORITES, {});
}

export function isFavorite(mealId) {
  const favs = getFavorites();
  return Boolean(favs[mealId]);
}

export function toggleFavorite(meal) {
  const favs = getFavorites();
  if (favs[meal.id]) {
    delete favs[meal.id];
  } else {
    favs[meal.id] = {
      id: meal.id,
      name: meal.name,
      thumb: meal.thumb,
      addedAt: new Date().toISOString(),
    };
  }
  writeJSON(KEYS.FAVORITES, favs);
  return Boolean(favs[meal.id]);
}

// ---- Cooked log ----
// { [mealId]: { id, name, thumb, entries: [{ date, rating, comment }] } }
export function getCookedLog() {
  return readJSON(KEYS.COOKED, {});
}

export function addCookedEntry(meal, { rating, comment }) {
  const log = getCookedLog();
  if (!log[meal.id]) {
    log[meal.id] = { id: meal.id, name: meal.name, thumb: meal.thumb, entries: [] };
  }
  log[meal.id].name = meal.name;
  log[meal.id].thumb = meal.thumb;
  log[meal.id].entries.push({
    date: new Date().toISOString(),
    rating: rating || null,
    comment: comment || "",
  });
  writeJSON(KEYS.COOKED, log);
  return log[meal.id];
}

export function getCookedEntriesFlat() {
  const log = getCookedLog();
  const flat = [];
  Object.values(log).forEach((recipe) => {
    recipe.entries.forEach((entry) => {
      flat.push({
        id: recipe.id,
        name: recipe.name,
        thumb: recipe.thumb,
        date: entry.date,
        rating: entry.rating,
        comment: entry.comment,
      });
    });
  });
  return flat;
}

// ---- Pantry ----
// checked: { [staple name]: quantity string | "" }
// extras: [{ name, quantity }]
export function getPantryChecked() {
  return readJSON(KEYS.PANTRY_CHECKED, {});
}

export function setPantryItemChecked(name, checked, quantity) {
  const items = getPantryChecked();
  if (checked) {
    items[name] = quantity !== undefined ? quantity : items[name] || "";
  } else {
    delete items[name];
  }
  writeJSON(KEYS.PANTRY_CHECKED, items);
  return items;
}

export function setPantryItemQuantity(name, quantity) {
  const items = getPantryChecked();
  if (name in items) {
    items[name] = quantity;
    writeJSON(KEYS.PANTRY_CHECKED, items);
  }
  return items;
}

export function getPantryExtras() {
  return readJSON(KEYS.PANTRY_EXTRAS, []);
}

export function addPantryExtra(name, quantity) {
  const extras = getPantryExtras();
  extras.push({ name: name.trim(), quantity: quantity || "" });
  writeJSON(KEYS.PANTRY_EXTRAS, extras);
  return extras;
}

export function removePantryExtra(index) {
  const extras = getPantryExtras();
  extras.splice(index, 1);
  writeJSON(KEYS.PANTRY_EXTRAS, extras);
  return extras;
}

export function updatePantryExtraQuantity(index, quantity) {
  const extras = getPantryExtras();
  if (extras[index]) {
    extras[index].quantity = quantity;
    writeJSON(KEYS.PANTRY_EXTRAS, extras);
  }
  return extras;
}

// Unified pantry list: [{ name, quantity, source: 'staple'|'extra', extraIndex? }]
export function getFullPantry() {
  const checked = getPantryChecked();
  const extras = getPantryExtras();
  const list = Object.entries(checked).map(([name, quantity]) => ({
    name,
    quantity,
    source: "staple",
  }));
  extras.forEach((e, i) => {
    list.push({ name: e.name, quantity: e.quantity, source: "extra", extraIndex: i });
  });
  return list;
}

export function setPantryQuantityByName(name, quantity, source, extraIndex) {
  if (source === "extra") {
    updatePantryExtraQuantity(extraIndex, quantity);
  } else {
    setPantryItemQuantity(name, quantity);
  }
}

// ---- Meal ID pool (for deterministic daily pick) ----
export function getMealPoolCache() {
  return readJSON(KEYS.MEAL_POOL, null);
}

export function setMealPoolCache(ids) {
  writeJSON(KEYS.MEAL_POOL, { ids, builtAt: new Date().toISOString() });
}

// ---- Daily recipe cache (avoid refetching detail on repeat visits same day) ----
export function getDailyCache() {
  return readJSON(KEYS.DAILY_CACHE, null);
}

export function setDailyCache(dateStr, meal) {
  writeJSON(KEYS.DAILY_CACHE, { date: dateStr, meal });
}

// ---- Diet plan profile ----
// { sex, age, heightFt, heightIn, weightLb, activity, goal }
export function getDietProfile() {
  return readJSON(KEYS.DIET_PROFILE, null);
}

export function setDietProfile(profile) {
  writeJSON(KEYS.DIET_PROFILE, profile);
}

// ---- Culinary Basics progress ----
// { [skillId]: true }
export function getLearnedSkills() {
  return readJSON(KEYS.LEARNED_SKILLS, {});
}

export function isSkillLearned(skillId) {
  return Boolean(getLearnedSkills()[skillId]);
}

export function toggleSkillLearned(skillId) {
  const learned = getLearnedSkills();
  if (learned[skillId]) {
    delete learned[skillId];
  } else {
    learned[skillId] = true;
  }
  writeJSON(KEYS.LEARNED_SKILLS, learned);
  return Boolean(learned[skillId]);
}
