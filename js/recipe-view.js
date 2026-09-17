import { escapeHtml, extractYoutubeId } from "./common.js";
import { estimateNutrition, guessServings } from "./nutrition.js";
import { isFavorite, toggleFavorite, addCookedEntry } from "./storage.js";
import { deductRecipeFromPantry } from "./pantry-match.js";
import { getFullPantry } from "./storage.js";

function stepsFromInstructions(instructions) {
  const raw = instructions
    .split(/\r\n|\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    // strip leading "1." / "STEP 1" style numbering since we render our own
    .map((s) => s.replace(/^(step\s*\d+[:.)]?\s*|\d+[.)]\s*)/i, ""));
  return raw.length > 0 ? raw : [instructions.trim()].filter(Boolean);
}

// Renders a full recipe detail view into `container`.
// `options.offerPantryDeduction` shows a note when marking cooked that
// pantry deduction will be attempted (used from the pantry-suggested flow).
export function renderRecipeDetail(meal, container, options = {}) {
  const steps = stepsFromInstructions(meal.instructions || "");
  const servings = guessServings(meal.instructions);
  const nutrition = estimateNutrition(meal.ingredients, servings);
  const ytId = extractYoutubeId(meal.youtube);
  const fav = isFavorite(meal.id);
  const pantryAvailable = getFullPantry().length > 0;

  container.innerHTML = `
    <div class="recipe-hero">
      <img src="${escapeHtml(meal.thumb)}" alt="${escapeHtml(meal.name)}" loading="lazy" />
    </div>
    <h1 style="margin-top:20px;">${escapeHtml(meal.name)}</h1>
    <div class="recipe-meta">
      ${meal.category ? `<span class="pill">${escapeHtml(meal.category)}</span>` : ""}
      ${meal.area ? `<span class="pill pill-outline">${escapeHtml(meal.area)}</span>` : ""}
    </div>

    <div class="btn-row">
      <button class="btn ${fav ? "btn-active" : ""}" id="fav-btn">
        ${fav ? "★ Saved to Favorites" : "☆ Save to Favorites"}
      </button>
      <button class="btn btn-primary" id="cook-btn">✓ Mark as Cooked</button>
    </div>

    <div id="cook-form-slot"></div>

    <div class="recipe-body">
      <div>
        <h2>Ingredients</h2>
        <ul class="ingredient-list">
          ${meal.ingredients
            .map(
              (i) =>
                `<li><span>${escapeHtml(i.ingredient)}</span><span>${escapeHtml(i.measure)}</span></li>`
            )
            .join("")}
        </ul>

        <div class="section nutrition-box">
          <div class="eyebrow">Estimated Nutrition</div>
          ${
            nutrition.hasEstimate
              ? `
            <div class="figures">
              <div>
                <div class="figure-value">~${nutrition.perServingCalories} kcal</div>
                <div class="figure-label">calories${servings ? " / serving" : ""}</div>
              </div>
              <div>
                <div class="figure-value">~${nutrition.perServingProtein}g</div>
                <div class="figure-label">protein${servings ? " / serving" : ""}</div>
              </div>
            </div>
            <div class="note">Estimate from ${nutrition.matchedCount} of ${nutrition.totalCount} ingredients${
                  servings ? `, assuming ${servings} servings` : " (whole recipe)"
                }. Not verified nutrition data.</div>
          `
              : `<div class="note">Not enough recognizable ingredients to estimate nutrition.</div>`
          }
        </div>
      </div>

      <div>
        <h2>Instructions</h2>
        <ol class="steps">
          ${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
        </ol>

        ${
          ytId
            ? `
          <div class="section">
            <h2>Watch how it's made</h2>
            <a href="${escapeHtml(meal.youtube)}" target="_blank" rel="noopener">${escapeHtml(meal.youtube)}</a>
            <div class="youtube-embed">
              <iframe src="https://www.youtube.com/embed/${escapeHtml(ytId)}" title="Recipe video" allowfullscreen></iframe>
            </div>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;

  container.querySelector("#fav-btn").addEventListener("click", () => {
    const nowFav = toggleFavorite(meal);
    const btn = container.querySelector("#fav-btn");
    btn.textContent = nowFav ? "★ Saved to Favorites" : "☆ Save to Favorites";
    btn.classList.toggle("btn-active", nowFav);
  });

  container.querySelector("#cook-btn").addEventListener("click", () => {
    renderCookForm(container.querySelector("#cook-form-slot"), meal, options, pantryAvailable);
  });
}

function renderCookForm(slot, meal, options, pantryAvailable) {
  let rating = 0;
  slot.innerHTML = `
    <div class="cook-form">
      <label>How did it turn out?</label>
      <div class="star-picker" id="star-picker">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}">★</button>`).join("")}
      </div>
      <label>Notes (optional)</label>
      <textarea id="cook-comment" placeholder="How did it go? Any tweaks you made..."></textarea>
      ${
        options.enablePantryDeduction && pantryAvailable
          ? `<p class="subtle" style="font-size:0.8rem;margin-top:8px;">We'll try to deduct these ingredients from your pantry.</p>`
          : ""
      }
      <div class="btn-row" style="margin-bottom:0;">
        <button class="btn btn-primary" id="save-cook">Save</button>
        <button class="btn btn-ghost" id="cancel-cook">Cancel</button>
      </div>
      <div id="deduction-result"></div>
    </div>
  `;

  const starBtns = Array.from(slot.querySelectorAll("[data-star]"));
  starBtns.forEach((b) => {
    b.addEventListener("click", () => {
      rating = Number(b.dataset.star);
      starBtns.forEach((sb) => sb.classList.toggle("filled", Number(sb.dataset.star) <= rating));
    });
  });

  slot.querySelector("#cancel-cook").addEventListener("click", () => {
    slot.innerHTML = "";
  });

  slot.querySelector("#save-cook").addEventListener("click", () => {
    const comment = slot.querySelector("#cook-comment").value.trim();
    addCookedEntry(meal, { rating: rating || null, comment });

    let deductionHtml = "";
    if (options.enablePantryDeduction && pantryAvailable) {
      const summary = deductRecipeFromPantry(meal);
      deductionHtml = renderDeductionSummary(summary);
    }

    slot.innerHTML = `<div class="cook-form"><p><strong>Saved!</strong> Logged as cooked${
      rating ? ` (${rating}★)` : ""
    }.</p>${deductionHtml}</div>`;
  });
}

function renderDeductionSummary(summary) {
  if (summary.length === 0) return "";
  const items = summary
    .map((s) => {
      if (s.action === "deducted") {
        return `<li class="tag-deducted">✓ ${escapeHtml(s.name)}: ${escapeHtml(s.before)} → ${escapeHtml(s.after)}</li>`;
      }
      if (s.action === "not-in-pantry") {
        return `<li class="subtle">— ${escapeHtml(s.name)}: not in pantry, skipped</li>`;
      }
      return `<li class="tag-skipped">⚠ ${escapeHtml(s.name)}: couldn't parse amount (${escapeHtml(
        s.before || ""
      )}), left as-is</li>`;
    })
    .join("");
  return `
    <div>
      <p class="subtle" style="font-size:0.85rem;margin-top:14px;">Pantry update:</p>
      <ul class="deduction-summary">${items}</ul>
      <p class="subtle" style="font-size:0.78rem;">Double-check <a href="pantry.html">My Pantry</a> and correct anything that looks off.</p>
    </div>
  `;
}
