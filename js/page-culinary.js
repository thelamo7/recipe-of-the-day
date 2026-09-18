import { escapeHtml, renderNav, extractYoutubeId } from "./common.js";
import { CULINARY_CATEGORIES } from "./culinary-data.js";
import { getLearnedSkills, toggleSkillLearned } from "./storage.js";

renderNav("culinary");

const slot = document.getElementById("culinary-slot");
const totalSkills = CULINARY_CATEGORIES.reduce((sum, cat) => sum + cat.skills.length, 0);

function countLearnedInCategory(category, learned) {
  return category.skills.filter((s) => learned[s.id]).length;
}

function countLearnedTotal(learned) {
  return CULINARY_CATEGORIES.reduce((sum, cat) => sum + countLearnedInCategory(cat, learned), 0);
}

function renderVideo(skill) {
  if (!skill.youtube || !skill.youtube.url) {
    return `<p class="subtle" style="font-size:0.82rem;">Video coming soon.</p>`;
  }
  const ytId = extractYoutubeId(skill.youtube.url);
  const label = skill.youtube.channel
    ? `Watch: ${escapeHtml(skill.youtube.title || "tutorial")} (${escapeHtml(skill.youtube.channel)})`
    : `Watch: ${escapeHtml(skill.youtube.title || "tutorial")}`;
  return `
    <a href="${escapeHtml(skill.youtube.url)}" target="_blank" rel="noopener" class="video-link">${label} &rarr;</a>
    ${
      ytId
        ? `<div class="youtube-embed"><iframe src="https://www.youtube.com/embed/${escapeHtml(ytId)}" title="${escapeHtml(skill.title)} video" allowfullscreen></iframe></div>`
        : ""
    }
  `;
}

function skillCardHtml(skill, isLearned) {
  return `
    <div class="skill-card" data-skill-id="${escapeHtml(skill.id)}">
      <div class="skill-card-header">
        <label class="skill-check">
          <input type="checkbox" class="learned-checkbox" data-skill-id="${escapeHtml(skill.id)}" ${isLearned ? "checked" : ""} />
        </label>
        <button type="button" class="skill-title-btn" data-toggle="${escapeHtml(skill.id)}">
          <span class="skill-title ${isLearned ? "learned" : ""}">${escapeHtml(skill.title)}</span>
          <span class="skill-chevron">&darr;</span>
        </button>
      </div>
      <div class="skill-card-body" id="body-${escapeHtml(skill.id)}" hidden>
        <ol class="skill-steps">
          ${skill.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
        </ol>
        ${skill.tip ? `<div class="skill-tip"><strong>Why it matters:</strong> ${escapeHtml(skill.tip)}</div>` : ""}
        <div class="skill-video">${renderVideo(skill)}</div>
      </div>
    </div>
  `;
}

function render() {
  const learned = getLearnedSkills();
  const totalLearned = countLearnedTotal(learned);
  const pct = Math.round((totalLearned / totalSkills) * 100);

  slot.innerHTML = `
    <div class="progress-header">
      <div>
        <div class="progress-count">${totalLearned}/${totalSkills} skills learned</div>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
      </div>
    </div>

    ${CULINARY_CATEGORIES.map((cat) => {
      const catLearned = countLearnedInCategory(cat, learned);
      return `
        <div class="culinary-category">
          <div class="culinary-category-header">
            <h2>${escapeHtml(cat.title)}</h2>
            <span class="category-progress" data-category-progress="${escapeHtml(cat.id)}">${catLearned}/${cat.skills.length}</span>
          </div>
          <div class="skill-list">
            ${cat.skills.map((skill) => skillCardHtml(skill, Boolean(learned[skill.id]))).join("")}
          </div>
        </div>
      `;
    }).join("")}
  `;

  bindEvents();
}

function bindEvents() {
  slot.querySelectorAll(".learned-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      const skillId = cb.dataset.skillId;
      const nowLearned = toggleSkillLearned(skillId);
      updateProgressUI(skillId, nowLearned);
    });
  });

  slot.querySelectorAll(".skill-title-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.toggle;
      const body = document.getElementById(`body-${id}`);
      const chevron = btn.querySelector(".skill-chevron");
      const isHidden = body.hasAttribute("hidden");
      if (isHidden) {
        body.removeAttribute("hidden");
        chevron.textContent = "↑";
      } else {
        body.setAttribute("hidden", "");
        chevron.textContent = "↓";
      }
    });
  });
}

// Updates counts/labels in place so expanded skill panels don't collapse
// when the user just checks a box.
function updateProgressUI(skillId, nowLearned) {
  const card = slot.querySelector(`.skill-card[data-skill-id="${CSS.escape(skillId)}"]`);
  if (card) {
    card.querySelector(".skill-title").classList.toggle("learned", nowLearned);
  }

  const category = CULINARY_CATEGORIES.find((cat) => cat.skills.some((s) => s.id === skillId));
  const learned = getLearnedSkills();

  if (category) {
    const catLearned = countLearnedInCategory(category, learned);
    const catEl = slot.querySelector(`[data-category-progress="${CSS.escape(category.id)}"]`);
    if (catEl) catEl.textContent = `${catLearned}/${category.skills.length}`;
  }

  const totalLearned = countLearnedTotal(learned);
  const pct = Math.round((totalLearned / totalSkills) * 100);
  slot.querySelector(".progress-count").textContent = `${totalLearned}/${totalSkills} skills learned`;
  slot.querySelector(".progress-bar-fill").style.width = `${pct}%`;
}

render();
