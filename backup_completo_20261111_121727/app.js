const photos = [
  ["Montagne al tramonto","Natura","photo-1464822759023-fed622ff2c3b"],
  ["Foresta mistica","Natura","photo-1448375240586-882707db888b"],
  ["Oceano infinito","Natura","photo-1500530855697-b586d89ba3ee"],
  ["Lago alpino","Natura","photo-1470770841072-f978cf4d019e"],
  ["Supercar","Auto","photo-1503376780353-7e6692767b70"],
  ["Porsche","Auto","photo-1506157786151-b8491531f063"],
  ["Strada notturna","Auto","photo-1492144534655-ae79c964c9d7"],
  ["Minimal dark","Minimal","photo-1519608487953-e999c86e7455"],
  ["Architettura","Minimal","photo-1511818966892-d7d671e672a2"],
  ["Neon future","Tecnologia","photo-1518770660439-4636190af475"],
  ["Setup digitale","Tecnologia","photo-1498050108023-c5249f4df085"],
  ["Circuiti","Tecnologia","photo-1519389950473-47ba0277781c"],
  ["Galassia","Spazio","photo-1462331940025-496dfbfc7564"],
  ["Universo","Spazio","photo-1446776811953-b23d57bd21aa"],
  ["Notte stellata","Spazio","photo-1464802686167-b939a6910659"],
  ["Tokyo di notte","Città","photo-1519608487953-e999c86e7455"],
  ["New York","Città","photo-1519501025264-65ba15a82390"],
  ["Metropoli","Città","photo-1519608487953-e999c86e7455"]
];

const themes = {
  Natura: {
    titles: ["Paesaggio naturale","Montagne selvagge","Foresta verde","Lago cristallino","Oceano blu","Cascata","Tramonto naturale","Valle panoramica"],
    tags: ["nature,landscape","mountain,forest","lake,nature","ocean,coast","waterfall,nature","sunset,landscape"]
  },
  Auto: {
    titles: ["Supercar","Auto sportiva","Motore potente","Design automobilistico","Auto di lusso","Strada panoramica","Hypercar","Garage premium"],
    tags: ["sports,car","supercar","luxury,car","automotive","race,car","classic,car"]
  },
  Tecnologia: {
    titles: ["Digital Future","Cyber Technology","Setup moderno","Circuiti digitali","Computer Setup","Neon Technology","Gaming Station","Futuristic Design"],
    tags: ["technology,computer","gaming,setup","circuit,technology","computer,desk","digital,technology","futuristic,technology"]
  },
  Spazio: {
    titles: ["Galassia lontana","Nebulosa","Universo infinito","Pianeta misterioso","Stelle nel cosmo","Via Lattea","Esplorazione spaziale","Sistema solare"],
    tags: ["galaxy,space","nebula,space","planet,space","stars,universe","milkyway,space","astronomy,night"]
  },
  Minimal: {
    titles: ["Minimal Architecture","Geometrie","Design essenziale","Minimal Interior","Abstract Design","Linee moderne","Architettura moderna","Minimal Art"],
    tags: ["minimal,architecture","minimal,interior","abstract,geometry","modern,architecture","minimal,design","concrete,architecture"]
  },
  Città: {
    titles: ["Tokyo Skyline","New York City","Metropoli moderna","City Lights","Strade urbane","Architettura urbana","Città di notte","Skyline"],
    tags: ["tokyo,city","newyork,city","city,night","urban,architecture","city,skyline","street,city"]
  }
};

const categories = Object.keys(themes);
const generatedPhotos = Array.from({length: 482}, (_, index) => {
  const category = categories[index % categories.length];
  const theme = themes[category];
  const title = theme.titles[Math.floor(index / categories.length) % theme.titles.length];
  const tag = theme.tags[Math.floor(index / categories.length) % theme.tags.length];

  return {
    id: `generated-${index + 1}`,
    title: `${title} ${String(index + 19).padStart(3, "0")}`,
    category,
    url: `https://loremflickr.com/1200/1600/${encodeURIComponent(tag)}?lock=${5000 + index}`,
    source: "LoremFlickr"
  };
});

const imageUrl = id =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

let wallpapers = [
  ...photos.map((p, i) => ({
    id: `default-${i}`,
    title: p[0],
    category: p[1],
    url: imageUrl(p[2]),
    source: "Unsplash"
  })),
  ...generatedPhotos
];

const grid = document.getElementById("wallpaperGrid");
const search = document.getElementById("searchInput");
const empty = document.getElementById("emptyState");
const modal = document.getElementById("previewModal");

let activeCategory = "Tutti";
let activeView = "all";
let visibleCount = 60;
const PAGE_SIZE = 60;

let favorites = JSON.parse(
  localStorage.getItem("wallpaperhub-favorites") || "[]"
);

const resultsInfo = document.createElement("div");
resultsInfo.className = "results-info";
resultsInfo.style.cssText =
  "color:#858585;font-size:13px;margin:0 0 15px;";

grid.parentNode.insertBefore(resultsInfo, grid);

const loadMoreButton = document.createElement("button");
loadMoreButton.textContent = "Mostra altri sfondi";
loadMoreButton.style.cssText = `
  display:block;
  margin:0 auto 65px;
  padding:14px 25px;
  border:1px solid #171717;
  border-radius:9px;
  background:#171717;
  color:white;
  cursor:pointer;
  font-size:14px;
  font-weight:600;
`;
grid.insertAdjacentElement("afterend", loadMoreButton);

