export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function renderNav(activePage) {
  const links = [
    { href: "index.html", label: "Today", key: "home" },
    { href: "browse.html", label: "Browse", key: "browse" },
    { href: "pantry.html", label: "My Pantry", key: "pantry" },
    { href: "log.html", label: "Cooking Log", key: "log" },
    { href: "diet.html", label: "Diet Plan", key: "diet" },
    { href: "culinary.html", label: "Culinary Basics", key: "culinary" },
  ];
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="container">
      <a href="index.html" class="brand">Recipe<span>of the Day</span></a>
      <nav class="site-nav" id="site-nav">
        ${links
          .map(
            (l) =>
              `<a href="${l.href}" class="${l.key === activePage ? "active" : ""}">${l.label}</a>`
          )
          .join("")}
      </nav>
      <button class="nav-toggle" id="nav-toggle" aria-label="Menu">&#9776;</button>
    </div>
  `;
  document.body.prepend(header);
  const toggle = header.querySelector("#nav-toggle");
  const nav = header.querySelector("#site-nav");
  toggle.addEventListener("click", () => nav.classList.toggle("open"));

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `Recipe of the Day &middot; recipes courtesy of <a href="https://www.themealdb.com/" target="_blank" rel="noopener">TheMealDB</a>`;
  document.body.appendChild(footer);
}

export function starString(rating) {
  const r = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r);
}

export function formatDateShort(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function extractYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return m ? m[1] : null;
}

export function stateBox(message, opts = {}) {
  const btn = opts.retryLabel
    ? `<button class="btn" id="state-retry">${escapeHtml(opts.retryLabel)}</button>`
    : "";
  return `<div class="state-box"><p>${escapeHtml(message)}</p>${btn}</div>`;
}
