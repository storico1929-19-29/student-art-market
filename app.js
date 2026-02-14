// app.js
const OWNER = "storico1929-19-29";
const REPO = "student-art-market";
const BRANCH = "main";
const IMG_DIR = "img";

// Як люди бронюють: створюють Issue з назвою "Бронь: <ім'я_файлу>"
const ISSUE_TITLE_PREFIX = "Бронь:";

const galleryEl = document.getElementById("gallery");
const statusEl = document.getElementById("status");

function normalizeName(name) {
  return (name || "").trim();
}

function parseNumberPrefix(filename) {
  // "57-Nadir.jpg" -> 57
  const m = filename.match(/^(\d+)-/);
  return m ? Number(m[1]) : 999999;
}

function parseCategory(filename) {
  // "57-Nadir.jpg" -> "Nadir"
  const m = filename.match(/^\d+-([^.]+)\./);
  return m ? m[1] : "Інше";
}

function getImageUrl(path) {
  // GitHub Pages URL (працює стабільно)
  return `https://${OWNER}.github.io/${REPO}/${path}`;
}

function buildReserveIssueLink(filename) {
  const title = `${ISSUE_TITLE_PREFIX} ${filename}`;
  const body =
`Я хочу забронювати малюнок: ${filename}

ПІБ:
Контакт (телефон/месенджер):
Коментар:`;

  const url =
`https://github.com/${OWNER}/${REPO}/issues/new` +
`?title=${encodeURIComponent(title)}` +
`&body=${encodeURIComponent(body)}`;

  return url;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "Accept": "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function loadImages() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${IMG_DIR}?ref=${BRANCH}`;
  const items = await fetchJson(url);

  // тільки картинки
  const imgs = items
    .filter(it => it.type === "file" && /\.(png|jpe?g|webp|gif)$/i.test(it.name))
    .map(it => ({
      name: it.name,
      path: it.path,
      number: parseNumberPrefix(it.name),
      category: parseCategory(it.name),
    }))
    .sort((a, b) => a.category.localeCompare(b.category, "uk") || a.number - b.number);

  return imgs;
}

async function loadReservations() {
  // Беремо останні 100 Issues (має вистачити)
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues?state=open&per_page=100`;
  const issues = await fetchJson(url);

  // в issues прилітають ще PR-и — відсікаємо
  const onlyIssues = issues.filter(it => !it.pull_request);

  // Витягуємо filenames з заголовків
  const reserved = new Set();
  for (const it of onlyIssues) {
    const t = normalizeName(it.title);
    if (t.toLowerCase().startsWith(ISSUE_TITLE_PREFIX.toLowerCase())) {
      const filename = normalizeName(t.slice(ISSUE_TITLE_PREFIX.length));
      if (filename) reserved.add(filename);
    }
  }
  return reserved;
}

function render(images, reservedSet) {
  galleryEl.innerHTML = "";

  let currentCat = "";
  for (const img of images) {
    if (img.category !== currentCat) {
      currentCat = img.category;
      const h = document.createElement("h2");
      h.className = "category-title";
      h.textContent = currentCat;
      galleryEl.appendChild(h);
    }

    const card = document.createElement("div");
    card.className = "art-card";

    const image = document.createElement("img");
    image.loading = "lazy";
    image.alt = img.name;
    image.src = getImageUrl(img.path);

    const title = document.createElement("div");
    title.className = "art-title";
    title.textContent = img.name.replace(/\.[^.]+$/, "");

    const isReserved = reservedSet.has(img.name);

    const badge = document.createElement("div");
    badge.className = "badge " + (isReserved ? "reserved" : "free");
    badge.textContent = isReserved ? "Заброньовано" : "Вільний";

    const actions = document.createElement("div");
    actions.className = "actions";

    const btn = document.createElement("a");
    btn.className = "btn " + (isReserved ? "btn-disabled" : "btn-primary");
    btn.textContent = isReserved ? "Уже заброньовано" : "Забронювати";
    btn.href = isReserved ? "#" : buildReserveIssueLink(img.name);
    btn.target = "_blank";
    btn.rel = "noopener";

    if (isReserved) {
      btn.addEventListener("click", (e) => e.preventDefault());
    }

    actions.appendChild(btn);

    card.appendChild(image);
    card.appendChild(title);
    card.appendChild(badge);
    card.appendChild(actions);

    galleryEl.appendChild(card);
  }
}

async function main() {
  try {
    statusEl.textContent = "Завантажую малюнки…";
    const [images, reserved] = await Promise.all([loadImages(), loadReservations()]);
    statusEl.textContent = `Знайдено малюнків: ${images.length}. Броней: ${reserved.size}.`;
    render(images, reserved);
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Помилка завантаження. Перевір, чи є папка img і чи GitHub Pages активний.";
  }
}

main();