loadMoreButton.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  render();
});

function render() {
  const term = search.value.trim().toLowerCase();

  const shown = wallpapers.filter(w => {
    const categoryMatch =
      activeCategory === "Tutti" || w.category === activeCategory;

    const searchMatch =
      `${w.title} ${w.category}`.toLowerCase().includes(term);

    const viewMatch =
      activeView === "favorites"
        ? favorites.includes(w.id)
        : activeView === "uploads"
          ? w.id.startsWith("upload-")
          : true;

    return categoryMatch && searchMatch && viewMatch;
  });

  const visible = shown.slice(0, visibleCount);

  grid.innerHTML = visible.map(w => `
    <article class="wallpaper-card" data-id="${escapeHTML(w.id)}">
      <img
        src="${escapeHTML(w.url)}"
        alt="${escapeHTML(w.title)}"
        loading="lazy"
        onerror="this.onerror=null;this.style.opacity='.25';"
      >
      <div class="card-overlay">
        <div>
          <div class="card-title">${escapeHTML(w.title)}</div>
          <div class="card-category">${escapeHTML(w.category)}</div>
        </div>
        <button
          class="favorite ${favorites.includes(w.id) ? "selected" : ""}"
          data-favorite="${escapeHTML(w.id)}"
          aria-label="Aggiungi ai preferiti"
        >${favorites.includes(w.id) ? "♥" : "♡"}</button>
      </div>
    </article>
  `).join("");

  resultsInfo.textContent =
    `Visualizzati ${visible.length} di ${shown.length} sfondi`;

  empty.hidden = shown.length !== 0;
  loadMoreButton.hidden = visible.length >= shown.length;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

grid.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");

  if (favoriteButton) {
    const id = favoriteButton.dataset.favorite;

    favorites = favorites.includes(id)
      ? favorites.filter(x => x !== id)
      : [...favorites, id];

    localStorage.setItem(
      "wallpaperhub-favorites",
      JSON.stringify(favorites)
    );

    render();
    return;
  }

  const card = event.target.closest(".wallpaper-card");
  if (card) openPreview(card.dataset.id);
});

function openPreview(id) {
  const w = wallpapers.find(item => item.id === id);
  if (!w) return;

  document.getElementById("previewImage").src = w.url;
  document.getElementById("previewTitle").textContent = w.title;
  document.getElementById("previewCategory").textContent = w.category;

  const download = document.getElementById("downloadButton");
  download.href = w.url;
  download.download =
    `${w.title.replace(/[^a-z0-9]/gi, "-")}-Wallpaper.jpg`;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closePreview() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.getElementById("closeModal")
  .addEventListener("click", closePreview);

modal.addEventListener("click", e => {
  if (e.target === modal) closePreview();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closePreview();
});

search.addEventListener("input", () => {
  visibleCount = PAGE_SIZE;
  render();
});

document.getElementById("categories").addEventListener("click", e => {
  const btn = e.target.closest("[data-category]");
  if (!btn) return;

  activeCategory = btn.dataset.category;
  visibleCount = PAGE_SIZE;

  document.querySelectorAll(".category").forEach(b =>
    b.classList.toggle("active", b === btn)
  );

  render();
});

document.querySelector("nav").addEventListener("click", e => {
  const btn = e.target.closest("[data-view]");
  if (!btn) return;

  activeView = btn.dataset.view;
  visibleCount = PAGE_SIZE;

  document.querySelectorAll(".nav-btn").forEach(b =>
    b.classList.toggle("active", b === btn)
  );

  document.getElementById("sectionTitle").textContent =
    activeView === "favorites"
      ? "I tuoi preferiti"
      : activeView === "uploads"
        ? "I miei sfondi"
        : "Esplora gli sfondi";

  render();
});

const DB_NAME = "WallpaperHubDB";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("uploads")) {
        request.result.createObjectStore("uploads", {keyPath: "id"});
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadUploads() {
  try {
    const db = await openDB();

    const records = await new Promise((resolve, reject) => {
      const request = db.transaction("uploads")
        .objectStore("uploads").getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    records.forEach(record => {
      const url = URL.createObjectURL(record.file);

      wallpapers.push({
        id: record.id,
        title: record.title,
        category: "I miei sfondi",
        url,
        source: url
      });
    });

    render();
  } catch (error) {
    console.error("Errore caricamento sfondi:", error);
  }
}

document.getElementById("uploadButton").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", async e => {
  const files = [...e.target.files]
    .filter(file => file.type.startsWith("image/"));

  if (!files.length) return;

  try {
    const db = await openDB();

    for (const file of files) {
      const id =
        `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const title = file.name.replace(/\.[^.]+$/, "");

      await new Promise((resolve, reject) => {
        const request = db.transaction("uploads", "readwrite")
          .objectStore("uploads")
          .add({id, title, file});

        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });

      wallpapers.push({
        id,
        title,
        category: "I miei sfondi",
        url: URL.createObjectURL(file)
      });
    }

    render();
  } catch (error) {
    alert("Non è stato possibile salvare le immagini. Controlla lo spazio disponibile.");
    console.error(error);
  }

  e.target.value = "";
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .catch(console.error);
  });
}

render();
loadUploads();
