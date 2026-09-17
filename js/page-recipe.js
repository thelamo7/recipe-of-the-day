import { renderNav, stateBox } from "./common.js";
import { lookupMealById } from "./api.js";
import { renderRecipeDetail } from "./recipe-view.js";

renderNav(null);

const slot = document.getElementById("recipe-slot");
const params = new URLSearchParams(location.search);
const id = params.get("id");

async function load() {
  if (!id) {
    slot.innerHTML = stateBox("No recipe specified.");
    return;
  }
  slot.innerHTML = '<div class="skeleton"></div>';
  try {
    const meal = await lookupMealById(id);
    if (!meal) {
      slot.innerHTML = stateBox("Recipe not found.");
      return;
    }
    document.title = `${meal.name} — Recipe of the Day`;
    renderRecipeDetail(meal, slot, { enablePantryDeduction: true });
  } catch (e) {
    slot.innerHTML = stateBox(
      "TheMealDB seems to be unavailable right now. Please try again in a moment.",
      { retryLabel: "Try again" }
    );
    const btn = document.getElementById("state-retry");
    if (btn) btn.addEventListener("click", load);
  }
}

load();
