import { escapeHtml, renderNav, stateBox } from "./common.js";
import { PANTRY_STAPLES } from "./config.js";
import {
  getPantryChecked,
  setPantryItemChecked,
  getPantryExtras,
  addPantryExtra,
  removePantryExtra,
} from "./storage.js";
import { findRecipesFromPantry, annotateMissingIngredients } from "./pantry-match.js";

renderNav("pantry");

const staplesGrid = document.getElementById("staples-grid");
const extrasList = document.getElementById("extras-list");
const resultsSlot = document.getElementById("pantry-results-slot");

function renderStaples() {
  const checked = getPantryChecked();
  staplesGrid.innerHTML = PANTRY_STAPLES.map((name) => {
    const isChecked = name in checked;
    const id = `staple-${name.replace(/\s+/g, "-")}`;
    return `
      <div class="pantry-item">
        <input type="checkbox" id="${id}" ${isChecked ? "checked" : ""} data-name="${escapeHtml(name)}" />
        <label for="${id}">${escapeHtml(name)}</label>
        <input type="text" class="qty" placeholder="qty" value="${escapeHtml(checked[name] || "")}" data-name="${escapeHtml(name)}" ${isChecked ? "" : "disabled"} />
      </div>
    `;
  }).join("");

  staplesGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const name = cb.dataset.name;
      const qtyInput = staplesGrid.querySelector(`input.qty[data-name="${CSS.escape(name)}"]`);
      setPantryItemChecked(name, cb.checked, qtyInput.value);
      qtyInput.disabled = !cb.checked;
    });
  });
  staplesGrid.querySelectorAll("input.qty").forEach((input) => {
    input.addEventListener("change", () => {
      setPantryItemChecked(input.dataset.name, true, input.value);
    });
  });
}

function renderExtras() {
  const extras = getPantryExtras();
  if (extras.length === 0) {
    extrasList.innerHTML = `<p class="subtle" style="font-size:0.85rem;margin-top:8px;">No extras added yet.</p>`;
    return;
  }
  extrasList.innerHTML = extras
    .map(
      (e, i) => `
    <div class="extra-item">
      <span>${escapeHtml(e.name)}${e.quantity ? ` <span class="subtle">(${escapeHtml(e.quantity)})</span>` : ""}</span>
      <span class="remove" data-idx="${i}">remove</span>
    </div>
  `
    )
    .join("");
  extrasList.querySelectorAll(".remove").forEach((el) => {
    el.addEventListener("click", () => {
      removePantryExtra(Number(el.dataset.idx));
      renderExtras();
    });
  });
}

document.getElementById("extra-add").addEventListener("click", () => {
  const nameInput = document.getElementById("extra-name");
  const qtyInput = document.getElementById("extra-qty");
  if (!nameInput.value.trim()) return;
  addPantryExtra(nameInput.value, qtyInput.value);
  nameInput.value = "";
  qtyInput.value = "";
  renderExtras();
});

async function showResults() {
  resultsSlot.innerHTML = '<div class="skeleton" style="height:160px;margin-top:20px;"></div>';
  try {
    const { candidates, queriedCount } = await findRecipesFromPantry();
    if (queriedCount === 0) {
      resultsSlot.innerHTML = stateBox("Check off a few pantry items first, then try again.");
      return;
    }
    if (candidates.length === 0) {
      resultsSlot.innerHTML = stateBox(
        "No recipes matched your pantry items. Try adding a few more staples."
      );
      return;
    }

    const top = candidates.slice(0, 12);
    const details = await Promise.allSettled(top.map((c) => annotateMissingIngredients(c.id)));

    const cards = top
      .map((c, i) => {
        const d = details[i].status === "fulfilled" ? details[i].value : null;
        const missing = d ? d.missing : [];
        const closeMatch = missing.length > 0 && missing.length <= 2;
        return `
        <a class="recipe-tile" href="recipe.html?id=${encodeURIComponent(c.id)}">
          <div class="card">
            <img src="${escapeHtml(c.thumb)}" alt="${escapeHtml(c.name)}" loading="lazy" />
            <div class="card-body">
              <h3>${escapeHtml(c.name)}</h3>
              <div class="overlap-badge">${c.overlapCount} pantry match${c.overlapCount === 1 ? "" : "es"}</div>
              ${
                missing.length === 0
                  ? `<div class="meta" style="color:var(--accent-dark);">You have everything!</div>`
                  : closeMatch
                  ? `<div class="meta">Missing just: ${missing.map(escapeHtml).join(", ")}</div>`
                  : `<div class="meta">Missing ${missing.length} ingredient${missing.length === 1 ? "" : "s"}</div>`
              }
            </div>
          </div>
        </a>`;
      })
      .join("");

    resultsSlot.innerHTML = `<h2 style="margin-top:28px;">Recipes From My Pantry</h2><div class="grid">${cards}</div>`;
  } catch (e) {
    resultsSlot.innerHTML = stateBox(
      "TheMealDB seems to be unavailable right now. Please try again in a moment.",
      { retryLabel: "Try again" }
    );
    const btn = document.getElementById("state-retry");
    if (btn) btn.addEventListener("click", showResults);
  }
}

document.getElementById("find-recipes-btn").addEventListener("click", (e) => {
  e.preventDefault();
  showResults();
});

renderStaples();
renderExtras();
