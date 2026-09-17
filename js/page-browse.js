import { escapeHtml, renderNav, stateBox } from "./common.js";
import { getCategories, filterByCategory } from "./api.js";

renderNav("browse");

const slot = document.getElementById("browse-slot");
const subtitle = document.getElementById("browse-subtitle");

function getCategoryParam() {
  return new URLSearchParams(location.search).get("category");
}

async function showCategoryList() {
  subtitle.textContent = "Pick a category to explore recipes.";
  slot.innerHTML = '<div class="skeleton"></div>';
  try {
    const categories = await getCategories();
    slot.innerHTML = `<div class="category-chip-grid">
      ${categories
        .map(
          (c) => `
        <a class="category-chip" href="browse.html?category=${encodeURIComponent(c.name)}">
          <img src="${escapeHtml(c.thumb)}" alt="" loading="lazy" />
          ${escapeHtml(c.name)}
        </a>`
        )
        .join("")}
    </div>`;
  } catch (e) {
    slot.innerHTML = stateBox(
      "TheMealDB seems to be unavailable right now. Please try again in a moment.",
      { retryLabel: "Try again" }
    );
    const btn = document.getElementById("state-retry");
    if (btn) btn.addEventListener("click", showCategoryList);
  }
}

async function showCategoryGrid(category) {
  subtitle.innerHTML = `<a href="browse.html">&larr; All categories</a>`;
  slot.innerHTML = '<div class="skeleton"></div>';
  try {
    const meals = await filterByCategory(category);
    if (meals.length === 0) {
      slot.innerHTML = stateBox(`No recipes found in "${category}".`);
      return;
    }
    slot.innerHTML = `<h2 style="margin-top:20px;">${escapeHtml(category)}</h2><div class="grid">
      ${meals
        .map(
          (m) => `
        <a class="recipe-tile" href="recipe.html?id=${encodeURIComponent(m.id)}">
          <div class="card">
            <img src="${escapeHtml(m.thumb)}" alt="${escapeHtml(m.name)}" loading="lazy" />
            <div class="card-body"><h3>${escapeHtml(m.name)}</h3></div>
          </div>
        </a>`
        )
        .join("")}
    </div>`;
  } catch (e) {
    slot.innerHTML = stateBox(
      "TheMealDB seems to be unavailable right now. Please try again in a moment.",
      { retryLabel: "Try again" }
    );
    const btn = document.getElementById("state-retry");
    if (btn) btn.addEventListener("click", () => showCategoryGrid(category));
  }
}

const category = getCategoryParam();
if (category) {
  document.title = `${category} — Browse — Recipe of the Day`;
  showCategoryGrid(category);
} else {
  showCategoryList();
}
