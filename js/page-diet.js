import { escapeHtml, renderNav, stateBox } from "./common.js";
import { getDietProfile, setDietProfile } from "./storage.js";
import { computeTargets, ACTIVITY_LABELS, GOAL_LABELS } from "./diet.js";
import { suggestMealsForTarget } from "./meal-suggest.js";

renderNav("diet");

const slot = document.getElementById("diet-slot");

const DISCLAIMER =
  "These numbers are a rough estimate from a standard formula (Mifflin-St Jeor), not professional medical or nutritional advice. Consult a doctor or registered dietitian for guidance specific to you.";

function renderForm(existing) {
  const p = existing || {};
  slot.innerHTML = `
    <form class="diet-form" id="diet-form">
      <div class="form-row">
        <div class="form-field">
          <label for="f-sex">Sex</label>
          <select id="f-sex" required>
            <option value="">Select...</option>
            <option value="male" ${p.sex === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${p.sex === "female" ? "selected" : ""}>Female</option>
          </select>
        </div>
        <div class="form-field">
          <label for="f-age">Age (years)</label>
          <input type="number" id="f-age" min="10" max="100" value="${escapeHtml(p.age ?? "")}" required />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="f-height-ft">Height</label>
          <div class="height-inputs">
            <input type="number" id="f-height-ft" min="1" max="8" placeholder="ft" value="${escapeHtml(p.heightFt ?? "")}" required />
            <input type="number" id="f-height-in" min="0" max="11" placeholder="in" value="${escapeHtml(p.heightIn ?? "")}" required />
          </div>
        </div>
        <div class="form-field">
          <label for="f-weight">Weight (lb)</label>
          <input type="number" id="f-weight" min="60" max="700" value="${escapeHtml(p.weightLb ?? "")}" required />
        </div>
      </div>

      <div class="form-row">
        <div class="form-field full">
          <label for="f-activity">Activity level</label>
          <select id="f-activity" required>
            <option value="">Select...</option>
            ${Object.entries(ACTIVITY_LABELS)
              .map(
                ([k, label]) =>
                  `<option value="${k}" ${p.activity === k ? "selected" : ""}>${escapeHtml(label)}</option>`
              )
              .join("")}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-field full">
          <label for="f-goal">Goal</label>
          <select id="f-goal" required>
            <option value="">Select...</option>
            ${Object.entries(GOAL_LABELS)
              .map(
                ([k, label]) =>
                  `<option value="${k}" ${p.goal === k ? "selected" : ""}>${escapeHtml(label)}</option>`
              )
              .join("")}
          </select>
        </div>
      </div>

      <div class="btn-row" style="margin-bottom:0;">
        <button type="submit" class="btn btn-primary">${existing ? "Update My Plan" : "Calculate My Plan"}</button>
        ${existing ? `<button type="button" class="btn btn-ghost" id="cancel-edit">Cancel</button>` : ""}
      </div>
    </form>
    <p class="disclaimer">${escapeHtml(DISCLAIMER)}</p>
  `;

  document.getElementById("diet-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const profile = {
      sex: document.getElementById("f-sex").value,
      age: document.getElementById("f-age").value,
      heightFt: document.getElementById("f-height-ft").value,
      heightIn: document.getElementById("f-height-in").value,
      weightLb: document.getElementById("f-weight").value,
      activity: document.getElementById("f-activity").value,
      goal: document.getElementById("f-goal").value,
    };
    setDietProfile(profile);
    renderResults(profile);
  });

  const cancelBtn = document.getElementById("cancel-edit");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => renderResults(existing));
  }
}

function renderResults(profile) {
  const targets = computeTargets(profile);

  slot.innerHTML = `
    <div class="targets-summary">
      <div class="figures">
        <div>
          <div class="figure-value">${targets.calorieTarget} kcal</div>
          <div class="figure-label">daily calorie target</div>
        </div>
        <div>
          <div class="figure-value">${targets.proteinTarget}g</div>
          <div class="figure-label">daily protein target</div>
        </div>
      </div>
      <button class="btn" id="edit-info">Edit my info</button>
    </div>
    <div class="targets-detail">
      Estimated maintenance (TDEE): ~${targets.tdee} kcal/day &middot; Goal: ${escapeHtml(
    GOAL_LABELS[profile.goal] || ""
  )} &middot; Activity: ${escapeHtml(ACTIVITY_LABELS[profile.activity] || "")}
    </div>
    <p class="disclaimer">${escapeHtml(DISCLAIMER)}</p>

    <div class="btn-row">
      <button class="btn btn-primary" id="find-meals-btn">Suggest Recipes For My Plan</button>
    </div>
    <div id="meal-suggestions-slot"></div>
  `;

  document.getElementById("edit-info").addEventListener("click", () => renderForm(profile));
  document.getElementById("find-meals-btn").addEventListener("click", () => showMealSuggestions(targets));
}

async function showMealSuggestions(targets) {
  const suggestSlot = document.getElementById("meal-suggestions-slot");
  suggestSlot.innerHTML = '<div class="skeleton" style="height:200px;margin-top:20px;"></div>';
  try {
    const { perMealTarget, byGroup } = await suggestMealsForTarget(targets.calorieTarget);
    const groupNames = Object.keys(byGroup);
    const anyResults = groupNames.some((g) => byGroup[g].length > 0);

    if (!anyResults) {
      suggestSlot.innerHTML = stateBox(
        "Couldn't find recipes with a close nutrition estimate right now. Try again in a moment."
      );
      return;
    }

    suggestSlot.innerHTML = `
      <p class="subtle" style="font-size:0.85rem;margin-top:20px;">
        Targeting roughly ${perMealTarget} kcal per meal (daily target &divide; 3). Breakfast/Lunch/Dinner
        grouping is a heuristic — TheMealDB only labels "Breakfast" explicitly.
      </p>
      ${groupNames
        .map((group) => {
          const items = byGroup[group];
          if (items.length === 0) {
            return `<div class="meal-group"><h2>${escapeHtml(group)}</h2><p class="subtle">No close matches found.</p></div>`;
          }
          return `
          <div class="meal-group">
            <div class="meal-group-header"><h2>${escapeHtml(group)}</h2></div>
            <div class="grid">
              ${items
                .map(
                  ({ meal, nutrition }) => `
                <a class="recipe-tile" href="recipe.html?id=${encodeURIComponent(meal.id)}">
                  <div class="card">
                    <img src="${escapeHtml(meal.thumb)}" alt="${escapeHtml(meal.name)}" loading="lazy" />
                    <div class="card-body">
                      <h3>${escapeHtml(meal.name)}</h3>
                      <div class="cal-badge">~${nutrition.perServingCalories} kcal &middot; ~${nutrition.perServingProtein}g protein</div>
                    </div>
                  </div>
                </a>`
                )
                .join("")}
            </div>
          </div>`;
        })
        .join("")}
    `;
  } catch (e) {
    suggestSlot.innerHTML = stateBox(
      "TheMealDB seems to be unavailable right now. Please try again in a moment.",
      { retryLabel: "Try again" }
    );
    const btn = document.getElementById("state-retry");
    if (btn) btn.addEventListener("click", () => showMealSuggestions(targets));
  }
}

const existing = getDietProfile();
if (existing) {
  renderResults(existing);
} else {
  renderForm(null);
}
