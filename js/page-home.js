import { renderNav, stateBox } from "./common.js";
import { getTodaysRecipe } from "./daily.js";
import { renderRecipeDetail } from "./recipe-view.js";

renderNav("home");

const label = document.getElementById("today-label");
label.textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const slot = document.getElementById("recipe-slot");

async function load() {
  slot.innerHTML = '<div class="skeleton"></div>';
  try {
    const meal = await getTodaysRecipe();
    if (!meal) {
      slot.innerHTML = stateBox("Couldn't load today's recipe.", { retryLabel: "Try again" });
      bindRetry();
      return;
    }
    renderRecipeDetail(meal, slot, { enablePantryDeduction: true });
  } catch (e) {
    slot.innerHTML = stateBox(
      "TheMealDB seems to be unavailable right now. Please try again in a moment.",
      { retryLabel: "Try again" }
    );
    bindRetry();
  }
}

function bindRetry() {
  const btn = document.getElementById("state-retry");
  if (btn) btn.addEventListener("click", load);
}

load();
