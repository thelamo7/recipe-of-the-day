import { escapeHtml, renderNav, starString, formatDateShort, stateBox } from "./common.js";
import { getCookedEntriesFlat } from "./storage.js";

renderNav("log");

const slot = document.getElementById("log-slot");
const sortRecentBtn = document.getElementById("sort-recent");
const sortRatingBtn = document.getElementById("sort-rating");

let sortMode = "recent";

function render() {
  const entries = getCookedEntriesFlat();
  if (entries.length === 0) {
    slot.innerHTML = stateBox("You haven't logged anything cooked yet. Mark a recipe as cooked to start your log.");
    return;
  }

  const sorted = [...entries].sort((a, b) => {
    if (sortMode === "rating") {
      return (b.rating || 0) - (a.rating || 0) || new Date(b.date) - new Date(a.date);
    }
    return new Date(b.date) - new Date(a.date);
  });

  slot.innerHTML = sorted
    .map(
      (e) => `
    <div class="log-entry">
      <img src="${escapeHtml(e.thumb)}" alt="${escapeHtml(e.name)}" loading="lazy" />
      <div>
        <a href="recipe.html?id=${encodeURIComponent(e.id)}"><strong>${escapeHtml(e.name)}</strong></a>
        <div class="date">${formatDateShort(e.date)}</div>
        <div class="stars">${e.rating ? starString(e.rating) : '<span class="subtle">Not rated</span>'}</div>
        ${e.comment ? `<div class="comment">${escapeHtml(e.comment)}</div>` : ""}
      </div>
    </div>
  `
    )
    .join("");
}

sortRecentBtn.addEventListener("click", () => {
  sortMode = "recent";
  sortRecentBtn.classList.add("btn-active");
  sortRatingBtn.classList.remove("btn-active");
  render();
});
sortRatingBtn.addEventListener("click", () => {
  sortMode = "rating";
  sortRatingBtn.classList.add("btn-active");
  sortRecentBtn.classList.remove("btn-active");
  render();
});

render();
